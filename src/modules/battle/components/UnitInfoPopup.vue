<script setup lang="ts">
/**
 * @file 单位信息悬浮框组件
 * @description 鼠标悬停在单位上时显示的信息弹窗
 * 用于 UnifiedBattleCanvas 的 unit-info slot
 */
import { computed } from "vue";
import type { BattleUnit, Point } from "@/types";

// ============ Props ============

const props = defineProps<{
  /** 悬停的单位 */
  unit: BattleUnit | null;
  /** 鼠标位置 */
  position: Point | null;
}>();

// ============ 计算属性 ============

/** 弹窗位置样式 */
const popupStyle = computed(() => {
  if (!props.position) return {};

  // 偏移量，避免遮挡鼠标
  const offsetX = 16;
  const offsetY = 16;

  return {
    left: `${props.position.x + offsetX}px`,
    top: `${props.position.y + offsetY}px`,
  };
});

/** HP 百分比 */
const hpPercent = computed(() => {
  if (!props.unit) return 0;
  return Math.round((props.unit.hp / props.unit.maxHp) * 100);
});

/** MP 百分比 */
const mpPercent = computed(() => {
  if (!props.unit) return 0;
  return Math.round((props.unit.mp / props.unit.maxMp) * 100);
});

/** HP 条颜色 */
const hpBarColor = computed(() => {
  if (hpPercent.value > 50) return "bg-emerald-500";
  if (hpPercent.value > 25) return "bg-amber-500";
  return "bg-red-500";
});
</script>

<template>
  <Transition name="fade">
    <div
      v-if="unit && position"
      class="pointer-events-none absolute z-50 min-w-40 rounded-lg border border-slate-600 bg-slate-800/95 p-3 shadow-xl backdrop-blur-sm"
      :style="popupStyle"
    >
      <!-- 单位名称 -->
      <div class="mb-2 flex items-center gap-2">
        <span class="size-2 rounded-full" :class="unit.isPlayer ? 'bg-blue-500' : 'bg-red-500'" />
        <span class="font-bold text-white">{{ unit.name }}</span>
        <span v-if="unit.isDead" class="text-xs text-red-400">（已阵亡）</span>
      </div>

      <!-- HP 条 -->
      <div class="mb-1.5">
        <div class="mb-0.5 flex items-center justify-between text-xs">
          <span class="text-gray-400">HP</span>
          <span class="text-gray-300">{{ unit.hp }} / {{ unit.maxHp }}</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            class="h-full transition-all duration-300"
            :class="hpBarColor"
            :style="{ width: `${hpPercent}%` }"
          />
        </div>
      </div>

      <!-- MP 条 -->
      <div class="mb-2">
        <div class="mb-0.5 flex items-center justify-between text-xs">
          <span class="text-gray-400">MP</span>
          <span class="text-gray-300">{{ unit.mp }} / {{ unit.maxMp }}</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            class="h-full bg-blue-500 transition-all duration-300"
            :style="{ width: `${mpPercent}%` }"
          />
        </div>
      </div>

      <!-- 速度 -->
      <div class="flex items-center justify-between text-xs">
        <span class="text-gray-400">速度</span>
        <span class="text-gray-300">{{ unit.speed }}</span>
      </div>
    </div>
  </Transition>
</template>
