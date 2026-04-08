/**
 * Webview Bootstrap 引导层
 *
 * 目的:
 * 1. 提供统一的 window.__blpBridge 全局入口点
 * 2. 为旧脚本提供兼容别名 (window.message, window.vscode, window.currentResourceURI)
 * 3. 管理脚本和资源的加载顺序，确保依赖关系满足
 * 4. 处理消息通信的初始化 (message._trans, addEventListener)
 *
 * 加载顺序:
 * 1. HTML 标签插入 <script>bootstrap.js</script> (此文件)
 * 2. bootstrap 初始化全局对象，设置兼容别名
 * 3. 其他脚本加载 (message.js, previewTypeScript.js)，使用别名访问
 * 4. 预览类型脚本通过 window.__blpBridge 调用 RPC
 */

/**
 * Webview 到 Extension 的异步通信桥接
 */
interface IWebviewBridge {
  /**
   * 发起 RPC 调用
   * @param type 方法名 ('load', 'loadBlp', 'loadText', 'loadTextArray', 'loadResource')
   * @param data 参数
   * @param timeout 超时时间 (ms)
   * @returns Promise<any>
   */
  call<T = any>(type: string, data?: any, timeout?: number): Promise<T>;

  /**
   * 向后端发送事件（如 'size', 'zoom', 'reopen-as-text'）
   * @param event 事件名
   * @param data 数据
   */
  emit(event: string, data?: any): void;

  /**
   * 获取当前资源 URI (兼容别名: window.currentResourceURI)
   */
  getResourceUri(): string;

  /**
   * 获取 VS Code API (兼容别名: window.vscode)
   */
  getVscodeApi(): any;
}

/**
 * Bridge 实现
 */
class WebviewBridge implements IWebviewBridge {
  private requestCounter = 0;
  private pendingRequests = new Map<string, { resolve: any; reject: any; timer?: NodeJS.Timeout }>();

  constructor(
    private resourceUri: string,
    private vscodeApi: any,
  ) {
    // 监听来自 Extension 的响应消息
    window.addEventListener('message', (event) => {
      const message = event.data;
      const { requestId, data, error } = message;

      if (requestId && this.pendingRequests.has(requestId)) {
        const pending = this.pendingRequests.get(requestId)!;
        this.pendingRequests.delete(requestId);

        // 清除超时计时器
        if (pending.timer) {
          clearTimeout(pending.timer);
        }

        // 处理响应
        if (error) {
          pending.reject(new Error(`${error.code}: ${error.message}`));
        } else {
          pending.resolve(data);
        }
      }
    });
  }

  /**
   * 发起 RPC 调用
   */
  async call<T = any>(type: string, data?: any, timeout?: number): Promise<T> {
    const requestId = `req-${++this.requestCounter}-${Date.now()}`;

    return new Promise((resolve, reject) => {
      const pending: any = {
        resolve,
        reject,
      };

      // 如果指定了超时时间，设置计时器
      if (timeout && timeout > 0) {
        pending.timer = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error(`RPC timeout after ${timeout}ms`));
        }, timeout);
      }

      this.pendingRequests.set(requestId, pending);

      // 发送请求到 Extension
      this.vscodeApi.postMessage({
        requestId,
        type,
        data,
        timeout,
      });
    });
  }

  /**
   * 发送事件
   */
  emit(event: string, data?: any): void {
    this.vscodeApi.postMessage({
      type: event,
      value: data, // 保留旧字段名称以兼容
    });
  }

  getResourceUri(): string {
    return this.resourceUri;
  }

  getVscodeApi(): any {
    return this.vscodeApi;
  }
}

/**
 * 全局 Bridge 实例
 */
declare global {
  interface Window {
    __blpBridge: IWebviewBridge; // 新的统一入口

    // 以下是兼容别名，新代码应使用 __blpBridge 替代
    currentResourceURI?: string;
    vscode?: any;
    message?: any;
    module?: any;
  }
}

/**
 * 初始化 Bootstrap
 * 由 BasePreview.getWebviewContents() 在 HTML 中调用
 *
 * 参数来自 HTML <script> 标签:
 * ```html
 * <script>
 *   const __BLP_BOOTSTRAP_DATA = {
 *     resourceUri: "file:///path/to/file.blp",
 *     vscodeApi: ...,
 *     // 其他初始化数据
 *   };
 * </script>
 * <script src="bootstrap.js"></script>
 * ```
 */
export function initializeBootstrap(bootstrapData: {
  resourceUri: string;
  vscodeApi: any;
  debug?: boolean;
}): IWebviewBridge {
  const { resourceUri, vscodeApi, debug } = bootstrapData;

  if (debug) {
    console.log('[BLP Bootstrap] Initializing with:', { resourceUri });
  }

  // 1. 创建 Bridge 实例
  const bridge = new WebviewBridge(resourceUri, vscodeApi);

  // 2. 暴露到全局作用域
  window.__blpBridge = bridge;

  // 3. 设置向后兼容别名
  // 旧代码可能通过 window.message._trans() 调用
  // 我们提供一个兼容实现
  window.message = {
    _trans: (type: string, data?: any, timeout?: number) =>
      bridge.call(type, data, timeout),
  };

  // 旧代码可能访问 window.vscode
  window.vscode = vscodeApi;

  // 旧代码可能访问 window.currentResourceURI
  window.currentResourceURI = resourceUri;

  // 兼容 CommonJS require()
  // 如果旧脚本中存在对 module.exports 的引用
  if (typeof window.module === 'undefined') {
    (window as any).module = {
      exports: {},
    };
  }

  if (debug) {
    console.log('[BLP Bootstrap] Initialization complete');
    console.log('[BLP Bootstrap] Available at: window.__blpBridge');
    console.log('[BLP Bootstrap] Aliases: window.message, window.vscode, window.currentResourceURI');
  }

  return bridge;
}

/**
 * 自动引导（如果在 HTML 中通过 <script src="bootstrap.js"> 直接调用）
 * 从注入的全局数据读取 bootstrapData 并初始化
 */
if (typeof (window as any).__BLP_BOOTSTRAP_DATA !== 'undefined') {
  initializeBootstrap((window as any).__BLP_BOOTSTRAP_DATA);
}

export default initializeBootstrap;
