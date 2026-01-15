import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import type {
  CharacterConfig,
  EffectConfig,
  SkillDesign,
} from "@/core/designer/types";

type CharacterEntry = CharacterConfig & {
  id: string;
  createdAt: number;
  updatedAt: number;
};

type EffectEntry = EffectConfig & {
  id: string;
  createdAt: number;
  updatedAt: number;
};

type SkillEntry = SkillDesign & {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export type { CharacterEntry, EffectEntry, SkillEntry };

const STORAGE_KEYS = {
  characters: "designer-library-characters",
  effects: "designer-library-effects",
  skills: "designer-library-skills",
} as const;

const createId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const normalizeCharacterPayload = (config: CharacterConfig) => ({
  id: config.id,
  name: config.name,
  url: config.url,
  rows: config.rows,
  cols: config.cols,
  frameCount: config.frameCount,
});

const normalizeEffectPayload = (config: EffectConfig) => ({
  id: config.id,
  name: config.name,
  url: config.url,
  rows: config.rows,
  cols: config.cols,
  frameCount: config.frameCount,
});

const normalizeSkillPayload = (config: SkillDesign) => ({
  id: config.id,
  name: config.name,
  steps: config.steps.map((step) => ({
    type: step.type,
    params: { ...step.params },
  })),
  context: { ...config.context },
  targeting: {
    modes: [...config.targeting.modes],
    randomRange: [...config.targeting.randomRange] as [number, number],
    expressions: { ...config.targeting.expressions },
  },
  scaling: config.scaling.map((entry) => ({
    ...entry,
  })),
});

export const useDesignerLibraryStore = defineStore("designer-library", () => {
  const characters = useLocalStorage<CharacterEntry[]>(
    STORAGE_KEYS.characters,
    []
  );
  const effects = useLocalStorage<EffectEntry[]>(STORAGE_KEYS.effects, []);
  const skills = useLocalStorage<SkillEntry[]>(STORAGE_KEYS.skills, []);

  const saveCharacter = (config: CharacterConfig): CharacterEntry => {
    const payload = normalizeCharacterPayload(config);
    const timestamp = Date.now();
    if (payload.id) {
      const index = characters.value.findIndex(
        (character) => character.id === payload.id
      );
      if (index !== -1) {
        const existing = characters.value[index]!;
        const updated: CharacterEntry = {
          ...existing,
          ...payload,
          id: payload.id ?? existing.id,
          createdAt: existing.createdAt,
          updatedAt: timestamp,
        };
        characters.value.splice(index, 1, updated);
        return updated;
      }
    }

    const entry: CharacterEntry = {
      ...payload,
      id: payload.id ?? createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    characters.value.unshift(entry);
    return entry;
  };

  const saveEffect = (config: EffectConfig): EffectEntry => {
    const payload = normalizeEffectPayload(config);
    const timestamp = Date.now();
    if (payload.id) {
      const index = effects.value.findIndex(
        (effect) => effect.id === payload.id
      );
      if (index !== -1) {
        const existing = effects.value[index]!;
        const updated: EffectEntry = {
          ...existing,
          ...payload,
          id: payload.id ?? existing.id,
          createdAt: existing.createdAt,
          updatedAt: timestamp,
        };
        effects.value.splice(index, 1, updated);
        return updated;
      }
    }

    const entry: EffectEntry = {
      ...payload,
      id: payload.id ?? createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    effects.value.unshift(entry);
    return entry;
  };

  const saveSkill = (config: SkillDesign): SkillEntry => {
    const payload = normalizeSkillPayload(config);
    const timestamp = Date.now();
    if (payload.id) {
      const index = skills.value.findIndex((skill) => skill.id === payload.id);
      if (index !== -1) {
        const existing = skills.value[index]!;
        const updated: SkillEntry = {
          ...existing,
          ...payload,
          id: payload.id ?? existing.id,
          createdAt: existing.createdAt,
          updatedAt: timestamp,
        };
        skills.value.splice(index, 1, updated);
        return updated;
      }
    }

    const entry: SkillEntry = {
      ...payload,
      id: payload.id ?? createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    skills.value.unshift(entry);
    return entry;
  };

  const deleteCharacter = (id: string) => {
    characters.value = characters.value.filter(
      (character) => character.id !== id
    );
  };

  const deleteEffect = (id: string) => {
    effects.value = effects.value.filter((effect) => effect.id !== id);
  };

  const deleteSkill = (id: string) => {
    skills.value = skills.value.filter((skill) => skill.id !== id);
  };

  return {
    characters,
    effects,
    skills,
    saveCharacter,
    saveEffect,
    saveSkill,
    deleteCharacter,
    deleteEffect,
    deleteSkill,
  };
});
