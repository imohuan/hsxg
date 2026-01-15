<script setup lang="ts">
import { computed, ref } from "vue";
import { useSkillTimeline, type TimelineSegment } from "./useSkillTimeline";
import TimelineItem from "./TimelineItem.vue";

const props = defineProps<{
  segments: TimelineSegment[];
  totalFrames: number;
  currentFrame: number;
  fps: number;
  selectedStepIndex: number | null;
}>();

const emit = defineEmits<{
  (e: "update:current-frame", frame: number): void;
  (e: "select-step", index: number): void;
  (e: "delete-step", index: number): void;
  (e: "update-segment", index: number, start: number, end: number): void;
  (
    e: "drop-step",
    stepIndex: number,
    targetTime: number,
    trackId: string
  ): void;
}>();

const leftScrollContainer = ref<HTMLDivElement | null>(null);
const rightScrollContainer = ref<HTMLDivElement | null>(null);

const segmentsRef = computed(() => props.segments);
const totalFramesRef = computed(() => props.totalFrames);
const currentFrameRef = computed(() => props.currentFrame);
const fpsRef = computed(() => props.fps);
const selectedStepIndexRef = computed(() => props.selectedStepIndex);

const {
  TRACK_HEIGHT,
  zoom,
  tracks,
  visibleTracks,
  timelineItems,
  totalDuration,
  totalWidth,
  currentTime,
  snapLine,
  dragOverTrackId,
  ghostItem,
  timeToPx,
  pxToTime,
  formatTime,
  getTrackIndex,
  isTrackLocked,
  addTrack,
  deleteTrack,
  toggleLockTrack,
  toggleHideTrack,
  handleScroll,
  handleWheel,
  handleItemMouseDownBody,
  handleItemMouseDownResizeLeft,
  handleItemMouseDownResizeRight,
  handleItemClick,
  deleteItem,
  startScrubbing,
  handleTimelineClick,
  handleDragOver,
  handleDragLeave,
  handleDrop,
} = useSkillTimeline({
  segments: segmentsRef,
  totalFrames: totalFramesRef,
  currentFrame: currentFrameRef,
  fps: fpsRef,
  selectedStepIndex: selectedStepIndexRef,
  leftScrollContainer,
  rightScrollContainer,
  emitUpdateCurrentFrame: (frame) => emit("update:current-frame", frame),
  emitSelectStep: (index) => emit("select-step", index),
  emitDeleteStep: (index) => emit("delete-step", index),
  emitUpdateSegment: (index, start, end) =>
    emit("update-segment", index, start, end),
  emitDropStep: (stepIndex, targetTime, trackId) =>
    emit("drop-step", stepIndex, targetTime, trackId),
});

const rulerMajorStep = computed(() => {
  const z = zoom.value;
  if (z < 6) return 20; // 缩得很小时：每 20 秒一个大刻度
  if (z < 12) return 10; // 中等缩放：每 10 秒
  if (z < 24) return 5; // 默认：每 5 秒
  if (z < 48) return 2; // 放大：每 2 秒
  return 1; // 深度放大：每 1 秒
});

const rulerMinorStep = computed(() => {
  const major = rulerMajorStep.value;
  if (major >= 20) return major / 4; // 5s
  if (major >= 10) return major / 5; // 2s
  if (major >= 5) return 1; // 1s
  if (major >= 2) return 0.5; // 0.5s
  return 0.25; // 更大缩放时的细网格
});

const stepTypeColors: Record<string, string> = {
  move: "bg-emerald-600",
  damage: "bg-red-500",
  effect: "bg-violet-600",
  wait: "bg-amber-600",
};

const stepTypeNames: Record<string, string> = {
  move: "移动",
  damage: "伤害",
  effect: "特效",
  wait: "等待",
};
</script>

<template>
  <div
    class="h-full flex flex-col border-t border-white/10 bg-slate-900/60 select-none"
  >
    <div class="flex-1 flex overflow-scroll custom-scrollbar relative group">
      <!-- 左侧：轨道头 -->
      <div
        class="w-48 border-r border-white/10 flex flex-col shrink-0 z-20 relative"
        ref="leftScrollContainer"
      >
        <!-- 左上角：添加轨道按钮 -->
        <div
          class="sticky top-0 h-8 border-b border-white/10 shrink-0 shadow-sm z-20 px-3 flex items-center justify-between bg-slate-950"
        >
          <div></div>
          <button
            class="flex items-center justify-center gap-1 px-1.5 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-[10px] font-medium transition-colors"
            @click="addTrack"
            title="添加轨道"
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
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
            添加轨道
          </button>
        </div>

        <!-- 轨道头列表 -->
        <div class="flex-1 relative">
          <div class="pb-10">
            <div
              v-for="track in tracks"
              :key="track.id"
              class="border-b border-white/10 px-3 flex items-center justify-between hover:bg-black/60 transition-colors relative group"
              :class="{
                'opacity-50': track.hidden,
                'bg-amber-900/20': track.locked,
              }"
              :style="{ height: TRACK_HEIGHT + 'px' }"
            >
              <div
                class="flex items-center gap-2 overflow-hidden flex-1 min-w-0"
              >
                <div
                  class="w-1 h-4 rounded-full shrink-0"
                  :class="track.hidden ? 'bg-slate-500' : 'bg-emerald-500'"
                ></div>
                <span
                  class="text-xs text-slate-300 font-medium truncate"
                  :class="{
                    'line-through': track.hidden,
                    'text-amber-400': track.locked,
                  }"
                >
                  {{ track.name }}
                </span>
                <span
                  v-if="track.locked"
                  class="text-[10px] text-amber-400 flex-shrink-0"
                  title="已锁定"
                >
                  🔒
                </span>
                <span
                  v-if="track.hidden"
                  class="text-[10px] text-slate-500 flex-shrink-0"
                  title="已隐藏"
                >
                  👁️
                </span>
              </div>

              <div
                class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <button
                  class="p-1 hover:bg-white/10 rounded transition-colors"
                  :class="track.locked ? 'text-amber-400' : 'text-slate-400'"
                  @click.stop="toggleLockTrack(track.id)"
                  :title="track.locked ? '解锁' : '锁定'"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      v-if="track.locked"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    ></path>
                    <path
                      v-else
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    ></path>
                  </svg>
                </button>

                <button
                  class="p-1 hover:bg-white/10 rounded transition-colors"
                  :class="track.hidden ? 'text-slate-500' : 'text-slate-400'"
                  @click.stop="toggleHideTrack(track.id)"
                  :title="track.hidden ? '显示' : '隐藏'"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      v-if="track.hidden"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    ></path>
                    <path
                      v-else
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                    <path
                      v-if="!track.hidden"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    ></path>
                  </svg>
                </button>

                <button
                  class="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                  @click.stop="deleteTrack(track.id)"
                  :disabled="tracks.length <= 1"
                  :class="{
                    'opacity-50 cursor-not-allowed': tracks.length <= 1,
                  }"
                  title="删除轨道"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：时间轴区域 -->
      <div
        class="flex-1 relative bg-slate-950/50"
        ref="rightScrollContainer"
        @scroll="handleScroll"
        @wheel="handleWheel"
        @click="handleTimelineClick"
      >
        <!-- 标尺 -->
        <div
          class="sticky top-0 z-30 h-8 border-b border-white/10 backdrop-blur min-w-full"
          :style="{ width: totalWidth + 'px' }"
        >
          <div
            class="absolute inset-0 ruler-bg pointer-events-none bg-slate-950/50"
            :style="{
              backgroundSize: `${timeToPx(rulerMajorStep)}px 100%, ${timeToPx(
                rulerMinorStep
              )}px 100%`,
              // 第一层：主刻度线（与数字对齐，更亮）
              // 第二层：区间内的小刻度线（略暗但清晰可见）
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.85) 1px, transparent 1px), linear-gradient(to right, rgba(71,85,105,0.3) 1px, transparent 1px)',
            }"
          >
            <div
              v-for="i in Math.ceil((totalDuration + 20) / rulerMajorStep) + 2"
              :key="i"
              class="absolute top-0.5 text-[10px] font-mono text-slate-400 pl-1.5 select-none"
              :style="{ left: (i - 1) * rulerMajorStep * zoom + 'px' }"
            >
              {{ formatTime((i - 1) * rulerMajorStep) }}
            </div>
          </div>

          <!-- 播放头帽子 -->
          <div
            class="absolute top-0 bottom-0 w-0 z-40"
            :style="{ left: timeToPx(currentTime) + 'px' }"
          >
            <div
              class="absolute -translate-x-1/2 top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-emerald-400 cursor-ew-resize hover:scale-110 transition-transform"
              @mousedown.stop="startScrubbing"
            ></div>
          </div>
        </div>

        <!-- 轨道内容区域 -->
        <div
          class="relative min-w-full pb-20"
          :style="{ width: totalWidth + 'px' }"
        >
          <!-- 轨道背景线 -->
          <div
            v-for="track in visibleTracks"
            :key="'bg-' + track.id"
            class="border-b border-white/10 w-full relative box-border transition-colors"
            :class="{
              'bg-emerald-500/10 border-emerald-400/30':
                dragOverTrackId === track.id,
            }"
            :style="{ height: TRACK_HEIGHT + 'px' }"
            @dragover.prevent="handleDragOver($event, track.id)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, track.id)"
          >
            <div
              class="absolute inset-0 pointer-events-none border-r border-white/5"
              :style="{
                width: zoom + 'px',
                backgroundSize: zoom + 'px 100%',
              }"
            ></div>
          </div>

          <!-- 步骤块与临时标签 -->
          <div class="absolute inset-0 pointer-events-none">
            <TimelineItem
              v-for="item in timelineItems"
              :key="item.id"
              v-show="!tracks.find((t) => t.id === item.trackId)?.hidden"
              class="pointer-events-auto"
              :item="item"
              :selected="item.stepIndex === selectedStepIndex"
              :locked="isTrackLocked(item.trackId)"
              :left="timeToPx(item.start)"
              :top="getTrackIndex(item.trackId) * TRACK_HEIGHT + 2"
              :width="timeToPx(item.duration)"
              :height="TRACK_HEIGHT - 4"
              @mousedown-body="handleItemMouseDownBody"
              @mousedown-resize-left="handleItemMouseDownResizeLeft"
              @mousedown-resize-right="handleItemMouseDownResizeRight"
              @click="handleItemClick"
              @delete="deleteItem"
            />

            <!-- 从库拖拽时的临时标签 -->
            <div
              v-if="
                ghostItem &&
                !tracks.find((t) => t.id === ghostItem?.trackId)?.hidden
              "
              class="absolute rounded-md overflow-hidden border border-black/30 shadow-md pointer-events-none opacity-70"
              :class="[
                ghostItem
                  ? stepTypeColors[ghostItem.stepType] || 'bg-gray-600'
                  : 'bg-gray-600',
                'z-40',
              ]"
              :style="{
                left: ghostItem ? timeToPx(ghostItem.start) + 'px' : '0',
                top: ghostItem
                  ? getTrackIndex(ghostItem.trackId) * TRACK_HEIGHT + 2 + 'px'
                  : '0',
                width: ghostItem
                  ? Math.max(4, timeToPx(ghostItem.duration)) + 'px'
                  : '0',
                height: TRACK_HEIGHT - 4 + 'px',
              }"
            >
              <div
                class="w-full h-full px-2 flex flex-col justify-center overflow-hidden"
              >
                <div
                  class="text-[11px] font-bold text-white/90 truncate leading-tight select-none"
                >
                  {{
                    ghostItem
                      ? stepTypeNames[ghostItem.stepType] || ghostItem.stepType
                      : ""
                  }}
                </div>
                <div class="text-[9px] text-white/60 truncate font-mono">
                  {{ ghostItem ? ghostItem.duration.toFixed(2) + "s" : "" }}
                </div>
              </div>
            </div>
          </div>

          <!-- 吸附线 -->
          <div
            v-if="snapLine !== null"
            class="absolute top-0 bottom-0 w-px bg-yellow-400 z-[60] pointer-events-none shadow-[0_0_8px_rgba(250,204,21,0.6)]"
            :style="{ left: snapLine + 'px' }"
          >
            <div
              class="sticky top-10 ml-1 text-[10px] bg-yellow-400 text-black px-1 rounded font-mono font-bold inline-block"
            >
              {{ formatTime(pxToTime(snapLine || 0)) }}
            </div>
          </div>

          <!-- 播放头线 -->
          <div
            class="absolute top-0 bottom-0 w-px bg-emerald-400 z-40 pointer-events-none shadow-lg shadow-emerald-500/50"
            :style="{ left: timeToPx(currentTime) + 'px' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #0f172a;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 4px;
  border: 2px solid #0f172a;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.hide-v-scrollbar::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
}

.hide-v-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.ruler-bg {
  background-image: linear-gradient(to right, #475569 1px, transparent 1px),
    linear-gradient(to right, #334155 1px, transparent 1px);
  background-position: 0 0;
  background-repeat: repeat-x;
}
</style>
