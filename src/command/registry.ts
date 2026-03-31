/**
 * Command Registry and Handler Framework
 *
 * Provides a centralized registry for VS Code commands with better organization,
 * error handling, and lifecycle management.
 */

import * as vscode from 'vscode';
import { Logger } from '@common/logger';
import { ErrorHandler } from '@common/error-handler';
import type { CommandContext } from '@common/types';

/**
 * Command execution context
 */
export interface ExecutionContext {
  command: string;
  timestamp: number;
  arguments?: unknown[];
  context?: CommandContext;
  cancelToken?: vscode.CancellationToken;
}

/**
 * Command result
 */
export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: Error;
  executionTime: number;
}

/**
 * Command handler type
 */
export type CommandHandler = (
  context?: CommandContext,
  ...args: unknown[]
) => Promise<unknown> | unknown;

/**
 * Command registry entry
 */
export interface CommandRegistryEntry {
  id: string;
  handler: CommandHandler;
  displayName?: string;
  category?: string;
  keybinding?: string;
  description?: string;
}

/**
 * Command registry and manager
 */
export class CommandRegistry {
  private static commands: Map<string, CommandRegistryEntry> = new Map();
  private static disposables: vscode.Disposable[] = [];
  private static executionHistory: ExecutionContext[] = [];
  private static readonly MAX_HISTORY = 100;

  /**
   * Register a command
   */
  static register(entry: CommandRegistryEntry): vscode.Disposable {
    const wrappedHandler = this.wrapHandler(entry.id, entry.handler);
    const disposable = vscode.commands.registerCommand(entry.id, wrappedHandler);

    this.commands.set(entry.id, entry);
    this.disposables.push(disposable);

    Logger.info(`Command registered: ${entry.id}`, entry);

    return disposable;
  }

  /**
   * Register multiple commands
   */
  static registerAll(entries: CommandRegistryEntry[]): void {
    entries.forEach((entry) => this.register(entry));
  }

  /**
   * Wrap command handler with error handling and logging
   */
  private static wrapHandler(
    commandId: string,
    handler: CommandHandler
  ): (...args: unknown[]) => Promise<unknown> {
    return async (...args: unknown[]) => {
      const startTime = performance.now();
      const context: ExecutionContext = {
        command: commandId,
        timestamp: Date.now(),
        arguments: args,
      };

      this.recordExecution(context);

      try {
        Logger.debug(`Command executing: ${commandId}`, { args });

        const result = await Promise.resolve(handler(undefined, ...args));

        const executionTime = performance.now() - startTime;
        Logger.info(`Command completed: ${commandId}`, { executionTime, result });

        return result;
      } catch (error) {
        const executionTime = performance.now() - startTime;
        const err = error instanceof Error ? error : new Error(String(error));

        Logger.error(`Command failed: ${commandId}`, { executionTime, error: err });
        ErrorHandler.handle(err, true, `Command: ${commandId}`);

        throw err;
      }
    };
  }

  /**
   * Execute command programmatically
   */
  static async execute<T = unknown>(
    commandId: string,
    ...args: unknown[]
  ): Promise<T | null> {
    try {
      const result = await vscode.commands.executeCommand<T>(commandId, ...args);
      return result || null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      ErrorHandler.handle(err, false, `Execute command: ${commandId}`);
      return null;
    }
  }

  /**
   * Get command by ID
   */
  static getCommand(id: string): CommandRegistryEntry | undefined {
    return this.commands.get(id);
  }

  /**
   * Get all registered commands
   */
  static getAllCommands(): CommandRegistryEntry[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  static getCommandsByCategory(category: string): CommandRegistryEntry[] {
    return Array.from(this.commands.values()).filter(
      (cmd) => cmd.category === category
    );
  }

  /**
   * Record command execution
   */
  private static recordExecution(context: ExecutionContext): void {
    this.executionHistory.push(context);

    // Keep only recent executions
    if (this.executionHistory.length > this.MAX_HISTORY) {
      this.executionHistory = this.executionHistory.slice(-this.MAX_HISTORY);
    }
  }

  /**
   * Get execution history
   */
  static getExecutionHistory(): ExecutionContext[] {
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  static clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Dispose all registered commands
   */
  static dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
    this.commands.clear();
    Logger.info('Command registry disposed');
  }
}

/**
 * Command category manager
 */
export const CommandCategories = {
  MPQ: 'Blp Preview - MPQ',
  W3X: 'Blp Preview - W3X',
  Converter: 'Blp Preview - Converter',
  Editor: 'Blp Preview - Editor',
  Utilities: 'Blp Preview - Utilities',
} as const;
