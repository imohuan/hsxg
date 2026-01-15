<script setup lang="ts">
import { computed } from "vue";
import { DeleteOutlined } from "@vicons/material";
import type { TimelineSegment, SkillStep, StepType } from "@/types";

// Props
const props = defineProps<{
  /** 片段数据 */
  segment: TimelineSegment;
  /** 关联的步骤 */
  step?: SkillStep;
  /** 是否选中 */
  selected?: boolean;
  /** 帧转像素的转换函数 */
  frameToPx: (frame: number) => number;
  /** 是否禁用（轨道锁定时） */
  disabled?: boolean;
}>();

// Emits
const emit = defineEmits<{
  /** 选中片段 */
  select: [segmentId: string];
  /** 删除片段 */
  delete: [segmentId: string];
  /** 开始拖拽移动 */
  dragStart: [segmentId: string, mode: "move" | "resize-start" | "resize-end", event: MouseEvent];
}>();

// 步骤类型颜色映射（亮色 SaaS 风格）
const stepTypeColors: Record<StepType, string> = {
  move: "bg-indigo-500",
  damage: "bg-rose-500",
  effect: "bg-violet-500",
  wait: "bg-slate-400",
  camera: "bg-emerald-500",
  shake: "bg-amber-500",
  background: "bg-cyan-500",
};

// 步骤类型名称映射
const stepTypeNames: Record<StepType, string> = {
  move: "移动",
  damage: "伤害",
  effect: "特效",
  wait: "等待",
  camera: "镜头",
  shake: "震动",
  background: "背景",
};

// 计算片段样式
const segmentStyle = computed(() => {
  const left = props.frameToPx(props.segment.startFrame);
  const width = props.frameToPx(props.segment.endFrame - props.segment.startFrame);

  return {
    left: `${left}px`,
    width: `${Math.max(width, 20)}px`, // 最小宽度 20px
  };
});

// 计算背景颜色
const bgColorClass = computed(() => {
  if (!props.step) return "bg-gray-600";
  return stepTypeColors[props.step.type] || "bg-gray-600";
});

// 计算步骤名称
const stepName = computed(() => {
  if (!props.step) return "未知";
  return stepTypeNames[props.step.type] || props.step.type;
});

// 选中片段
function handleSelect(event: MouseEvent) {
  event.stopPropagation();
  emit("select", props.segment.id);
}

// 删除片段
function handleDelete(event: MouseEvent) {
  event.stopPropagation();
  emit("delete", props.segment.id);
}

// 开始拖拽移动
function handleDragStart(event: MouseEvent) {
  if (props.disabled) return;
  event.stopPropagation();
  emit("dragStart", props.segment.id, "move", event);
}

// 开始调整起始位置
function handleResizeStartStart(event: MouseEvent) {
  if (props.disabled) return;
  event.stopPropagation();
  emit("dragStart", props.segment.id, "resize-start", event);
}

// 开始调整结束位置
function handleResizeEndStart(event: MouseEvent) {
  if (props.disabled) return;
  event.stopPropagation();
  emit("dragStart", props.segment.id, "resize-end", event);
}
</script>

<template>
  <div
    class="group absolute top-1 bottom-1 flex cursor-pointer items-center overflow-hidden rounded-md shadow-sm transition-all"
    :class="[
      bgColorClass,
      selected ? 'shadow-md ring-2 ring-indigo-400 ring-offset-1' : '',
      disabled ? 'cursor-not-allowed opacity-50' : 'hover:shadow-md hover:brightness-105',
    ]"
    :style="segmentStyle"
    @click="handleSelect"
    @mousedown="handleDragStart"
  >
    <!-- 左侧调整手柄 -->
    <div
      class="absolute top-0 left-0 h-full w-1.5 cursor-ew-resize bg-white/30 opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100"
      @mousedown="handleResizeStartStart"
    />

    <!-- 内容区域 -->
    <div class="flex flex-1 items-center justify-between px-2.5 text-xs font-medium text-white">
      <span class="truncate">{{ stepName }}</span>

      <!-- 删除按钮 -->
      <button
        v-if="selected && !disabled"
        class="ml-1 shrink-0 rounded p-0.5 transition-colors hover:bg-white/20"
        title="删除片段"
        @click="handleDelete"
      >
        <DeleteOutlined class="size-3" />
      </button>
    </div>

    <!-- 右侧调整手柄 -->
    <div
      class="absolute top-0 right-0 h-full w-1.5 cursor-ew-resize bg-white/30 opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100"
      @mousedown="handleResizeEndStart"
    />
  </div>
</template>
