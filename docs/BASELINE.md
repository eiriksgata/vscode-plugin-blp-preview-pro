# Custom Editor 行为基线 & 回归检查清单

## 概述

本文档冻结当前系统的功能、交互、消息协议行为，为后续重构提供验收标准。重构完成后，所有行为必须保持一致。

---

## 预览类型功能矩阵

| 预览类型 | 文件扩展名 | 关键类 | CSS | JS脚本 | Message事件 | 状态栏 | 特殊能力 |
|---------|---------|--------|-----|-------|-----------|--------|---------|
| BLP/TGA | `.blp`, `.tga` | BlpPreview | blpPreviewPro.css | jpgDecoder, blp2, binReader, tga, message, blpPreviewPro | size, zoom, reopen-as-text | binarySize, size, zoom | 图片缩放、尺寸显示、转为文本编辑器 |
| Audio | `.wav`, `.mp3` | AudioPreview | audioPreview.css | message, audioPreview | (无用户交互) | binarySize | 音频播放 |
| 3D Model | `.mdx`, `.mdl` | MdxPreview | modelPreview.css | viewer.min2, message, modelPreview | (在代码中定义) | binarySize | 3D模型渲染、ModelViewer 全局库 |
| Map Terrain | `.w3e`, `.w3x` | W3EPreview | modelPreview.css | viewer.min2, message, mapPreview | (在代码中定义) | (无) | 地图渲染、多层对象(Terrain/Unit/Doodad) |
| Spreadsheet | `.slk`, `.mmp`, `.w3c`, `.w3i` | SlkPreview | xspreadsheet.css, slkPreview.css | message, xspreadsheet, slkPreview | (在代码中定义) | binarySize | 可编辑表格、多格式支持 |

---

## 详细行为基线

### 1. BLP/TGA 预览 (BlpPreview)

**文件类型**: `.blp`, `.tga`  
**类**: `src/custom-editor/blpPreview/BlpPreview.ts`  
**Webview 入口**: `src/custom-editor/blpPreview/index.ts`

#### 资源加载链路
```
load() → vscode.workspace.fs.readFile(resource) 或 MpqArchive.get() 或 W3XArchive.get()
         ↓
       { ext, buf } (Uint8Array.buffer)
         ↓
       decoding by media/lib/blp2.js / tga.js
         ↓
       canvas.drawImage() to preview
```

#### 消息流: 前端 → 后端 → 前端
- **load**: 前端主动请求 `message.load()` → 后端返回 `{ ext, buf }`
- **size**: BlpPreview 收到前端发来的尺寸信息 (如"1024x768") → 更新状态栏
- **zoom**: 前端发出缩放级别 (如 0.5, 1, 2, \`'fit'\`) → BlpPreview 更新 `imageZoom` 状态并触发 `update()` → 状态栏显示
- **reopen-as-text**: 执行 `vscode.commands.executeCommand('vscode.openWith', resource, 'default')`

#### 状态栏交互
- **onActive()**: 显示三个状态栏条目
  - `sizeStatusBarEntry.show(id, imageSize)` — 显示图片尺寸 (如"1024x768")
  - `binarySizeStatusBarEntry.show(id, _imageBinarySize)` — 显示文件大小 (字节)
  - `zoomStatusBarEntry.show(id, imageZoom)` — 显示缩放倍数
- **onVisible()**: 隐藏所有三个状态栏条目
- **onDispose()**: 清理状态栏条目

#### 用户交互
- 打开 `.blp`/`.tga` 文件 → Webview 加载 `index.ts` → 调用 `message.load()` → 返回 buffer → 解码并渲染到 canvas
- 按 `Ctrl+Scroll` / `+/-` 改变缩放 → 前端发送 zoom 消息 → BlpPreview 更新状态栏
- 右键菜单 "以文本打开" → 执行 reopen-as-text 命令
- 文件修改 (on disk) → FileSystemWatcher 触发 → `render()` 重新加载

#### 资源解析优先级
```
if scheme === 'w3x' → MpqArchive.getByPath(fsPath + '.w3x').get(resourcePath)
else if scheme === 'mpq' → MpqManager.get(resourcePath)
else → vscode.workspace.fs.readFile(resource)
```

---

### 2. Audio 预览 (AudioPreview)

**文件类型**: `.wav`, `.mp3`  
**类**: `src/custom-editor/audioPreview/AudioPreview.ts`  
**Webview 入口**: `src/custom-editor/audioPreview/index.ts`

#### 资源加载
- 通过 `message.load()` 获取 buffer
- Webview 中通过 `<audio>` 标签与 blob:// URL 播放

#### 音频播放控制
- HTML5 `<audio>` 原生控制 (play, pause, volume, seek)

#### 状态栏交互
- **onActive()**: 显示 `binarySizeStatusBarEntry` (文件大小)
- **onVisible()**: 隐藏 `binarySizeStatusBarEntry`
- **onDispose()**: 清理

#### 用户交互
- 打开音频文件 → Webview 加载 index.ts → HTML5 audio 元素自动播放
- 无额外消息事件

---

### 3. 3D 模型预览 (MdxPreview)

**文件类型**: `.mdx`, `.mdl`  
**类**: `src/custom-editor/modelPreview/MdxPreview.ts`  
**Webview 入口**: `src/custom-editor/modelPreview/index.ts`

#### 关键特性
- 加载 `media/lib/viewer.min2.js` (war3-model 库)
- **全局库注入**: war3-model 库会在全局作用域创建 `window.ModelViewer` 构造函数
- **Fetch 覆写**: `media/modelPreview.js` 可能覆写 `window.fetch()` 来拦截资源加载

#### 资源加载
- Webview 通过 `message.load()` 获取主文件 buffer
- 模型依赖资源 (如纹理) 通过 `message.loadResource(path)` 加载

#### 消息流
- 可能定义 `onMessage()` 处理自定义事件 (具体事件需查看 media/modelPreview.js)

#### 状态栏交互
- **onActive()**: 显示 `binarySizeStatusBarEntry`
- **onVisible()**: 隐藏 `binarySizeStatusBarEntry`

#### 已知问题 & 回归点
- **全局库冲突**: war3-model 库的 `window.ModelViewer` 在多窗口预览时可能污染全局作用域
- **Fetch 覆写**: 如果多个预览类型都覆写 fetch，最后一个注入的覆写会生效，导致其他预览的请求被错误拦截

---

### 4. 地图预览 (W3EPreview)

**文件类型**: `.w3e`, `.w3x`  
**类**: `src/custom-editor/mapPreview/W3EPreview.ts`  
**Webview 入口**: `src/custom-editor/mapPreview/index.ts`

#### 关键特性
- 处理 W3X 文件 (Warcraft III map archives)
- 包含多个子组件: Terrain, Unit, Doodad, StandSequence, Variation, Widget + Camera
- 复杂的 MPQ/W3X 解析链路

#### 资源加载链路
```
W3XArchive.getByPath() → parse .w3i (map info) → render terrain, units, doodads
                         parse .doo (doodad data)
                         parse .war (war3map)
                         load .tga textures from archive
```

#### 消息流
- Webview 通过 `message.load()` 获取 .w3e 或 .w3x 文件
- 然后加载多个关联资源: `loadText(path)`, `loadTextArray(path)` 用于获取解析数据

#### 状态栏
- W3EPreview 未定义 onActive/onVisible/onDispose，因此**不显示任何状态栏**

#### 已知问题 & 回归点
- **异步初始化**: W3X 档案加载是异步的 (Promise-based)，timing issue 可能导致资源加载失败
- **复杂依赖**: w3x-reader 目录包含 20+ 文件，修改时需完整回归测试

---

### 5. 表格预览 (SlkPreview)

**文件类型**: `.slk`, `.mmp`, `.w3c`, `.w3i`  
**类**: `src/custom-editor/slkPreview/SlkPreview.ts`  
**Webview 入口**: `src/custom-editor/slkPreview/index.ts`

#### 关键特性
- 使用 xspreadsheet 库呈现可编辑表格
- 支持多种数据格式

#### 资源加载
```
message.load() → parse file format (.slk / .mmp / .w3c / .w3i) → 
  convert to JSON → xspreadsheet.loadData()
```

#### 编辑能力
- Webview 中的表格可编辑
- 保存通过 webview state 或额外 message 协议实现

#### 消息流
- 可定义 onMessage() 处理保存、导出等操作

#### 状态栏
- **onActive()**: 显示 `binarySizeStatusBarEntry`
- **onVisible()**: 隐藏 `binarySizeStatusBarEntry`

---

## 消息协议基线

### 后端消息处理 (src/common/message.ts)

```typescript
class Message {
  async onMessage(message: { type?: string; data?: any }) {
    const handler = this[message.type];  // 动态分发
    if (typeof handler === 'function') {
      return await handler.call(this, message.data);
    }
    // 无处理 → silent failure (不返回错误)
  }
}
```

### RPC 方法

#### load()
- **输入**: (无)
- **输出**: `{ ext: string; buf: ArrayBuffer }`
- **来源**: 当前资源 (file:// / mpq:// / w3x://)
- **失败**: 抛出异常 (前端 Promise 拒绝)

#### loadBlp(path: string)
- **输入**: `path` — MPQ 内路径
- **输出**: `{ ext: string; buf: ArrayBuffer }`
- **来源**: MpqManager 或 W3X archive
- **失败**: 返回 null (需改进)

#### loadText(path: string)
- **输入**: `path`
- **输出**: `string` (文本内容)
- **处理**: 尝试通过多种方式加载 (workspace, MPQ, W3X)

#### loadTextArray(path: string)
- **输入**: `path`
- **输出**: `string[]` (按行分割)

#### loadResource(path: string)
- **输入**: `path`
- **输出**: `ArrayBuffer` (任意资源二进制)

### 前端消息发送 (src/custom-editor/message.ts)

```typescript
window.message._trans(type, data, timeout) → 
  Promise<T> {
    requestId = generateId();
    requests[requestId] = { resolve, reject, timeout: setTimeout(...) };
    window.vscode.postMessage({ requestId, type, data });
    return promise;
  }
window.addEventListener('message', (e) => {
  const { requestId, data } = e.data;
  if (requests[requestId]) {
    requests[requestId].resolve(data);
  }
});
```

#### 已知问题
- **无类型检查**: message.type 是 string，无类型安全
- **动态分发**: `this[message.type]()` 对 minification 和 refactoring 不友好
- **无错误码**: 无法区分"方法不存在"和"执行失败"
- **Timeout 只在 timeout > 0 时启用**

---

## 资源加载优先级

### 本地文件 (文件系统)
```
resource.scheme === 'file' → vscode.workspace.fs.readFile()
```

### MPQ 存档
```
resource.scheme === 'mpq' → MpqArchive.getByPath(...).get(path)
```

### W3X 地图
```
resource.scheme === 'w3x' → parse *.w3x → extract by resourcePath
```

### 嵌套资源查找 (_loadSource)
1. 如果是 w3x:// scheme，从 archive 获取
2. 否则查找 workspace 相同目录
3. 否则查找 MpqManager 全局实例
4. 否则返回 undefined

---

## 回归检查清单

### ✅ 构建与编译
- [ ] `bun run compile` 无错误，产物路径不变
- [ ] `bun run compile` 执行时间 < 60s
- [ ] 编译后所有 .js 产物在 media/ 目录下

### ✅ 文件打开与预览
- [ ] 打开 `.blp` 文件 → BLP预览加载成功
- [ ] 打开 `.tga` 文件 → BLP预览加载成功
- [ ] 打开 `.mdx` 文件 → 3D模型预览加载成功
- [ ] 打开 `.mdl` 文件 → 3D模型预览加载成功
- [ ] 打开 `.w3e` 文件 → 地图预览加载成功
- [ ] 打开 `.wav` 文件 → 音频预览加载成功
- [ ] 打开 `.mp3` 文件 → 音频预览加载成功
- [ ] 打开 `.slk` 文件 → 表格预览加载成功
- [ ] 打开 `.mmp` 文件 → 表格预览加载成功
- [ ] 打开 `.w3c` 文件 → 表格预览加载成功
- [ ] 打开 `.w3i` 文件 → 表格预览加载成功

### ✅ BLP/TGA 交互
- [ ] 缩放: 按 Ctrl+滚轮 改变缩放倍数 → 状态栏 zoom 值更新
- [ ] 缩放: 按 Ctrl+= 放大 → zoom 递增
- [ ] 缩放: 按 Ctrl+- 缩小 → zoom 递减
- [ ] 缩放: 按 Ctrl+0 重置为 fit → zoom = 'fit'
- [ ] 状态栏: BLP预览激活时，显示三个条目 (size, binarySize, zoom)
- [ ] 状态栏: 切换到其他编辑器 → 隐藏三个条目
- [ ] 重新打开: 右键菜单 "以文本打开" → 在文本编辑器中打开该文件
- [ ] 文件更新: 在磁盘上修改文件 → 预览自动刷新

### ✅ 音频交互
- [ ] 点击 Play → 音频开始播放
- [ ] 音频无状态栏 (仅显示 binarySize)
- [ ] 可调节音量和进度条

### ✅ 3D 模型交互
- [ ] 加载 .mdx 模型 → 3D 场景渲染
- [ ] 鼠标拖动 → 旋转视角
- [ ] 滚轮 → 缩放视角
- [ ] 状态栏: 显示 binarySize

### ✅ 地图交互
- [ ] 加载 .w3e 地形 → 预览渲染
- [ ] 加载 .w3x 地图 → 包括 terrain、unit、doodad 渲染
- [ ] 状态栏: **无任何状态栏显示**
- [ ] 鼠标交互: 根据 media/mapPreview.js 定义的行为

### ✅ 表格交互
- [ ] 加载 .slk/.mmp/.w3c/.w3i → xspreadsheet 渲染可编辑表格
- [ ] 点击单元格可编辑
- [ ] 状态栏: 显示 binarySize

### ✅ 消息通信
- [ ] 前端请求 load → 后端返回 buffer (200ms 内)
- [ ] 前端请求 loadText → 后端返回字符串 (200ms 内)
- [ ] 前端请求未知类型 → 后端不返回错误，**前端 Promise 一直 pending** (需改进)
- [ ] 前端请求 timeout (>5s) → Promise reject

### ✅ MPQ 与 W3X 资源加载
- [ ] 从本地 .w3x 打开资源 → MpqArchive 成功提取
- [ ] 从本地 .mpq 打开资源 (如果支持) → 资源加载成功
- [ ] MpqArchive lazy init → 无阻塞前端

### ✅ 全局作用域污染
- [ ] window.ModelViewer 仅在模型预览加载时存在
- [ ] window.fetch 未被任何预览无意中覆写 (或至少不跨预览污染)
- [ ] window.message, window.vscode, window.currentResourceURI 存在于所有 webview

---

## 已知限制 & 改进空间

1. **动态分发的脆弱性**: 无法在编译时验证消息类型，minification 后符号名不匹配
2. **错误处理不一致**: 有些方法返回 null，有些抛异常，前端无法区分
3. **全局污染**: war3-model 库、fetch 覆写、window 注入散落各处
4. **Timeout 不完善**: 仅当 timeout > 0 才启用，undefined 时忽略超时保护
5. **缺乏版本管理**: 无法在前后端版本不同时自动降级
6. **Silent failure**: 未知消息类型不返回错误，前端 Promise 无限等待

---

## 重构检查点

重构完成后需验证:
1. **功能等价性**: 所有 10 种文件类型可打开、交互行为一致
2. **消息兼容性**: 所有 RPC 方法返回值类型、timing 一致
3. **全局作用域**: 清晰的初始化顺序，无意外污染
4. **类型安全**: 消息类型在 TypeScript 中可验证
5. **性能**: 加载时间、消息 latency 无明显退化

