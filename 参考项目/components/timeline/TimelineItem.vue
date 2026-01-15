<script setup lang="ts">
import type { TimelineItem } from "./useSkillTimeline";

const props = defineProps<{
  item: TimelineItem;
  selected: boolean;
  locked: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
}>();

const emit = defineEmits<{
  (e: "mousedown-body", ev: MouseEvent, item: TimelineItem): void;
  (e: "mousedown-resize-left", ev: MouseEvent, item: TimelineItem): void;
  (e: "mousedown-resize-right", ev: MouseEvent, item: TimelineItem): void;
  (e: "click", item: TimelineItem): void;
  (e: "delete", item: TimelineItem): void;
}>();

const handleBodyMouseDown = (e: MouseEvent) => {
  if (props.locked) return;
  emit("mousedown-body", e, props.item);
};

const handleResizeLeftMouseDown = (e: MouseEvent) => {
  if (props.locked) return;
  emit("mousedown-resize-left", e, props.item);
};

const handleResizeRightMouseDown = (e: MouseEvent) => {
  if (props.locked) return;
  emit("mousedown-resize-right", e, props.item);
};

const handleClick = () => {
  emit("click", props.item);
};

const handleDelete = () => {
  emit("delete", props.item);
};
</script>

<template>
  <div
    class="absolute rounded-md overflow-hidden border border-black/30 shadow-md group pointer-events-auto transition-opacity"
    :class="[
      item.colorClass,
      selected ? 'ring-2 ring-emerald-400' : '',
      locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    ]"
    :style="{
      left: left + 'px',
      top: top + 'px',
      width: Math.max(4, width) + 'px',
      height: height + 'px',
    }"
    @click.stop="handleClick"
  >
    <!-- 左侧缩放手柄区域：只在靠近边缘且 hover 到手柄窄条时才可见/可点 -->
    <div class="absolute inset-y-0 left-0 w-2 pointer-events-none">
      <div
        class="absolute inset-y-0 left-0 w-1 cursor-ew-resize bg-white/20 opacity-0 hover:opacity-100 transition-opacity pointer-events-auto"
        @mousedown.stop="handleResizeLeftMouseDown"
      ></div>
    </div>

    <!-- 中间用于拖拽移动的区域 -->
    <div
      class="w-full h-full px-2 flex flex-col justify-center overflow-hidden cursor-grab active:cursor-grabbing"
      @mousedown.stop="handleBodyMouseDown"
    >
      <div
        class="text-[11px] font-bold text-white/90 truncate leading-tight select-none"
      >
        {{ item.name }}
      </div>
      <div class="text-[9px] text-white/60 truncate font-mono">
        {{ item.duration.toFixed(2) }}s
      </div>
    </div>

    <!-- 右侧缩放手柄区域 -->
    <div class="absolute inset-y-0 right-0 w-2 pointer-events-none">
      <div
        class="absolute inset-y-0 right-0 w-1 cursor-ew-resize bg-white/20 opacity-0 hover:opacity-100 transition-opacity pointer-events-auto"
        @mousedown.stop="handleResizeRightMouseDown"
      ></div>
    </div>

    <button
      class="absolute right-1 top-1 hidden group-hover:block bg-slate-900/60 hover:bg-red-500 text-white rounded p-0.5 backdrop-blur-sm transition-colors"
      @click.stop="handleDelete"
      title="删除"
    >
      <svg
        class="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
</template>
