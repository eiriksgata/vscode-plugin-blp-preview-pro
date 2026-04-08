/**
 * 资源加载服务
 *
 * 职责: 统一处理资源加载的所有方式（本地文件、MPQ、W3X）
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import ArchiveManager from '../../mpq-manager/manager';
import MpqArchive from '../../mpq-manager/archive';
import MpqManager from '../../mpq-manager';
import {
  LoadResponse,
  LoadBlpResponse,
  LoadTextResponse,
  LoadTextArrayResponse,
  LoadResourceResponse,
  ErrorCode,
} from '../protocol';

/**
 * 资源加载上下文
 */
export interface ResourceContext {
  /** 主文件的资源 URI */
  primaryResource: vscode.Uri;

  /** 资源根目录 */
  resourceRoot: vscode.Uri;

  /** MPQ 管理器实例 */
  mpqManager: ArchiveManager;

  /** 工作区文件夹列表 */
  workspaceFolders?: readonly vscode.WorkspaceFolder[];
}

/**
 * ResourceService 类
 */
export class ResourceService {
  constructor(private context: ResourceContext) {}

  /**
   * 加载主文件资源
   */
  async load(): Promise<LoadResponse> {
    const { primaryResource, resourceRoot, mpqManager } = this.context;

    try {
      let ext: string;
      let buf: Uint8Array;

      if (primaryResource.scheme === 'w3x') {
        // W3X 存档
        const [fsPath, resourcePath] = primaryResource.fsPath.split(/\.w3x/);
        const mpq = MpqArchive.getByPath(fsPath + '.w3x');
        await mpq.promise;
        const data = await mpq.get(resourcePath.slice(1));

        if (!data) {
          throw new Error(`No data found in W3X archive for ${resourcePath}`);
        }

        ext = primaryResource.path.split(/\./).pop() || 'bin';
        buf = new Uint8Array(data);
      } else if (primaryResource.scheme === 'mpq') {
        // MPQ 存档
        const [first, ...rest] = primaryResource.path.split(/\\/);
        const data = await mpqManager.get(rest.join('\\'));

        if (!data) {
          throw new Error(`No data found in MPQ archive for ${rest.join('\\')}`);
        }

        ext = primaryResource.path.split(/\./).pop() || 'bin';
        buf = new Uint8Array(data);
      } else {
        // 本地文件系统
        const fileBuffer = await vscode.workspace.fs.readFile(primaryResource);
        ext = primaryResource.path.split(/\./).pop() || 'bin';
        buf = fileBuffer;
      }

      return {
        ext,
        buf: buf.buffer,
        size: buf.byteLength,
      };
    } catch (error) {
      throw this.wrapError(error, ErrorCode.FILE_NOT_FOUND, '无法读取文件资源');
    }
  }

  /**
   * 从 MPQ/W3X 加载 BLP 资源
   */
  async loadBlp(path: string): Promise<LoadBlpResponse> {
    try {
      const { primaryResource, mpqManager } = this.context;

      let data: Uint8Array | undefined;

      if (primaryResource.scheme === 'w3x') {
        const [fsPath] = primaryResource.fsPath.split(/\.w3x/);
        const mpq = MpqArchive.getByPath(fsPath + '.w3x');
        await mpq.promise;
        data = new Uint8Array(await mpq.get(path));
      } else if (mpqManager) {
        data = new Uint8Array(await mpqManager.get(path));
      }

      if (!data || data.length === 0) {
        throw new Error(`BLP resource not found: ${path}`);
      }

      return {
        ext: 'blp',
        buf: data.buffer,
        size: data.byteLength,
      };
    } catch (error) {
      throw this.wrapError(error, ErrorCode.FILE_NOT_FOUND, `无法加载 BLP: ${path}`);
    }
  }

  /**
   * 加载文本文件
   */
  async loadText(path: string): Promise<LoadTextResponse> {
    try {
      const { primaryResource, resourceRoot, mpqManager } = this.context;

      let content: string | undefined;

      // 尝试多种加载方式
      if (primaryResource.scheme === 'w3x') {
        // 从 W3X 加载
        const [fsPath] = primaryResource.fsPath.split(/\.w3x/);
        const mpq = MpqArchive.getByPath(fsPath + '.w3x');
        await mpq.promise;
        const data = await mpq.get(path);
        if (data) {
          content = Buffer.from(data).toString('utf-8');
        }
      } else if (primaryResource.scheme === 'mpq') {
        // 从 MPQ 加载
        const data = await mpqManager.get(path);
        if (data) {
          content = Buffer.from(data).toString('utf-8');
        }
      }

      // 尝试从工作区相同目录加载
      if (!content) {
        const resourcePath = resourceRoot.with({ path: resourceRoot.path + path });
        try {
          const buf = await vscode.workspace.fs.readFile(resourcePath);
          content = Buffer.from(buf).toString('utf-8');
        } catch {
          // 文件不存在，继续
        }
      }

      if (!content) {
        throw new Error(`Text resource not found: ${path}`);
      }

      return {
        content,
        size: Buffer.byteLength(content, 'utf-8'),
      };
    } catch (error) {
      throw this.wrapError(error, ErrorCode.FILE_NOT_FOUND, `无法加载文本: ${path}`);
    }
  }

  /**
   * 加载文本文件并按行分割
   */
  async loadTextArray(path: string): Promise<LoadTextArrayResponse> {
    const textResponse = await this.loadText(path);
    const lines = textResponse.content.split(/\r?\n/);

    return {
      lines,
      size: textResponse.size,
    };
  }

  /**
   * 加载任意二进制资源
   */
  async loadResource(path: string): Promise<LoadResourceResponse> {
    try {
      const { primaryResource, resourceRoot, mpqManager } = this.context;

      let buf: Uint8Array | undefined;

      // 尝试多种加载方式
      if (primaryResource.scheme === 'w3x') {
        const [fsPath] = primaryResource.fsPath.split(/\.w3x/);
        const mpq = MpqArchive.getByPath(fsPath + '.w3x');
        await mpq.promise;
        const data = await mpq.get(path);
        if (data) {
          buf = new Uint8Array(data);
        }
      } else if (primaryResource.scheme === 'mpq') {
        const data = await mpqManager.get(path);
        if (data) {
          buf = new Uint8Array(data);
        }
      }

      // 尝试从工作区加载
      if (!buf) {
        const resourcePath = resourceRoot.with({ path: resourceRoot.path + path });
        try {
          buf = await vscode.workspace.fs.readFile(resourcePath);
        } catch {
          // 文件不存在，继续
        }
      }

      if (!buf) {
        throw new Error(`Resource not found: ${path}`);
      }

      return {
        buf: buf.buffer,
        size: buf.byteLength,
      };
    } catch (error) {
      throw this.wrapError(error, ErrorCode.FILE_NOT_FOUND, `无法加载资源: ${path}`);
    }
  }

  /**
   * 等待 MPQ 初始化
   */
  private async waitForMpqReady(): Promise<void> {
    await MpqManager.waitUntilReady();
    if (this.context.mpqManager?.task) {
      await this.context.mpqManager.task.catch(() => undefined);
    }
  }

  /**
   * 将异常包装为错误响应
   */
  private wrapError(error: any, defaultCode: ErrorCode, message: string): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(message);
  }
}
