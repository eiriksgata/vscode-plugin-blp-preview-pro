/**
 * 3D 模型预览适配层
 */

import { ModelPreviewEvents, PreviewEventBus } from '../events/preview-events';

export interface IModelPreviewEventHandler {
  onCameraChange(event: ModelPreviewEvents.CameraChangeEvent): void;
  onAnimationChange(event: ModelPreviewEvents.AnimationEvent): void;
}

export class ModelPreviewDispatcher {
  private eventBus = new PreviewEventBus();

  registerHandlers(handlers: IModelPreviewEventHandler): {
    unsubscribeCamera: () => void;
    unsubscribeAnimation: () => void;
  } {
    const unsubscribeCamera = this.eventBus.on<ModelPreviewEvents.CameraChangeEvent>(
      'camera-change',
      (event) => handlers.onCameraChange(event),
    );

    const unsubscribeAnimation = this.eventBus.on<ModelPreviewEvents.AnimationEvent>(
      'animation',
      (event) => handlers.onAnimationChange(event),
    );

    return { unsubscribeCamera, unsubscribeAnimation };
  }

  async dispatch(event: ModelPreviewEvents.Event): Promise<void> {
    await this.eventBus.emit(event);
  }

  static fromMessage(message: any): ModelPreviewEvents.Event | null {
    switch (message.type) {
      case 'camera-change':
        return {
          type: 'camera-change',
          data: message.data || {},
        };
      case 'animation':
        return {
          type: 'animation',
          data: message.data || { animationName: '', playing: false },
        };
    }
    return null;
  }
}

export class ModelPreviewEventMiddleware {
  private dispatcher = new ModelPreviewDispatcher();

  async handleMessage(message: any, handlers: IModelPreviewEventHandler): Promise<void> {
    const event = ModelPreviewDispatcher.fromMessage(message);
    if (event) {
      const unsubscribers = this.dispatcher.registerHandlers(handlers);
      try {
        await this.dispatcher.dispatch(event);
      } finally {
        unsubscribers.unsubscribeCamera();
        unsubscribers.unsubscribeAnimation();
      }
    }
  }

  dispose(): void {}
}
