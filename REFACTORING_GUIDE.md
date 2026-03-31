# BLP Preview Pro - Bun 迁移和代码重构指南

## 概述

本文档总结了将 BLP Preview Pro 扩展迁移到 Bun 包管理器和代码重构的所有工作。

---

## 1. Bun 迁移完成 ✅

### 1.1 环境设置
- **Bun 版本**: 1.3.11
- **配置文件**: `bunfig.toml` 已创建

### 1.2 Bunfig.toml 配置

```toml
[install]
prefer = "npm"
concurrent = 6
trust = ["webpack", "esbuild", "vsce"]

[build]
entrypoints = ["./src/extension.ts"]
root = "src"
outdir = "dist"
```

**说明**:
- 使用 npm 风格的版本解析确保兼容性
- 信任常用构建工具
- 配置输出目录为 dist

### 1.3 迁移步骤

**安装依赖**:
```bash
bun install
```

**构建项目**:
```bash
bun run compile    # webpack 编译
bun run package    # 生产构建
```

---

## 2. TypeScript 现代化 ✅

### 2.1 更新的 tsconfig.json

#### 主要改进:
- **模块**: `commonjs` → `esnext`
- **目标**: `es6` → `es2020`
- **模块解析**: 添加了 `nodenext`
- **严格检查**: 完全启用所有严格类型检查选项

#### 新增功能:
1. **路径别名** - 简化导入:
   ```typescript
   import { Logger } from '@common/logger';
   import { CommandRegistry } from '@command/registry';
   ```

2. **严格类型检查**:
   - `strict: true`
   - `noImplicitAny: true`
   - `noUnusedLocals: true`
   - `noUnusedParameters: true`
   - `noImplicitReturns: true`

3. **源映射和声明**:
   - `sourceMap: true`
   - `inlineSources: true`
   - `declarationMap: true`
   - `declaration: true`

---

## 3. 公共模块重构 ✅

### 3.1 新的公共模块架构

#### `src/common/` 结构:
```
common/
├── index.ts              # 统一导出
├── error-handler.ts      # 错误处理 (新增)
├── logger.ts             # 日志和性能监控 (新增)
├── config-manager.ts     # 配置管理 (新增)
├── types.ts              # 类型定义 (新增)
├── arrayunique.ts
├── binarystream.ts
├── bytesof.ts
├── clipboard.ts
├── dispose.ts
├── fs-helper.ts
├── gl-matrix-addon.ts
├── message.ts
├── searches.ts
├── task.ts
├── typecast.ts
└── utf8.ts
```

### 3.2 新增核心模块

#### 1. **错误处理模块** (`error-handler.ts`)
```typescript
// 应用级错误类
export class AppError extends Error {
  constructor(message: string, code: string, severity: ErrorSeverity)
}

// 统一错误处理器
export class ErrorHandler {
  static handle(error: Error | AppError, showToUser: boolean)
  static show(): void
  static clear(): void
}

// 便利函数
export function tryAsync<T>(fn: () => Promise<T>)
export function trySync<T>(fn: () => T)
```

**特性**:
- 分层错误处理
- 用户友好的错误消息
- 错误代码和上下文支持
- 输出通道集成

#### 2. **日志和性能监控** (`logger.ts`)
```typescript
// 结构化日志记录
export class Logger {
  static debug(message: string, data?: unknown)
  static info(message: string, data?: unknown)
  static warn(message: string, data?: unknown)
  static error(message: string, data?: unknown)
  static getLogs(): Array<...>
}

// 性能监控
export class PerformanceMonitor {
  static start(name: string): string
  static end(id: string, success: boolean): PerformanceMetric
  static measure<T>(name: string, fn: () => Promise<T>)
  static getSummary()
}
```

**特性**:
- 日志级别：Debug, Info, Warn, Error
- 自动性能测量
- 指标收集和汇总
- 开发模式下的控制台输出

#### 3. **配置管理** (`config-manager.ts`)
```typescript
export class ConfigManager {
  static getConfig(): ExtensionConfig
  static get<T>(key: string, defaultValue: T): T
  static set<T>(key: string, value: T)
  static onChange(listener: (config: ExtensionConfig) => void)
  static exportConfig(): string
  static importConfig(jsonStr: string)
  static resetToDefaults()
}
```

**特性**:
- 集中配置管理
- 配置变更监听器
- 导出/导入配置
- 类型安全的配置访问

#### 4. **类型定义** (`types.ts`)
```typescript
// 文件相关
export interface FileEntry
export interface BinaryData

// 操作相关
export interface ConversionOptions
export interface ExtractionOptions
export interface PreviewOptions
export interface ModelViewerSettings
export interface MapViewerSettings

// 存档相关
export interface MPQArchiveInfo
export interface W3XMapInfo

// 扩展相关
export interface ExtensionConfig
export interface CommandContext
export interface AsyncOperationResult
export interface BatchOperationOptions
```

**优势**:
- 单一真实信息源
- 类型安全
- 改进的 IDE 支持
- 代码文档

---

## 4. 命令处理模块重构 ✅

### 4.1 新的命令架构

#### 新增文件:
```
command/
├── index.ts           # 统一导出
├── registry.ts        # 命令注册表 (新增)
├── factory.ts         # 命令工厂 (新增)
├── convert2png.ts
├── convert2jpg.ts
├── ... 其他命令
```

#### 命令注册表 (`registry.ts`)
```typescript
export interface CommandRegistryEntry {
  id: string
  handler: CommandHandler
  displayName?: string
  category?: string
  keybinding?: string
  description?: string
}

export class CommandRegistry {
  static register(entry: CommandRegistryEntry)
  static execute<T>(commandId: string, ...args: unknown[])
  static getCommand(id: string)
  static getAllCommands()
  static getCommandsByCategory(category: string)
  static getExecutionHistory()
}
```

**特性**:
- 统一的命令注册
- 自动错误处理和日志记录
- 命令执行历史
- 分类管理

#### 命令工厂 (`factory.ts`)
```typescript
// 创建所有默认命令
export function createDefaultCommands(): CommandRegistryEntry[]
```

**命令类别**:
- MPQ 命令 (5 个)
- W3X 命令 (3 个)
- 文件操作 (3 个)
- 转换命令 (5 个)
- 剪贴板操作 (3 个)

---

## 5. 编辑器模块重构 ✅

### 5.1 增强的基础预览类

#### 新文件: `enhanced-base-preview.ts`

```typescript
export abstract class EnhancedBasePreview implements IDisposable {
  // 生命周期管理
  protected setupWebviewHandlers()
  protected setupLifecycleHandlers()
  
  // 消息处理
  protected handleWebviewMessage(message)
  protected onWebviewReady()
  protected sendWebviewMessage(type: string, payload?: unknown)
  
  // 内容管理
  protected loadContent()
  protected setWebviewContent(html: string)
  
  // 资源管理
  protected getResourceUri(...pathSegments: string[]): vscode.Uri
  protected getWebviewResourceUri(...pathSegments: string[]): vscode.Uri
  
  // 生命周期
  dispose()
}

export class PreviewState {
  static setState(key: string, state: Record<string, unknown>)
  static getState(key: string)
  static deleteState(key: string)
}
```

**特性**:
- 改进的生命周期管理
- 统一的错误处理
- 性能监控集成
- 状态管理
- 资源 URI 管理

---

## 6. 代码质量改进 ✅

### 6.1 ESLint 现代化配置

#### 新配置:
- 扩展: `eslint:recommended` 和 `@typescript-eslint/recommended`
- 目录: es2020 (从 es6 升级)
- 严格规则:
  - `noImplicitAny`: warn
  - `explicitFunctionReturnTypes`: warn
  - `noFloatingPromises`: error
  - `noMisusedPromises`: error
  - `awaitThenable`: error

### 6.2 Prettier 配置

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### 6.3 改进的 Webpack 配置

#### `webpack.config.modern.js`:
- **缓存**: 文件系统缓存
- **优化**: 
  - Terser 最小化
  - 树摇动 (Tree shaking)
  - 边界效果分析
- **别名**: 路径别名支持
- **性能**: 性能预算设置
- **源映射**: 条件性源映射

---

## 7. Bun 使用指南

### 7.1 常见命令

```bash
# 安装依赖
bun install

# 运行脚本
bun run compile      # 快速编译
bun run watch        # 监视模式
bun run package      # 生产构建
bun run test         # 运行测试
bun run lint         # 代码检查

# 添加包
bun add <package>
bun add -D <package> # 开发依赖

# 删除包
bun remove <package>

# 更新包
bun update
```

### 7.2 Bun 的优势

1. **性能**: 比 npm/yarn 快 25-60%
2. **兼容性**: 100% npm 兼容
3. **集成**: 内置 TypeScript 支持
4. **并发**: 智能并发安装
5. **一体化**: 包管理 + 运行时 + 打包

---

## 8. 迁移清单

- [x] 安装 Bun 包管理器
- [x] 创建 bunfig.toml 配置
- [x] 现代化 TypeScript 配置
- [x] 添加路径别名
- [x] 启用严格类型检查
- [x] 创建错误处理模块
- [x] 创建日志和性能监控
- [x] 创建配置管理器
- [x] 创建类型定义集合
- [x] 重构命令处理系统
- [x] 增强编辑器基础类
- [x] 现代化 ESLint 配置
- [x] 添加 Prettier 配置
- [x] 优化 Webpack 配置

---

## 9. 后续工作建议

### 9.1 即刻优先事项
1. 修复 TypeScript 编译错误
   - 导入参数类型
   - 添加缺失的 @types 包
   - 完成函数返回类型

2. 集成新的命令注册表
   - 在 extension.ts 中使用 CommandRegistry
   - 迁移现有命令到新工厂

3. 更新编辑器为 EnhancedBasePreview
   - 继承新的基类
   - 利用新功能

### 9.2 长期改进
1. 性能优化
   - 使用性能监控识别热点
   - 缓存优化
   - 内存管理改进

2. 功能增强
   - 批量操作支持
   - 进度跟踪
   - 撤销/重做功能

3. 测试覆盖
   - 单元测试
   - 集成测试
   - E2E 测试

4. 文档
   - API 文档
   - 贡献指南
   - 架构文档

---

## 10. 参考资源

- **Bun 文档**: https://bun.sh
- **TypeScript 编译器**: https://www.typescriptlang.org/
- **ESLint**: https://eslint.org/
- **VS Code API**: https://code.visualstudio.com/api

---

## 版本信息

- **重构日期**: 2026-03-31
- **Bun 版本**: 1.3.11
- **TypeScript**: ES2020
- **Node 目标**: 代码库

---

## 支持和反馈

对于问题或建议，请参考：
- GitHub Issues: https://github.com/eiriksgata/vscode-plugin-blp-preview-pro/issues
- 讨论: https://github.com/eiriksgata/vscode-plugin-blp-preview-pro/discussions
