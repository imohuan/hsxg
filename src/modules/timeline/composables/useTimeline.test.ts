import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ref } from "vue";
import { useTimeline } from "./useTimeline";
import type { TimelineSegment, TimelineTrack, SkillStep } from "@/types";

describe("useTimeline", () => {
  // 测试数据
  let fps: ReturnType<typeof ref<number>>;
  let totalFrames: ReturnType<typeof ref<number>>;
  let segments: ReturnType<typeof ref<TimelineSegment[]>>;
  let tracks: ReturnType<typeof ref<TimelineTrack[]>>;
  let steps: ReturnType<typeof ref<SkillStep[]>>;

  beforeEach(() => {
    fps = ref(30);
    totalFrames = ref(300);
    segments = ref([]);
    tracks = ref([]);
    steps = ref([]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createTimeline() {
    return useTimeline({ fps, totalFrames, segments, tracks, steps });
  }

  // ============ 工具方法测试 ============

  describe("工具方法", () => {
    it("frameToTime 应正确将帧数转换为时间", () => {
      const timeline = createTimeline();
      expect(timeline.frameToTime(30)).toBe(1); // 30帧 / 30fps = 1秒
      expect(timeline.frameToTime(60)).toBe(2);
      expect(timeline.frameToTime(0)).toBe(0);
    });

    it("timeToFrame 应正确将时间转换为帧数", () => {
      const timeline = createTimeline();
      expect(timeline.timeToFrame(1)).toBe(30); // 1秒 * 30fps = 30帧
      expect(timeline.timeToFrame(2)).toBe(60);
      expect(timeline.timeToFrame(0)).toBe(0);
    });

    it("timeToPx 和 pxToTime 应互为逆运算", () => {
      const timeline = createTimeline();
      const time = 2.5;
      const px = timeline.timeToPx(time);
      expect(timeline.pxToTime(px)).toBeCloseTo(time);
    });
  });

  // ============ 计算属性测试 ============

  describe("计算属性", () => {
    it("currentTime 应反映当前帧对应的时间", () => {
      const timeline = createTimeline();
      timeline.seekTo(60);
      expect(timeline.currentTime.value).toBe(2); // 60帧 / 30fps = 2秒
    });

    it("totalDuration 应反映总帧数对应的时长", () => {
      const timeline = createTimeline();
      expect(timeline.totalDuration.value).toBe(10); // 300帧 / 30fps = 10秒
    });
  });

  // ============ 播放控制测试 ============

  describe("播放控制", () => {
    it("play 应开始播放并更新 isPlaying 状态", () => {
      const timeline = createTimeline();
      expect(timeline.isPlaying.value).toBe(false);
      timeline.play();
      expect(timeline.isPlaying.value).toBe(true);
    });

    it("pause 应停止播放", () => {
      const timeline = createTimeline();
      timeline.play();
      timeline.pause();
      expect(timeline.isPlaying.value).toBe(false);
    });

    it("seekTo 应跳转到指定帧", () => {
      const timeline = createTimeline();
      timeline.seekTo(100);
      expect(timeline.currentFrame.value).toBe(100);
    });

    it("seekTo 应限制在有效范围内", () => {
      const timeline = createTimeline();
      timeline.seekTo(-10);
      expect(timeline.currentFrame.value).toBe(0);
      timeline.seekTo(500);
      expect(timeline.currentFrame.value).toBe(300);
    });

    it("播放时应递增帧数", () => {
      const timeline = createTimeline();
      timeline.play();
      vi.advanceTimersByTime(1000 / 30); // 前进一帧的时间
      expect(timeline.currentFrame.value).toBe(1);
    });
  });


  // ============ 轨道管理测试 ============

  describe("轨道管理", () => {
    it("addTrack 应创建新轨道", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack("测试轨道");
      expect(track.name).toBe("测试轨道");
      expect(tracks.value).toHaveLength(1);
      expect(tracks.value[0]).toStrictEqual(track);
    });

    it("addTrack 无参数时应使用默认名称", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      expect(track.name).toBe("轨道 1");
    });

    it("removeTrack 应删除轨道及其片段", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      const step: SkillStep = { id: "step1", type: "move", params: {} };
      timeline.addSegment(step, track.id, 0, 30);

      expect(tracks.value).toHaveLength(1);
      expect(segments.value).toHaveLength(1);

      timeline.removeTrack(track.id);
      expect(tracks.value).toHaveLength(0);
      expect(segments.value).toHaveLength(0);
    });

    it("updateTrack 应更新轨道属性", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      timeline.updateTrack(track.id, { locked: true, name: "新名称" });
      expect(track.locked).toBe(true);
      expect(track.name).toBe("新名称");
    });
  });

  // ============ 片段管理测试 ============

  describe("片段管理", () => {
    it("addSegment 应创建新片段", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      const step: SkillStep = { id: "step1", type: "move", params: {} };
      const segment = timeline.addSegment(step, track.id, 0, 30);

      expect(segment).not.toBeNull();
      expect(segment!.startFrame).toBe(0);
      expect(segment!.endFrame).toBe(30);
      expect(segments.value).toHaveLength(1);
    });

    it("addSegment 在锁定轨道上应返回 null", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      timeline.updateTrack(track.id, { locked: true });
      const step: SkillStep = { id: "step1", type: "move", params: {} };
      const segment = timeline.addSegment(step, track.id, 0, 30);

      expect(segment).toBeNull();
    });

    it("addSegment 重叠时应返回 null", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      const step1: SkillStep = { id: "step1", type: "move", params: {} };
      const step2: SkillStep = { id: "step2", type: "damage", params: {} };

      timeline.addSegment(step1, track.id, 0, 30);
      const segment2 = timeline.addSegment(step2, track.id, 15, 30); // 重叠

      expect(segment2).toBeNull();
      expect(segments.value).toHaveLength(1);
    });

    it("updateSegment 应更新片段时间范围", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      const step: SkillStep = { id: "step1", type: "move", params: {} };
      const segment = timeline.addSegment(step, track.id, 0, 30)!;

      const result = timeline.updateSegment(segment.id, 10, 50);
      expect(result).toBe(true);
      expect(segment.startFrame).toBe(10);
      expect(segment.endFrame).toBe(50);
    });

    it("updateSegment 当 endFrame <= startFrame 时应返回 false", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      const step: SkillStep = { id: "step1", type: "move", params: {} };
      const segment = timeline.addSegment(step, track.id, 0, 30)!;

      const result = timeline.updateSegment(segment.id, 30, 10);
      expect(result).toBe(false);
      expect(segment.startFrame).toBe(0); // 保持原值
    });

    it("removeSegment 应删除片段", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      const step: SkillStep = { id: "step1", type: "move", params: {} };
      const segment = timeline.addSegment(step, track.id, 0, 30)!;

      timeline.removeSegment(segment.id);
      expect(segments.value).toHaveLength(0);
    });

    it("removeSegment 应清除选中状态", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      const step: SkillStep = { id: "step1", type: "move", params: {} };
      const segment = timeline.addSegment(step, track.id, 0, 30)!;

      timeline.selectSegment(segment.id);
      expect(timeline.selectedSegmentId.value).toBe(segment.id);

      timeline.removeSegment(segment.id);
      expect(timeline.selectedSegmentId.value).toBeNull();
    });
  });

  // ============ 重叠检测测试 ============

  describe("重叠检测", () => {
    it("checkOverlap 无重叠时应返回 false", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      const step: SkillStep = { id: "step1", type: "move", params: {} };
      timeline.addSegment(step, track.id, 0, 30);

      // 在片段后面，无重叠
      expect(timeline.checkOverlap(track.id, 30, 60)).toBe(false);
    });

    it("checkOverlap 有重叠时应返回 true", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      const step: SkillStep = { id: "step1", type: "move", params: {} };
      timeline.addSegment(step, track.id, 0, 30);

      // 部分重叠
      expect(timeline.checkOverlap(track.id, 15, 45)).toBe(true);
    });

    it("checkOverlap 应排除指定片段", () => {
      const timeline = createTimeline();
      const track = timeline.addTrack();
      const step: SkillStep = { id: "step1", type: "move", params: {} };
      const segment = timeline.addSegment(step, track.id, 0, 30)!;

      // 与自身重叠，但排除自身
      expect(timeline.checkOverlap(track.id, 0, 30, segment.id)).toBe(false);
    });

    it("getTrackSegments 应返回指定轨道的片段", () => {
      const timeline = createTimeline();
      const track1 = timeline.addTrack();
      const track2 = timeline.addTrack();
      const step1: SkillStep = { id: "step1", type: "move", params: {} };
      const step2: SkillStep = { id: "step2", type: "damage", params: {} };

      timeline.addSegment(step1, track1.id, 0, 30);
      timeline.addSegment(step2, track2.id, 0, 30);

      expect(timeline.getTrackSegments(track1.id)).toHaveLength(1);
      expect(timeline.getTrackSegments(track2.id)).toHaveLength(1);
    });
  });
});
