import * as vscode from 'vscode';
import BasePreview from "../BasePreview";
import htmlTemplate from './index.html';

export default class BlpPreview extends BasePreview {

    protected imageSize: string | undefined;
    protected imageZoom: number | 'fit' = 'fit';

    getCssSource(): string[] {
        return [
            '/media/blpPreviewPro.css',
        ];
    }

    getJSSource(): string[] {
        return [
            '/media/lib/jpgDecoder.js',
            '/media/lib/blp2.js',
            '/media/lib/binReader.js',
            '/media/lib/tga.js',
            '/media/message.js',
            '/media/blpPreviewPro.js',
        ];
    }

    getHTMLTempalte(): string {
        return htmlTemplate;
    }

    onMessage(message: { type?: string; value?: unknown }): void {
        super.onMessage(message);
        switch (message.type) {
            case 'size':
                {
                    this.imageSize = typeof message.value === 'string' ? message.value : '';
                    this.update();
                    break;
                }
            case 'zoom':
                {
                    this.imageZoom = message.value === 'fit' || typeof message.value === 'number'
                        ? message.value
                        : 'fit';
                    this.update();
                    break;
                }

            case 'reopen-as-text':
                {
                    vscode.commands.executeCommand('vscode.openWith', this.resource, 'default', this.webviewEditor.viewColumn);
                    break;
                }
        }
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
