<script setup lang="ts">
import { computed } from "vue";
import {
  LockOutlined,
  LockOpenOutlined,
  VisibilityOutlined,
  VisibilityOffOutlined,
  DeleteOutlined,
} from "@vicons/material";
import type { TimelineTrack, TimelineSegment } from "@/types";

// Props
const props = defineProps<{
  /** 轨道数据 */
  track: TimelineTrack;
  /** 轨道上的片段 */
  segments: TimelineSegment[];
  /** 总宽度（像素） */
  totalWidth: number;
  /** 轨道高度 */
  height?: number;
  /** 是否可删除 */
  deletable?: boolean;
}>();

// Emits
const emit = defineEmits<{
  /** 切换锁定状态 */
  toggleLock: [trackId: string];
  /** 切换隐藏状态 */
  toggleHidden: [trackId: string];
  /** 删除轨道 */
  delete: [trackId: string];
  /** 更新轨道名称 */
  updateName: [trackId: string, name: string];
}>();

// 计算轨道样式
const trackStyle = computed(() => ({
  height: `${props.height || 48}px`,
  opacity: props.track.hidden ? 0.5 : 1,
}));

// 计算内容区域样式
const contentStyle = computed(() => ({
  width: `${props.totalWidth}px`,
  pointerEvents: props.track.locked ? ("none" as const) : ("auto" as const),
}));

// 切换锁定
function handleToggleLock() {
  emit("toggleLock", props.track.id);
}

// 切换隐藏
function handleToggleHidden() {
  emit("toggleHidden", props.track.id);
}

// 删除轨道
function handleDelete() {
  if (props.deletable !== false) {
    emit("delete", props.track.id);
  }
}

// 更新名称
function handleNameChange(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("updateName", props.track.id, target.value);
}
</script>

<template>
  <div class="flex border-b border-slate-200" :style="trackStyle">
    <!-- 轨道信息区域 -->
    <div class="flex w-44 shrink-0 items-center gap-2 border-r border-slate-200 bg-slate-50 px-3">
      <!-- 轨道指示条 -->
      <div class="h-4 w-1 shrink-0 rounded-full" :class="track.hidden ? 'bg-slate-300' : 'bg-indigo-500'" />

      <!-- 轨道名称 -->
      <input
        type="text"
        :value="track.name"
        class="w-full truncate bg-transparent text-sm font-medium text-slate-700 transition-colors outline-none focus:text-indigo-600"
        :class="{ 'text-slate-400 line-through': track.hidden, 'text-amber-600': track.locked }"
        :disabled="track.locked"
        @change="handleNameChange"
      />

      <!-- 操作按钮 -->
      <div
        class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
      >
        <!-- 锁定按钮 -->
        <button
          class="rounded p-1 transition-colors hover:bg-slate-200"
          :class="track.locked ? 'text-amber-500' : 'text-slate-400'"
          :title="track.locked ? '解锁轨道' : '锁定轨道'"
          @click="handleToggleLock"
        >
          <component :is="track.locked ? LockOutlined : LockOpenOutlined" class="size-4" />
        </button>

        <!-- 隐藏按钮 -->
        <button
          class="rounded p-1 transition-colors hover:bg-slate-200"
          :class="track.hidden ? 'text-slate-300' : 'text-slate-400'"
          :title="track.hidden ? '显示轨道' : '隐藏轨道'"
          @click="handleToggleHidden"
        >
          <component :is="track.hidden ? VisibilityOffOutlined : VisibilityOutlined" class="size-4" />
        </button>

        <!-- 删除按钮 -->
        <button
          v-if="deletable !== false"
          class="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          title="删除轨道"
          @click="handleDelete"
        >
          <DeleteOutlined class="size-4" />
        </button>
      </div>
    </div>

    <!-- 轨道内容区域（片段容器） -->
    <div class="relative flex-1 overflow-hidden bg-slate-50/50" :style="contentStyle">
      <!-- 锁定遮罩 -->
      <div v-if="track.locked" class="absolute inset-0 z-10 bg-amber-50/30" />

      <!-- 片段插槽 -->
      <slot name="segments" :segments="segments" :track="track" />
    </div>
  </div>
</template>
