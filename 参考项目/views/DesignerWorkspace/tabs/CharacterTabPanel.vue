<script setup lang="ts">
import type { CharacterConfig } from "@/core/designer/types";

const props = defineProps<{
  config: CharacterConfig;
  refreshPreview: () => void;
}>();

const cardClass =
  "space-y-4 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-inner shadow-black/40";
const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400 focus:bg-slate-950/80";
const buttonClass =
  "inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400";
</script>

<template>
  <div :class="cardClass">
    <h3 class="text-lg font-semibold text-white">人物属性</h3>
    <label class="flex flex-col gap-1">
      <span class="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400"
        >名称</span
      >
      <input v-model="props.config.name" :class="inputClass" type="text" />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400"
        >图片 URL</span
      >
      <input v-model="props.config.url" :class="inputClass" type="text" />
    </label>
    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1">
        <span class="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400"
          >行</span
        >
        <input
          v-model.number="props.config.rows"
          :class="inputClass"
          min="1"
          type="number"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400"
          >列</span
        >
        <input
          v-model.number="props.config.cols"
          :class="inputClass"
          min="1"
          type="number"
        />
      </label>
    </div>
    <label class="flex flex-col gap-1">
      <span class="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400"
        >帧数量</span
      >
      <input
        v-model.number="props.config.frameCount"
        :class="inputClass"
        min="1"
        type="number"
        :placeholder="`默认: ${props.config.rows * props.config.cols}`"
      />
    </label>
    <p class="flex items-center text-xs text-slate-500">
      <i class="fa fa-info-circle mr-1 text-slate-400" />
      帧数量用于指定实际使用的帧数,当图片未铺满时使用
    </p>
    <label class="flex flex-col gap-1">
      <span class="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400"
        >缩放比例</span
      >
      <input
        v-model.number="props.config.scale"
        :class="inputClass"
        min="0.1"
        max="10"
        step="0.1"
        type="number"
        placeholder="默认: 0.8"
      />
    </label>
    <p class="flex items-center text-xs text-slate-500">
      <i class="fa fa-info-circle mr-1 text-slate-400" />
      角色在战斗场景中的显示缩放比例，建议范围 0.5 - 3.0
    </p>
    <button :class="buttonClass" type="button" @click="props.refreshPreview">
      <i class="fa fa-refresh mr-2 text-sm" />
      刷新预览
    </button>
  </div>
</template>
