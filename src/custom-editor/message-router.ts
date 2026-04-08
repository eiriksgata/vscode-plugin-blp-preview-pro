/**
 * 消息路由适配器 (MessageRouter)
 *
 * 用途: 替代后端 Message 类中的 this[message.type]() 动态分发
 * 优势:
 * 1. 类型安全 - TypeScript 编译时验证
 * 2. 可追踪 - 清晰的方法映射
 * 3. 可扩展 - 新方法通过 registry 注册，无需修改发调方法
 * 4. 错误处理 - 统一的错误捕获与返回格式
 * 5. Minification 友好 - 不依赖符号名
 */

import {
  RpcMethodName,
  RpcRequest,
  RpcResponse,
  ErrorCode,
  ErrorResponse,
  IMessageHandler,
  isMethodRegistered,
  getMethodDescription,
  DEFAULT_RPC_TIMEOUT,
} from './protocol';

/**
 * RPC 方法处理器签名
 */
type RpcHandler = (data?: unknown) => Promise<unknown>;

/**
 * 消息路由器配置
 */
export interface RouterConfig {
  /** 是否在调试模式下记录所有调用 */
  debug?: boolean;
  /** 自定义日志记录器 */
  logger?: {
    log: (message: string, data?: any) => void;
    error: (message: string, error?: any) => void;
  };
}

/**
 * MessageRouter 类
 * 负责:
 * 1. 验证传入的 RPC 请求
 * 2. 路由到正确的处理器
 * 3. 捕获并格式化错误
 * 4. 返回标准化的 RPC 响应
 */
export class MessageRouter {
  private handlers: Map<RpcMethodName, RpcHandler> = new Map();
  private config: RouterConfig;

  constructor(
    private messageHandler: IMessageHandler,
    config?: RouterConfig,
  ) {
    this.config = config || {};
    this.registerHandlers();
  }

  /**
   * 注册所有 RPC 方法处理器
   */
  private registerHandlers(): void {
    // 绑定处理器到消息对象实例
    this.handlers.set('load', (data) => this.messageHandler.load(data));
    this.handlers.set('loadBlp', (data) => this.messageHandler.loadBlp(data as string));
    this.handlers.set('loadText', (data) => this.messageHandler.loadText(data as string));
    this.handlers.set('loadTextArray', (data) => this.messageHandler.loadTextArray(data as string));
    this.handlers.set('loadResource', (data) => this.messageHandler.loadResource(data as string));
  }

  /**
   * 路由并处理 RPC 请求
   * @param request RPC 请求
   * @returns RPC 响应 (data 或 error)
   */
  async route(request: RpcRequest): Promise<RpcResponse> {
    const startTime = Date.now();

    try {
      const { type, data, requestId } = request;

      // 1. 验证方法是否已注册
      if (!isMethodRegistered(type)) {
        this.log(`Method not found: ${type}`);
        return {
          requestId,
          error: {
            code: ErrorCode.METHOD_NOT_FOUND,
            message: `Unknown RPC method: ${type}`,
            details: {
              method: type,
              available: Array.from(this.handlers.keys()),
            },
          },
        };
      }

      // 2. 获取处理器
      const handler = this.handlers.get(type);
      if (!handler) {
        throw new Error(`Handler not found for method: ${type}`);
      }

      // 3. 执行处理器，捕获任何错误
      this.log(`Calling RPC method: ${type}`, { data });
      const result = await handler(data);
      const duration = Date.now() - startTime;

      this.log(`RPC method ${type} completed in ${duration}ms`, { result });

      return {
        requestId,
        data: result,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError(`RPC error after ${duration}ms`, error);

      // 将异常转换为标准错误响应
      const response: RpcResponse = {
        requestId: request.requestId,
        error: this.translateError(error),
      };

      return response;
    }
  }

  /**
   * 将异常翻译为标准错误响应
   * @param error 捕获的异常
   * @returns ErrorResponse
   */
  private translateError(error: any): ErrorResponse {
    if (error instanceof Error) {
      const message = error.message;

      // 根据错误消息推断错误码
      if (message.includes('not found') || message.includes('ENOENT')) {
        return {
          code: ErrorCode.FILE_NOT_FOUND,
          message,
        };
      }
      if (message.includes('invalid') || message.includes('Invalid')) {
        return {
          code: ErrorCode.INVALID_FORMAT,
          message,
        };
      }
      if (message.includes('mpq') || message.includes('MPQ')) {
        return {
          code: ErrorCode.MPQ_ERROR,
          message,
        };
      }
      if (message.includes('w3x') || message.includes('W3X')) {
        return {
          code: ErrorCode.W3X_ERROR,
          message,
        };
      }

      return {
        code: ErrorCode.INTERNAL_ERROR,
        message: error.message,
        details: {
          stack: error.stack, // 开发时有用，生产时可移除
        },
      };
    }

    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: String(error),
    };
  }

  /**
   * 注册自定义 RPC 方法（用于扩展）
   * @param methodName 方法名
   * @param handler 处理器函数
   */
  registerCustomHandler(methodName: string, handler: RpcHandler): void {
    // 注意：这会覆盖内置方法，仅用于扩展或测试
    const typedName = methodName as RpcMethodName;
    this.handlers.set(typedName, handler);
    this.log(`Registered custom handler: ${methodName}`);
  }

  /**
   * 获取已注册的方法列表
   * @returns 方法名数组
   */
  getRegisteredMethods(): RpcMethodName[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 获取方法描述
   * @param methodName 方法名
   * @returns 描述字符串
   */
  getMethodDescription(methodName: RpcMethodName): string {
    return getMethodDescription(methodName);
  }

  /**
   * 记录日志
   * @param message 消息
   * @param data 数据
   */
  private log(message: string, data?: any): void {
    if (this.config.debug && this.config.logger) {
      this.config.logger.log(message, data);
    }
  }

  /**
   * 记录错误
   * @param message 消息
   * @param error 错误
   */
  private logError(message: string, error?: any): void {
    if (this.config.logger) {
      this.config.logger.error(message, error);
    }
  }
}

/**
 * 向后兼容适配器
 * 用于将旧的 Message 类适配到新的 MessageRouter
 *
 * 使用方式:
 * ```
 * const router = new MessageRouter(messageInstance);
 * const adapter = new BackwardCompatibilityAdapter(messageInstance, router);
 * adapter.onMessage(message); // 替代 message.onMessage(message)
 * ```
 */
export class BackwardCompatibilityAdapter {
  constructor(
    private messageHandler: IMessageHandler,
    private router: MessageRouter,
  ) {}

  /**
   * 处理传入的消息（向后兼容的入口）
   * @param message 消息对象
   * @returns Promise<响应>
   */
  async onMessage(message: any): Promise<any> {
    const request: RpcRequest = {
      requestId: message.requestId,
      type: message.type as RpcMethodName,
      data: message.data,
      timeout: message.timeout,
    };

    // 使用新路由器处理
    const response = await this.router.route(request);

    // 转换为向后兼容的格式
    if (response.error) {
      // 旧系统可能期望异常抛出或特定格式
      throw new Error(`${response.error.code}: ${response.error.message}`);
    }

    return response.data;
  }
}
