import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { TimelineSegment, TimelineTrack, SkillStep } from "@/types";

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 时间轴配置选项 */
export interface UseTimelineOptions {
  fps: Ref<number>;
  totalFrames: Ref<number>;
  segments: Ref<TimelineSegment[]>;
  tracks: Ref<TimelineTrack[]>;
  steps: Ref<SkillStep[]>;
}

/** 时间轴返回接口 */
export interface UseTimelineReturn {
  // 状态
  currentFrame: Ref<number>;
  zoom: Ref<number>;
  isPlaying: Ref<boolean>;
  selectedSegmentId: Ref<string | null>;

  // 计算属性
  currentTime: ComputedRef<number>;
  totalDuration: ComputedRef<number>;

  // 播放控制
  play: () => void;
  pause: () => void;
  seekTo: (frame: number) => void;

  // 轨道管理
  addTrack: (name?: string) => TimelineTrack;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;

  // 片段管理
  addSegment: (step: SkillStep, trackId: string, startFrame: number, duration?: number) => TimelineSegment | null;
  updateSegment: (segmentId: string, startFrame: number, endFrame: number) => boolean;
  removeSegment: (segmentId: string) => void;
  selectSegment: (segmentId: string | null) => void;

  // 工具方法
  timeToPx: (time: number) => number;
  pxToTime: (px: number) => number;
  frameToTime: (frame: number) => number;
  timeToFrame: (time: number) => number;

  // 验证方法
  checkOverlap: (trackId: string, startFrame: number, endFrame: number, excludeSegmentId?: string) => boolean;
  getTrackSegments: (trackId: string) => TimelineSegment[];
}

/** 默认片段持续时间（帧数） */
const DEFAULT_SEGMENT_DURATION = 30;

/** 像素与时间的转换基准（每秒对应的像素数） */
const PIXELS_PER_SECOND = 100;

/**
 * 时间轴核心逻辑 Hook
 * 实现轨道管理、片段管理、时间计算
 * @param options 时间轴配置选项
 */
export function useTimeline(options: UseTimelineOptions): UseTimelineReturn {
  const { fps, totalFrames, segments, tracks, steps } = options;

  // ============ 状态 ============
  const currentFrame = ref(0);
  const zoom = ref(1);
  const isPlaying = ref(false);
  const selectedSegmentId = ref<string | null>(null);

  // 播放定时器
  let playTimer: ReturnType<typeof setInterval> | null = null;

  // ============ 计算属性 ============

  /** 当前时间（秒） */
  const currentTime = computed(() => frameToTime(currentFrame.value));

  /** 总时长（秒） */
  const totalDuration = computed(() => frameToTime(totalFrames.value));

  // ============ 工具方法 ============

  /**
   * 帧数转换为时间（秒）
   */
  function frameToTime(frame: number): number {
    return fps.value > 0 ? frame / fps.value : 0;
  }

  /**
   * 时间（秒）转换为帧数
   */
  function timeToFrame(time: number): number {
    return Math.round(time * fps.value);
  }

  /**
   * 时间（秒）转换为像素
   */
  function timeToPx(time: number): number {
    return time * PIXELS_PER_SECOND * zoom.value;
  }

  /**
   * 像素转换为时间（秒）
   */
  function pxToTime(px: number): number {
    return zoom.value > 0 ? px / (PIXELS_PER_SECOND * zoom.value) : 0;
  }

  // ============ 播放控制 ============

  /**
   * 开始播放
   */
  function play(): void {
    if (isPlaying.value) return;

    isPlaying.value = true;
    const frameInterval = 1000 / fps.value;

    playTimer = setInterval(() => {
      if (currentFrame.value >= totalFrames.value) {
        pause();
        currentFrame.value = 0;
      } else {
        currentFrame.value++;
      }
    }, frameInterval);
  }

  /**
   * 暂停播放
   */
  function pause(): void {
    isPlaying.value = false;
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
  }

  /**
   * 跳转到指定帧
   */
  function seekTo(frame: number): void {
    currentFrame.value = Math.max(0, Math.min(frame, totalFrames.value));
  }

  // ============ 轨道管理 ============

  /**
   * 添加新轨道
   */
  function addTrack(name?: string): TimelineTrack {
    const track: TimelineTrack = {
      id: generateId("track"),
      name: name || `轨道 ${tracks.value.length + 1}`,
      locked: false,
      hidden: false,
    };
    tracks.value.push(track);
    return track;
  }

  /**
   * 删除轨道
   */
  function removeTrack(trackId: string): void {
    const index = tracks.value.findIndex((t) => t.id === trackId);
    if (index !== -1) {
      tracks.value.splice(index, 1);
      // 同时删除该轨道上的所有片段
      segments.value = segments.value.filter((s) => s.trackId !== trackId);
    }
  }

  /**
   * 更新轨道属性
   */
  function updateTrack(trackId: string, updates: Partial<TimelineTrack>): void {
    const track = tracks.value.find((t) => t.id === trackId);
    if (track) {
      Object.assign(track, updates);
    }
  }

  // ============ 片段管理 ============

  /**
   * 获取指定轨道的所有片段
   */
  function getTrackSegments(trackId: string): TimelineSegment[] {
    return segments.value.filter((s) => s.trackId === trackId);
  }

  /**
   * 检查片段是否与同轨道其他片段重叠
   * @returns true 表示有重叠
   */
  function checkOverlap(trackId: string, startFrame: number, endFrame: number, excludeSegmentId?: string): boolean {
    const trackSegments = getTrackSegments(trackId).filter((s) => s.id !== excludeSegmentId);

    for (const segment of trackSegments) {
      // 检查是否重叠：两个区间重叠的条件是 !(A.end <= B.start || B.end <= A.start)
      const noOverlap = endFrame <= segment.startFrame || segment.endFrame <= startFrame;
      if (!noOverlap) {
        return true;
      }
    }
    return false;
  }

  /**
   * 添加片段到轨道
   * @returns 新创建的片段，如果有重叠则返回 null
   */
  function addSegment(
    step: SkillStep,
    trackId: string,
    startFrame: number,
    duration: number = DEFAULT_SEGMENT_DURATION,
  ): TimelineSegment | null {
    const track = tracks.value.find((t) => t.id === trackId);
    if (!track || track.locked) {
      return null;
    }

    const endFrame = startFrame + duration;

    // 检查重叠
    if (checkOverlap(trackId, startFrame, endFrame)) {
      return null;
    }

    // 确保步骤存在于 steps 列表中
    if (!steps.value.find((s) => s.id === step.id)) {
      steps.value.push(step);
    }

    const segment: TimelineSegment = {
      id: generateId("seg"),
      stepId: step.id || generateId("step"),
      trackId,
      startFrame,
      endFrame,
    };

    segments.value.push(segment);
    return segment;
  }

  /**
   * 更新片段的时间范围
   * @returns true 表示更新成功，false 表示有重叠或无效
   */
  function updateSegment(segmentId: string, startFrame: number, endFrame: number): boolean {
    const segment = segments.value.find((s) => s.id === segmentId);
    if (!segment) {
      return false;
    }

    // 验证 endFrame > startFrame
    if (endFrame <= startFrame) {
      return false;
    }

    const track = tracks.value.find((t) => t.id === segment.trackId);
    if (!track || track.locked) {
      return false;
    }

    // 检查重叠（排除自身）
    if (checkOverlap(segment.trackId, startFrame, endFrame, segmentId)) {
      return false;
    }

    segment.startFrame = startFrame;
    segment.endFrame = endFrame;
    return true;
  }

  /**
   * 删除片段
   */
  function removeSegment(segmentId: string): void {
    const index = segments.value.findIndex((s) => s.id === segmentId);
    if (index !== -1) {
      segments.value.splice(index, 1);
      // 如果删除的是当前选中的片段，清除选中状态
      if (selectedSegmentId.value === segmentId) {
        selectedSegmentId.value = null;
      }
    }
  }

  /**
   * 选中片段
   */
  function selectSegment(segmentId: string | null): void {
    selectedSegmentId.value = segmentId;
  }

  // ============ 返回 ============

  return {
    // 状态
    currentFrame,
    zoom,
    isPlaying,
    selectedSegmentId,

    // 计算属性
    currentTime,
    totalDuration,

    // 播放控制
    play,
    pause,
    seekTo,

    // 轨道管理
    addTrack,
    removeTrack,
    updateTrack,

    // 片段管理
    addSegment,
    updateSegment,
    removeSegment,
    selectSegment,

    // 工具方法
    timeToPx,
    pxToTime,
    frameToTime,
    timeToFrame,

    // 验证方法
    checkOverlap,
    getTrackSegments,
  };
}
