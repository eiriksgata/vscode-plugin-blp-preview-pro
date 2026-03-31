/**
 * Common Type Definitions
 * 
 * Centralized type definitions used throughout the extension
 */

/**
 * File entry in archive or file system
 */
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
  extension?: string;
}

/**
 * Binary data representation
 */
export interface BinaryData {
  buffer: ArrayBuffer;
  offset: number;
  length: number;
}

/**
 * Clipboard content
 */
export interface ClipboardContent {
  text?: string;
  data?: unknown;
  timestamp: number;
}

/**
 * Message type for communication
 */
export interface Message<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  requestId?: string;
}

/**
 * Search result
 */
export interface SearchResult {
  path: string;
  matches: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

/**
 * Task result
 */
export interface TaskResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
}

/**
 * Conversion options
 */
export interface ConversionOptions {
  inputPath: string;
  outputPath: string;
  format: 'png' | 'jpg' | 'bmp' | 'tga' | 'blp' | 'mdl' | 'mdx';
  quality?: number;
  compress?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Resource extraction options
 */
export interface ExtractionOptions {
  sourcePath: string;
  destinationPath: string;
  recursive?: boolean;
  includeTextures?: boolean;
  filter?: (path: string) => boolean;
}

/**
 * Preview options
 */
export interface PreviewOptions {
  width?: number;
  height?: number;
  scale?: number;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

/**
 * Model viewer settings
 */
export interface ModelViewerSettings extends PreviewOptions {
  showGrid?: boolean;
  showWireframe?: boolean;
  backgroundColor?: string;
  lightIntensity?: number;
  cameraFov?: number;
  cameraDistance?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

/**
 * Map viewer settings
 */
export interface MapViewerSettings extends PreviewOptions {
  showTerrain?: boolean;
  showObjects?: boolean;
  showUnits?: boolean;
  showDoodads?: boolean;
  terrainScale?: number;
  gridSize?: number;
}

/**
 * MPQ archive information
 */
export interface MPQArchiveInfo {
  path: string;
  size: number;
  fileCount: number;
  compression: string;
  modified: Date;
  valid: boolean;
}

/**
 * MPQ file entry
 */
export interface MPQFileEntry extends FileEntry {
  compressed: boolean;
  encryptionKey?: number;
  crc?: number;
}

/**
 * W3X map information
 */
export interface W3XMapInfo {
  path: string;
  name: string;
  description: string;
  width: number;
  height: number;
  playerCount: number;
  fileCount: number;
}

/**
 * Extension configuration
 */
export interface ExtensionConfig {
  mpqLocation: string;
  retainContext: boolean;
  autoSave: boolean;
  previewQuality: 'low' | 'medium' | 'high';
  cachSize: number;
  enableLogging: boolean;
  enablePerformanceMonitoring: boolean;
}

/**
 * Command context
 */
export interface CommandContext {
  uri?: any;
  resourcePath?: string;
  editor?: any;
  workspace?: any;
}

/**
 * Disposable resource
 */
export interface IDisposable {
  dispose(): void;
}

/**
 * Async operation result
 */
export interface AsyncOperationResult<T = unknown> {
  status: 'pending' | 'success' | 'error' | 'cancelled';
  data?: T;
  error?: Error;
  startTime: number;
  endTime?: number;
  progress?: number;
  cancellationToken?: { isCancellationRequested: boolean };
}

/**
 * Batch operation options
 */
export interface BatchOperationOptions {
  parallel: boolean;
  concurrencyLimit?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  stopOnError?: boolean;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    index: number;
    success: boolean;
    error?: Error;
  }>;
}
