/**
 * Common Module Exports
 * 
 * This module provides centralized access to common utilities and helpers
 * used throughout the BLP Preview Pro extension.
 */

export { default as arrayUnique } from './arrayunique';
export { default as BinaryStream } from './binarystream';
export { bytesOf } from './bytesof';
export { simpleCopy, contentCopy, isWayland } from './clipboard';
export { disposeAll, Disposable } from './dispose';
export {
  isWin,
  MD5,
  tempPath,
  tempFilePath,
  makefiles,
  makefolders,
  makeDirSync,
  makeFileSync,
} from './fs-helper';
export * from './gl-matrix-addon';
export * from './message';
export { isStringInBytes, isStringInString, boundIndexOf } from './searches';
export { default as Task } from './task';
export * from './typecast';
export { decodeUtf8, encodeUtf8, byteLengthUtf8, splitUtf8ByteLength } from './utf8';

// Re-export commonly used types
export type {
  FileEntry,
  BinaryData,
  ClipboardContent,
  Message,
  SearchResult,
  TaskResult,
} from './types';
