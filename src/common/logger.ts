/**
 * Performance Monitoring and Logging Module
 *
 * Provides performance monitoring, metrics collection, and structured logging
 * for debugging and optimization purposes.
 */

import * as vscode from 'vscode';

/**
 * Log levels
 */
export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

/**
 * Performance metric entry
 */
export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Structured logger
 */
export class Logger {
  private static readonly MAX_LOGS = 1000;
  private static logs: Array<{ timestamp: string; level: LogLevel; message: string }> = [];
  private static outputChannel: vscode.OutputChannel | null = null;
  private static currentLevel: LogLevel = LogLevel.Info;

  /**
   * Initialize logger with output channel
   */
  static initialize(level: LogLevel = LogLevel.Info): void {
    this.currentLevel = level;
    this.outputChannel = vscode.window.createOutputChannel('BLP Preview Pro - Logger');
  }

  /**
   * Set log level
   */
  static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Log message at specified level
   */
  private static log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const logEntry = `[${timestamp}] [${levelName}] ${message}${
      data ? ` ${JSON.stringify(data)}` : ''
    }`;

    this.logs.push({ timestamp, level, message: logEntry });

    // Keep only recent logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Output to channel if available
    if (this.outputChannel) {
      this.outputChannel.appendLine(logEntry);
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const method = ['log', 'info', 'warn', 'error'][level] as
        | 'log'
        | 'info'
        | 'warn'
        | 'error';
      console[method](message, data);
    }
  }

  static debug(message: string, data?: unknown): void {
    this.log(LogLevel.Debug, message, data);
  }

  static info(message: string, data?: unknown): void {
    this.log(LogLevel.Info, message, data);
  }

  static warn(message: string, data?: unknown): void {
    this.log(LogLevel.Warn, message, data);
  }

  static error(message: string, data?: unknown): void {
    this.log(LogLevel.Error, message, data);
  }

  /**
   * Get all logs
   */
  static getLogs(): Array<{ timestamp: string; level: LogLevel; message: string }> {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  static clearLogs(): void {
    this.logs = [];
  }

  /**
   * Show output channel
   */
  static show(): void {
    this.outputChannel?.show(true);
  }
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetric> = new Map();
  private static observers: ((metric: PerformanceMetric) => void)[] = [];

  /**
   * Start measuring a performance metric
   */
  static start(name: string, metadata?: Record<string, unknown>): string {
    const id = `${name}-${Date.now()}-${Math.random()}`;
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      success: false,
      metadata,
    };

    this.metrics.set(id, metric);
    Logger.debug(`Perf: Started ${name}`, metadata);

    return id;
  }

  /**
   * End measuring a performance metric
   */
  static end(id: string, success: boolean = true): PerformanceMetric | null {
    const metric = this.metrics.get(id);
    if (!metric) {
      Logger.warn(`Perf: Metric not found - ${id}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;

    Logger.debug(`Perf: Completed ${metric.name}`, {
      duration: `${metric.duration.toFixed(2)}ms`,
      success,
    });

    // Notify observers
    this.observers.forEach((observer) => observer(metric));

    // Clean up old metrics
    this.metrics.delete(id);

    return metric;
  }

  /**
   * Measure async function execution
   */
  static async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const id = this.start(name, metadata);
    try {
      const result = await fn();
      this.end(id, true);
      return result;
    } catch (error) {
      this.end(id, false);
      throw error;
    }
  }

  /**
   * Measure sync function execution
   */
  static measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const id = this.start(name, metadata);
    try {
      const result = fn();
      this.end(id, true);
      return result;
    } catch (error) {
      this.end(id, false);
      throw error;
    }
  }

  /**
   * Subscribe to metric completion
   */
  static onMetricComplete(observer: (metric: PerformanceMetric) => void): void {
    this.observers.push(observer);
  }

  /**
   * Get all recorded metrics
   */
  static getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear metrics
   */
  static clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get metrics summary
   */
  static getSummary(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    const summary: Record<string, { count: number; totalTime: number; avgTime: number }> = {};

    for (const metric of this.metrics.values()) {
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, totalTime: 0, avgTime: 0 };
      }

      const entry = summary[metric.name];
      entry.count++;
      entry.totalTime += metric.duration || 0;
      entry.avgTime = entry.totalTime / entry.count;
    }

    return summary;
  }
}
