/**
 * 音频预览适配层
 */

import { AudioPreviewEvents, PreviewEventBus } from '../events/preview-events';

/**
 * 音频预览的事件处理器接口
 */
export interface IAudioPreviewEventHandler {
  /**
   * 处理元数据改变事件
   */
  onMetadataChange(event: AudioPreviewEvents.MetadataChangeEvent): void;
}

/**
 * 音频预览事件派发器
 */
export class AudioPreviewDispatcher {
  private eventBus = new PreviewEventBus();

  /**
   * 注册事件处理器
   */
  registerHandlers(handlers: IAudioPreviewEventHandler): {
    unsubscribeMetadataChange: () => void;
  } {
    const unsubscribeMetadataChange = this.eventBus.on<AudioPreviewEvents.MetadataChangeEvent>(
      'metadata-change',
      (event) => handlers.onMetadataChange(event),
    );

    return {
      unsubscribeMetadataChange,
    };
  }

  /**
   * 派发事件
   */
  async dispatch(event: AudioPreviewEvents.Event): Promise<void> {
    await this.eventBus.emit(event);
  }

  /**
   * 从消息转换为类型化事件
   */
  static fromMessage(message: any): AudioPreviewEvents.Event | null {
    switch (message.type) {
      case 'metadata-change':
        return {
          type: 'metadata-change',
          data: message.data || {},
        };
    }

    return null;
  }
}

/**
 * 音频预览事件处理中间件
 */
export class AudioPreviewEventMiddleware {
  private dispatcher = new AudioPreviewDispatcher();

  /**
   * 处理来自 Webview 的消息
   */
  async handleMessage(message: any, handlers: IAudioPreviewEventHandler): Promise<void> {
    const event = AudioPreviewDispatcher.fromMessage(message);
    if (event) {
      const unsubscribers = this.dispatcher.registerHandlers(handlers);
      try {
        await this.dispatcher.dispatch(event);
      } finally {
        unsubscribers.unsubscribeMetadataChange();
      }
    } else {
      console.warn('[AudioPreviewEventMiddleware] Unknown event type:', message.type);
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // 清理事件总线
  }
}
