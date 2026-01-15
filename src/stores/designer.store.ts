import { defineStore } from "pinia";
import { ref } from "vue";
import type { CharacterConfig, EffectConfig, SkillDesign } from "@/types";

/**
 * 设计器状态 Store
 * 管理角色、特效、技能的编辑状态
 */
export const useDesignerStore = defineStore("designer", () => {
  // ============ 状态 ============

  /** 角色配置列表 */
  const characters = ref<CharacterConfig[]>([]);

  /** 特效配置列表 */
  const effects = ref<EffectConfig[]>([]);

  /** 技能设计列表 */
  const skills = ref<SkillDesign[]>([]);

  /** 当前标签页 */
  const currentTab = ref<"character" | "effect" | "skill" | "json">("character");

  /** 当前编辑的角色 ID */
  const currentCharacterId = ref<string | null>(null);

  /** 当前编辑的特效 ID */
  const currentEffectId = ref<string | null>(null);

  /** 当前编辑的技能 ID */
  const currentSkillId = ref<string | null>(null);

  // ============ 角色方法 ============

  /** 添加角色 */
  function addCharacter(config: CharacterConfig): void {
    characters.value.push(config);
  }

  /** 更新角色 */
  function updateCharacter(id: string, config: Partial<CharacterConfig>): void {
    const index = characters.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      characters.value[index] = { ...characters.value[index], ...config } as CharacterConfig;
    }
  }

  /** 删除角色 */
  function removeCharacter(id: string): void {
    const index = characters.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      characters.value.splice(index, 1);
    }
  }

  /** 获取角色 */
  function getCharacter(id: string): CharacterConfig | undefined {
    return characters.value.find((c) => c.id === id);
  }

  // ============ 特效方法 ============

  /** 添加特效 */
  function addEffect(config: EffectConfig): void {
    effects.value.push(config);
  }

  /** 更新特效 */
  function updateEffect(id: string, config: Partial<EffectConfig>): void {
    const index = effects.value.findIndex((e) => e.id === id);
    if (index !== -1) {
      effects.value[index] = { ...effects.value[index], ...config } as EffectConfig;
    }
  }

  /** 删除特效 */
  function removeEffect(id: string): void {
    const index = effects.value.findIndex((e) => e.id === id);
    if (index !== -1) {
      effects.value.splice(index, 1);
    }
  }

  /** 获取特效 */
  function getEffect(id: string): EffectConfig | undefined {
    return effects.value.find((e) => e.id === id);
  }

  // ============ 技能方法 ============

  /** 添加技能 */
  function addSkill(design: SkillDesign): void {
    skills.value.push(design);
  }

  /** 更新技能 */
  function updateSkill(id: string, design: Partial<SkillDesign>): void {
    const index = skills.value.findIndex((s) => s.id === id);
    if (index !== -1) {
      skills.value[index] = { ...skills.value[index], ...design } as SkillDesign;
    }
  }

  /** 删除技能 */
  function removeSkill(id: string): void {
    const index = skills.value.findIndex((s) => s.id === id);
    if (index !== -1) {
      skills.value.splice(index, 1);
    }
  }

  /** 获取技能 */
  function getSkill(id: string): SkillDesign | undefined {
    return skills.value.find((s) => s.id === id);
  }

  // ============ 重置方法 ============

  /** 重置所有数据 */
  function reset(): void {
    characters.value = [];
    effects.value = [];
    skills.value = [];
    currentCharacterId.value = null;
    currentEffectId.value = null;
    currentSkillId.value = null;
  }

  return {
    // 状态
    characters,
    effects,
    skills,
    currentTab,
    currentCharacterId,
    currentEffectId,
    currentSkillId,
    // 角色方法
    addCharacter,
    updateCharacter,
    removeCharacter,
    getCharacter,
    // 特效方法
    addEffect,
    updateEffect,
    removeEffect,
    getEffect,
    // 技能方法
    addSkill,
    updateSkill,
    removeSkill,
    getSkill,
    // 重置
    reset,
  };
});
