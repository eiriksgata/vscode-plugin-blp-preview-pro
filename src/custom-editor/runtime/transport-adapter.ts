/**
 * 传输适配器
 *
 * 职责: 将内部的 RPC 响应转换为 VS Code Webview 消息格式
 */

import { Webview } from 'vscode';
import {
  RpcResponse,
  RpcRequest,
  ExtensionToWebviewMessage,
  ErrorResponse,
  ErrorCode,
} from '../protocol';

/**
 * TransportAdapter 配置
 */
export interface TransportAdapterConfig {
  /** 是否对响应数据进行深度克隆 */
  deepClone?: boolean;

  /** 是否在响应中包含元数据 */
  includeMetadata?: boolean;

  /** 最大响应大小 (字节) */
  maxResponseSize?: number;

  /** 是否启用调试日志 */
  debug?: boolean;
}

/**
 * TransportAdapter 类
 */
export class TransportAdapter {
  private config: TransportAdapterConfig;

  constructor(config?: TransportAdapterConfig) {
    this.config = config || {};
  }

  /**
   * 将 RPC 响应转换为 Webview 消息
   */
  toWebviewMessage(rpcResponse: RpcResponse): ExtensionToWebviewMessage {
    const message: ExtensionToWebviewMessage = {
      requestId: rpcResponse.requestId,
      type: rpcResponse.error ? 'error' : 'response',
    };

    if (rpcResponse.error) {
      message.error = rpcResponse.error;
    } else {
      message.data = rpcResponse.data;
    }

    return message;
  }

  /**
   * 从 Webview 消息转换为 RPC 请求
   */
  fromWebviewMessage(message: any): RpcRequest {
    return {
      requestId: message.requestId,
      type: message.type,
      data: message.data,
      timeout: message.timeout,
      version: message.version,
    };
  }

  /**
   * 发送响应到 Webview
   */
  async send(webview: Webview, response: RpcResponse): Promise<void> {
    try {
      const message = this.toWebviewMessage(response);

      // 验证响应大小
      if (this.config.maxResponseSize) {
        const size = Buffer.byteLength(JSON.stringify(message), 'utf8');
        if (size > this.config.maxResponseSize) {
          console.warn(
            `Response size ${size} exceeds max ${this.config.maxResponseSize}, may be truncated`,
          );
        }
      }

      // 发送消息
      webview.postMessage(message);

      if (this.config.debug) {
        console.log('[TransportAdapter] Sent response:', {
          requestId: response.requestId,
          hasError: !!response.error,
          dataSize: response.data
            ? Buffer.byteLength(JSON.stringify(response.data), 'utf8')
            : 0,
        });
      }
    } catch (error) {
      console.error('[TransportAdapter] Failed to send response:', error);
      throw error;
    }
  }

  /**
   * 批量发送响应
   */
  async sendBatch(webview: Webview, responses: RpcResponse[]): Promise<void> {
    const promises = responses.map((r) => this.send(webview, r));
    await Promise.all(promises);
  }

  /**
   * 生成错误响应
   */
  createErrorResponse(
    requestId: string | undefined,
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
  ): RpcResponse {
    return {
      requestId,
      error: {
        code,
        message,
        details,
      },
    };
  }

  /**
   * 生成成功响应
   */
  createSuccessResponse(requestId: string | undefined, data: any): RpcResponse {
    return {
      requestId,
      data,
    };
  }

  /**
   * 生成超时错误响应
   */
  createTimeoutResponse(requestId: string | undefined, timeoutMs: number): RpcResponse {
    return this.createErrorResponse(requestId, ErrorCode.TIMEOUT, `Request timeout after ${timeoutMs}ms`);
  }

  /**
   * 生成方法未找到错误响应
   */
  createMethodNotFoundResponse(requestId: string | undefined, methodName: string): RpcResponse {
    return this.createErrorResponse(
      requestId,
      ErrorCode.METHOD_NOT_FOUND,
      `Unknown RPC method: ${methodName}`,
      { method: methodName },
    );
  }

  /**
   * 格式化错误对象为 ErrorResponse
   */
  formatError(error: any, defaultCode: ErrorCode = ErrorCode.INTERNAL_ERROR): ErrorResponse {
    if (typeof error === 'string') {
      return {
        code: defaultCode,
        message: error,
      };
    }

    if (error instanceof Error) {
      // 推断错误码
      let code = defaultCode;
      const message = error.message.toLowerCase();

      if (message.includes('not found') || message.includes('enoent')) {
        code = ErrorCode.FILE_NOT_FOUND;
      } else if (message.includes('invalid')) {
        code = ErrorCode.INVALID_FORMAT;
      } else if (message.includes('mpq')) {
        code = ErrorCode.MPQ_ERROR;
      } else if (message.includes('w3x')) {
        code = ErrorCode.W3X_ERROR;
      }

      return {
        code,
        message: error.message,
        details: this.config.debug ? { stack: error.stack } : undefined,
      };
    }

    return {
      code: defaultCode,
      message: String(error),
    };
  }

  /**
   * 检查响应是否有效
   */
  isValidResponse(response: RpcResponse): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!response) {
      errors.push('Response is null or undefined');
    } else {
      // 要么有 data，要么有 error，但不能都没有
      if (!response.data && !response.error) {
        errors.push('Response must have either data or error field');
      }

      // 不能同时有 data 和 error
      if (response.data && response.error) {
        errors.push('Response cannot have both data and error fields');
      }

      // 错误必须有 code 和 message
      if (response.error) {
        if (!response.error.code) {
          errors.push('Error response must have code field');
        }
        if (!response.error.message) {
          errors.push('Error response must have message field');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
