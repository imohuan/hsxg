<script setup lang="ts">
/**
 * @file 目标信息面板
 * @description 选择目标时显示的信息面板，包含血量/蓝量和确认按钮
 */
import type { BattleUnit } from "@/types";

// ============ Props & Emits ============

defineProps<{
  /** 选中的目标单位 */
  target: BattleUnit | null;
}>();

const emit = defineEmits<{
  /** 确认选择 */
  confirm: [];
  /** 取消选择 */
  cancel: [];
}>();

// ============ 计算属性 ============

function getHpPercent(unit: BattleUnit): number {
  return Math.round((unit.hp / unit.maxHp) * 100);
}

function getMpPercent(unit: BattleUnit): number {
  if (unit.maxMp === 0) return 0;
  return Math.round((unit.mp / unit.maxMp) * 100);
}

function getHpColor(percent: number): string {
  if (percent > 50) return "bg-emerald-500";
  if (percent > 25) return "bg-amber-500";
  return "bg-red-500";
}
</script>

<template>
  <div
    v-if="target"
    class="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm"
    style="min-width: 160px"
  >
    <!-- 目标名称 -->
    <div class="text-base font-bold text-gray-800">
      {{ target.name }}
    </div>

    <!-- 血量条 -->
    <div class="w-full">
      <div class="mb-1 flex items-center justify-between text-xs">
        <span class="text-gray-500">HP</span>
        <span class="font-medium text-gray-700">{{ getHpPercent(target) }}%</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          class="h-full transition-all duration-300"
          :class="getHpColor(getHpPercent(target))"
          :style="{ width: `${getHpPercent(target)}%` }"
        />
      </div>
    </div>

    <!-- 蓝量条 -->
    <div class="w-full">
      <div class="mb-1 flex items-center justify-between text-xs">
        <span class="text-gray-500">MP</span>
        <span class="font-medium text-gray-700">{{ getMpPercent(target) }}%</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          class="h-full bg-blue-500 transition-all duration-300"
          :style="{ width: `${getMpPercent(target)}%` }"
        />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="mt-1 flex w-full gap-2">
      <button
        class="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
        @click="emit('cancel')"
      >
        取消
      </button>
      <button
        class="flex-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
        @click="emit('confirm')"
      >
        确认
      </button>
    </div>
  </div>
</template>
