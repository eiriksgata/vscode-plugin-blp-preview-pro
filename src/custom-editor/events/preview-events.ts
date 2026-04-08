/**
 * 预览事件类型定义
 * 定义所有预览类型支持的事件及其数据格式
 */

/**
 * BLP/TGA 预览事件
 */
export namespace BlpPreviewEvents {
  export interface SizeEvent {
    type: 'size';
    value: string;
  }

  export interface ZoomEvent {
    type: 'zoom';
    value: number | 'fit';
  }

  export interface ReopenAsTextEvent {
    type: 'reopen-as-text';
  }

  export type Event = SizeEvent | ZoomEvent | ReopenAsTextEvent;
}

/**
 * 音频预览事件
 */
export namespace AudioPreviewEvents {
  export interface MetadataChangeEvent {
    type: 'metadata-change';
    data: {
      duration?: number;
      currentTime?: number;
    };
  }

  export type Event = MetadataChangeEvent;
}

/**
 * 3D 模型预览事件
 */
export namespace ModelPreviewEvents {
  export interface CameraChangeEvent {
    type: 'camera-change';
    data: {
      position?: [number, number, number];
      target?: [number, number, number];
    };
  }

  export interface AnimationEvent {
    type: 'animation';
    data: {
      animationName: string;
      playing: boolean;
    };
  }

  export type Event = CameraChangeEvent | AnimationEvent;
}

/**
 * 地图预览事件
 */
export namespace MapPreviewEvents {
  export interface LoadedEvent {
    type: 'loaded';
    data: any;
  }

  export interface SelectionChangeEvent {
    type: 'selection-change';
    data: {
      selectedObjects: Array<{
        id: string;
        type: 'unit' | 'doodad' | 'terrain';
        position?: [number, number];
      }>;
    };
  }

  export type Event = LoadedEvent | SelectionChangeEvent;
}

/**
 * 表格预览事件
 */
export namespace TablePreviewEvents {
  export interface CellChangeEvent {
    type: 'cell-change';
    row: number;
    col: number;
    value: string;
  }

  export interface SearchEvent {
    type: 'search';
    query: string;
  }

  export type Event = CellChangeEvent | SearchEvent;
}

/**
 * 统一的预览事件类型
 */
export type PreviewEvent =
  | BlpPreviewEvents.Event
  | AudioPreviewEvents.Event
  | ModelPreviewEvents.Event
  | MapPreviewEvents.Event
  | TablePreviewEvents.Event;

/**
 * 事件处理器签名
 */
export type EventHandler<T extends PreviewEvent = PreviewEvent> = (event: T) => void | Promise<void>;

/**
 * 预览事件总线
 */
export class PreviewEventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on<T extends PreviewEvent>(eventType: T['type'], handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);
    return () => {
      this.handlers.get(eventType)?.delete(handler as EventHandler);
    };
  }

  async emit(event: PreviewEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error handling event ${event.type}:`, error);
      }
    }
  }

  emitSync(event: PreviewEvent): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error handling event ${event.type}:`, error);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
