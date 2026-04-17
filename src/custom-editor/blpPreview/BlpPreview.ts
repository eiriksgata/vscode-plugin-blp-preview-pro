import * as vscode from 'vscode';
import BasePreview from "../BasePreview";
import htmlTemplate from './index.html';
import { BlpPreviewEventMiddleware } from '../events/blp-preview-adapter';
import { BlpPreviewEvents } from '../events/preview-events';

export default class BlpPreview extends BasePreview {

    protected imageSize: string | undefined;
    protected imageZoom: number | 'fit' = 'fit';
    private eventMiddleware: BlpPreviewEventMiddleware;
 constructor(
        extensionRoot: vscode.Uri,
        resource: vscode.Uri,
        webviewEditor: vscode.WebviewPanel,
        ctx: any // BlpPreviewContext - avoid circular import
    ) {
        super(extensionRoot, resource, webviewEditor, ctx);
        this.eventMiddleware = new BlpPreviewEventMiddleware();
    }

    getCssSource(): string[] {
        return [
            '/media/blpPreview.css',
        ];
    }

    getJSSource(): string[] {
        return [
            '/media/lib/jpgDecoder.js',
            '/media/lib/blp2.js',
            '/media/lib/binReader.js',
            '/media/lib/tga.js',
            '/media/message.js',
            '/media/blpPreview.js',
        ];
    }

    getHTMLTempalte(): string {
        return htmlTemplate;
    }

    onMessage(message: { type?: string; value?: unknown; requestId?: number | string }): void {
        // Only RPC-style messages are handled by BasePreview/Message.
        if (typeof message.requestId !== 'undefined') {
            super.onMessage(message);
        }
        this.eventMiddleware.handleMessage(message, {
            onSizeChange: (event: BlpPreviewEvents.SizeEvent) => {
                this.imageSize = event.value;
                this.update();
            },
            onZoomChange: (event: BlpPreviewEvents.ZoomEvent) => {
                this.imageZoom = event.value;
                this.update();
            },
            onReopenAsText: (event: BlpPreviewEvents.ReopenAsTextEvent) => {
                vscode.commands.executeCommand('vscode.openWith', this.resource, 'default', this.webviewEditor.viewColumn);
            }
        });
    }

    onActive(): void {
        this.ctx.sizeStatusBarEntry.show(this.id, this.imageSize || '');
        this.ctx.binarySizeStatusBarEntry.show(this.id, this._imageBinarySize);
        this.ctx.zoomStatusBarEntry.show(this.id, this.imageZoom || 'fit');
    }

    onVisible(): void {
        this.ctx.sizeStatusBarEntry.hide(this.id);
        this.ctx.binarySizeStatusBarEntry.hide(this.id);
        this.ctx.zoomStatusBarEntry.hide(this.id);
    }

    onDispose(): void {
        this.ctx.sizeStatusBarEntry.hide(this.id);
        this.ctx.binarySizeStatusBarEntry.hide(this.id);
        this.ctx.zoomStatusBarEntry.hide(this.id);
    }
}
