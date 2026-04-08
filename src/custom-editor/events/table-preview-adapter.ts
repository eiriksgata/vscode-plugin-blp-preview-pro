/**
 * 表格预览适配层（SLK文件）
 */

import { TablePreviewEvents, PreviewEventBus } from '../events/preview-events';

export interface ITablePreviewEventHandler {
  onCellChange(event: TablePreviewEvents.CellChangeEvent): void;
  onSearch(event: TablePreviewEvents.SearchEvent): void;
}

export class TablePreviewDispatcher {
  private eventBus = new PreviewEventBus();

  registerHandlers(handlers: ITablePreviewEventHandler): {
    unsubscribeCellChange: () => void;
    unsubscribeSearch: () => void;
  } {
    const unsubscribeCellChange = this.eventBus.on<TablePreviewEvents.CellChangeEvent>(
      'cell-change',
      (event) => handlers.onCellChange(event),
    );

    const unsubscribeSearch = this.eventBus.on<TablePreviewEvents.SearchEvent>('search', (event) =>
      handlers.onSearch(event),
    );

    return { unsubscribeCellChange, unsubscribeSearch };
  }

  async dispatch(event: TablePreviewEvents.Event): Promise<void> {
    await this.eventBus.emit(event);
  }

  static fromMessage(message: any): TablePreviewEvents.Event | null {
    switch (message.type) {
      case 'cell-change':
        return {
          type: 'cell-change',
          row: message.row || 0,
          col: message.col || 0,
          value: message.value || '',
        };
      case 'search':
        return {
          type: 'search',
          query: message.query || '',
        };
    }
    return null;
  }
}

export class TablePreviewEventMiddleware {
  private dispatcher = new TablePreviewDispatcher();

  async handleMessage(message: any, handlers: ITablePreviewEventHandler): Promise<void> {
    const event = TablePreviewDispatcher.fromMessage(message);
    if (event) {
      const unsubscribers = this.dispatcher.registerHandlers(handlers);
      try {
        await this.dispatcher.dispatch(event);
      } finally {
        unsubscribers.unsubscribeCellChange();
        unsubscribers.unsubscribeSearch();
      }
    }
  }

  dispose(): void {}
}
