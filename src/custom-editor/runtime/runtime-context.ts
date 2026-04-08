/**
 * 运行时上下文序列化器
 *
 * 职责: 管理 Webview 运行时环境使用的各种全局数据，确保数据的安全序列化与初始化
 */

import * as vscode from 'vscode';

/**
 * 运行时上下文（Webview 中的全局对象）
 */
export interface RuntimeContext {
  /** 当前编辑资源的 URI */
  resourceUri: vscode.Uri;

  /** 预览设置（isMac, debug 等） */
  settings: {
    isMac: boolean;
    debug?: boolean;
    [key: string]: any;
  };

  /** 其他初始化数据 */
  metadata?: Record<string, any>;
}

/**
 * 序列化结果
 */
export interface SerializationResult {
  /** 序列化的数据对象 JSON 字符串 */
  json: string;

  /** 元数据（用于日志和调试） */
  metadata: {
    keys: string[];
    size: number;
  };
}

/**
 * RuntimeContextSerializer 类
 */
export class RuntimeContextSerializer {
  /**
   * 序列化运行时上下文
   * @param context 运行时上下文
   * @returns 序列化结果
   */
  static serialize(context: RuntimeContext): SerializationResult {
    const data = {
      resourceUri: context.resourceUri,
      settings: context.settings,
      metadata: context.metadata,
    };

    const json = JSON.stringify(data);
    const keys = Object.keys(data);
    const size = Buffer.byteLength(json, 'utf8');

    return {
      json,
      metadata: {
        keys,
        size,
      },
    };
  }

  /**
   * 生成用于注入的数据属性
   * @param context 运行时上下文
   * @returns HTML 属性字符串 (data-* format)
   */
  static toDataAttributes(context: RuntimeContext): string {
    const attributes: string[] = [];

    // 资源 URI
    attributes.push(
      `data-resource-uri="${RuntimeContextSerializer.escapeHtml(JSON.stringify(context.resourceUri))}"`,
    );

    // 设置
    attributes.push(
      `data-settings="${RuntimeContextSerializer.escapeHtml(JSON.stringify(context.settings))}"`,
    );

    // 元数据
    if (context.metadata) {
      attributes.push(
        `data-metadata="${RuntimeContextSerializer.escapeHtml(JSON.stringify(context.metadata))}"`,
      );
    }

    return attributes.join(' ');
  }

  /**
   * 逃逸 HTML 特殊字符
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char] || char);
  }

  /**
   * 生成用于 Webview 初始化的注释（用于调试）
   */
  static toDebugComment(context: RuntimeContext): string {
    const lines = [
      '<!-- Runtime Context -->',
      `<!-- Resource URI: ${context.resourceUri} -->`,
      `<!-- Settings: ${JSON.stringify(context.settings)} -->`,
    ];

    if (context.metadata) {
      lines.push(`<!-- Metadata: ${JSON.stringify(context.metadata)} -->`);
    }

    return lines.join('\n    ');
  }

  /**
   * 验证上下文完整性
   */
  static validate(context: RuntimeContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证 resourceUri
    if (!context.resourceUri) {
      errors.push('缺少 resourceUri');
    }

    // 验证 settings
    if (!context.settings) {
      errors.push('缺少 settings 对象');
    } else {
      if (typeof context.settings.isMac !== 'boolean') {
        errors.push('settings.isMac 必须是布尔值');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 合并多个上下文（优先级从右到左）
   */
  static merge(...contexts: Partial<RuntimeContext>[]): RuntimeContext {
    const result: RuntimeContext = {
      resourceUri: undefined as any,
      settings: { isMac: false },
    };

    contexts.forEach((ctx) => {
      if (ctx.resourceUri) {
        result.resourceUri = ctx.resourceUri;
      }
      if (ctx.settings) {
        result.settings = { ...result.settings, ...ctx.settings };
      }
      if (ctx.metadata) {
        result.metadata = { ...result.metadata, ...ctx.metadata };
      }
    });

    return result;
  }

  /**
   * 创建默认上下文
   */
  static createDefault(resourceUri: vscode.Uri): RuntimeContext {
    return {
      resourceUri,
      settings: {
        isMac: process.platform === 'darwin',
      },
    };
  }
}
