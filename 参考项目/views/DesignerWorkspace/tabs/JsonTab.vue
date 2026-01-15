<script setup lang="ts">
import { computed, ref, watch } from "vue";
import DesignerTabLayout from "@/components/designer/DesignerTabLayout.vue";
import JsonTreeViewer from "@/components/json/JsonTreeViewer.vue";
import JsonTabPanel from "./JsonTabPanel.vue";
import type { BattleJSONConfig } from "@/core/game/config";
import type { BattleController } from "@/core/game/BattleController";

const props = defineProps<{
  configText: string;
  controller: BattleController | null;
}>();

const emit = defineEmits<{
  (e: "update:configText", text: string): void;
  (e: "refresh"): void;
  (e: "apply"): void;
}>();

const configText = ref(props.configText);
const configMessage = ref("");

const parsedConfigState = computed(() => {
  try {
    return {
      data: JSON.parse(configText.value) as BattleJSONConfig,
      error: "",
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "JSON 解析失败",
    };
  }
});

const parsedConfig = computed(() => parsedConfigState.value.data);
const parsedConfigError = computed(() => parsedConfigState.value.error);

const refreshConfigText = () => {
  emit("refresh");
};

const applyJsonConfig = () => {
  try {
    const parsed = JSON.parse(configText.value) as BattleJSONConfig;
    props.controller?.applyConfig(parsed);
    configMessage.value = "配置已成功应用至战斗场景";
    emit("apply");
  } catch (error) {
    configMessage.value =
      error instanceof Error
        ? `配置解析失败：${error.message}`
        : "配置解析失败，请检查格式";
  }
};

// 监听 configText 变化，同步到父组件
watch(
  () => configText.value,
  (newValue) => {
    emit("update:configText", newValue);
  }
);

// 监听 props.configText 变化，同步到本地
watch(
  () => props.configText,
  (newValue) => {
    if (newValue !== configText.value) {
      configText.value = newValue;
    }
  }
);
</script>

<template>
  <DesignerTabLayout>
    <template #left>
      <JsonTabPanel
        :has-controller="!!props.controller"
        @apply="applyJsonConfig"
        @refresh="refreshConfigText"
      />
    </template>

    <template #right>
      <div class="flex flex-1 flex-col overflow-y-auto px-6 py-6">
        <div
          class="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/85 p-6 font-mono shadow-inner shadow-black/40"
        >
          <div class="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
            <div
              class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-900/70 bg-slate-950/90 p-3"
            >
              <JsonTreeViewer
                class="flex-1 overflow-auto"
                v-if="parsedConfig"
                :data="parsedConfig"
                :expand-all="true"
              />
              <div
                v-else
                class="flex flex-1 flex-col items-center justify-center gap-2 text-center text-xs text-slate-400"
              >
                <p>当前 JSON 不可解析，请检查语法。</p>
                <p v-if="parsedConfigError">错误：{{ parsedConfigError }}</p>
              </div>
            </div>
          </div>
          <p
            class="text-xs"
            :class="
              configMessage.includes('失败')
                ? 'text-red-400'
                : 'text-emerald-300'
            "
          >
            {{ configMessage }}
          </p>
          <p
            v-if="!parsedConfig && parsedConfigError"
            class="text-xs text-red-400"
          >
            JSON 解析失败：{{ parsedConfigError }}
          </p>
        </div>
      </div>
    </template>
  </DesignerTabLayout>
</template>
