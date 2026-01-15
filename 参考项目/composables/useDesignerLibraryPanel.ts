import { computed, ref, watch, type Ref } from "vue";
import { storeToRefs } from "pinia";
import {
  DEFAULT_CHARACTER,
  DEFAULT_EFFECT,
  createDefaultSkill,
} from "@/core/config/defaults";
import type {
  CharacterConfig,
  DesignerTool,
  EffectConfig,
  SkillDesign,
} from "@/core/designer/types";
import {
  useDesignerLibraryStore,
  type CharacterEntry,
  type EffectEntry,
  type SkillEntry,
} from "@/stores/designerLibrary";

export type WorkspaceTab = DesignerTool | "json";
export type LibraryItem = CharacterEntry | EffectEntry | SkillEntry;

interface UseDesignerLibraryPanelOptions {
  activeTool: Ref<WorkspaceTab>;
  characterConfig: CharacterConfig;
  effectConfig: EffectConfig;
  skill: SkillDesign;
  selectedStepIndex: Ref<number | null>;
  refreshPreview: () => void;
}

const cloneSkillSteps = (steps: SkillDesign["steps"]) =>
  steps.map((step) => ({
    type: step.type,
    params: { ...step.params },
  }));

const cloneSkillMeta = (skill: SkillDesign) => {
  const fallback = createDefaultSkill();
  const context = {
    ...fallback.context,
    ...(skill.context || {}),
  };
  const targetingSource = skill.targeting || fallback.targeting;
  const targeting = {
    modes: targetingSource.modes?.length
      ? [...targetingSource.modes]
      : [...fallback.targeting.modes],
    randomRange: (
      targetingSource.randomRange || fallback.targeting.randomRange
    ).slice(0, 2) as [number, number],
    expressions: {
      ...fallback.targeting.expressions,
      ...(targetingSource.expressions || {}),
    },
  };
  const scalingSource =
    skill.scaling && skill.scaling.length > 0
      ? skill.scaling
      : fallback.scaling;
  const scaling = scalingSource.map((entry, index) => ({
    id: entry.id ?? `formula-${index}`,
    label: entry.label ?? `公式 ${index + 1}`,
    expression: entry.expression ?? "level",
  }));

  return { context, targeting, scaling };
};

export const useDesignerLibraryPanel = ({
  activeTool,
  characterConfig,
  effectConfig,
  skill,
  selectedStepIndex,
  refreshPreview,
}: UseDesignerLibraryPanelOptions) => {
  const designerLibraryStore = useDesignerLibraryStore();
  const { characters, effects, skills } = storeToRefs(designerLibraryStore);

  const showLibraryPanel = computed(() => activeTool.value !== "json");

  const activeLibraryList = computed<LibraryItem[]>(() => {
    if (activeTool.value === "character") return characters.value;
    if (activeTool.value === "effect") return effects.value;
    if (activeTool.value === "skill") return skills.value;
    return [];
  });

  const activeLibraryTitle = computed(() => {
    if (activeTool.value === "character") return "人物列表";
    if (activeTool.value === "effect") return "特效列表";
    if (activeTool.value === "skill") return "技能列表";
    return "配置列表";
  });

  const activeLibraryDescription = computed(() => {
    if (activeTool.value === "character")
      return "保存常用人物配置，方便快速切换";
    if (activeTool.value === "effect") return "管理特效资源并复用在技能中";
    if (activeTool.value === "skill") return "保存技能动作序列以便复用";
    return "管理配置";
  });

  const selectedLibraryId = ref<string | null>(null);
  const libraryStatus = ref("");
  const preventAutoSelection = ref(false);

  const clearActiveConfigId = () => {
    if (activeTool.value === "character") {
      delete characterConfig.id;
    } else if (activeTool.value === "effect") {
      delete effectConfig.id;
    } else if (activeTool.value === "skill") {
      skill.id = undefined;
    }
  };

  const resetSkill = () => {
    const fresh = createDefaultSkill();
    skill.id = undefined;
    skill.name = fresh.name;
    skill.steps.splice(0, skill.steps.length);
    const meta = cloneSkillMeta(fresh);
    skill.context = meta.context;
    skill.targeting = meta.targeting;
    skill.scaling = meta.scaling;
    selectedStepIndex.value = null;
  };

  const selectLibraryItem = (item: LibraryItem) => {
    preventAutoSelection.value = false;
    selectedLibraryId.value = item.id;
    libraryStatus.value = "";
    if (activeTool.value === "character") {
      const { createdAt: _c, updatedAt: _u, ...rest } = item as CharacterEntry;
      Object.assign(characterConfig, rest);
      refreshPreview();
      return;
    }
    if (activeTool.value === "effect") {
      const { createdAt: _c, updatedAt: _u, ...rest } = item as EffectEntry;
      Object.assign(effectConfig, rest);
      refreshPreview();
      return;
    }
    if (activeTool.value === "skill") {
      const { createdAt: _c, updatedAt: _u, ...rest } = item as SkillEntry;
      skill.id = rest.id;
      skill.name = rest.name;
      skill.steps.splice(0, skill.steps.length, ...cloneSkillSteps(rest.steps));
      const meta = cloneSkillMeta(rest as SkillDesign);
      skill.context = meta.context;
      skill.targeting = meta.targeting;
      skill.scaling = meta.scaling;
      selectedStepIndex.value = skill.steps.length ? 0 : null;
    }
  };

  const saveCurrentToLibrary = () => {
    if (activeTool.value === "character") {
      const saved = designerLibraryStore.saveCharacter({
        ...characterConfig,
        id: selectedLibraryId.value ?? characterConfig.id,
      });
      selectedLibraryId.value = saved.id;
      libraryStatus.value = "人物配置已保存";
      return;
    }
    if (activeTool.value === "effect") {
      const saved = designerLibraryStore.saveEffect({
        ...effectConfig,
        id: selectedLibraryId.value ?? effectConfig.id,
      });
      selectedLibraryId.value = saved.id;
      libraryStatus.value = "特效配置已保存";
      return;
    }
    if (activeTool.value === "skill") {
      const meta = cloneSkillMeta(skill);
      const saved = designerLibraryStore.saveSkill({
        ...skill,
        ...meta,
        id: selectedLibraryId.value ?? skill.id,
        steps: cloneSkillSteps(skill.steps),
      });
      selectedLibraryId.value = saved.id;
      libraryStatus.value = "技能已保存";
    }
  };

  const deleteLibraryItem = (id: string) => {
    if (activeTool.value === "character") {
      designerLibraryStore.deleteCharacter(id);
    } else if (activeTool.value === "effect") {
      designerLibraryStore.deleteEffect(id);
    } else if (activeTool.value === "skill") {
      designerLibraryStore.deleteSkill(id);
    }
    if (selectedLibraryId.value === id) {
      selectedLibraryId.value = null;
    }
    libraryStatus.value = "已删除所选配置";
  };

  const createNewConfig = () => {
    preventAutoSelection.value = true;
    selectedLibraryId.value = null;
    clearActiveConfigId();
    libraryStatus.value = "";
    if (activeTool.value === "character") {
      Object.assign(characterConfig, { ...DEFAULT_CHARACTER });
      refreshPreview();
      return;
    }
    if (activeTool.value === "effect") {
      Object.assign(effectConfig, { ...DEFAULT_EFFECT });
      refreshPreview();
      return;
    }
    if (activeTool.value === "skill") {
      resetSkill();
    }
  };

  const clearSelection = () => {
    preventAutoSelection.value = true;
    selectedLibraryId.value = null;
    clearActiveConfigId();
    libraryStatus.value = "已取消列表选中";
  };

  const createBaselineLibraryEntry = () => {
    let entry: LibraryItem | null = null;
    if (activeTool.value === "character") {
      entry = designerLibraryStore.saveCharacter({ ...DEFAULT_CHARACTER });
    } else if (activeTool.value === "effect") {
      entry = designerLibraryStore.saveEffect({ ...DEFAULT_EFFECT });
    } else if (activeTool.value === "skill") {
      entry = designerLibraryStore.saveSkill({
        ...createDefaultSkill(),
      });
    }
    if (entry) {
      selectLibraryItem(entry);
    }
  };

  const ensureDefaultLibrarySelection = () => {
    if (activeTool.value === "json") return;
    const list = activeLibraryList.value;
    if (!list.length) {
      createBaselineLibraryEntry();
      return;
    }
    const hasSelected =
      !!selectedLibraryId.value &&
      list.some((item) => item.id === selectedLibraryId.value);
    if (!hasSelected && !preventAutoSelection.value) {
      selectLibraryItem(list[0]!);
    }
  };

  watch(activeLibraryList, () => ensureDefaultLibrarySelection(), {
    immediate: true,
  });

  watch(
    () => activeTool.value,
    () => {
      selectedLibraryId.value = null;
      clearActiveConfigId();
      libraryStatus.value = "";
      preventAutoSelection.value = false;
      ensureDefaultLibrarySelection();
    }
  );

  return {
    showLibraryPanel,
    activeLibraryList,
    activeLibraryTitle,
    activeLibraryDescription,
    selectedLibraryId,
    libraryStatus,
    selectLibraryItem,
    saveCurrentToLibrary,
    deleteLibraryItem,
    createNewConfig,
    clearSelection,
  };
};
