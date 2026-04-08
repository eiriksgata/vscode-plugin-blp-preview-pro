/**
 * 前后端消息协议定义
 *
 * 核心目标:
 * 1. 为所有 RPC 方法定义类型安全的 request/response 格式
 * 2. 统一错误处理 (错误码 + 错误信息)
 * 3. 替代 `this[message.type]()` 动态分发，引入类型化的方法路由
 * 4. 保留旧系统的消息字段名称兼容性
 */

/**
 * 错误码定义
 * 便于前端统一处理不同类型的异常
 */
export enum ErrorCode {
  /** 文件不存在或无法读取 */
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',

  /** 资源路径无效或超出范围 */
  INVALID_RESOURCE_PATH = 'INVALID_RESOURCE_PATH',

  /** 格式不支持或格式错误 */
  INVALID_FORMAT = 'INVALID_FORMAT',

  /** 内部服务器错误 */
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  /** 消息类型未定义 (改进的替代品：MPC里主动返回)*/
  METHOD_NOT_FOUND = 'METHOD_NOT_FOUND',

  /** 消息超时 */
  TIMEOUT = 'TIMEOUT',

  /** MPQ 存档未初始化或读取失败 */
  MPQ_ERROR = 'MPQ_ERROR',

  /** W3X 存档解析失败 */
  W3X_ERROR = 'W3X_ERROR',
}

/**
 * 错误响应格式
 */
export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * RPC 请求格式 (前端 → 后端)
 * @template TMethod - RPC 方法名 (类型收窄)
 */
export interface RpcRequest<TMethod extends RpcMethodName = RpcMethodName> {
  requestId?: string; // 由前端生成，用于匹配异步响应
  type: TMethod;      // 方法名
  data?: unknown;     // 方法参数
  timeout?: number;   // 如果 > 0，则在超时后 reject promise
  version?: string;   // 协议版本，便于前后端兼容升级
}

/**
 * RPC 响应格式 (后端 → 前端)
 */
export interface RpcResponse<TData = unknown> {
  requestId?: string; // 匹配 request
  type?: string;      // 可选，用于 postMessage 识别
  data?: TData;       // 成功响应的数据
  error?: ErrorResponse; // 失败时填充错误信息（与 data 互斥）
}

/**
 * RPC 方法定义
 *
 * 格式: 'methodName': { request: {...}, response: {...} }
 */

/**
 * load() - 加载主文件资源
 * 加载当前编辑的文件 (file:// / mpq:// / w3x://)
 */
export interface LoadRequest {}

export interface LoadResponse {
  ext: string;          // 文件扩展名 (如 'blp', 'tga', 'mdx')
  buf: ArrayBuffer;     // 文件二进制数据
  size?: number;        // 文件大小 (字节)
}

/**
 * loadBlp(path: string) - 从 MPQ/W3X 加载 BLP 资源
 * 用于地图预览中加载贴图
 */
export interface LoadBlpRequest {
  path: string; // MPQ 内路径，如 "Textures\\Terrain\\Grass.blp"
}

export interface LoadBlpResponse {
  ext: string;
  buf: ArrayBuffer;
  size?: number;
}

/**
 * loadText(path: string) - 加载文本文件
 * 从工作区、MPQ 或 W3X 加载文本文件 (如 .w3i、.slk)
 */
export interface LoadTextRequest {
  path: string; // 文件路径
}

export interface LoadTextResponse {
  content: string; // 文本内容
  size?: number;
}

/**
 * loadTextArray(path: string) - 加载文本文件并按行分割
 */
export interface LoadTextArrayRequest {
  path: string;
}

export interface LoadTextArrayResponse {
  lines: string[];
  size?: number;
}

/**
 * loadResource(path: string) - 加载任意二进制资源
 * 通用资源加载方法，用于加载模型纹理、音频等
 */
export interface LoadResourceRequest {
  path: string;
}

export interface LoadResourceResponse {
  buf: ArrayBuffer;
  size?: number;
}

/**
 * 方法名称列表（用于类型收窄）
 */
export type RpcMethodName = 'load' | 'loadBlp' | 'loadText' | 'loadTextArray' | 'loadResource';

/**
 * RPC 方法路由表（方法签名映射）
 * 用于检查已注册的方法，替代 this[message.type] 动态访问
 */
export const RPC_METHOD_REGISTRY: Record<
  RpcMethodName,
  {
    request: { new(): unknown };
    response: { new(): unknown };
    description: string;
  }
> = {
  load: {
    request: class LoadRequest {},
    response: class LoadResponse {},
    description: '加载主文件资源 (file/mpq/w3x://)',
  },
  loadBlp: {
    request: class LoadBlpRequest {},
    response: class LoadBlpResponse {},
    description: '从 MPQ/W3X 加载 BLP 贴图',
  },
  loadText: {
    request: class LoadTextRequest {},
    response: class LoadTextResponse {},
    description: '加载文本文件',
  },
  loadTextArray: {
    request: class LoadTextArrayRequest {},
    response: class LoadTextArrayResponse {},
    description: '加载文本文件并按行分割',
  },
  loadResource: {
    request: class LoadResourceRequest {},
    response: class LoadResourceResponse {},
    description: '加载任意二进制资源',
  },
};

/**
 * 检查方法是否已注册
 * @param methodName 方法名
 * @returns 是否注册过
 */
export function isMethodRegistered(methodName: string): methodName is RpcMethodName {
  return methodName in RPC_METHOD_REGISTRY;
}

/**
 * 获取方法的描述
 * @param methodName 方法名
 * @returns 方法描述
 */
export function getMethodDescription(methodName: RpcMethodName): string {
  return RPC_METHOD_REGISTRY[methodName]?.description || '未知方法';
}

/**
 * 前端消息类型定义（Webview → Extension 通信）
 * 这些是前端主动发送给后端的消息
 */
export interface WebviewToExtensionMessage {
  requestId?: string;
  type: RpcMethodName | 'unknown';
  data?: unknown;
  timeout?: number;
}

/**
 * 后端消息类型定义（Extension → Webview 通信）
 * 这些是后端发送给前端的响应
 */
export interface ExtensionToWebviewMessage<TData = unknown> {
  requestId?: string;
  type?: 'response' | 'setActive' | 'error'; // 'setActive' 是 BasePreview 的旧消息类型
  data?: TData;
  error?: ErrorResponse;
  value?: unknown; // 向后兼容：旧系统使用 value 而不是 data
}

/**
 * 前端 Bridge 接口（Webview 内部使用）
 * 定义前端如何调用后端 RPC
 */
export interface IWebviewBridge {
  /**
   * 发起 RPC 调用
   * @param type 方法名
   * @param data 参数
   * @param timeout 超时时间 (ms)
   * @returns Promise<T> 响应数据
   */
  call<TResponse>(
    type: RpcMethodName,
    data?: unknown,
    timeout?: number,
  ): Promise<TResponse>;

  /**
   * 向后端发送一次性消息 (fire-and-forget)
   * @param event 事件名 (如 'size', 'zoom', 'reopen-as-text')
   * @param data 数据
   */
  emit(event: string, data?: unknown): void;
}

/**
 * 后端消息处理器接口
 * Message 类应实现此接口，方便类型检查
 */
export interface IMessageHandler {
  load(data?: unknown): Promise<LoadResponse>;
  loadBlp(data: LoadBlpRequest['path']): Promise<LoadBlpResponse>;
  loadText(data: LoadTextRequest['path']): Promise<LoadTextResponse>;
  loadTextArray(data: LoadTextArrayRequest['path']): Promise<LoadTextArrayResponse>;
  loadResource(data: LoadResourceRequest['path']): Promise<LoadResourceResponse>;
}

/**
 * 协议版本
 */
export const PROTOCOL_VERSION = '1.0.0';

/**
 * 默认超时时间 (ms)
 */
export const DEFAULT_RPC_TIMEOUT = 30000; // 30s
