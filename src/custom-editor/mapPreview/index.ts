/**
 * 地图查看器
 */
import { setupCamera } from "./camera";
import MapViewer from "./mapViewer";
import { TerrainEditor } from "./terrain-editor";
import type Message from "../message";

/** viewer.min2.js 注入的全局对象 */
declare const ModelViewer: {
    viewer: {
        ModelViewer: new (canvas: HTMLCanvasElement) => any;
        handlers: Record<string, any>;
        DebugRenderMode: { None: number };
    };
    common: {
        glMatrix: {
            vec3: any;
            quat: any;
            [key: string]: any;
        };
        [key: string]: any;
    };
};

/** message.js 注入的全局对象 */
declare const message: Message;

declare global {
    interface Window {
        terrainEditor: TerrainEditor | null;
        /** HTML 模板中提供的纹理网格渲染函数 */
        populateTextureGrid: (
            gridId: string,
            previews: (string | null)[],
            onSelect: (idx: number) => void,
        ) => void;
        /** 地形面板角点信息更新回调 */
        updateCornerInfo: ((corner: object | null, mode: string) => void) | undefined;
        /** 憂崖面板角点信息更新回调 */
        updateCliffInfo: ((corner: object | null, mode: string) => void) | undefined;
        /** 水面面板角点信息更新回调 */
        updateWaterInfo: ((corner: object | null) => void) | undefined;
        /** 属性面板角点信息更新回调 */
        updatePropsInfo: ((corner: object | null) => void) | undefined;
    }
}

const handlers = ModelViewer.viewer.handlers;
const common = ModelViewer.common;
const glMatrix = common.glMatrix;
const vec3 = glMatrix.vec3;
const quat = glMatrix.quat;

// 全局编辑器实例
let terrainEditor: TerrainEditor | null = null;

let canvas = document.getElementById('canvas') as HTMLCanvasElement;

canvas.width = 800;
canvas.height = 600;

// Create the viewer!
let viewer = new ModelViewer.viewer.ModelViewer(canvas);
viewer.debugRenderMode = ModelViewer.viewer.DebugRenderMode.None;

// Create a new scene. Each scene has its own camera, and a list of things to render.
let scene = viewer.addScene();

// Check camera.js!
setupCamera(scene);

// Events.
const DEBUG_VIEWER_EVENTS = false;

if (DEBUG_VIEWER_EVENTS) {
    viewer.on('loadstart', (e) => console.log(e));
    viewer.on('load', (e) => console.log('load', e));
    viewer.on('loadend', (e) => console.log('loadend', e));
    viewer.on('error', (e) => console.log('error', e));
}

// Add the MDX handler.
// Note that this also loads all of the team colors/glows.
// You can optionally supply a path solver (look below) to point the viewer to the right location of the textures.
// Additionally, a boolean can be given that selects between RoC/TFT and Reforged team colors.
// For example:
//   viewer.addHandler(handlers.mdx, pathSolver); // Roc/TFT = 14 teams.
//   viewer.addHandler(handlers.mdx, pathSolver, true); // Reforged = 28 teams.
// In the case of this example, team colors aren't used, so it's fine for their loads to simply fail.
viewer.addHandler(handlers.mdx);

// Add the BLP handler.
viewer.addHandler(handlers.blp);
// Add the DDS handler.
viewer.addHandler(handlers.dds);
// Add the TGA handler.
viewer.addHandler(handlers.tga);

// @ts-ignore
// 缓存原始 BLP buffer，供 getTexturePreview 使用 CPU 解码
const _blpRawCache = new Map<string, ArrayBuffer>();
(window as any)._blpRawCache = _blpRawCache;
const MAP_PREVIEW_DEBUG = true;

type BinaryPayload = ArrayBuffer | Uint8Array | { buf?: ArrayBuffer | Uint8Array } | null | undefined;

function normalizeResourcePath(input: string): string {
    return input.replace(/\//g, '\\').toLowerCase();
}

function getResourcePathCandidates(input: string): string[] {
    const trimmed = input.trim();
    const slash = trimmed.replace(/\\/g, '/');
    const backslash = trimmed.replace(/\//g, '\\');
    const mapSlash = `map/${slash}`;
    const mapBackslash = `map\\${backslash}`;
    const candidates = [trimmed, backslash, slash, mapSlash, mapBackslash];

    // 去重，避免重复请求同一路径
    return [...new Set(candidates.filter(Boolean))];
}

function cacheRawBlp(path: string, buf: ArrayBuffer) {
    const normalized = normalizeResourcePath(path);
    _blpRawCache.set(normalized, buf);
    _blpRawCache.set(path.toLowerCase(), buf);
}

function extractArrayBuffer(payload: BinaryPayload): ArrayBuffer | null {
    if (!payload) {
        return null;
    }
    if (payload instanceof ArrayBuffer) {
        return payload;
    }
    if (payload instanceof Uint8Array) {
        return payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
    }
    if (typeof payload === 'object' && 'buf' in payload) {
        const inner = payload.buf;
        if (inner instanceof ArrayBuffer) {
            return inner;
        }
        if (inner instanceof Uint8Array) {
            return inner.buffer.slice(inner.byteOffset, inner.byteOffset + inner.byteLength);
        }
    }
    return null;
}

// @ts-ignore
window.fetch = async function (path: string) {
    const candidates = getResourcePathCandidates(path);
    let loaded: ArrayBuffer | null = null;
    let hitSource: 'resource' | 'blp' | 'none' = 'none';

    if (MAP_PREVIEW_DEBUG) {
        console.info('[MapPreview][fetch] request=', path, 'candidates=', candidates);
    }

    for (const candidate of candidates) {
        try {
            const raw = await message.loadResource(candidate) as BinaryPayload;
            loaded = extractArrayBuffer(raw);
            if (loaded) {
                cacheRawBlp(candidate, loaded);
                hitSource = 'resource';
                if (MAP_PREVIEW_DEBUG) {
                    console.info('[MapPreview][fetch] hit resource:', candidate, 'bytes=', loaded.byteLength);
                }
                break;
            }
            if (MAP_PREVIEW_DEBUG) {
                console.warn('[MapPreview][fetch] resource empty:', candidate, 'payload=', raw);
            }
        } catch {
            // 忽略，继续尝试其他路径格式
            if (MAP_PREVIEW_DEBUG) {
                console.warn('[MapPreview][fetch] resource failed:', candidate);
            }
        }
    }

    if (!loaded) {
        for (const candidate of candidates) {
            try {
                const raw = await message.loadBlp(candidate) as BinaryPayload;
                loaded = extractArrayBuffer(raw);
                if (loaded) {
                    cacheRawBlp(candidate, loaded);
                    hitSource = 'blp';
                    if (MAP_PREVIEW_DEBUG) {
                        console.info('[MapPreview][fetch] hit blp:', candidate, 'bytes=', loaded.byteLength);
                    }
                    break;
                }
                if (MAP_PREVIEW_DEBUG) {
                    console.warn('[MapPreview][fetch] blp empty:', candidate, 'payload=', raw);
                }
            } catch {
                // 忽略，继续尝试其他路径格式
                if (MAP_PREVIEW_DEBUG) {
                    console.warn('[MapPreview][fetch] blp failed:', candidate);
                }
            }
        }
    }

    if (!loaded) {
        if (MAP_PREVIEW_DEBUG) {
            console.error('[MapPreview][fetch] all candidates failed:', path, candidates);
        }
        return {
            ok: false,
            status: 404,
            arrayBuffer: async () => new ArrayBuffer(0),
        };
    }

    if (MAP_PREVIEW_DEBUG) {
        console.info('[MapPreview][fetch] success source=', hitSource, 'path=', path, 'bytes=', loaded.byteLength);
    }

    return {
        ok: true,
        status: 200,
        arrayBuffer: async () => loaded as ArrayBuffer,
    };
};

message.load().then(({ buf, ext }) => {
    const map = new MapViewer(viewer, scene, buf);
    
    // 初始化地形编辑器，传入 saveW3E 回调，解耦对全局 message 的直接依赖
    terrainEditor = new TerrainEditor(map.w3e, map, viewer, (buf) => message.saveW3E(buf));
    window.terrainEditor = terrainEditor;  // 绑定到全局作用域

    // 等待地形纹理完全加载后再填充纹理面板缩略图
    map.terrainReadyPromise.then(() => {
        // 初始化地面纹理网格（图片预览 + 点击选择）
        if (map.w3e.groundTilesets) {
            const groundPreviews: (string | null)[] = [];
            map.w3e.groundTilesets.forEach((_tileset: string, idx: number) => {
                groundPreviews.push(map.getTexturePreview(idx));
            });
            window.populateTextureGrid('groundTextureGrid', groundPreviews, (idx: number) => {
                if (terrainEditor) {
                    terrainEditor.setGroundTexture(idx);
                }
            });
            // 默认选中第一个
            if (terrainEditor) {
                terrainEditor.setGroundTexture(0);
            }
        }
        
        // 初始化悬崖纹理网格
        if (map.w3e.cliffTilesets) {
            const cliffPreviews: (string | null)[] = [];
            map.w3e.cliffTilesets.forEach((_tileset: string, idx: number) => {
                cliffPreviews.push(map.getTexturePreview(idx, 64, 'cliff'));
            });
            window.populateTextureGrid('cliffTextureGrid', cliffPreviews, (idx: number) => {
                if (terrainEditor) {
                    terrainEditor.setCliffTexture(idx);
                }
            });
        }
    });

    // 注册鼠标悬停回调 - 实时显示各菜单的角点信息
    terrainEditor.onHoverCorner((corner, eventType?: string) => {
        if (!corner) {
            window.updateCornerInfo?.(null, 'idle');
            window.updateCliffInfo?.(null, 'idle');
            window.updateWaterInfo?.(null);
            window.updatePropsInfo?.(null);
            return;
        }
        
        const brushConfig = terrainEditor!.getBrushConfig();
        const currentMode = document.querySelector('.menu-tab.active')?.getAttribute('data-tab') || 'terrain';
        
        // 根据当前菜单更新信息
        if (currentMode === 'terrain') {
            window.updateCornerInfo?.(corner, brushConfig.mode);
        } else if (currentMode === 'cliff') {
            window.updateCliffInfo?.(corner, brushConfig.mode);
        } else if (currentMode === 'water') {
            window.updateWaterInfo?.(corner);
        } else if (currentMode === 'props') {
            window.updatePropsInfo?.(corner);
        }
    });
    
    // 绑定快捷键
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (!terrainEditor) return;
        
        // Ctrl/Cmd + Z: 撤销
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (terrainEditor.canUndo()) {
                terrainEditor.undo();
                console.log('撤销');
            }
        }
        
        // Ctrl/Cmd + Shift + Z: 重做
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
            e.preventDefault();
            if (terrainEditor.canRedo()) {
                terrainEditor.redo();
                console.log('重做');
            }
        }
        
        // Ctrl/Cmd + S: 保存
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (terrainEditor.isDirtied()) {
                terrainEditor.save().then(success => {
                    if (success) {
                        console.log('地形已保存');
                    }
                });
            }
        }
    });
    
    // 渲染循环
    function step(timestamp: number) {
        requestAnimationFrame(step);

        map.render();
    }
    requestAnimationFrame(step);
});
