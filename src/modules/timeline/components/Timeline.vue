<script setup lang="ts">
import { ref, computed, provide, toRef } from "vue";
import { PlayArrowOutlined, PauseOutlined, AddOutlined } from "@vicons/material";
import type { TimelineSegment, TimelineTrack, SkillStep, StepType } from "@/types";
import { useTimeline } from "../composables/useTimeline";
import { useDragDrop } from "../composables/useDragDrop";
import TimelineRuler from "./TimelineRuler.vue";
import TimelineTrackComponent from "./TimelineTrack.vue";
import TimelineSegmentComponent from "./TimelineSegment.vue";
import StepEditor from "./StepEditor.vue";

// Props
const props = withDefaults(
  defineProps<{
    /** 帧率 */
    fps?: number;
    /** 总帧数 */
    totalFrames?: number;
    /** 每秒对应的像素数 */
    pixelsPerSecond?: number;
  }>(),
  {
    fps: 30,
    totalFrames: 300,
    pixelsPerSecond: 100,
  },
);

// Emits
const emit = defineEmits<{
  /** 步骤变化 */
  stepsChange: [steps: SkillStep[]];
  /** 片段变化 */
  segmentsChange: [segments: TimelineSegment[]];
  /** 轨道变化 */
  tracksChange: [tracks: TimelineTrack[]];
}>();

// 响应式数据
const fpsRef = ref(props.fps);
const totalFramesRef = ref(props.totalFrames);
const segments = ref<TimelineSegment[]>([]);
const tracks = ref<TimelineTrack[]>([
  { id: "track_default_1", name: "轨道 1", locked: false, hidden: false },
]);
const steps = ref<SkillStep[]>([]);

// 使用时间轴 Hook
const timeline = useTimeline({
  fps: fpsRef,
  totalFrames: totalFramesRef,
  segments,
  tracks,
  steps,
});

// 帧转像素
function frameToPx(frame: number): number {
  return timeline.frameToTime(frame) * props.pixelsPerSecond * timeline.zoom.value;
}

// 像素转帧
function pxToFrame(px: number): number {
  const time = px / (props.pixelsPerSecond * timeline.zoom.value);
  return timeline.timeToFrame(time);
}

// 使用拖拽 Hook
const dragDrop = useDragDrop({
  currentFrame: timeline.currentFrame,
  fps: fpsRef,
  segments,
  pxToFrame,
  frameToPx,
  onUpdateSegment: (segmentId, startFrame, endFrame) => {
    return timeline.updateSegment(segmentId, startFrame, endFrame);
  },
});

// 计算总宽度
const totalWidth = computed(() => {
  return timeline.frameToTime(totalFramesRef.value) * props.pixelsPerSecond * timeline.zoom.value;
});

// 获取选中的步骤
const selectedStep = computed(() => {
  if (!timeline.selectedSegmentId.value) return null;
  const segment = segments.value.find((s) => s.id === timeline.selectedSegmentId.value);
  if (!segment) return null;
  return steps.value.find((s) => s.id === segment.stepId) || null;
});

// 获取轨道的片段
function getTrackSegments(trackId: string): TimelineSegment[] {
  return timeline.getTrackSegments(trackId);
}

// 获取片段对应的步骤
function getSegmentStep(segment: TimelineSegment): SkillStep | undefined {
  return steps.value.find((s) => s.id === segment.stepId);
}

// 添加轨道
function handleAddTrack() {
  timeline.addTrack();
  emit("tracksChange", tracks.value);
}

// 删除轨道
function handleDeleteTrack(trackId: string) {
  timeline.removeTrack(trackId);
  emit("tracksChange", tracks.value);
  emit("segmentsChange", segments.value);
}

// 切换轨道锁定
function handleToggleLock(trackId: string) {
  const track = tracks.value.find((t) => t.id === trackId);
  if (track) {
    timeline.updateTrack(trackId, { locked: !track.locked });
    emit("tracksChange", tracks.value);
  }
}

// 切换轨道隐藏
function handleToggleHidden(trackId: string) {
  const track = tracks.value.find((t) => t.id === trackId);
  if (track) {
    timeline.updateTrack(trackId, { hidden: !track.hidden });
    emit("tracksChange", tracks.value);
  }
}

// 更新轨道名称
function handleUpdateTrackName(trackId: string, name: string) {
  timeline.updateTrack(trackId, { name });
  emit("tracksChange", tracks.value);
}

// 选中片段
function handleSelectSegment(segmentId: string) {
  timeline.selectSegment(segmentId);
}

// 删除片段
function handleDeleteSegment(segmentId: string) {
  timeline.removeSegment(segmentId);
  emit("segmentsChange", segments.value);
}

// 开始拖拽
function handleDragStart(
  segmentId: string,
  mode: "move" | "resize-start" | "resize-end",
  event: MouseEvent,
) {
  dragDrop.startDrag(segmentId, mode, event);
}

// 处理刻度尺点击跳转
function handleSeek(frame: number) {
  timeline.seekTo(frame);
}

// 处理缩放变化
function handleZoomChange(newZoom: number) {
  timeline.zoom.value = newZoom;
}

// 更新步骤参数
function handleUpdateStepParams(stepId: string, params: Record<string, unknown>) {
  const step = steps.value.find((s) => s.id === stepId);
  if (step) {
    Object.assign(step.params, params);
    emit("stepsChange", steps.value);
  }
}

// 更新步骤类型
function handleUpdateStepType(stepId: string, type: StepType) {
  const step = steps.value.find((s) => s.id === stepId);
  if (step) {
    step.type = type;
    // 重置参数
    step.params = {};
    emit("stepsChange", steps.value);
  }
}

// 生成唯一 ID
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// 添加新步骤（从外部拖入或点击添加）
function addStep(type: StepType, trackId: string, startFrame: number): void {
  const step: SkillStep = {
    id: generateId("step"),
    type,
    params: {},
  };
  
  const segment = timeline.addSegment(step, trackId, startFrame);
  if (segment) {
    emit("stepsChange", steps.value);
    emit("segmentsChange", segments.value);
    timeline.selectSegment(segment.id);
  }
}

// 点击轨道内容区域添加步骤
function handleTrackClick(event: MouseEvent, trackId: string) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const frame = pxToFrame(x);
  
  // 默认添加移动步骤
  addStep("move", trackId, frame);
}

// 提供给子组件的方法
provide("addStep", addStep);
provide("frameToPx", frameToPx);
provide("pxToFrame", pxToFrame);
</script>

<template>
  <div class="flex h-full flex-col bg-gray-900">
    <!-- 工具栏 -->
    <div class="flex items-center gap-2 border-b border-gray-700 bg-gray-800 px-4 py-2">
      <!-- 播放控制 -->
      <button
        class="rounded p-1.5 hover:bg-gray-700"
        :class="timeline.isPlaying.value ? 'text-yellow-500' : 'text-white'"
        :title="timeline.isPlaying.value ? '暂停' : '播放'"
        @click="timeline.isPlaying.value ? timeline.pause() : timeline.play()"
      >
        <component
          :is="timeline.isPlaying.value ? PauseOutlined : PlayArrowOutlined"
          class="size-5"
        />
      </button>
      
      <!-- 时间显示 -->
      <div class="min-w-20 text-sm text-gray-400">
        {{ timeline.currentTime.value.toFixed(2) }}s / {{ timeline.totalDuration.value.toFixed(2) }}s
      </div>
      
      <!-- 分隔线 -->
      <div class="h-5 w-px bg-gray-600" />
      
      <!-- 帧数显示 -->
      <div class="text-sm text-gray-400">
        帧: {{ timeline.currentFrame.value }} / {{ totalFramesRef }}
      </div>
      
      <!-- 分隔线 -->
      <div class="h-5 w-px bg-gray-600" />
      
      <!-- 缩放控制 -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-400">缩放:</span>
        <input
          type="range"
          :value="timeline.zoom.value"
          min="0.25"
          max="4"
          step="0.25"
          class="w-24"
          @input="handleZoomChange(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="min-w-10 text-sm text-gray-400">{{ (timeline.zoom.value * 100).toFixed(0) }}%</span>
      </div>
      
      <!-- 弹性空间 -->
      <div class="flex-1" />
      
      <!-- 添加轨道按钮 -->
      <button
        class="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        @click="handleAddTrack"
      >
        <AddOutlined class="size-4" />
        添加轨道
      </button>
    </div>
    
    <!-- 主内容区域 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 时间轴区域 -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <!-- 刻度尺 -->
        <div class="flex shrink-0 border-b border-gray-700">
          <!-- 左侧占位 -->
          <div class="w-40 shrink-0 border-r border-gray-700 bg-gray-800" />
          <!-- 刻度尺 -->
          <div class="flex-1 overflow-x-auto">
            <TimelineRuler
              :total-frames="totalFramesRef"
              :fps="fpsRef"
              :zoom="timeline.zoom.value"
              :current-frame="timeline.currentFrame.value"
              :pixels-per-second="pixelsPerSecond"
              @seek="handleSeek"
              @zoom-change="handleZoomChange"
            />
          </div>
        </div>
        
        <!-- 轨道区域 -->
        <div class="flex-1 overflow-auto">
          <TimelineTrackComponent
            v-for="track in tracks"
            :key="track.id"
            :track="track"
            :segments="getTrackSegments(track.id)"
            :total-width="totalWidth"
            :deletable="tracks.length > 1"
            @toggle-lock="handleToggleLock"
            @toggle-hidden="handleToggleHidden"
            @delete="handleDeleteTrack"
            @update-name="handleUpdateTrackName"
          >
            <template #segments="{ segments: trackSegments, track: currentTrack }">
              <!-- 可点击区域 -->
              <div
                class="absolute inset-0"
                @click="handleTrackClick($event, currentTrack.id)"
              />
              
              <!-- 片段 -->
              <TimelineSegmentComponent
                v-for="segment in trackSegments"
                :key="segment.id"
                :segment="segment"
                :step="getSegmentStep(segment)"
                :selected="timeline.selectedSegmentId.value === segment.id"
                :frame-to-px="frameToPx"
                :disabled="currentTrack.locked"
                @select="handleSelectSegment"
                @delete="handleDeleteSegment"
                @drag-start="handleDragStart"
              />
              
              <!-- 吸附辅助线 -->
              <div
                v-if="dragDrop.activeSnapPoint.value && dragDrop.dragState.value.isDragging"
                class="absolute top-0 h-full w-px bg-yellow-400"
                :style="{ left: `${frameToPx(dragDrop.activeSnapPoint.value.frame)}px` }"
              />
            </template>
          </TimelineTrackComponent>
        </div>
      </div>
      
      <!-- 步骤编辑器面板 -->
      <div class="w-64 shrink-0 border-l border-gray-700">
        <StepEditor
          :step="selectedStep"
          @update="handleUpdateStepParams"
          @update-type="handleUpdateStepType"
        />
      </div>
    </div>
  </div>
</template>
