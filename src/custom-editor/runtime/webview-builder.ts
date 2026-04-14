/**
 * Webview HTML 构建器
 *
 * 职责:
 * 1. 管理 CSP 头和 nonce
 * 2. 生成 HTML 框架
 * 3. 组织 CSS 和 JS 加载
 */

import * as vscode from 'vscode';

/**
 * HTML 构建选项
 */
export interface WebviewHtmlBuilderOptions {
  /** Webview 安全码（nonce） */
  nonce: string;

  /** CSP 来源 */
  cspSource: string;

  /** 扩展根 URI */
  extensionRoot: vscode.Uri;

  /** 是否启用调试模式 */
  debug?: boolean;

  /** 自定义 meta 标签（在 head 中） */
  metaTags?: string[];

  /** 自定义样式（在 head 中） */
  customStyles?: string;

  /** 自定义脚本（在 body 末尾） */
  customScripts?: string;
}

/**
 * HTML 片段
 */
export interface HtmlFragment {
  css: string;
  js: string;
  html: string;
}

/**
 * WebviewHtmlBuilder 类
 */
export class WebviewHtmlBuilder {
  private nonce: string;
  private cspSource: string;
  private extensionRoot: vscode.Uri;
  private debug: boolean = false;
  private metaTags: string[] = [];
  private customStyles: string = '';
  private customScripts: string = '';

  constructor(options: WebviewHtmlBuilderOptions) {
    this.nonce = options.nonce;
    this.cspSource = options.cspSource;
    this.extensionRoot = options.extensionRoot;
    this.debug = options.debug || false;
    this.metaTags = options.metaTags || [];
    this.customStyles = options.customStyles || '';
    this.customScripts = options.customScripts || '';
  }

  /**
   * 构建完整的 HTML
   */
  build(fragment: HtmlFragment): string {
    const head = this.buildHead(fragment.css);
    const body = this.buildBody(fragment.html, fragment.js);

    return `<!DOCTYPE html>
<html lang="en">
${head}
${body}
</html>`;
  }

  /**
   * 构建 <head> 部分
   */
  private buildHead(css: string): string {
    const cspContent = this.buildCspContent();

    return `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
    <title>Preview</title>
    ${this.buildMetaTags()}
    <meta http-equiv="Content-Security-Policy" content="${cspContent}">
    ${css}
    ${this.customStyles ? `<style nonce="${this.nonce}">${this.customStyles}</style>` : ''}
</head>`;
  }

  /**
   * 构建 <body> 部分
   */
  private buildBody(html: string, js: string): string {
    return `<body class="container image scale-to-fit loading">
    ${html}
    ${js}
    ${this.customScripts}
</body>`;
  }

  /**
   * 生成 CSP 内容策略字符串
   */
  private buildCspContent(): string {
    return `default-src 'none'; connect-src ${this.cspSource}; media-src * blob:; img-src data: ${this.cspSource}; script-src 'nonce-${this.nonce}'; style-src ${this.cspSource} 'nonce-${this.nonce}'`;
  }

  /**
   * 生成 meta 标签
   */
  private buildMetaTags(): string {
    const tags = this.metaTags
      .map((tag) => `    ${tag}`)
      .join('\n');
    return tags ? tags + '\n' : '';
  }

  /**
   * 逃逸 HTML 属性值
   */
  escapeAttribute(value: string | vscode.Uri): string {
    return value.toString().replace(/"/g, '&quot;');
  }

  /**
   * 获取扩展资源的 URI
   */
  extensionResource(path: string): vscode.Uri {
    return this.webview.asWebviewUri(
      this.extensionRoot.with({
        path: this.extensionRoot.path + path,
      }),
    );
  }

  /**
   * （虚拟）获取 webview 实例
   * 注意：实际使用时需要通过构造函数注入
   */
  private get webview(): any {
    throw new Error('webview 必须通过构造函数注入');
  }

  /**
   * 生成 CSS 链接标签
   */
  buildCSSLinks(cssSources: string[], webview: vscode.Webview): string {
    return cssSources
      .map((source) => {
        const uri = webview.asWebviewUri(
          this.extensionRoot.with({
            path: this.extensionRoot.path + source,
          }),
        );
        return `<link rel="stylesheet" href="${this.escapeAttribute(uri)}" type="text/css" media="screen" nonce="${this.nonce}">`;
      })
      .join('\n        ');
  }

  /**
   * 生成 JS 脚本标签
   */
  buildScriptTags(jsSources: string[], webview: vscode.Webview): string {
    return jsSources
      .map((source) => {
        const uri = webview.asWebviewUri(
          this.extensionRoot.with({
            path: this.extensionRoot.path + source,
          }),
        );
        return `<script src="${this.escapeAttribute(uri)}" nonce="${this.nonce}"></script>`;
      })
      .join('\n        ');
  }

  /**
   * 生成内联 Bootstrap 脚本
   */
  buildBootstrapScript(resourceUri: vscode.Uri): string {
    return `<script type="text/javascript" nonce="${this.nonce}">
        (function() {
            const vscodeApi = acquireVsCodeApi();
            const resourceUri = ${JSON.stringify(resourceUri)};

            let requestCounter = 0;
            const pendingRequests = new Map();

            const bridge = {
                call(type, data, timeout) {
                    return new Promise((resolve, reject) => {
                        const requestId = \`req-\${++requestCounter}-\${Date.now()}\`;
                        const pending = { resolve, reject };

                        if (timeout && timeout > 0) {
                            pending.timer = setTimeout(() => {
                                pendingRequests.delete(requestId);
                                reject(new Error(\`RPC timeout after \${timeout}ms\`));
                            }, timeout);
                        }

                        pendingRequests.set(requestId, pending);
                        vscodeApi.postMessage({ requestId, type, data, timeout });
                    });
                },

                emit(event, data) {
                    vscodeApi.postMessage({ type: event, value: data });
                },

                getResourceUri() {
                    return resourceUri;
                },

                getVscodeApi() {
                    return vscodeApi;
                },
            };

            window.addEventListener('message', (event) => {
                const message = event.data;
                const { requestId, data, error } = message;

                if (requestId && pendingRequests.has(requestId)) {
                    const pending = pendingRequests.get(requestId);
                    pendingRequests.delete(requestId);

                    if (pending.timer) {
                        clearTimeout(pending.timer);
                    }

                    if (error) {
                        pending.reject(new Error(\`\${error.code}: \${error.message}\`));
                    } else {
                        pending.resolve(data);
                    }
                }
            });

            window.__blpBridge = bridge;
            window.message = {
                _trans(type, data, timeout) {
                    return bridge.call(type, data, timeout);
                },
            };
            window.vscode = vscodeApi;
            window.currentResourceURI = resourceUri;

            if (typeof window.module === 'undefined') {
                window.module = { exports: {} };
            }
        })();
    </script>`;
  }
}
