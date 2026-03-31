/**
 * Error Handling Module
 *
 * Provides centralized error handling, logging, and user-friendly error messages
 * for the BLP Preview Pro extension.
 */

import * as vscode from 'vscode';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical',
}

/**
 * Application-specific error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: ErrorSeverity = ErrorSeverity.Error,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert error to user-friendly message
   */
  getUserMessage(): string {
    const messages: Record<string, string> = {
      MPQ_NOT_FOUND: 'MPQ 文件未找到。请检查文件路径。',
      MPQ_INVALID: 'MPQ 文件格式无效。',
      FILE_READ_ERROR: '无法读取文件。',
      FILE_WRITE_ERROR: '无法写入文件。',
      CONVERSION_ERROR: '文件转换失败。',
      EXTRACT_ERROR: '文件提取失败。',
      PERMISSION_ERROR: '权限不足。',
      INVALID_INPUT: '输入参数无效。',
    };

    return messages[this.code] || this.message;
  }
}

/**
 * Error logger and handler
 */
export class ErrorHandler {
  private static readonly outputChannel = vscode.window.createOutputChannel('BLP Preview Pro');

  /**
   * Log error to output channel and optionally show to user
   */
  static handle(error: Error | AppError, showToUser: boolean = true, action?: string): void {
    const timestamp = new Date().toISOString();
    const errorInfo = this.formatError(error, action);

    // Log to output channel
    this.outputChannel.appendLine(`[${timestamp}] ${errorInfo}`);
    this.outputChannel.show(false);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }

    // Show to user if requested
    if (showToUser) {
      this.showUserMessage(error);
    }
  }

  /**
   * Format error information for logging
   */
  private static formatError(error: Error | AppError, action?: string): string {
    let message = `${error.name}: ${error.message}`;

    if (error instanceof AppError) {
      message += ` [${error.code}]`;
      if (error.context) {
        message += ` Context: ${JSON.stringify(error.context)}`;
      }
    }

    if (action) {
      message = `${action} - ${message}`;
    }

    if (error.stack && process.env.NODE_ENV === 'development') {
      message += `\n${error.stack}`;
    }

    return message;
  }

  /**
   * Show user-friendly error message
   */
  private static showUserMessage(error: Error | AppError): void {
    const message =
      error instanceof AppError ? error.getUserMessage() : error.message;

    if (error instanceof AppError) {
      switch (error.severity) {
        case ErrorSeverity.Info:
          vscode.window.showInformationMessage(message);
          break;
        case ErrorSeverity.Warning:
          vscode.window.showWarningMessage(message);
          break;
        case ErrorSeverity.Error:
        case ErrorSeverity.Critical:
          vscode.window.showErrorMessage(message);
          break;
      }
    } else {
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * Clear output channel
   */
  static clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Show output channel
   */
  static show(): void {
    this.outputChannel.show(true);
  }
}

/**
 * Try-catch wrapper with error handling
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => void,
  label?: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (errorHandler) {
      errorHandler(err);
    } else {
      ErrorHandler.handle(err, true, label);
    }
    return null;
  }
}

/**
 * Sync try-catch wrapper with error handling
 */
export function trySync<T>(
  fn: () => T,
  errorHandler?: (error: Error) => void,
  label?: string
): T | null {
  try {
    return fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (errorHandler) {
      errorHandler(err);
    } else {
      ErrorHandler.handle(err, true, label);
    }
    return null;
  }
}
