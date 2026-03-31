/**
 * Enhanced Base Preview Class
 * 
 * Provides common functionality for all custom editor previews with better
 * lifecycle management, error handling, and performance monitoring.
 */

import * as vscode from 'vscode';
import { Logger, PerformanceMonitor } from '@common/logger';
import { ErrorHandler } from '@common/error-handler';
import type { PreviewOptions, IDisposable } from '@common/types';

/**
 * Enhanced base preview class
 */
export abstract class EnhancedBasePreview implements IDisposable {
  protected disposables: vscode.Disposable[] = [];
  protected isLoading = false;
  protected disposed = false;
  protected performanceId?: string;

  constructor(
    protected webviewPanel: vscode.WebviewPanel,
    protected extensionPath: string,
    protected options?: PreviewOptions
  ) {
    this.setupWebviewHandlers();
    this.setupLifecycleHandlers();
  }

  /**
   * Setup webview message handlers
   */
  protected setupWebviewHandlers(): void {
    this.webviewPanel.webview.onDidReceiveMessage(
      (message) => this.handleWebviewMessage(message),
      this,
      this.disposables
    );
  }

  /**
   * Setup lifecycle handlers
   */
  protected setupLifecycleHandlers(): void {
    this.webviewPanel.onDidDispose(
      () => this.dispose(),
      this,
      this.disposables
    );

    this.webviewPanel.onDidChangeViewState(
      ({ webviewPanel }) => this.onViewStateChanged(webviewPanel.visible),
      this,
      this.disposables
    );
  }

  /**
   * Handle messages from webview
   */
  protected async handleWebviewMessage(message: { type: string; payload?: unknown }): Promise<void> {
    Logger.debug(`Message from webview: ${message.type}`, message.payload);

    try {
      switch (message.type) {
        case 'ready':
          await this.onWebviewReady();
          break;
        case 'error':
          this.onWebviewError(message.payload as Error);
          break;
        default:
          await this.onCustomMessage(message.type, message.payload);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error(`Error handling webview message: ${message.type}`, err);
      ErrorHandler.handle(err, false);
    }
  }

  /**
   * Called when webview signals it's ready
   */
  protected async onWebviewReady(): Promise<void> {
    Logger.info('Webview ready');
    await this.loadContent();
  }

  /**
   * Called when webview reports an error
   */
  protected onWebviewError(error: Error | unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    Logger.error('Webview error', err);
    ErrorHandler.handle(err, true);
  }

  /**
   * Handle custom messages from webview
   */
  protected async onCustomMessage(type: string, _payload: unknown): Promise<void> {
    Logger.debug(`Custom message not handled: ${type}`);
  }

  /**
   * Called when view visibility changes
   */
  protected onViewStateChanged(visible: boolean): void {
    if (visible) {
      Logger.debug('Preview became visible');
      this.onBecomeVisible();
    } else {
      Logger.debug('Preview became hidden');
      this.onBecomeHidden();
    }
  }

  /**
   * Called when preview becomes visible
   */
  protected onBecomeVisible(): void {
    // Override in subclasses
  }

  /**
   * Called when preview becomes hidden
   */
  protected onBecomeHidden(): void {
    // Override in subclasses
  }

  /**
   * Load preview content
   */
  protected async loadContent(): Promise<void> {
    if (this.isLoading) {
      return;
    }

    const perfId = PerformanceMonitor.start('loadContent');
    this.isLoading = true;

    try {
      this.performanceId = perfId;
      Logger.debug('Loading preview content');
      await this.onLoadContent();
      PerformanceMonitor.end(perfId, true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      PerformanceMonitor.end(perfId, false);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Abstract method for loading content
   */
  protected abstract onLoadContent(): Promise<void>;

  /**
   * Send message to webview
   */
  protected sendWebviewMessage(type: string, payload?: unknown): void {
    if (this.disposed) {
      Logger.warn('Cannot send message to disposed webview');
      return;
    }

    try {
      this.webviewPanel.webview.postMessage({ type, payload });
    } catch (error) {
      Logger.error('Failed to send webview message', error as Error);
    }
  }

  /**
   * Update webview HTML
   */
  protected setWebviewContent(html: string): void {
    try {
      this.webviewPanel.webview.html = html;
    } catch (error) {
      Logger.error('Failed to set webview content', error as Error);
    }
  }

  /**
   * Get resource URI
   */
  protected getResourceUri(...pathSegments: string[]): vscode.Uri {
    return vscode.Uri.joinPath(
      vscode.Uri.file(this.extensionPath),
      ...pathSegments
    );
  }

  /**
   * Get webview resource URI
   */
  protected getWebviewResourceUri(...pathSegments: string[]): vscode.Uri {
    return this.webviewPanel.webview.asWebviewUri(
      this.getResourceUri(...pathSegments)
    );
  }

  /**
   * Add disposable
   */
  protected addDisposable(disposable: vscode.Disposable): void {
    this.disposables.push(disposable);
  }

  /**
   * Check if disposed
   */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    Logger.debug('Disposing preview');

    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];

    this.disposed = true;
  }

  /**
   * Abstract method to get display name
   */
  abstract getDisplayName(): string;

  /**
   * Abstract method to get file type
   */
  abstract getFileType(): string;
}

/**
 * Preview state management
 */
export class PreviewState {
  private static states: Map<string, Record<string, unknown>> = new Map();

  static setState(key: string, state: Record<string, unknown>): void {
    this.states.set(key, state);
  }

  static getState(key: string): Record<string, unknown> | undefined {
    return this.states.get(key);
  }

  static deleteState(key: string): void {
    this.states.delete(key);
  }

  static clearStates(): void {
    this.states.clear();
  }
}
