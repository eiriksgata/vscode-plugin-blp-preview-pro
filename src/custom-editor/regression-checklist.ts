/**
 * 回归测试验证脚本
 * 在重构每个预览类型后清点此脚本，确保行为一致性
 */

export interface RegressionCheckpoint {
  category: string;
  item: string;
  description: string;
  verified: boolean;
  notes?: string;
}

export const regressionChecklist: RegressionCheckpoint[] = [
  // 构建与编译
  {
    category: '构建与编译',
    item: 'compile',
    description: 'bun run compile 无错误，产物路径不变',
    verified: false,
  },
  {
    category: '构建与编译',
    item: 'compile_time',
    description: '编译时间 < 60s',
    verified: false,
  },
  {
    category: '构建与编译',
    item: 'media_output',
    description: '编译后所有 .js 产物在 media/ 目录下',
    verified: false,
  },

  // 文件打开与预览
  {
    category: '文件打开',
    item: 'blp_open',
    description: '打开 .blp 文件 → BLP预览加载',
    verified: false,
  },
  {
    category: '文件打开',
    item: 'tga_open',
    description: '打开 .tga 文件 → BLP预览加载',
    verified: false,
  },
  {
    category: '文件打开',
    item: 'mdx_open',
    description: '打开 .mdx 文件 → 3D模型预览',
    verified: false,
  },
  {
    category: '文件打开',
    item: 'mdl_open',
    description: '打开 .mdl 文件 → 3D模型预览',
    verified: false,
  },
  {
    category: '文件打开',
    item: 'w3e_open',
    description: '打开 .w3e 文件 → 地图预览',
    verified: false,
  },
  {
    category: '文件打开',
    item: 'wav_open',
    description: '打开 .wav 文件 → 音频预览',
    verified: false,
  },
  {
    category: '文件打开',
    item: 'mp3_open',
    description: '打开 .mp3 文件 → 音频预览',
    verified: false,
  },
  {
    category: '文件打开',
    item: 'slk_open',
    description: '打开 .slk 文件 → 表格预览',
    verified: false,
  },
  {
    category: '文件打开',
    item: 'mmp_open',
    description: '打开 .mmp 文件 → 表格预览',
    verified: false,
  },
  {
    category: '文件打开',
    item: 'w3c_open',
    description: '打开 .w3c 文件 → 表格预览',
    verified: false,
  },
  {
    category: '文件打开',
    item: 'w3i_open',
    description: '打开 .w3i 文件 → 表格预览',
    verified: false,
  },

  // BLP/TGA 交互
  {
    category: 'BLP/TGA 交互',
    item: 'blp_zoom_wheel',
    description: '按 Ctrl+滚轮 改变缩放倍数',
    verified: false,
  },
  {
    category: 'BLP/TGA 交互',
    item: 'blp_zoom_plus',
    description: '按 Ctrl+= 放大',
    verified: false,
  },
  {
    category: 'BLP/TGA 交互',
    item: 'blp_zoom_minus',
    description: '按 Ctrl+- 缩小',
    verified: false,
  },
  {
    category: 'BLP/TGA 交互',
    item: 'blp_zoom_reset',
    description: '按 Ctrl+0 重置为 fit',
    verified: false,
  },
  {
    category: 'BLP/TGA 交互',
    item: 'blp_statusbar',
    description: 'BLP预览激活时，显示三个条目 (size, binarySize, zoom)',
    verified: false,
  },
  {
    category: 'BLP/TGA 交互',
    item: 'blp_statusbar_hide',
    description: '切换到其他编辑器 → 隐藏三个条目',
    verified: false,
  },
  {
    category: 'BLP/TGA 交互',
    item: 'blp_reopen_as_text',
    description: '右键菜单 "以文本打开" → 在文本编辑器中打开',
    verified: false,
  },
  {
    category: 'BLP/TGA 交互',
    item: 'blp_autorefresh',
    description: '在磁盘上修改文件 → 预览自动刷新',
    verified: false,
  },

  // 音频交互
  {
    category: '音频交互',
    item: 'audio_play',
    description: '点击 Play → 音频开始播放',
    verified: false,
  },
  {
    category: '音频交互',
    item: 'audio_statusbar',
    description: '音频无状态栏 (仅显示 binarySize)',
    verified: false,
  },
  {
    category: '音频交互',
    item: 'audio_volume',
    description: '可调节音量和进度条',
    verified: false,
  },

  // 3D 模型交互
  {
    category: '3D 模型交互',
    item: 'model_render',
    description: '加载 .mdx 模型 → 3D 场景渲染',
    verified: false,
  },
  {
    category: '3D 模型交互',
    item: 'model_rotate',
    description: '鼠标拖动 → 旋转视角',
    verified: false,
  },
  {
    category: '3D 模型交互',
    item: 'model_zoom',
    description: '滚轮 → 缩放视角',
    verified: false,
  },
  {
    category: '3D 模型交互',
    item: 'model_statusbar',
    description: '状态栏: 显示 binarySize',
    verified: false,
  },

  // 地图交互
  {
    category: '地图交互',
    item: 'map_terrain',
    description: '加载 .w3e 地形 → 预览渲染',
    verified: false,
  },
  {
    category: '地图交互',
    item: 'map_full',
    description: '加载 .w3x 地图 → 包括 terrain、unit、doodad 渲染',
    verified: false,
  },
  {
    category: '地图交互',
    item: 'map_no_statusbar',
    description: '状态栏: 无任何状态栏显示',
    verified: false,
  },

  // 表格交互
  {
    category: '表格交互',
    item: 'table_load',
    description: '加载 .slk/.mmp/.w3c/.w3i → xspreadsheet 渲染',
    verified: false,
  },
  {
    category: '表格交互',
    item: 'table_edit',
    description: '点击单元格可编辑',
    verified: false,
  },
  {
    category: '表格交互',
    item: 'table_statusbar',
    description: '状态栏: 显示 binarySize',
    verified: false,
  },

  // 消息通信
  {
    category: '消息通信',
    item: 'msg_load',
    description: '前端请求 load → 后端返回 buffer (200ms 内)',
    verified: false,
  },
  {
    category: '消息通信',
    item: 'msg_loadText',
    description: '前端请求 loadText → 后端返回字符串 (200ms 内)',
    verified: false,
  },
  {
    category: '消息通信',
    item: 'msg_unknown',
    description: '前端请求未知类型 → 后端返回错误（改进后）',
    verified: false,
  },
  {
    category: '消息通信',
    item: 'msg_timeout',
    description: '前端请求 timeout (>5s) → Promise reject',
    verified: false,
  },

  // 资源加载
  {
    category: 'MPQ/W3X 资源',
    item: 'w3x_extract',
    description: '从本地 .w3x 打开资源 → 提取成功',
    verified: false,
  },
  {
    category: 'MPQ/W3X 资源',
    item: 'mpq_lazy_init',
    description: 'MpqArchive lazy init → 无阻塞前端',
    verified: false,
  },

  // 全局作用域
  {
    category: '全局作用域',
    item: 'global_ModelViewer',
    description: 'window.ModelViewer 仅在模型预览加载时存在',
    verified: false,
  },
  {
    category: '全局作用域',
    item: 'global_fetch',
    description: 'window.fetch 未被无意中覆写',
    verified: false,
  },
  {
    category: '全局作用域',
    item: 'global_bridges',
    description: 'window.message, window.vscode, window.currentResourceURI 存在',
    verified: false,
  },
];

/**
 * 统计回归检查进度
 */
export function getSummary(): {
  total: number;
  verified: number;
  percentage: number;
  byCategory: Record<string, { total: number; verified: number }>;
} {
  const total = regressionChecklist.length;
  const verified = regressionChecklist.filter((c) => c.verified).length;

  const byCategory: Record<string, { total: number; verified: number }> = {};
  regressionChecklist.forEach((c) => {
    if (!byCategory[c.category]) {
      byCategory[c.category] = { total: 0, verified: 0 };
    }
    byCategory[c.category].total++;
    if (c.verified) {
      byCategory[c.category].verified++;
    }
  });

  return {
    total,
    verified,
    percentage: (verified / total) * 100,
    byCategory,
  };
}

/**
 * 打印进度报告
 */
export function printReport(): void {
  const summary = getSummary();
  console.log(`\n回归测试进度: ${summary.verified}/${summary.total} (${summary.percentage.toFixed(1)}%)\n`);
  Object.entries(summary.byCategory).forEach(([category, counts]) => {
    const pct = ((counts.verified / counts.total) * 100).toFixed(0);
    console.log(`  ${category}: ${counts.verified}/${counts.total} (${pct}%)`);
  });
}
