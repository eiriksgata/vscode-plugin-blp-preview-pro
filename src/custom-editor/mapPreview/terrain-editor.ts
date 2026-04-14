import War3MapW3e from './w3x-reader/w3e/w3e';
import { TerrainPicker } from './picker';

/** 保存回调：接收序列化后的地形 buffer，返回是否成功 */
export type SaveW3EHandler = (buffer: ArrayBuffer) => Promise<{ success: boolean; message?: string }>;

type HeightBrushMode = 'raise' | 'lower' | 'smooth' | 'flatten';
type EditorMode = 'terrain' | 'cliff' | 'water' | 'props';

interface CornerState {
  groundHeight: number;
  waterHeight: number;
  groundTexture: number;
  groundVariation: number;
  cliffTexture: number;
  cliffVariation: number;
  layerHeight: number;
  flags: number;
}

interface CornerChange {
  column: number;
  row: number;
  before: CornerState;
  after: CornerState;
}

interface EditAction {
  changes: CornerChange[];
  timestamp: number;
}

interface HoveredCorner {
  column: number;
  row: number;
  height: number;
  waterHeight: number;
  groundTexture: number;
  groundVariation: number;
  cliffTexture: number;
  cliffVariation: number;
  layerHeight: number;
  flags: number;
}

export class TerrainEditor {
  private picker: TerrainPicker;
  private undoStack: EditAction[] = [];
  private redoStack: EditAction[] = [];
  private isEditing = false;
  private lastPaintCol = -1;
  private lastPaintRow = -1;
  private isDirty = false;
  private lastPickedCorner: HoveredCorner | null = null;
  private onCornerHoverCallback: ((corner: HoveredCorner | null) => void) | null = null;

  brushSize = 3;
  brushStrength = 0.5;
  brushMode: HeightBrushMode = 'raise';

  currentGroundTexture = 0;
  currentGroundVariation = 0;
  terrainBrushSize = 3;
  terrainBrushStrength = 1.0;

  currentCliffTexture = 0;
  currentCliffLayerHeight = 1;
  cliffBrushSize = 2;
  cliffBrushStrength = 0.5;

  currentWaterHeight = 0;
  waterBrushSize = 4;
  waterBrushStrength = 0.3;

  currentEditMode: EditorMode = 'terrain';

  constructor(
    private w3e: War3MapW3e,
    private mapViewer: any,
    private viewer: any,
    private onSave?: SaveW3EHandler,
  ) {
    this.picker = new TerrainPicker(this.viewer, w3e.corners, w3e.mapSize, w3e.centerOffset);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const canvas = this.viewer.canvas as HTMLCanvasElement;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey) {
        return;
      }

      this.isEditing = true;
      this.lastPaintCol = -1;
      this.lastPaintRow = -1;
      this.paintTerrain(e);
      e.preventDefault();
      e.stopPropagation();
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      this.updateHoverCorner(e);

      if (this.isEditing && !e.ctrlKey) {
        this.paintTerrain(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isEditing = false;
      this.lastPaintCol = -1;
      this.lastPaintRow = -1;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isEditing = false;
      this.lastPaintCol = -1;
      this.lastPaintRow = -1;
      this.lastPickedCorner = null;

      if (this.onCornerHoverCallback) {
        this.onCornerHoverCallback(null);
      }
    });
  }

  private snapshotCorner(column: number, row: number): CornerState {
    const corner = this.w3e.corners[row][column];
    return {
      groundHeight: corner.groundHeight,
      waterHeight: corner.waterHeight,
      groundTexture: corner.groundTexture,
      groundVariation: corner.groundVariation,
      cliffTexture: corner.cliffTexture,
      cliffVariation: corner.cliffVariation,
      layerHeight: corner.layerHeight,
      flags: corner.flags,
    };
  }

  private applySnapshot(column: number, row: number, state: CornerState) {
    const corner = this.w3e.corners[row][column];
    corner.groundHeight = state.groundHeight;
    corner.waterHeight = state.waterHeight;
    corner.groundTexture = state.groundTexture;
    corner.groundVariation = state.groundVariation;
    corner.cliffTexture = state.cliffTexture;
    corner.cliffVariation = state.cliffVariation;
    corner.layerHeight = state.layerHeight;
    corner.flags = state.flags;
  }

  private statesEqual(left: CornerState, right: CornerState): boolean {
    return left.groundHeight === right.groundHeight
      && left.waterHeight === right.waterHeight
      && left.groundTexture === right.groundTexture
      && left.groundVariation === right.groundVariation
      && left.cliffTexture === right.cliffTexture
      && left.cliffVariation === right.cliffVariation
      && left.layerHeight === right.layerHeight
      && left.flags === right.flags;
  }

  private updateHoverCorner(e: MouseEvent) {
    const rect = this.viewer.canvas.getBoundingClientRect();
    const hit = this.picker.pickTerrain(e.clientX - rect.left, e.clientY - rect.top);

    if (!hit) {
      this.lastPickedCorner = null;
      if (this.onCornerHoverCallback) {
        this.onCornerHoverCallback(null);
      }
      return;
    }

    const corner = this.w3e.corners[hit.row][hit.column];
    this.lastPickedCorner = {
      column: hit.column,
      row: hit.row,
      height: corner.groundHeight,
      waterHeight: corner.waterHeight,
      groundTexture: corner.groundTexture,
      groundVariation: corner.groundVariation,
      cliffTexture: corner.cliffTexture,
      cliffVariation: corner.cliffVariation,
      layerHeight: corner.layerHeight,
      flags: corner.flags,
    };

    if (this.onCornerHoverCallback) {
      this.onCornerHoverCallback(this.lastPickedCorner);
    }
  }

  private paintTerrain(e: MouseEvent) {
    const rect = this.viewer.canvas.getBoundingClientRect();
    const hit = this.picker.pickTerrain(e.clientX - rect.left, e.clientY - rect.top);

    if (!hit) {
      return;
    }

    const { column, row } = hit;

    if (column === this.lastPaintCol && row === this.lastPaintRow) {
      return;
    }

    this.lastPaintCol = column;
    this.lastPaintRow = row;

    let action: EditAction | null = null;

    switch (this.currentEditMode) {
      case 'terrain':
        action = this.applyTextureBrush(column, row);
        break;
      case 'cliff':
        action = this.applyCliffBrush(column, row);
        break;
      case 'water':
        action = this.applyWaterBrush(column, row);
        break;
      case 'props':
        return;
      default:
        action = this.applyHeightBrush(column, row);
        break;
    }

    if (action) {
      this.undoStack.push(action);
      this.redoStack = [];
      this.updateHeightMap();
      if (this.currentEditMode === 'terrain' || this.currentEditMode === 'cliff') {
        this.mapViewer.updateTextureBuffers();
      }
      this.refreshHoveredCorner();
    }
  }

  private collectBrushChanges(
    radius: number,
    centerCol: number,
    centerRow: number,
    mutate: (column: number, row: number, falloff: number) => void,
  ): EditAction | null {
    const [cols, rows] = this.w3e.mapSize;
    const changes: CornerChange[] = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const column = centerCol + dx;
        const row = centerRow + dy;

        if (column < 0 || column >= cols || row < 0 || row >= rows) {
          continue;
        }

        const distance = Math.sqrt(dx * dx + dy * dy);
        const falloff = radius <= 0 ? 1 : Math.max(0, 1 - distance / radius);

        if (falloff <= 0) {
          continue;
        }

        const before = this.snapshotCorner(column, row);
        mutate(column, row, falloff);
        const after = this.snapshotCorner(column, row);

        if (!this.statesEqual(before, after)) {
          changes.push({ column, row, before, after });
        }
      }
    }

    if (changes.length === 0) {
      return null;
    }

    this.isDirty = true;
    return { changes, timestamp: Date.now() };
  }

  private applyHeightBrush(centerCol: number, centerRow: number): EditAction | null {
    return this.collectBrushChanges(this.brushSize, centerCol, centerRow, (column, row, falloff) => {
      const corner = this.w3e.corners[row][column];
      const oldHeight = corner.groundHeight;
      const force = this.brushStrength * falloff;

      switch (this.brushMode) {
        case 'raise':
          corner.groundHeight = oldHeight + force;
          break;
        case 'lower':
          corner.groundHeight = oldHeight - force;
          break;
        case 'smooth': {
          const neighbors = this.getNeighborHeights(column, row);
          if (neighbors.length > 0) {
            const avgHeight = neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length;
            corner.groundHeight = oldHeight * (1 - force) + avgHeight * force;
          }
          break;
        }
        case 'flatten':
          corner.groundHeight = 0;
          break;
      }
    });
  }

  private applyTextureBrush(centerCol: number, centerRow: number): EditAction | null {
    return this.collectBrushChanges(this.terrainBrushSize, centerCol, centerRow, (column, row, falloff) => {
      if (falloff < 0.3) {
        return;
      }

      const corner = this.w3e.corners[row][column];
      corner.groundTexture = this.currentGroundTexture;
      corner.groundVariation = this.currentGroundVariation;
    });
  }

  private applyCliffBrush(centerCol: number, centerRow: number): EditAction | null {
    return this.collectBrushChanges(this.cliffBrushSize, centerCol, centerRow, (column, row, falloff) => {
      if (falloff < 0.3) {
        return;
      }

      const corner = this.w3e.corners[row][column];
      corner.cliffTexture = this.currentCliffTexture;
      corner.layerHeight = this.currentCliffLayerHeight;
    });
  }

  private applyWaterBrush(centerCol: number, centerRow: number): EditAction | null {
    return this.collectBrushChanges(this.waterBrushSize, centerCol, centerRow, (column, row, falloff) => {
      if (falloff < 0.3) {
        return;
      }

      const corner = this.w3e.corners[row][column];
      corner.waterHeight = corner.groundHeight + this.currentWaterHeight;
      corner.flags |= 0x40;
    });
  }

  private getNeighborHeights(col: number, row: number): number[] {
    const [cols, rows] = this.w3e.mapSize;
    const heights: number[] = [];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) {
          continue;
        }

        const nextCol = col + dx;
        const nextRow = row + dy;

        if (nextCol >= 0 && nextCol < cols && nextRow >= 0 && nextRow < rows) {
          heights.push(this.w3e.corners[nextRow][nextCol].groundHeight);
        }
      }
    }

    return heights;
  }

  private updateHeightMap() {
    if (!this.mapViewer.heightMap || !this.mapViewer.cliffHeightMap) {
      return;
    }

    const [cols, rows] = this.w3e.mapSize;
    const cornerHeights = new Float32Array(cols * rows);
    const cliffHeights = new Float32Array(cols * rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const corner = this.w3e.corners[y][x];
        const index = y * cols + x;
        cliffHeights[index] = corner.groundHeight;
        cornerHeights[index] = corner.groundHeight + corner.layerHeight - 2;
      }
    }

    const gl = this.viewer.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.mapViewer.heightMap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, cols, rows, 0, gl.ALPHA, gl.FLOAT, cornerHeights);

    gl.bindTexture(gl.TEXTURE_2D, this.mapViewer.cliffHeightMap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, cols, rows, 0, gl.ALPHA, gl.FLOAT, cliffHeights);
  }

  private refreshHoveredCorner() {
    if (!this.lastPickedCorner || !this.onCornerHoverCallback) {
      return;
    }

    const { column, row } = this.lastPickedCorner;
    const corner = this.w3e.corners[row][column];
    this.lastPickedCorner = {
      column,
      row,
      height: corner.groundHeight,
      waterHeight: corner.waterHeight,
      groundTexture: corner.groundTexture,
      groundVariation: corner.groundVariation,
      cliffTexture: corner.cliffTexture,
      cliffVariation: corner.cliffVariation,
      layerHeight: corner.layerHeight,
      flags: corner.flags,
    };

    this.onCornerHoverCallback(this.lastPickedCorner);
  }

  undo() {
    if (this.undoStack.length === 0) {
      return;
    }

    const action = this.undoStack.pop()!;
    this.redoStack.push(action);

    for (const change of action.changes) {
      this.applySnapshot(change.column, change.row, change.before);
    }

    this.updateHeightMap();
    this.mapViewer.updateTextureBuffers();
    this.refreshHoveredCorner();
  }

  redo() {
    if (this.redoStack.length === 0) {
      return;
    }

    const action = this.redoStack.pop()!;
    this.undoStack.push(action);

    for (const change of action.changes) {
      this.applySnapshot(change.column, change.row, change.after);
    }

    this.updateHeightMap();
    this.mapViewer.updateTextureBuffers();
    this.refreshHoveredCorner();
  }

  setEditMode(mode: EditorMode) {
    this.currentEditMode = mode;
  }

  getEditMode(): EditorMode {
    return this.currentEditMode;
  }

  setBrushMode(mode: HeightBrushMode) {
    this.brushMode = mode;
  }

  setBrushSize(size: number) {
    this.brushSize = Math.max(1, Math.min(10, size));
  }

  setBrushStrength(strength: number) {
    this.brushStrength = Math.max(0.1, Math.min(2, strength));
  }

  setGroundTexture(textureId: number) {
    this.currentGroundTexture = textureId;
  }

  setGroundVariation(variation: number) {
    this.currentGroundVariation = Math.max(0, Math.min(15, variation));
  }

  setTerrainBrushSize(size: number) {
    this.terrainBrushSize = Math.max(1, Math.min(10, size));
  }

  setTerrainBrushStrength(strength: number) {
    this.terrainBrushStrength = Math.max(0.1, Math.min(2, strength));
  }

  setCliffTexture(textureId: number) {
    this.currentCliffTexture = textureId;
  }

  setCliffLayerHeight(height: number) {
    this.currentCliffLayerHeight = Math.max(0, Math.min(15, height));
  }

  setCliffBrushSize(size: number) {
    this.cliffBrushSize = Math.max(1, Math.min(8, size));
  }

  setCliffBrushStrength(strength: number) {
    this.cliffBrushStrength = Math.max(0.1, Math.min(1, strength));
  }

  setWaterHeight(height: number) {
    this.currentWaterHeight = Math.max(-10, Math.min(10, height));
  }

  setWaterBrushSize(size: number) {
    this.waterBrushSize = Math.max(1, Math.min(10, size));
  }

  setWaterBrushStrength(strength: number) {
    this.waterBrushStrength = Math.max(0.1, Math.min(1, strength));
  }

  addWaterAtCursor() {
    if (!this.lastPickedCorner) {
      return;
    }

    const action = this.collectBrushChanges(0, this.lastPickedCorner.column, this.lastPickedCorner.row, (column, row) => {
      const corner = this.w3e.corners[row][column];
      corner.waterHeight = corner.groundHeight + 1;
      corner.flags |= 0x40;
    });

    if (action) {
      this.undoStack.push(action);
      this.redoStack = [];
      this.updateHeightMap();
      this.refreshHoveredCorner();
    }
  }

  removeWaterAtCursor() {
    if (!this.lastPickedCorner) {
      return;
    }

    const action = this.collectBrushChanges(0, this.lastPickedCorner.column, this.lastPickedCorner.row, (column, row) => {
      const corner = this.w3e.corners[row][column];
      corner.waterHeight = corner.groundHeight;
      corner.flags &= ~0x40;
    });

    if (action) {
      this.undoStack.push(action);
      this.redoStack = [];
      this.updateHeightMap();
      this.refreshHoveredCorner();
    }
  }

  private setFlagAtCursor(mask: number, enabled: boolean) {
    if (!this.lastPickedCorner) {
      return;
    }

    const action = this.collectBrushChanges(0, this.lastPickedCorner.column, this.lastPickedCorner.row, (column, row) => {
      const corner = this.w3e.corners[row][column];
      if (enabled) {
        corner.flags |= mask;
      } else {
        corner.flags &= ~mask;
      }
    });

    if (action) {
      this.undoStack.push(action);
      this.redoStack = [];
      this.refreshHoveredCorner();
    }
  }

  setBlightAtCursor(enabled: boolean) {
    this.setFlagAtCursor(0x20, enabled);
  }

  setBoundaryAtCursor(enabled: boolean) {
    this.setFlagAtCursor(0x80, enabled);
  }

  setRampAtCursor(enabled: boolean) {
    this.setFlagAtCursor(0x10, enabled);
  }

  setMapEdgeAtCursor(enabled: boolean) {
    this.setFlagAtCursor(0x02, enabled);
  }

  getBrushConfig() {
    return {
      mode: this.brushMode,
      size: this.brushSize,
      strength: this.brushStrength,
      editMode: this.currentEditMode,
    };
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  onHoverCorner(callback: (corner: HoveredCorner | null) => void) {
    this.onCornerHoverCallback = callback;
  }

  isDirtied(): boolean {
    return this.isDirty;
  }

  async save(): Promise<boolean> {
    if (!this.onSave) {
      console.warn('TerrainEditor: 未注册保存处理器，无法保存');
      return false;
    }
    try {
      const buffer = this.w3e.save();
      const result = await this.onSave(buffer);

      if (result?.success) {
        this.isDirty = false;
        this.undoStack = [];
        this.redoStack = [];
        return true;
      }

      return false;
    } catch (error) {
      console.error('保存失败:', error);
      return false;
    }
  }
}
