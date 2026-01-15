<script setup lang="ts">
const props = defineProps<{
  hasController: boolean;
}>();

const emits = defineEmits<{
  (e: "refresh"): void;
  (e: "apply"): void;
}>();

const cardClass =
  "space-y-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-inner shadow-black/40";
const secondaryButtonClass =
  "inline-flex w-full items-center justify-center rounded-full border border-white/20 px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-slate-100 transition hover:border-emerald-400";
const primaryButtonClass =
  "inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40";
</script>

<template>
  <div :class="cardClass">
    <h3 class="text-lg font-semibold text-white">JSON 配置</h3>
    <p class="text-sm text-slate-400">
      在右侧查看与编辑完整的 JSON 配置，支持同步到战斗界面。
    </p>
    <button
      :class="secondaryButtonClass"
      type="button"
      @click="emits('refresh')"
    >
      根据当前表单刷新
    </button>
    <button
      :disabled="!props.hasController"
      :class="primaryButtonClass"
      type="button"
      @click="emits('apply')"
    >
      应用到战斗界面
    </button>
  </div>
</template>
