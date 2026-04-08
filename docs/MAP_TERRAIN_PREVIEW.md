# 地图地形预览（W3E / mapPreview）技术文档

## 概述

本插件支持直接在 VS Code 中预览魔兽争霸 3 地图地形文件（`war3map.w3e`）。触发条件：在 VS Code 中打开后缀为 `.w3e` 的文件，插件自动注入 WebGL 渲染视图，呈现可交互的三维地形。

---

## 一、文件入口与注册

```
src/extension.ts
  └─ registerCustomEditorProvider()
       └─ src/custom-editor/index.ts
            └─ EditorProvider.ts
                 └─ case '.w3e' → new W3EPreview(...)
```

- **`EditorProvider.ts`** 根据扩展名路由，`.w3e` 对应 `W3EPreview`。
- **`W3EPreview.ts`** 继承自 `BasePreview`，只声明引用的 CSS/JS 资源和 HTML 模板（极简）：
  - CSS：`/media/modelPreview.css`
  - JS：`/media/message.js`、`/media/lib/viewer.min2.js`、`/media/mapPreview.js`
  - HTML 模板：`src/custom-editor/mapPreview/index.html`（含 `<canvas id="canvas">`）
- **`package.json`** 中声明：`"filenamePattern": "*.{blp,tga,mdx,w3e,slk,mmp,w3c}"` 触发自定义编辑器。

---

## 二、W3E 文件格式解析

### 解析器

`src/custom-editor/mapPreview/w3x-reader/w3e/w3e.ts` — `War3MapW3e`

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | int32 | 文件版本 |
| `tileset` | char(1) | 地图风格代码（如 `A`=灰烬之地、`L`=洛丹伦等） |
| `haveCustomTileset` | int32 | 是否使用自定义贴图组 |
| `groundTilesets` | string[4][] | 地面贴图 ID 列表（4字节 SLK key）|
| `cliffTilesets` | string[4][] | 悬崖贴图 ID 列表 |
| `mapSize` | Int32[2] | 地图列数×行数（含冗余一格） |
| `centerOffset` | Float32[2] | 地图中心在世界坐标中的偏移（单位：游戏坐标） |
| `corners` | Corner[rows][cols] | 每个角点的地形数据 |

文件头标识：二进制前4字节 `W3E!`。

### 角点结构

`src/custom-editor/mapPreview/w3x-reader/w3e/corner.ts` — `Corner`（每角点 7 字节）

| 字段 | 位来源 | 含义 |
|------|--------|------|
| `groundHeight` | bytes[0-1] int16 → `(val-8192)/512` | 地面高度（单位：格） |
| `waterHeight` | bytes[2-3] 低14位 → 同上解码 | 水面高度 |
| `mapEdge` | bytes[2-3] bit14 | 是否是地图边缘 |
| `ramp` | bytes[4] bit4 | 是否是坡道 |
| `blight` | bytes[4] bit5 | 是否是枯萎地面 |
| `water` | bytes[4] bit6 | 该角点是否有水 |
| `boundary` | bytes[4] bit7 | 是否是边界 |
| `groundTexture` | bytes[4] 低4位 | 地面贴图索引（引用 `groundTilesets`） |
| `cliffVariation` | bytes[5] 高3位 | 悬崖变体编号 |
| `groundVariation` | bytes[5] 低5位 | 地面变体编号 |
| `cliffTexture` | bytes[6] 高4位 | 悬崖贴图索引（引用 `cliffTilesets`） |
| `layerHeight` | bytes[6] 低4位 | 层高（用于判断悬崖） |

---

## 三、渲染架构

### 前端入口

`media/mapPreview.js`（由 `src/custom-editor/mapPreview/index.ts` 编译而来）

1. 创建 `ModelViewer`（`viewer.min2.js` 提供，基于 WebGL）。
2. 拦截 `window.fetch` → 通过 `message.loadBlp(path)` / `message.loadResource(path)` 向 VS Code 扩展后端取文件。
3. 调用 `message.load()` 拿到当前 `.w3e` 文件的 `ArrayBuffer`，传给 `MapViewer`。
4. 启动 `requestAnimationFrame` 循环调用 `map.render()`。

### `MapViewer`（核心类）

`src/custom-editor/mapPreview/mapViewer.ts`

构造时完成三步并行初始化：
```
loadBaseFiles()        → 加载 SLK/INI 元数据
  └─ loadTerrainCliffsAndWater()  → 构建地面/悬崖/水面 GPU 缓冲区
loadDoodadsAndDestructibles()     → 加载装饰物模型
loadUnitsAndItems()               → 加载单位/物品模型
```

#### 3.1 基础数据加载 `loadBaseFiles()`

并行请求以下 SLK 文件（从魔兽3安装目录或 MPQ 中读取）：

| 文件 | 用途 |
|------|------|
| `TerrainArt\Terrain.slk` | 地面贴图目录/文件名映射 |
| `TerrainArt\CliffTypes.slk` | 悬崖贴图目录/文件名/地面索引 |
| `TerrainArt\Water.slk` | 水面贴图帧数/颜色/高度等参数 |
| `Doodads\Doodads.slk` + `DoodadMetaData.slk` | 装饰物文件路径 |
| `Units\DestructableData.slk` + `DestructableMetaData.slk` | 可破坏物数据 |
| `Units\UnitData.slk` + `unitUI.slk` + `ItemData.slk` + `UnitMetaData.slk` | 单位数据 |
| `table\unit.ini` | 自定义单位配置 |

解析使用 `MappedData`（SLK 解析器），通过 4 字母 ID 查行。

#### 3.2 地形构建 `loadTerrainCliffsAndWater()`

**地面贴图加载**：
- 遍历 `w3e.groundTilesets`，用 SLK 查 `dir\file.blp` 路径，加载贴图。
- 额外加载当前风格的枯萎贴图（`Blight`）。

**悬崖贴图加载**：
- 遍历 `w3e.cliffTilesets`，查 `texDir\texFile.blp`。

**水面贴图加载**：
- 通过 `{tileset}Sha` 行（如 `ASha`）取帧数 `numTex`，依次加载 `texFile00.blp` … `texFileNN.blp`，支持动画播放（用 `waterIncreasePerFrame` 驱动）。

**GPU 缓冲区构建**（逐角点遍历）：

```
对每个 (x, y) 格：
  → cliffHeights[]: 原始地面高度（用于悬崖法线贴图）
  → cornerHeights[]: groundHeight + layerHeight - 2（地面最终高度）
  → waterHeights[]: 水面高度

  若该格是悬崖（四角 layerHeight 不全相等）：
    → 计算 cliffFileName（如 "AABB"，代表高度差组合）
    → 按变体查对应 .mdx 模型路径（Doodads\Terrain\Dir\DirAABB0.mdx）
    → 收集为 TerrainModel 实例（实例化绘制）

  否则（普通地面格）：
    → 从四角计算出最多4个贴图 ID（混合用）
    → 存入 cornerTextures / cornerVariations（供 GPU instancing）
```

高度图上传为 `ALPHA` 格式的 WebGL 纹理（`gl.FLOAT`），供 GLSL 顶点着色器采样。

#### 3.3 装饰物 `loadDoodadsAndDestructibles()`

- 读 `war3map.doo`，由 `War3MapDoo` 解析器提供装饰物列表。
- 按 ID 查 SLK，加载 `.mdx` 模型，创建 `Doodad` 实例（带 ModelViewer 动画支持）。

#### 3.4 单位与物品 `loadUnitsAndItems()`

- 读 `war3mapUnits.doo`，由 `War3MapUnitsDoo` 解析。
- 起始点 `sloc` 使用硬编码路径 `Objects\StartLocation\StartLocation.mdx`。
- 失败时 fallback 到 `sammycube.mdx`（用于调试未知 ID）。

---

## 四、GLSL 着色器

### 地面着色器（`ground.vert` / `ground.frag`）

| 功能 | 说明 |
|------|------|
| 高度采样 | 从高度图纹理 `u_heightMap`（ALPHA channel）读高度 |
| 法线计算 | 采样相邻4点高度差，向量归一化（软件光照准备，但光照目前注释掉） |
| 贴图混合 | 每格最多4层贴图，按 alpha 混合；支持 extended（512×256 8列）和普通（4列）贴图 |
| GPU Instancing | `ANGLE_instanced_arrays` 扩展实例化绘制，每帧一次 draw call |
| 多批渲染 | 贴图数 > 15 时分批多次渲染（WebGL 1 最大纹理单元限制） |

### 悬崖着色器（`cliffs.vert` / `cliffs.frag`）

| 功能 | 说明 |
|------|------|
| 模型加载 | 悬崖块使用 MDLX 模型（`.mdx`），从 geoset 提取 vertices/normals/uvs |
| 高度吻合 | 顶点着色器从 `cliffHeightMap` 双线性插值，让悬崖贴合地面 |
| 贴图 | 最多支持 2 种悬崖贴图（`u_texture1` / `u_texture2`） |
| OES_vertex_array_object | 支持 VAO 以减少状态切换 |

### 水面着色器（`water.vert` / `water.frag`）

| 功能 | 说明 |
|------|------|
| 深浅色混合 | 按水深（waterHeight - groundHeight）在最小/最大浅水色与深水色之间插值 |
| 动画 | `waterIndex` 每帧累加切换帧纹理，速率由 `texRate/60` 控制 |
| 透明度 | 启用 BLEND，`SRC_ALPHA / ONE_MINUS_SRC_ALPHA` |
| 深度写入 | `gl.depthMask(false)` 防止水面遮挡后方物体 |

---

## 五、渲染主循环

```
requestAnimationFrame → map.render()
  ├─ worldScene.startFrame()
  ├─ renderGround()        地面（Instanced Draw）
  ├─ renderCliffs()        悬崖模型（MDX Instanced Draw）
  ├─ worldScene.renderOpaque()   ModelViewer 不透明物体
  ├─ renderWater()         水面（Instanced Draw，半透明）
  ├─ worldScene.renderTranslucent() ModelViewer 半透明物体
  └─ update()              推进水面动画帧、更新 Doodad/Unit 动画
```

---

## 六、悬崖 FileName 计算（`cliffFileName`）

四个角点的 `layerHeight` 与最小值的差转为字母：

```
A = 差0层, B = 差1层, C = 差2层, ...
顺序：bottomLeft · topLeft · topRight · bottomRight
```

示例：四角高度 `[2,2,3,2]`，base=2，fileName = `"AABA"` → 查对应 `.mdx` 模型。

变体数量上限由 `variations.ts` 中的表决定：
- `Cliffs` 目录：`cliffVariations` 表
- 城市悬崖目录：`cityCliffVariations` 表

---

## 七、相机控制

`src/custom-editor/mapPreview/camera.js` — `SimpleOrbitCamera`

| 操作 | 效果 |
|------|------|
| 左键拖动 | 旋转（围绕目标点） |
| 右键拖动 | 平移（XY 平面） |
| 滚轮 | 缩放（距离） |
| 触摸双指 | 缩放 |
| 触摸滑动 | 旋转 |

默认参数：`fov = π/4`，`nearClip = 1`，`farClip = 200000`。

---

## 八、数据流总结

```
.w3e 文件（磁盘/MPQ）
  │
  ▼
BasePreview → message.load() → ArrayBuffer
  │
  ▼
War3MapW3e.load()   ← BinaryStream 逐字节解析
  │  corners[][]（角点高度/贴图/层高等）
  │  groundTilesets / cliffTilesets
  │
  ▼
MapViewer 构造
  ├─ loadBaseFiles() → SLK/INI 元数据（通过 message.loadBlp 向后端索取）
  ├─ loadTerrainCliffsAndWater()
  │     ├─ 加载 BLP 贴图
  │     ├─ 构建 heightMap / waterHeightMap / cliffHeightMap（WebGLTexture）
  │     ├─ 构建 instanceBuffer / textureBuffer / variationBuffer / waterBuffer
  │     └─ 构建 cliffModels（TerrainModel[]）
  ├─ loadDoodadsAndDestructibles() → war3map.doo → Doodad[]
  └─ loadUnitsAndItems()           → war3mapUnits.doo → Unit[]
  │
  ▼
每帧 render()
  地面 → 悬崖 → 单位/装饰物 → 水面
```

---

## 九、关键依赖关系

| 模块 | 依赖 | 说明 |
|------|------|------|
| `W3EPreview` | `BasePreview` | Webview HTML 注入 |
| `MapViewer` | `War3MapW3e` | W3E 解析 |
| `MapViewer` | `MappedData` | SLK 查表 |
| `MapViewer` | `TerrainModel` | 悬崖 MDX instancing |
| `MapViewer` | `Doodad` / `Unit` | ModelViewer 动画实体 |
| `index.ts (前端)` | `ModelViewer` (viewer.min2.js) | WebGL/MDX 渲染引擎 |
| `index.ts (前端)` | `message.js` | 后端文件通信 |

---

## 十、已知限制

- 贴图数量上限：地面贴图最多 **15 个/批**（WebGL 1 纹理单元限制，超过15自动分批）。
- 枯萎贴图（`blight`）逻辑已注释掉（`cornerTexture()` 中）。
- 悬崖贴图最多 **2 种**（`u_texture1` / `u_texture2`）。
- 地面光照计算已注释掉（`ground.frag` 中光照线被 `//` 注掉）。
- 模型未找到时 fallback 为 `sammycube.mdx`。
