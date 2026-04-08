import * as vscode from 'vscode';
import { Disposable } from "../common/dispose";
import Message from '../common/message';
import MpqManager from '../mpq-manager';
import { BlpPreviewContext } from '../extension';
import { WebviewHtmlBuilder } from './runtime/webview-builder';
import { RuntimeContextSerializer, RuntimeContext } from './runtime/runtime-context';

export enum ViewState {
    disposed,
    visible,
    active,
}

function isMac(): boolean {
    if (typeof process === 'undefined') {
        return false;
    }
    return process.platform === 'darwin';
}

function escapeAttribute(value: string | vscode.Uri): string {
    return value.toString().replace(/"/g, '&quot;');
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 64; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


export default class BasePreview extends Disposable {
    protected readonly id: string = `${Date.now()}-${Math.random().toString()}`;

    protected _previewState = ViewState.visible;
    protected _imageBinarySize: number = 0;
    protected message: Message;
    protected nonce = getNonce();


    constructor(
        protected readonly extensionRoot: vscode.Uri,
        protected readonly resource: vscode.Uri,
        protected readonly webviewEditor: vscode.WebviewPanel,
        protected readonly ctx: BlpPreviewContext,
    ) {
        super();
        const resourceRoot = resource.with({
            path: resource.path.replace(/\/[^\/]+?\.\w+$/, '/'),
        });
        webviewEditor.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                resourceRoot,
                extensionRoot,
            ]
        };

        this.message = new Message(webviewEditor.webview, MpqManager.instance, resource, resourceRoot, ctx);

        this._register(webviewEditor.webview.onDidReceiveMessage(message => {
            this.onMessage(message);
        }));

        this._register(webviewEditor.onDidChangeViewState(() => {
            this.update();
            this.webviewEditor.webview.postMessage({ type: 'setActive', value: this.webviewEditor.active });
        }));

        this._register(webviewEditor.onDidDispose(() => {
            if (this._previewState === ViewState.active) {
                this.onDispose();
            }
            this._previewState = ViewState.disposed;
        }));

        const watcher = this._register(vscode.workspace.createFileSystemWatcher(resource.fsPath));
        this._register(watcher.onDidChange(e => {
            if (e.toString() === this.resource.toString()) {
                this.render();
            }
        }));
        this._register(watcher.onDidDelete(e => {
            if (e.toString() === this.resource.toString()) {
                this.webviewEditor.dispose();
            }
        }));

        this._register(this.message.onSizeChange(size => {
            this._imageBinarySize = size;
            this.update();
        }));

        this.render();
        this.update();
        this.webviewEditor.webview.postMessage({ type: 'setActive', value: this.webviewEditor.active });
    }

    getCssSource(): string[] {
        return [];
    }

    getJSSource(): string[] {
        return [];
    }

    getHTMLTempalte(): string {
        return '';
    }

    onMessage(message: any) {
        this.message?.onMessage(message);
    }

    onActive() {

    }

    onVisible() {

    }

    onDispose() {

    }

    update() {
        if (this._previewState === ViewState.disposed) {
            return;
        }

        if (this.webviewEditor.active) {
            this._previewState = ViewState.active;
            this.onActive();
        } else {
            if (this._previewState === ViewState.active) {
                this.onVisible();
            }
            this._previewState = ViewState.visible;
        }
    }

    private async getWebviewContents() {
        // 步骤1: 创建运行时上下文
        const context: RuntimeContext = RuntimeContextSerializer.createDefault(this.resource);
        
        // 步骤2: 获取预览类型定义的 CSS 和 JS 源
        const cssSources = this.getCssSource();
        const jsSources = this.getJSSource();
        const htmlTemplate = this.getHTMLTempalte();

        // 步骤3: 创建 HTML 构建器
        const builder = new WebviewHtmlBuilder({
            nonce: this.nonce,
            cspSource: this.webviewEditor.webview.cspSource,
            extensionRoot: this.extensionRoot,
            debug: false,
        });

        // 步骤4: 生成 CSS 链接
        const cssLinks = cssSources.length > 0 
            ? builder.buildCSSLinks(cssSources, this.webviewEditor.webview)
            : '';

        // 步骤5: 生成 Bootstrap 脚本
        const bootstrapScript = builder.buildBootstrapScript(this.resource);

        // 步骤6: 生成 JS 脚本标签
        const jsScripts = jsSources.length > 0
            ? builder.buildScriptTags(jsSources, this.webviewEditor.webview)
            : '';

        // 步骤7: 组合为 HtmlFragment
        const fragment = {
            css: cssLinks,
            html: htmlTemplate,
            js: bootstrapScript + '\n        ' + jsScripts,
        };

        // 步骤8: 构建完整 HTML
        return builder.build(fragment);
    }

    private extensionResource(path: string) {
        return this.webviewEditor.webview.asWebviewUri(this.extensionRoot.with({
            path: this.extensionRoot.path + path
        }));
    }

    private async render() {
        if (this._previewState !== ViewState.disposed) {
            this.webviewEditor.webview.html = await this.getWebviewContents();
        }
    }
}