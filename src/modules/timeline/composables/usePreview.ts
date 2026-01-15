/**
 * @file 预览播放逻辑
 * 实现时间轴预览的播放、暂停、跳转功能
 * Requirements: 9.1-9.4
 */
import { ref, computed, watch, type Ref, type ComputedRef } from "vue";
import type { TimelineSegment, SkillStep, CharacterConfig } from "@/types";

/** 预览配置 */
export interface PreviewConfig {
  /** 攻击方角色配置 */
  attacker: CharacterConfig | null;
  /** 被攻击方角色配置列表 */
  targets: CharacterConfig[];
  /** 背景颜色 */
  backgroundColor?: string;
  /** 背景图片 */
  backgroundImage?: string;
}

/** 预览状态 */
export interface PreviewState {
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前帧 */
  currentFrame: number;
  /** 当前时间（秒） */
  currentTime: number;
  /** 播放速度倍率 */
  playbackRate: number;
}

/** usePreview 选项 */
export interface UsePreviewOptions {
  /** 帧率 */
  fps: Ref<number>;
  /** 总帧数 */
  totalFrames: Ref<number>;
  /** 片段列表 */
  segments: Ref<TimelineSegment[]>;
  /** 步骤列表 */
  steps: Ref<SkillStep[]>;
  /** 步骤执行回调 */
  onExecuteStep?: (step: SkillStep, progress: number) => void;
  /** 帧变化回调 */
  onFrameChange?: (frame: number) => void;
}

/** usePreview 返回值 */
export interface UsePreviewReturn {
  // 状态
  /** 是否正在播放 */
  isPlaying: Ref<boolean>;
  /** 当前帧 */
  currentFrame: Ref<number>;
  /** 播放速度倍率 */
  playbackRate: Ref<number>;
  /** 是否循环播放 */
  loop: Ref<boolean>;

  // 计算属性
  /** 当前时间（秒） */
  currentTime: ComputedRef<number>;
  /** 总时长（秒） */
  totalDuration: ComputedRef<number>;
  /** 播放进度（0-1） */
  progress: ComputedRef<number>;
  /** 当前帧激活的片段 */
  activeSegments: ComputedRef<TimelineSegment[]>;

  // 播放控制
  /** 开始播放 */
  play: () => void;
  /** 暂停播放 */
  pause: () => void;
  /** 切换播放/暂停 */
  toggle: () => void;
  /** 停止并重置到开头 */
  stop: () => void;
  /** 跳转到指定帧 */
  seekToFrame: (frame: number) => void;
  /** 跳转到指定时间（秒） */
  seekToTime: (time: number) => void;
  /** 跳转到指定进度（0-1） */
  seekToProgress: (progress: number) => void;
  /** 前进一帧 */
  stepForward: () => void;
  /** 后退一帧 */
  stepBackward: () => void;

  // 工具方法
  /** 帧数转时间 */
  frameToTime: (frame: number) => number;
  /** 时间转帧数 */
  timeToFrame: (time: number) => number;
  /** 获取指定帧的激活片段 */
  getActiveSegmentsAtFrame: (frame: number) => TimelineSegment[];
  /** 获取片段对应的步骤 */
  getStepForSegment: (segment: TimelineSegment) => SkillStep | undefined;
}

/**
 * 预览播放 Hook
 * 提供时间轴预览的播放控制功能
 * @param options 配置选项
 */
export function usePreview(options: UsePreviewOptions): UsePreviewReturn {
  const { fps, totalFrames, segments, steps, onExecuteStep, onFrameChange } = options;

  // ============ 状态 ============
  const isPlaying = ref(false);
  const currentFrame = ref(0);
  const playbackRate = ref(1);
  const loop = ref(false);

  // 播放定时器
  let playTimer: ReturnType<typeof setInterval> | null = null;
  let lastFrameTime = 0;

  // ============ 计算属性 ============

  /** 当前时间（秒） */
  const currentTime = computed(() => frameToTime(currentFrame.value));

  /** 总时长（秒） */
  const totalDuration = computed(() => frameToTime(totalFrames.value));

  /** 播放进度（0-1） */
  const progress = computed(() => {
    if (totalFrames.value === 0) return 0;
    return currentFrame.value / totalFrames.value;
  });

  /** 当前帧激活的片段 */
  const activeSegments = computed(() => getActiveSegmentsAtFrame(currentFrame.value));

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
   * 获取指定帧的激活片段
   * 片段在 [startFrame, endFrame) 范围内激活
   */
  function getActiveSegmentsAtFrame(frame: number): TimelineSegment[] {
    return segments.value.filter(
      (segment) => frame >= segment.startFrame && frame < segment.endFrame,
    );
  }

  /**
   * 获取片段对应的步骤
   */
  function getStepForSegment(segment: TimelineSegment): SkillStep | undefined {
    return steps.value.find((step) => step.id === segment.stepId);
  }

  // ============ 播放控制 ============

  /**
   * 开始播放
   * Requirements: 9.1
   */
  function play(): void {
    if (isPlaying.value) return;

    // 如果已经播放到末尾，从头开始
    if (currentFrame.value >= totalFrames.value) {
      currentFrame.value = 0;
    }

    isPlaying.value = true;
    lastFrameTime = performance.now();

    // 使用 requestAnimationFrame 实现更精确的帧控制
    const frameInterval = 1000 / (fps.value * playbackRate.value);

    playTimer = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastFrameTime;

      if (elapsed >= frameInterval) {
        lastFrameTime = now - (elapsed % frameInterval);
        advanceFrame();
      }
    }, 1);
  }

  /**
   * 前进一帧并执行步骤
   */
  function advanceFrame(): void {
    const nextFrame = currentFrame.value + 1;

    if (nextFrame > totalFrames.value) {
      if (loop.value) {
        currentFrame.value = 0;
      } else {
        pause();
        currentFrame.value = totalFrames.value;
      }
      return;
    }

    currentFrame.value = nextFrame;
    executeActiveSteps();
  }

  /**
   * 执行当前帧激活的步骤
   */
  function executeActiveSteps(): void {
    const active = activeSegments.value;

    for (const segment of active) {
      const step = getStepForSegment(segment);
      if (step && onExecuteStep) {
        // 计算步骤内的进度（0-1）
        const segmentDuration = segment.endFrame - segment.startFrame;
        const segmentProgress =
          segmentDuration > 0
            ? (currentFrame.value - segment.startFrame) / segmentDuration
            : 1;
        onExecuteStep(step, segmentProgress);
      }
    }

    // 触发帧变化回调
    onFrameChange?.(currentFrame.value);
  }

  /**
   * 暂停播放
   * Requirements: 9.4
   */
  function pause(): void {
    isPlaying.value = false;
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
  }

  /**
   * 切换播放/暂停
   */
  function toggle(): void {
    if (isPlaying.value) {
      pause();
    } else {
      play();
    }
  }

  /**
   * 停止并重置到开头
   */
  function stop(): void {
    pause();
    currentFrame.value = 0;
    onFrameChange?.(0);
  }

  /**
   * 跳转到指定帧
   * Requirements: 9.2
   */
  function seekToFrame(frame: number): void {
    const clampedFrame = Math.max(0, Math.min(frame, totalFrames.value));
    currentFrame.value = clampedFrame;
    executeActiveSteps();
    onFrameChange?.(clampedFrame);
  }

  /**
   * 跳转到指定时间（秒）
   */
  function seekToTime(time: number): void {
    seekToFrame(timeToFrame(time));
  }

  /**
   * 跳转到指定进度（0-1）
   */
  function seekToProgress(prog: number): void {
    const clampedProgress = Math.max(0, Math.min(prog, 1));
    seekToFrame(Math.round(clampedProgress * totalFrames.value));
  }

  /**
   * 前进一帧
   */
  function stepForward(): void {
    if (currentFrame.value < totalFrames.value) {
      seekToFrame(currentFrame.value + 1);
    }
  }

  /**
   * 后退一帧
   */
  function stepBackward(): void {
    if (currentFrame.value > 0) {
      seekToFrame(currentFrame.value - 1);
    }
  }

  // ============ 监听器 ============

  // 监听播放速度变化，重新启动播放
  watch(playbackRate, () => {
    if (isPlaying.value) {
      pause();
      play();
    }
  });

  // 监听 fps 变化，重新启动播放
  watch(fps, () => {
    if (isPlaying.value) {
      pause();
      play();
    }
  });

  // ============ 返回 ============

  return {
    // 状态
    isPlaying,
    currentFrame,
    playbackRate,
    loop,

    // 计算属性
    currentTime,
    totalDuration,
    progress,
    activeSegments,

    // 播放控制
    play,
    pause,
    toggle,
    stop,
    seekToFrame,
    seekToTime,
    seekToProgress,
    stepForward,
    stepBackward,

    // 工具方法
    frameToTime,
    timeToFrame,
    getActiveSegmentsAtFrame,
    getStepForSegment,
  };
}
