<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import DelayedTeleport from "@/components/common/DelayedTeleport.vue";
import {
  DEFAULT_CHARACTER,
  DEFAULT_EFFECT,
  createDefaultSkill,
} from "@/core/config/defaults";
import { generateBattleConfigFromSandbox } from "@/core/utils/battleConfig";
import { SKILL_SANDBOX_UNITS } from "@/core/config/sandboxConfig";
import type {
  CharacterConfig,
  DesignerTool,
  EffectConfig,
  SkillDesign,
} from "@/core/designer/types";
import type { BattleController } from "@/core/game/BattleController";
import type { BattleJSONConfig } from "@/core/game/config";
import CharacterTab from "@/views/DesignerWorkspace/tabs/CharacterTab.vue";
import EffectTab from "@/views/DesignerWorkspace/tabs/EffectTab.vue";
import SkillTab from "@/views/DesignerWorkspace/tabs/SkillTab.vue";
import JsonTab from "@/views/DesignerWorkspace/tabs/JsonTab.vue";

const props = defineProps<{
  controller: BattleController | null;
  active?: boolean;
}>();

type WorkspaceTab = DesignerTool | "json";

const activeTool = ref<WorkspaceTab>("skill");
const toolTabs: WorkspaceTab[] = ["character", "effect", "skill", "json"];

// 各 tab 的配置数据
const characterConfig = reactive<CharacterConfig>({ ...DEFAULT_CHARACTER });
const effectConfig = reactive<EffectConfig>({ ...DEFAULT_EFFECT });
const skill = reactive<SkillDesign>(createDefaultSkill());
const configText = ref("");

// 生成 JSON 配置文本
const generateBattleConfig = (): BattleJSONConfig => {
  return generateBattleConfigFromSandbox(
    SKILL_SANDBOX_UNITS,
    800,
    600,
    [
      {
        name: skill.name,
        steps: skill.steps.map((step) => ({
          type: step.type,
          params: { ...step.params },
        })),
        context: { ...skill.context },
        targeting: {
          modes: [...skill.targeting.modes],
          randomRange: [...skill.targeting.randomRange] as [number, number],
          expressions: { ...skill.targeting.expressions },
        },
        scaling: skill.scaling.map((entry) => ({ ...entry })),
      },
    ],
    [{ ...effectConfig }]
  );
};

// 刷新 JSON 配置文本
const refreshConfigText = () => {
  configText.value = JSON.stringify(generateBattleConfig(), null, 2);
};

// 监听配置变化，自动刷新 JSON
watch(
  [characterConfig, effectConfig, skill],
  () => {
    refreshConfigText();
  },
  { deep: true }
);

// 初始化
refreshConfigText();
</script>

<template>
  <div class="flex h-full w-full flex-col bg-slate-950 text-slate-50">
    <DelayedTeleport
      :active="!!props.active"
      :delay="100"
      to="#designer-tool-anchor"
      wait-for-target
    >
      <div
        class="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/70 p-1 shadow-inner shadow-black/30"
      >
        <button
          v-for="tool in toolTabs"
          :key="tool"
          class="rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300 transition data-[active=true]:bg-emerald-500 data-[active=true]:text-white"
          :data-active="activeTool === tool"
          type="button"
          @click="activeTool = tool"
        >
          <i
            class="mr-2"
            :class="{
              'fa-user': tool === 'character',
              'fa-fire': tool === 'effect',
              'fa-scroll': tool === 'skill',
              'fa-code': tool === 'json',
            }"
          />
          {{
            tool === "character"
              ? "人物设计"
              : tool === "effect"
              ? "特效设计"
              : tool === "skill"
              ? "技能编排"
              : "JSON 配置"
          }}
        </button>
      </div>
    </DelayedTeleport>

    <CharacterTab
      v-if="activeTool === 'character'"
      :config="characterConfig"
      @update:config="
        (newConfig) => {
          Object.assign(characterConfig, newConfig);
        }
      "
    />
    <EffectTab
      v-else-if="activeTool === 'effect'"
      :config="effectConfig"
      @update:config="
        (newConfig) => {
          Object.assign(effectConfig, newConfig);
        }
      "
    />
    <SkillTab
      v-else-if="activeTool === 'skill'"
      :skill="skill"
      :controller="props.controller"
      @update:skill="
        (newSkill) => {
          Object.assign(skill, newSkill);
        }
      "
    />
    <JsonTab
      v-else
      :config-text="configText"
      :controller="props.controller"
      @update:config-text="configText = $event"
      @refresh="refreshConfigText"
      @apply="() => {}"
    />
  </div>
</template>
