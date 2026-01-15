import { defineStore } from "pinia";
import { ref } from "vue";
import type { ProjectConfig, CharacterConfig, EffectConfig, SkillDesign } from "@/types";
import { ErrorType, AppError } from "@/types";

const STORAGE_KEY = "battle-game-config";
const CONFIG_VERSION = "1.0.0";

/**
 * 配置数据 Store
 * 管理项目配置的序列化、反序列化和持久化
 */
export const useConfigStore = defineStore("config", () => {
  // ============ 状态 ============

  /** 项目名称 */
  const projectName = ref("未命名项目");

  /** 配置版本 */
  const version = ref(CONFIG_VERSION);

  /** 角色配置列表 */
  const characters = ref<CharacterConfig[]>([]);

  /** 特效配置列表 */
  const effects = ref<EffectConfig[]>([]);

  /** 技能设计列表 */
  const skills = ref<SkillDesign[]>([]);

  /** 是否有未保存的更改 */
  const hasUnsavedChanges = ref(false);

  // ============ 导出方法 ============

  /** 导出配置为 ProjectConfig 对象 */
  function exportConfig(): ProjectConfig {
    return {
      version: version.value,
      characters: characters.value,
      effects: effects.value,
      skills: skills.value,
    };
  }

  /** 导出配置为 JSON 字符串 */
  function exportConfigAsJson(): string {
    return JSON.stringify(exportConfig(), null, 2);
  }

  // ============ 导入方法 ============

  /** 验证配置数据格式 */
  function validateConfig(config: unknown): config is ProjectConfig {
    if (typeof config !== "object" || config === null) {
      return false;
    }

    const c = config as Record<string, unknown>;

    // 检查必需字段
    if (typeof c.version !== "string") return false;
    if (!Array.isArray(c.characters)) return false;
    if (!Array.isArray(c.effects)) return false;
    if (!Array.isArray(c.skills)) return false;

    return true;
  }

  /** 导入配置 */
  function importConfig(config: ProjectConfig): void {
    if (!validateConfig(config)) {
      throw new AppError(ErrorType.INVALID_CONFIG, "配置数据格式无效", { config });
    }

    version.value = config.version;
    characters.value = config.characters;
    effects.value = config.effects;
    skills.value = config.skills;
    hasUnsavedChanges.value = false;
  }

  /** 从 JSON 字符串导入配置 */
  function importConfigFromJson(json: string): void {
    try {
      const config = JSON.parse(json) as unknown;
      if (!validateConfig(config)) {
        throw new AppError(ErrorType.INVALID_CONFIG, "JSON 数据格式无效");
      }
      importConfig(config);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ErrorType.INVALID_CONFIG, "JSON 解析失败", {
        error: String(error),
      });
    }
  }

  // ============ 持久化方法 ============

  /** 保存到 localStorage */
  function saveToLocalStorage(): void {
    try {
      const data = {
        projectName: projectName.value,
        config: exportConfig(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      hasUnsavedChanges.value = false;
    } catch (error) {
      throw new AppError(ErrorType.STORAGE_ERROR, "保存到 localStorage 失败", {
        error: String(error),
      });
    }
  }

  /** 从 localStorage 加载 */
  function loadFromLocalStorage(): boolean {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) {
        return false;
      }

      const data = JSON.parse(json) as { projectName?: string; config?: unknown };

      if (data.projectName) {
        projectName.value = data.projectName;
      }

      if (data.config && validateConfig(data.config)) {
        importConfig(data.config);
        return true;
      }

      return false;
    } catch (error) {
      console.warn("从 localStorage 加载配置失败:", error);
      return false;
    }
  }

  /** 清除 localStorage 数据 */
  function clearLocalStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ============ 重置方法 ============

  /** 重置所有配置 */
  function reset(): void {
    projectName.value = "未命名项目";
    version.value = CONFIG_VERSION;
    characters.value = [];
    effects.value = [];
    skills.value = [];
    hasUnsavedChanges.value = false;
  }

  /** 标记有未保存的更改 */
  function markAsChanged(): void {
    hasUnsavedChanges.value = true;
  }

  return {
    // 状态
    projectName,
    version,
    characters,
    effects,
    skills,
    hasUnsavedChanges,
    // 导出方法
    exportConfig,
    exportConfigAsJson,
    // 导入方法
    validateConfig,
    importConfig,
    importConfigFromJson,
    // 持久化方法
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    // 重置方法
    reset,
    markAsChanged,
  };
});
