/**
 * Configuration Management Module
 *
 * Centralized management of extension configuration and settings
 */

import * as vscode from 'vscode';
import type { ExtensionConfig } from './types';

const CONFIG_SECTION = 'blpPreviewPro';

/**
 * Configuration manager
 */
export class ConfigManager {
  private static config: vscode.WorkspaceConfiguration;
  private static listeners: Set<(config: ExtensionConfig) => void> = new Set();

  /**
   * Initialize configuration manager
   */
  static initialize(): void {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    this.setupListeners();
  }

  /**
   * Setup configuration change listeners
   */
  private static setupListeners(): void {
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIG_SECTION)) {
        this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
        this.notifyListeners();
      }
    });
  }

  /**
   * Get full configuration
   */
  static getConfig(): ExtensionConfig {
    return {
      mpqLocation: this.get<string>('mpqLocation', ''),
      retainContext: this.get<boolean>('retainContext', true),
      autoSave: this.get<boolean>('autoSave', false),
      previewQuality: this.get<'low' | 'medium' | 'high'>('previewQuality', 'high'),
      cachSize: this.get<number>('cacheSize', 100),
      enableLogging: this.get<boolean>('enableLogging', false),
      enablePerformanceMonitoring: this.get<boolean>('enablePerformanceMonitoring', false),
    };
  }

  /**
   * Get specific configuration value
   */
  static get<T>(key: string, defaultValue: T): T {
    return this.config.get<T>(key, defaultValue) || defaultValue;
  }

  /**
   * Set configuration value
   */
  static async set<T>(key: string, value: T, global: boolean = false): Promise<void> {
    const target = global ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
    await this.config.update(key, value, target);
  }

  /**
   * Get MPQ location
   */
  static getMPQLocation(): string {
    return this.get<string>('mpqLocation', '');
  }

  /**
   * Set MPQ location
   */
  static async setMPQLocation(path: string): Promise<void> {
    await this.set('mpqLocation', path);
  }

  /**
   * Get preview quality setting
   */
  static getPreviewQuality(): 'low' | 'medium' | 'high' {
    return this.get<'low' | 'medium' | 'high'>('previewQuality', 'high');
  }

  /**
   * Set preview quality
   */
  static async setPreviewQuality(quality: 'low' | 'medium' | 'high'): Promise<void> {
    await this.set('previewQuality', quality);
  }

  /**
   * Check if logging is enabled
   */
  static isLoggingEnabled(): boolean {
    return this.get<boolean>('enableLogging', false);
  }

  /**
   * Enable/disable logging
   */
  static async setLoggingEnabled(enabled: boolean): Promise<void> {
    await this.set('enableLogging', enabled);
  }

  /**
   * Check if performance monitoring is enabled
   */
  static isPerformanceMonitoringEnabled(): boolean {
    return this.get<boolean>('enablePerformanceMonitoring', false);
  }

  /**
   * Enable/disable performance monitoring
   */
  static async setPerformanceMonitoringEnabled(enabled: boolean): Promise<void> {
    await this.set('enablePerformanceMonitoring', enabled);
  }

  /**
   * Subscribe to configuration changes
   */
  static onChange(listener: (config: ExtensionConfig) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Unsubscribe from configuration changes
   */
  static offChange(listener: (config: ExtensionConfig) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of configuration change
   */
  private static notifyListeners(): void {
    const config = this.getConfig();
    this.listeners.forEach((listener) => listener(config));
  }

  /**
   * Reset to default configuration
   */
  static async resetToDefaults(): Promise<void> {
    const defaults: ExtensionConfig = {
      mpqLocation: '',
      retainContext: true,
      autoSave: false,
      previewQuality: 'high',
      cachSize: 100,
      enableLogging: false,
      enablePerformanceMonitoring: false,
    };

    for (const [key, value] of Object.entries(defaults)) {
      await this.set(key, value);
    }
  }

  /**
   * Export configuration to JSON
   */
  static exportConfig(): string {
    return JSON.stringify(this.getConfig(), null, 2);
  }

  /**
   * Import configuration from JSON
   */
  static async importConfig(jsonStr: string): Promise<void> {
    try {
      const config = JSON.parse(jsonStr) as Partial<ExtensionConfig>;
      for (const [key, value] of Object.entries(config)) {
        await this.set(key, value);
      }
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }
}
