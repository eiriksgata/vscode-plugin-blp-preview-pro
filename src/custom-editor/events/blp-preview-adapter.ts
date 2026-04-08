/**
 * BLP 预览适配层
 *
 * 提供类型化的事件处理接口，替代旧的动态转发
 */

import { BlpPreviewEvents, PreviewEventBus } from './preview-events';


/**
 * BlpPreview 的事件处理器接口
 */
export interface IBlpPreviewEventHandler {
  onSizeChange(event: BlpPreviewEvents.SizeEvent): void;
  onZoomChange(event: BlpPreviewEvents.ZoomEvent): void;
  onReopenAsText(event: BlpPreviewEvents.ReopenAsTextEvent): void;
}

/**
 * BlpPreview 事件派发器
 */
export class BlpPreviewDispatcher {
  private eventBus = new PreviewEventBus();

  registerHandlers(handlers: IBlpPreviewEventHandler) {
    const unsubscribeSize = this.eventBus.on<BlpPreviewEvents.SizeEvent>('size', (event) =>
      handlers.onSizeChange(event),
    );
    const unsubscribeZoom = this.eventBus.on<BlpPreviewEvents.ZoomEvent>('zoom', (event) =>
      handlers.onZoomChange(event),
    );
    const unsubscribeReopenAsText = this.eventBus.on<BlpPreviewEvents.ReopenAsTextEvent>(
      'reopen-as-text',
      (event) => handlers.onReopenAsText(event),
    );
    return { unsubscribeSize, unsubscribeZoom, unsubscribeReopenAsText };
  }

  dispatchSync(event: BlpPreviewEvents.Event): void {
    this.eventBus.emitSync(event);
  }

  static fromMessage(message: any): BlpPreviewEvents.Event | null {
    switch (message.type) {
      case 'size':
        return typeof message.value === 'string' ? { type: 'size', value: message.value } : null;
      case 'zoom':
        return typeof message.value === 'number' || message.value === 'fit'
          ? { type: 'zoom', value: message.value }
          : null;
      case 'reopen-as-text':
        return { type: 'reopen-as-text' };
    }
    return null;
  }
}

/**
 * BlpPreview 事件处理中间件
 */
export class BlpPreviewEventMiddleware {
  private dispatcher = new BlpPreviewDispatcher();

  handleMessage(message: any, handlers: IBlpPreviewEventHandler): void {
    const event = BlpPreviewDispatcher.fromMessage(message);
    if (event) {
      const unsubscribers = this.dispatcher.registerHandlers(handlers);
      try {
        this.dispatcher.dispatchSync(event);
      } finally {
        unsubscribers.unsubscribeSize();
        unsubscribers.unsubscribeZoom();
        unsubscribers.unsubscribeReopenAsText();
      }
    }
  }

  dispose(): void {}
}
