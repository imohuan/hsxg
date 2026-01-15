import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { ProjectConfig, CharacterConfig, EffectConfig, SkillDesign } from "@/types";
import { ErrorType, AppError } from "@/types";

const STORAGE_KEY = "battle-game-config";
const CONFIG_VERSION = "1.0.0";

/** 验证错误详情 */
export interface ValidationError {
  path: string;
  message: string;
}

/** 验证结果 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * 配置数据 Store
 * 管理项目配置的序列化、反序列化和持久化
 * Requirements: 6.1-6.5, 10.1-10.5
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

  /** 最后保存时间 */
  const lastSavedAt = ref<Date | null>(null);

  // ============ 计算属性 ============

  /** 配置统计信息 */
  const stats = computed(() => ({
    characterCount: characters.value.length,
    effectCount: effects.value.length,
    skillCount: skills.value.length,
    totalAnimations:
      characters.value.reduce((sum, c) => sum + c.animations.length, 0) +
      effects.value.reduce((sum, e) => sum + e.animations.length, 0),
  }));

  // ============ 验证方法 ============

  /** 验证 SpriteConfig */
  function validateSpriteConfig(sprite: unknown, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    if (typeof sprite !== "object" || sprite === null) {
      errors.push({ path, message: "雪碧图配置必须是对象" });
      return errors;
    }

    const s = sprite as Record<string, unknown>;
    if (typeof s.url !== "string") {
      errors.push({ path: `${path}.url`, message: "url 必须是字符串" });
    }
    if (typeof s.rows !== "number" || s.rows < 1) {
      errors.push({ path: `${path}.rows`, message: "rows 必须是正整数" });
    }
    if (typeof s.cols !== "number" || s.cols < 1) {
      errors.push({ path: `${path}.cols`, message: "cols 必须是正整数" });
    }
    if (s.frameCount !== undefined && (typeof s.frameCount !== "number" || s.frameCount < 1)) {
      errors.push({ path: `${path}.frameCount`, message: "frameCount 必须是正整数" });
    }
    if (s.fps !== undefined && (typeof s.fps !== "number" || s.fps < 1)) {
      errors.push({ path: `${path}.fps`, message: "fps 必须是正整数" });
    }
    if (s.scale !== undefined && (typeof s.scale !== "number" || s.scale <= 0)) {
      errors.push({ path: `${path}.scale`, message: "scale 必须是正数" });
    }

    return errors;
  }

  /** 验证 AnimationConfig */
  function validateAnimationConfig(anim: unknown, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    if (typeof anim !== "object" || anim === null) {
      errors.push({ path, message: "动画配置必须是对象" });
      return errors;
    }

    const a = anim as Record<string, unknown>;
    if (typeof a.key !== "string" || a.key.trim() === "") {
      errors.push({ path: `${path}.key`, message: "key 必须是非空字符串" });
    }
    if (!Array.isArray(a.frames)) {
      errors.push({ path: `${path}.frames`, message: "frames 必须是数组" });
    } else if (!a.frames.every((f) => typeof f === "number" && f >= 0)) {
      errors.push({ path: `${path}.frames`, message: "frames 必须是非负整数数组" });
    }
    if (typeof a.fps !== "number" || a.fps < 1) {
      errors.push({ path: `${path}.fps`, message: "fps 必须是正整数" });
    }
    if (typeof a.repeat !== "number") {
      errors.push({ path: `${path}.repeat`, message: "repeat 必须是数字" });
    }

    return errors;
  }

  /** 验证 CharacterConfig */
  function validateCharacterConfig(char: unknown, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    if (typeof char !== "object" || char === null) {
      errors.push({ path, message: "角色配置必须是对象" });
      return errors;
    }

    const c = char as Record<string, unknown>;
    if (typeof c.id !== "string" || c.id.trim() === "") {
      errors.push({ path: `${path}.id`, message: "id 必须是非空字符串" });
    }
    if (typeof c.name !== "string" || c.name.trim() === "") {
      errors.push({ path: `${path}.name`, message: "name 必须是非空字符串" });
    }

    errors.push(...validateSpriteConfig(c.sprite, `${path}.sprite`));

    if (!Array.isArray(c.animations)) {
      errors.push({ path: `${path}.animations`, message: "animations 必须是数组" });
    } else {
      c.animations.forEach((anim, i) => {
        errors.push(...validateAnimationConfig(anim, `${path}.animations[${i}]`));
      });
    }

    return errors;
  }

  /** 验证 EffectConfig */
  function validateEffectConfig(effect: unknown, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    if (typeof effect !== "object" || effect === null) {
      errors.push({ path, message: "特效配置必须是对象" });
      return errors;
    }

    const e = effect as Record<string, unknown>;
    if (typeof e.id !== "string" || e.id.trim() === "") {
      errors.push({ path: `${path}.id`, message: "id 必须是非空字符串" });
    }
    if (typeof e.name !== "string" || e.name.trim() === "") {
      errors.push({ path: `${path}.name`, message: "name 必须是非空字符串" });
    }

    errors.push(...validateSpriteConfig(e.sprite, `${path}.sprite`));

    if (!Array.isArray(e.animations)) {
      errors.push({ path: `${path}.animations`, message: "animations 必须是数组" });
    } else {
      e.animations.forEach((anim, i) => {
        errors.push(...validateAnimationConfig(anim, `${path}.animations[${i}]`));
      });
    }

    if (e.blendMode !== undefined && typeof e.blendMode !== "string") {
      errors.push({ path: `${path}.blendMode`, message: "blendMode 必须是字符串" });
    }

    return errors;
  }

  /** 验证 SkillStep */
  function validateSkillStep(step: unknown, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    if (typeof step !== "object" || step === null) {
      errors.push({ path, message: "技能步骤必须是对象" });
      return errors;
    }

    const s = step as Record<string, unknown>;
    if (typeof s.id !== "string" || s.id.trim() === "") {
      errors.push({ path: `${path}.id`, message: "id 必须是非空字符串" });
    }

    const validTypes = ["move", "damage", "effect", "wait", "camera", "shake", "background"];
    if (typeof s.type !== "string" || !validTypes.includes(s.type)) {
      errors.push({ path: `${path}.type`, message: `type 必须是以下之一: ${validTypes.join(", ")}` });
    }

    if (typeof s.params !== "object" || s.params === null) {
      errors.push({ path: `${path}.params`, message: "params 必须是对象" });
    }

    return errors;
  }

  /** 验证 TimelineSegment */
  function validateTimelineSegment(segment: unknown, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    if (typeof segment !== "object" || segment === null) {
      errors.push({ path, message: "时间轴片段必须是对象" });
      return errors;
    }

    const seg = segment as Record<string, unknown>;
    if (typeof seg.id !== "string" || seg.id.trim() === "") {
      errors.push({ path: `${path}.id`, message: "id 必须是非空字符串" });
    }
    if (typeof seg.stepId !== "string" || seg.stepId.trim() === "") {
      errors.push({ path: `${path}.stepId`, message: "stepId 必须是非空字符串" });
    }
    if (typeof seg.trackId !== "string" || seg.trackId.trim() === "") {
      errors.push({ path: `${path}.trackId`, message: "trackId 必须是非空字符串" });
    }
    if (typeof seg.startFrame !== "number" || seg.startFrame < 0) {
      errors.push({ path: `${path}.startFrame`, message: "startFrame 必须是非负整数" });
    }
    if (typeof seg.endFrame !== "number" || seg.endFrame < 0) {
      errors.push({ path: `${path}.endFrame`, message: "endFrame 必须是非负整数" });
    }
    if (
      typeof seg.startFrame === "number" &&
      typeof seg.endFrame === "number" &&
      seg.endFrame <= seg.startFrame
    ) {
      errors.push({ path: `${path}`, message: "endFrame 必须大于 startFrame" });
    }

    return errors;
  }

  /** 验证 TimelineTrack */
  function validateTimelineTrack(track: unknown, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    if (typeof track !== "object" || track === null) {
      errors.push({ path, message: "时间轴轨道必须是对象" });
      return errors;
    }

    const t = track as Record<string, unknown>;
    if (typeof t.id !== "string" || t.id.trim() === "") {
      errors.push({ path: `${path}.id`, message: "id 必须是非空字符串" });
    }
    if (typeof t.name !== "string" || t.name.trim() === "") {
      errors.push({ path: `${path}.name`, message: "name 必须是非空字符串" });
    }
    if (typeof t.locked !== "boolean") {
      errors.push({ path: `${path}.locked`, message: "locked 必须是布尔值" });
    }
    if (typeof t.hidden !== "boolean") {
      errors.push({ path: `${path}.hidden`, message: "hidden 必须是布尔值" });
    }

    return errors;
  }

  /** 验证 SkillDesign */
  function validateSkillDesign(skill: unknown, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    if (typeof skill !== "object" || skill === null) {
      errors.push({ path, message: "技能设计必须是对象" });
      return errors;
    }

    const s = skill as Record<string, unknown>;
    if (typeof s.id !== "string" || s.id.trim() === "") {
      errors.push({ path: `${path}.id`, message: "id 必须是非空字符串" });
    }
    if (typeof s.name !== "string" || s.name.trim() === "") {
      errors.push({ path: `${path}.name`, message: "name 必须是非空字符串" });
    }

    if (!Array.isArray(s.steps)) {
      errors.push({ path: `${path}.steps`, message: "steps 必须是数组" });
    } else {
      s.steps.forEach((step, i) => {
        errors.push(...validateSkillStep(step, `${path}.steps[${i}]`));
      });
    }

    if (!Array.isArray(s.segments)) {
      errors.push({ path: `${path}.segments`, message: "segments 必须是数组" });
    } else {
      s.segments.forEach((seg, i) => {
        errors.push(...validateTimelineSegment(seg, `${path}.segments[${i}]`));
      });
    }

    if (!Array.isArray(s.tracks)) {
      errors.push({ path: `${path}.tracks`, message: "tracks 必须是数组" });
    } else {
      s.tracks.forEach((track, i) => {
        errors.push(...validateTimelineTrack(track, `${path}.tracks[${i}]`));
      });
    }

    if (typeof s.totalFrames !== "number" || s.totalFrames < 1) {
      errors.push({ path: `${path}.totalFrames`, message: "totalFrames 必须是正整数" });
    }
    if (typeof s.fps !== "number" || s.fps < 1) {
      errors.push({ path: `${path}.fps`, message: "fps 必须是正整数" });
    }

    return errors;
  }

  /** 验证完整的 ProjectConfig */
  function validateConfigDetailed(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof config !== "object" || config === null) {
      return { valid: false, errors: [{ path: "", message: "配置必须是对象" }] };
    }

    const c = config as Record<string, unknown>;

    // 验证版本
    if (typeof c.version !== "string" || c.version.trim() === "") {
      errors.push({ path: "version", message: "version 必须是非空字符串" });
    }

    // 验证角色列表
    if (!Array.isArray(c.characters)) {
      errors.push({ path: "characters", message: "characters 必须是数组" });
    } else {
      c.characters.forEach((char, i) => {
        errors.push(...validateCharacterConfig(char, `characters[${i}]`));
      });
    }

    // 验证特效列表
    if (!Array.isArray(c.effects)) {
      errors.push({ path: "effects", message: "effects 必须是数组" });
    } else {
      c.effects.forEach((effect, i) => {
        errors.push(...validateEffectConfig(effect, `effects[${i}]`));
      });
    }

    // 验证技能列表
    if (!Array.isArray(c.skills)) {
      errors.push({ path: "skills", message: "skills 必须是数组" });
    } else {
      c.skills.forEach((skill, i) => {
        errors.push(...validateSkillDesign(skill, `skills[${i}]`));
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /** 简单验证配置数据格式（用于类型守卫） */
  function validateConfig(config: unknown): config is ProjectConfig {
    const result = validateConfigDetailed(config);
    return result.valid;
  }

  // ============ 导出方法 ============

  /** 导出配置为 ProjectConfig 对象 */
  function exportConfig(): ProjectConfig {
    return {
      version: version.value,
      characters: JSON.parse(JSON.stringify(characters.value)) as CharacterConfig[],
      effects: JSON.parse(JSON.stringify(effects.value)) as EffectConfig[],
      skills: JSON.parse(JSON.stringify(skills.value)) as SkillDesign[],
    };
  }

  /** 导出配置为 JSON 字符串 */
  function exportConfigAsJson(pretty = true): string {
    return pretty ? JSON.stringify(exportConfig(), null, 2) : JSON.stringify(exportConfig());
  }

  /** 下载配置为 JSON 文件 */
  function downloadConfigAsFile(filename?: string): void {
    const json = exportConfigAsJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `${projectName.value}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============ 导入方法 ============

  /** 导入配置 */
  function importConfig(config: ProjectConfig): void {
    const result = validateConfigDetailed(config);
    if (!result.valid) {
      throw new AppError(ErrorType.INVALID_CONFIG, "配置数据格式无效", {
        errors: result.errors,
      });
    }

    version.value = config.version;
    characters.value = JSON.parse(JSON.stringify(config.characters)) as CharacterConfig[];
    effects.value = JSON.parse(JSON.stringify(config.effects)) as EffectConfig[];
    skills.value = JSON.parse(JSON.stringify(config.skills)) as SkillDesign[];
    hasUnsavedChanges.value = false;
  }

  /** 从 JSON 字符串导入配置 */
  function importConfigFromJson(json: string): ValidationResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return {
        valid: false,
        errors: [{ path: "", message: "JSON 解析失败，请检查格式是否正确" }],
      };
    }

    const result = validateConfigDetailed(parsed);
    if (!result.valid) {
      return result;
    }

    importConfig(parsed as ProjectConfig);
    return { valid: true, errors: [] };
  }

  /** 从文件导入配置 */
  async function importConfigFromFile(file: File): Promise<ValidationResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
          resolve({ valid: false, errors: [{ path: "", message: "文件内容为空" }] });
          return;
        }
        resolve(importConfigFromJson(content));
      };
      reader.onerror = () => {
        resolve({ valid: false, errors: [{ path: "", message: "文件读取失败" }] });
      };
      reader.readAsText(file);
    });
  }

  // ============ 持久化方法 ============

  /** 检查 localStorage 是否可用 */
  function isLocalStorageAvailable(): boolean {
    try {
      const testKey = "__test__";
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /** 保存到 localStorage */
  function saveToLocalStorage(): boolean {
    if (!isLocalStorageAvailable()) {
      console.warn("localStorage 不可用，无法保存配置");
      return false;
    }

    try {
      const data = {
        projectName: projectName.value,
        savedAt: new Date().toISOString(),
        config: exportConfig(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      hasUnsavedChanges.value = false;
      lastSavedAt.value = new Date();
      return true;
    } catch (error) {
      console.error("保存到 localStorage 失败:", error);
      throw new AppError(ErrorType.STORAGE_ERROR, "保存到 localStorage 失败", {
        error: String(error),
      });
    }
  }

  /** 从 localStorage 加载 */
  function loadFromLocalStorage(): boolean {
    if (!isLocalStorageAvailable()) {
      console.warn("localStorage 不可用，无法加载配置");
      return false;
    }

    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) {
        return false;
      }

      const data = JSON.parse(json) as {
        projectName?: string;
        savedAt?: string;
        config?: unknown;
      };

      if (data.projectName) {
        projectName.value = data.projectName;
      }

      if (data.savedAt) {
        lastSavedAt.value = new Date(data.savedAt);
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
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /** 检查是否有已保存的配置 */
  function hasSavedConfig(): boolean {
    if (!isLocalStorageAvailable()) {
      return false;
    }
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  // ============ 与 designer.store 同步 ============

  /** 从 designer.store 同步数据 */
  function syncFromDesignerStore(data: {
    characters: CharacterConfig[];
    effects: EffectConfig[];
    skills: SkillDesign[];
  }): void {
    characters.value = JSON.parse(JSON.stringify(data.characters)) as CharacterConfig[];
    effects.value = JSON.parse(JSON.stringify(data.effects)) as EffectConfig[];
    skills.value = JSON.parse(JSON.stringify(data.skills)) as SkillDesign[];
    hasUnsavedChanges.value = true;
  }

  /** 导出数据到 designer.store 格式 */
  function exportToDesignerStore(): {
    characters: CharacterConfig[];
    effects: EffectConfig[];
    skills: SkillDesign[];
  } {
    return {
      characters: JSON.parse(JSON.stringify(characters.value)) as CharacterConfig[],
      effects: JSON.parse(JSON.stringify(effects.value)) as EffectConfig[],
      skills: JSON.parse(JSON.stringify(skills.value)) as SkillDesign[],
    };
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
    lastSavedAt.value = null;
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
    lastSavedAt,
    // 计算属性
    stats,
    // 验证方法
    validateConfig,
    validateConfigDetailed,
    // 导出方法
    exportConfig,
    exportConfigAsJson,
    downloadConfigAsFile,
    // 导入方法
    importConfig,
    importConfigFromJson,
    importConfigFromFile,
    // 持久化方法
    isLocalStorageAvailable,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    hasSavedConfig,
    // 同步方法
    syncFromDesignerStore,
    exportToDesignerStore,
    // 重置方法
    reset,
    markAsChanged,
  };
});
