/**
 * 地图预览适配层
 */

import { MapPreviewEvents, PreviewEventBus } from '../events/preview-events';

export interface IMapPreviewEventHandler {
  onLoaded(event: MapPreviewEvents.LoadedEvent): void;
  onSelectionChange(event: MapPreviewEvents.SelectionChangeEvent): void;
}

export class MapPreviewDispatcher {
  private eventBus = new PreviewEventBus();

  registerHandlers(handlers: IMapPreviewEventHandler): {
    unsubscribeLoaded: () => void;
    unsubscribeSelectionChange: () => void;
  } {
    const unsubscribeLoaded = this.eventBus.on<MapPreviewEvents.LoadedEvent>('loaded', (event) =>
      handlers.onLoaded(event),
    );

    const unsubscribeSelectionChange = this.eventBus.on<MapPreviewEvents.SelectionChangeEvent>(
      'selection-change',
      (event) => handlers.onSelectionChange(event),
    );

    return { unsubscribeLoaded, unsubscribeSelectionChange };
  }

  async dispatch(event: MapPreviewEvents.Event): Promise<void> {
    await this.eventBus.emit(event);
  }

  static fromMessage(message: any): MapPreviewEvents.Event | null {
    switch (message.type) {
      case 'loaded':
        return {
          type: 'loaded',
          data: message.data || {},
        };
      case 'selection-change':
        return {
          type: 'selection-change',
          data: message.data || { selectedObjects: [] },
        };
    }
    return null;
  }
}

export class MapPreviewEventMiddleware {
  private dispatcher = new MapPreviewDispatcher();

  async handleMessage(message: any, handlers: IMapPreviewEventHandler): Promise<void> {
    const event = MapPreviewDispatcher.fromMessage(message);
    if (event) {
      const unsubscribers = this.dispatcher.registerHandlers(handlers);
      try {
        await this.dispatcher.dispatch(event);
      } finally {
        unsubscribers.unsubscribeLoaded();
        unsubscribers.unsubscribeSelectionChange();
      }
    }
  }

  dispose(): void {}
}
