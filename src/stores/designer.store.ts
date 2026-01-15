import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useLocalStorage } from "@vueuse/core";
import type { CharacterConfig, EffectConfig, SkillDesign, AnimationConfig } from "@/types";

/** 本地存储的数据结构 */
interface DesignerStorageData {
  characters: CharacterConfig[];
  effects: EffectConfig[];
  skills: SkillDesign[];
}

/** 存储 key */
const STORAGE_KEY = "designer-data";

/**
 * 设计器状态 Store
 * 管理角色、特效、技能的编辑状态
 * 数据自动持久化到 localStorage
 * Requirements: 4.5-4.7, 5.1-5.5
 */
export const useDesignerStore = defineStore("designer", () => {
  // ============ 持久化存储 ============
  const storage = useLocalStorage<DesignerStorageData>(STORAGE_KEY, {
    characters: [],
    effects: [],
    skills: [],
  });

  // ============ 状态 ============

  /** 角色配置列表 */
  const characters = ref<CharacterConfig[]>(storage.value.characters);

  /** 特效配置列表 */
  const effects = ref<EffectConfig[]>(storage.value.effects);

  /** 技能设计列表 */
  const skills = ref<SkillDesign[]>(storage.value.skills);

  /** 当前标签页 */
  const currentTab = ref<"character" | "effect" | "skill" | "json">("character");

  /** 当前编辑的角色 ID */
  const currentCharacterId = ref<string | null>(null);

  /** 当前编辑的特效 ID */
  const currentEffectId = ref<string | null>(null);

  /** 当前编辑的技能 ID */
  const currentSkillId = ref<string | null>(null);

  /** 是否有未保存的更改 */
  const hasUnsavedChanges = ref(false);

  // ============ 自动同步到 localStorage ============
  watch(
    [characters, effects, skills],
    () => {
      storage.value = {
        characters: characters.value,
        effects: effects.value,
        skills: skills.value,
      };
    },
    { deep: true },
  );

  // ============ 计算属性 ============

  /** 当前选中的角色 */
  const currentCharacter = computed(() => {
    if (!currentCharacterId.value) return null;
    return characters.value.find((c) => c.id === currentCharacterId.value) ?? null;
  });

  /** 当前选中的特效 */
  const currentEffect = computed(() => {
    if (!currentEffectId.value) return null;
    return effects.value.find((e) => e.id === currentEffectId.value) ?? null;
  });

  /** 当前选中的技能 */
  const currentSkill = computed(() => {
    if (!currentSkillId.value) return null;
    return skills.value.find((s) => s.id === currentSkillId.value) ?? null;
  });

  /** 角色总数 */
  const characterCount = computed(() => characters.value.length);

  /** 特效总数 */
  const effectCount = computed(() => effects.value.length);

  /** 技能总数 */
  const skillCount = computed(() => skills.value.length);

  /** 所有角色的动画总数 */
  const totalCharacterAnimations = computed(() =>
    characters.value.reduce((sum, char) => sum + char.animations.length, 0),
  );

  /** 所有特效的动画总数 */
  const totalEffectAnimations = computed(() =>
    effects.value.reduce((sum, effect) => sum + effect.animations.length, 0),
  );

  // ============ 工具方法 ============

  /** 生成唯一 ID */
  function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /** 标记有未保存的更改 */
  function markDirty(): void {
    hasUnsavedChanges.value = true;
  }

  /** 清除未保存标记 */
  function clearDirty(): void {
    hasUnsavedChanges.value = false;
  }

  // ============ 角色方法 ============

  /** 添加角色 */
  function addCharacter(config: CharacterConfig): string {
    characters.value.push(config);
    markDirty();
    return config.id;
  }

  /** 创建新角色 */
  function createCharacter(name: string): CharacterConfig {
    const newCharacter: CharacterConfig = {
      id: generateId("char"),
      name,
      sprite: {
        url: "",
        rows: 1,
        cols: 1,
      },
      animations: [],
    };
    addCharacter(newCharacter);
    return newCharacter;
  }

  /** 更新角色 */
  function updateCharacter(id: string, config: Partial<CharacterConfig>): void {
    const index = characters.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      characters.value[index] = { ...characters.value[index], ...config } as CharacterConfig;
      markDirty();
    }
  }

  /** 删除角色 */
  function removeCharacter(id: string): void {
    const index = characters.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      characters.value.splice(index, 1);
      if (currentCharacterId.value === id) {
        currentCharacterId.value = null;
      }
      markDirty();
    }
  }

  /** 获取角色 */
  function getCharacter(id: string): CharacterConfig | undefined {
    return characters.value.find((c) => c.id === id);
  }

  /** 复制角色 */
  function duplicateCharacter(id: string): CharacterConfig | null {
    const original = getCharacter(id);
    if (!original) return null;

    const copy: CharacterConfig = {
      ...original,
      id: generateId("char"),
      name: `${original.name} (副本)`,
      sprite: { ...original.sprite },
      animations: original.animations.map((anim) => ({ ...anim })),
    };
    addCharacter(copy);
    return copy;
  }

  /** 添加角色动画 */
  function addCharacterAnimation(characterId: string, animation: AnimationConfig): void {
    const character = getCharacter(characterId);
    if (character) {
      character.animations.push(animation);
      markDirty();
    }
  }

  /** 更新角色动画 */
  function updateCharacterAnimation(
    characterId: string,
    animationKey: string,
    updates: Partial<AnimationConfig>,
  ): void {
    const character = getCharacter(characterId);
    if (character) {
      const animIndex = character.animations.findIndex((a) => a.key === animationKey);
      if (animIndex !== -1) {
        const existing = character.animations[animIndex];
        if (existing) {
          character.animations[animIndex] = {
            key: updates.key ?? existing.key,
            frames: updates.frames ?? existing.frames,
            fps: updates.fps ?? existing.fps,
            repeat: updates.repeat ?? existing.repeat,
          };
          markDirty();
        }
      }
    }
  }

  /** 删除角色动画 */
  function removeCharacterAnimation(characterId: string, animationKey: string): void {
    const character = getCharacter(characterId);
    if (character) {
      const animIndex = character.animations.findIndex((a) => a.key === animationKey);
      if (animIndex !== -1) {
        character.animations.splice(animIndex, 1);
        markDirty();
      }
    }
  }

  /** 按名称查找角色 */
  function findCharacterByName(name: string): CharacterConfig | undefined {
    return characters.value.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));
  }

  // ============ 特效方法 ============

  /** 添加特效 */
  function addEffect(config: EffectConfig): string {
    effects.value.push(config);
    markDirty();
    return config.id;
  }

  /** 创建新特效 */
  function createEffect(name: string): EffectConfig {
    const newEffect: EffectConfig = {
      id: generateId("effect"),
      name,
      sprite: {
        url: "",
        rows: 1,
        cols: 1,
      },
      animations: [],
      blendMode: "normal",
    };
    addEffect(newEffect);
    return newEffect;
  }

  /** 更新特效 */
  function updateEffect(id: string, config: Partial<EffectConfig>): void {
    const index = effects.value.findIndex((e) => e.id === id);
    if (index !== -1) {
      effects.value[index] = { ...effects.value[index], ...config } as EffectConfig;
      markDirty();
    }
  }

  /** 删除特效 */
  function removeEffect(id: string): void {
    const index = effects.value.findIndex((e) => e.id === id);
    if (index !== -1) {
      effects.value.splice(index, 1);
      if (currentEffectId.value === id) {
        currentEffectId.value = null;
      }
      markDirty();
    }
  }

  /** 获取特效 */
  function getEffect(id: string): EffectConfig | undefined {
    return effects.value.find((e) => e.id === id);
  }

  /** 复制特效 */
  function duplicateEffect(id: string): EffectConfig | null {
    const original = getEffect(id);
    if (!original) return null;

    const copy: EffectConfig = {
      ...original,
      id: generateId("effect"),
      name: `${original.name} (副本)`,
      sprite: { ...original.sprite },
      animations: original.animations.map((anim) => ({ ...anim })),
    };
    addEffect(copy);
    return copy;
  }

  /** 添加特效动画 */
  function addEffectAnimation(effectId: string, animation: AnimationConfig): void {
    const effect = getEffect(effectId);
    if (effect) {
      effect.animations.push(animation);
      markDirty();
    }
  }

  /** 更新特效动画 */
  function updateEffectAnimation(effectId: string, animationKey: string, updates: Partial<AnimationConfig>): void {
    const effect = getEffect(effectId);
    if (effect) {
      const animIndex = effect.animations.findIndex((a) => a.key === animationKey);
      if (animIndex !== -1) {
        const existing = effect.animations[animIndex];
        if (existing) {
          effect.animations[animIndex] = {
            key: updates.key ?? existing.key,
            frames: updates.frames ?? existing.frames,
            fps: updates.fps ?? existing.fps,
            repeat: updates.repeat ?? existing.repeat,
          };
          markDirty();
        }
      }
    }
  }

  /** 删除特效动画 */
  function removeEffectAnimation(effectId: string, animationKey: string): void {
    const effect = getEffect(effectId);
    if (effect) {
      const animIndex = effect.animations.findIndex((a) => a.key === animationKey);
      if (animIndex !== -1) {
        effect.animations.splice(animIndex, 1);
        markDirty();
      }
    }
  }

  /** 按名称查找特效 */
  function findEffectByName(name: string): EffectConfig | undefined {
    return effects.value.find((e) => e.name.toLowerCase().includes(name.toLowerCase()));
  }

  // ============ 技能方法 ============

  /** 添加技能 */
  function addSkill(design: SkillDesign): void {
    skills.value.push(design);
    markDirty();
  }

  /** 创建新技能 */
  function createSkill(name: string): SkillDesign {
    const newSkill: SkillDesign = {
      id: generateId("skill"),
      name,
      steps: [],
      segments: [],
      tracks: [
        {
          id: generateId("track"),
          name: "轨道 1",
          locked: false,
          hidden: false,
        },
      ],
      totalFrames: 300,
      fps: 60,
    };
    addSkill(newSkill);
    return newSkill;
  }

  /** 更新技能 */
  function updateSkill(id: string, design: Partial<SkillDesign>): void {
    const index = skills.value.findIndex((s) => s.id === id);
    if (index !== -1) {
      skills.value[index] = { ...skills.value[index], ...design } as SkillDesign;
      markDirty();
    }
  }

  /** 删除技能 */
  function removeSkill(id: string): void {
    const index = skills.value.findIndex((s) => s.id === id);
    if (index !== -1) {
      skills.value.splice(index, 1);
      if (currentSkillId.value === id) {
        currentSkillId.value = null;
      }
      markDirty();
    }
  }

  /** 获取技能 */
  function getSkill(id: string): SkillDesign | undefined {
    return skills.value.find((s) => s.id === id);
  }

  /** 复制技能 */
  function duplicateSkill(id: string): SkillDesign | null {
    const original = getSkill(id);
    if (!original) return null;

    const copy: SkillDesign = {
      ...original,
      id: generateId("skill"),
      name: `${original.name} (副本)`,
      steps: original.steps.map((step) => ({ ...step, id: generateId("step") })),
      segments: original.segments.map((seg) => ({ ...seg, id: generateId("seg") })),
      tracks: original.tracks.map((track) => ({ ...track, id: generateId("track") })),
    };
    addSkill(copy);
    return copy;
  }

  /** 按名称查找技能 */
  function findSkillByName(name: string): SkillDesign | undefined {
    return skills.value.find((s) => s.name.toLowerCase().includes(name.toLowerCase()));
  }

  // ============ 批量操作 ============

  /** 批量删除角色 */
  function removeCharacters(ids: string[]): void {
    ids.forEach((id) => {
      const index = characters.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        characters.value.splice(index, 1);
      }
    });
    if (currentCharacterId.value && ids.includes(currentCharacterId.value)) {
      currentCharacterId.value = null;
    }
    markDirty();
  }

  /** 批量删除特效 */
  function removeEffects(ids: string[]): void {
    ids.forEach((id) => {
      const index = effects.value.findIndex((e) => e.id === id);
      if (index !== -1) {
        effects.value.splice(index, 1);
      }
    });
    if (currentEffectId.value && ids.includes(currentEffectId.value)) {
      currentEffectId.value = null;
    }
    markDirty();
  }

  /** 批量删除技能 */
  function removeSkills(ids: string[]): void {
    ids.forEach((id) => {
      const index = skills.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        skills.value.splice(index, 1);
      }
    });
    if (currentSkillId.value && ids.includes(currentSkillId.value)) {
      currentSkillId.value = null;
    }
    markDirty();
  }

  // ============ 导入导出 ============

  /** 导出所有数据 */
  function exportData(): {
    characters: CharacterConfig[];
    effects: EffectConfig[];
    skills: SkillDesign[];
  } {
    return {
      characters: characters.value.map((c) => ({ ...c })),
      effects: effects.value.map((e) => ({ ...e })),
      skills: skills.value.map((s) => ({ ...s })),
    };
  }

  /** 导入数据 */
  function importData(data: {
    characters?: CharacterConfig[];
    effects?: EffectConfig[];
    skills?: SkillDesign[];
  }): void {
    if (data.characters) {
      characters.value = data.characters;
    }
    if (data.effects) {
      effects.value = data.effects;
    }
    if (data.skills) {
      skills.value = data.skills;
    }
    currentCharacterId.value = null;
    currentEffectId.value = null;
    currentSkillId.value = null;
    markDirty();
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
    hasUnsavedChanges.value = false;
    // 同步清除 localStorage
    storage.value = { characters: [], effects: [], skills: [] };
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
    hasUnsavedChanges,
    // 计算属性
    currentCharacter,
    currentEffect,
    currentSkill,
    characterCount,
    effectCount,
    skillCount,
    totalCharacterAnimations,
    totalEffectAnimations,
    // 工具方法
    generateId,
    markDirty,
    clearDirty,
    // 角色方法
    addCharacter,
    createCharacter,
    updateCharacter,
    removeCharacter,
    getCharacter,
    duplicateCharacter,
    addCharacterAnimation,
    updateCharacterAnimation,
    removeCharacterAnimation,
    findCharacterByName,
    // 特效方法
    addEffect,
    createEffect,
    updateEffect,
    removeEffect,
    getEffect,
    duplicateEffect,
    addEffectAnimation,
    updateEffectAnimation,
    removeEffectAnimation,
    findEffectByName,
    // 技能方法
    addSkill,
    createSkill,
    updateSkill,
    removeSkill,
    getSkill,
    duplicateSkill,
    findSkillByName,
    // 批量操作
    removeCharacters,
    removeEffects,
    removeSkills,
    // 导入导出
    exportData,
    importData,
    // 重置
    reset,
  };
});
