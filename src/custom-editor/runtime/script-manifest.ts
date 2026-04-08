/**
 * 脚本清单定义
 *
 * 用途: 管理 Webview 中脚本的加载顺序与顺序约束
 * 好处: 清晰的依赖关系、易于维护、支持脚本排序验证
 */

/**
 * 脚本清单项
 */
export interface ScriptManifestEntry {
  /** 脚本名称（用于日志和调试） */
  name: string;

  /** 脚本在源代码中的位置（相对于扩展根目录）*/
  source: string;

  /** 此脚本依赖的其他脚本名称 */
  dependencies?: string[];

  /** 脚本的执行环境（'bootstrap' = inline, 'module' = src 标签加载） */
  type: 'bootstrap' | 'module';

  /** 是否必须加载（false 表示可选，取决于条件） */
  required?: boolean;

  /** 脚本的目的（用于调试） */
  description?: string;
}

/**
 * 脚本清单
 *
 * 定义 Webview 中脚本的加载顺序和依赖关系
 */
export const SCRIPT_MANIFEST: ScriptManifestEntry[] = [
  {
    name: 'bootstrap',
    source: '(inline)',
    type: 'bootstrap',
    required: true,
    description: '初始化全局 Bridge，为旧脚本提供兼容别名',
  },
  {
    name: 'message',
    source: '/media/message.js',
    type: 'module',
    required: true,
    dependencies: ['bootstrap'],
    description: '前端消息客户端（来自 src/custom-editor/message.ts）',
  },
  // 以下脚本根据预览类型动态加载
  // 由各个 Preview 子类在 getJSSource() 中返回
];

/**
 * 脚本顺序验证器
 */
export class ScriptOrderValidator {
  /**
   * 验证脚本顺序是否满足依赖关系
   * @param scripts 脚本列表
   * @returns 验证结果（包含错误信息）
   */
  static validate(scripts: ScriptManifestEntry[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const scriptMap = new Map(scripts.map((s) => [s.name, s]));

    // 检查依赖是否存在
    scripts.forEach((script) => {
      if (script.dependencies) {
        script.dependencies.forEach((dep) => {
          if (!scriptMap.has(dep)) {
            errors.push(`Script '${script.name}' 依赖不存在的脚本 '${dep}'`);
          }
        });
      }
    });

    // 检查依赖顺序（依赖应在使用之前）
    const scriptIndices = new Map(scripts.map((s, i) => [s.name, i]));
    scripts.forEach((script, index) => {
      if (script.dependencies) {
        script.dependencies.forEach((dep) => {
          const depIndex = scriptIndices.get(dep);
          if (depIndex !== undefined && depIndex > index) {
            errors.push(
              `Script '${script.name}' 在索引 ${index} 加载，但其依赖 '${dep}' 在索引 ${depIndex}`,
            );
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取影响的脚本链（某脚本的所有依赖者）
   * @param scriptName 脚本名
   * @param scripts 脚本列表
   * @returns 受影响的脚本列表
   */
  static getAffectedScripts(scriptName: string, scripts: ScriptManifestEntry[]): string[] {
    const affected = new Set<string>();

    const findDependents = (name: string) => {
      scripts.forEach((script) => {
        if (script.dependencies?.includes(name)) {
          affected.add(script.name);
          findDependents(script.name);
        }
      });
    };

    findDependents(scriptName);
    return Array.from(affected);
  }
}

/**
 * 脚本预加载顺序生成器
 * 根据依赖关系自动排序脚本
 */
export class ScriptOrderGenerator {
  /**
   * 使用拓扑排序生成脚本加载顺序
   * @param scripts 脚本列表
   * @returns 排序后的脚本列表
   */
  static topologicalSort(scripts: ScriptManifestEntry[]): ScriptManifestEntry[] {
    const sorted: ScriptManifestEntry[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (temp.has(name)) {
        throw new Error(`Circular dependency detected for script '${name}'`);
      }

      const script = scripts.find((s) => s.name === name);
      if (!script) return;

      temp.add(name);

      // 递归访问依赖
      if (script.dependencies) {
        script.dependencies.forEach((dep) => visit(dep));
      }

      temp.delete(name);
      visited.add(name);
      sorted.push(script);
    };

    scripts.forEach((script) => {
      if (!visited.has(script.name)) {
        visit(script.name);
      }
    });

    return sorted;
  }

  /**
   * 将脚本列表分组为加载阶段
   * @param scripts 脚本列表
   * @returns 分阶段的脚本列表
   */
  static groupByPhase(scripts: ScriptManifestEntry[]): Array<ScriptManifestEntry[]> {
    const phases: Array<ScriptManifestEntry[]> = [[]];
    const processed = new Set<string>();

    scripts.forEach((script) => {
      // 检查是否所有依赖都已处理
      const depsReady =
        !script.dependencies || script.dependencies.every((dep) => processed.has(dep));

      if (depsReady) {
        phases[phases.length - 1].push(script);
        processed.add(script.name);
      } else {
        // 需要新的阶段
        phases.push([script]);
        processed.add(script.name);
      }
    });

    return phases.filter((p) => p.length > 0);
  }
}
