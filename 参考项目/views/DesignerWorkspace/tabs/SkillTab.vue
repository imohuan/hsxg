<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";
import DesignerTabLayout from "@/components/designer/DesignerTabLayout.vue";
import DesignerLibraryPanel from "@/components/designer/DesignerLibraryPanel.vue";
import { DesignerTimeline } from "@/components/designer";
import SkillTimeline from "@/components/timeline/SkillTimeline.vue";
import BattleCanvas from "@/core/game/BattleCanvas.vue";
import SkillTabPanel from "./SkillTabPanel.vue";
import {
  DEFAULT_CHARACTER,
  DEFAULT_EFFECT,
  stepPresets,
} from "@/core/config/defaults";
import { SKILL_SANDBOX_UNITS } from "@/core/config/sandboxConfig";
import { generateBattleConfigFromSandbox } from "@/core/utils/battleConfig";
import type {
  CharacterConfig,
  EffectConfig,
  SkillDesign,
  SkillStep,
  TimelineEvent,
} from "@/core/designer/types";
import type { BattleController } from "@/core/game/BattleController";
import type { BattleJSONConfig } from "@/core/game/config";
import { useDesignerLibraryPanel } from "@/composables/useDesignerLibraryPanel";

const props = defineProps<{
  skill: SkillDesign;
  controller: BattleController | null;
}>();

const emit = defineEmits<{
  (e: "update:skill", skill: SkillDesign): void;
}>();

// 直接使用 props.skill，因为父组件已经传递了 reactive 对象
const skill = props.skill;
const selectedStepIndex = ref<number | null>(null);
const playing = ref(false);
const currentFrame = ref(0);
const fps = ref(10);
const timelineEvents = ref<TimelineEvent[]>([]);

type BattleCanvasInstance = InstanceType<typeof BattleCanvas>;
const battleCanvasRef = ref<BattleCanvasInstance | null>(null);

const STEP_FRAME_DEFAULT: Record<string, number> = {
  // 这里的数值直接表示“帧数”默认值
  move: 50,
  damage: 30,
  effect: 40,
  wait: 30,
};

const skillTimelineSegments = computed(() => {
  let cursor = 0;

  // 单个步骤允许的最大帧数，避免被错误数据拖到无限大
  const MAX_FRAMES_PER_STEP = 600; // 例如：在 10fps 下约 60 秒

  const segments = skill.steps.map((step, index) => {
    const params = step.params as any;

    const raw =
      typeof params.duration === "number"
        ? params.duration
        : Number(params.duration) || STEP_FRAME_DEFAULT[step.type] || 30;

    // duration 直接当“帧数”用，并做 clamp
    const frames = Math.max(1, Math.min(MAX_FRAMES_PER_STEP, Math.round(raw)));

    // 如果步骤自己带了 startFrame（帧数），优先使用；否则按顺序排布
    const hasStartFrame =
      typeof params.startFrame === "number" &&
      Number.isFinite(params.startFrame);
    const start = hasStartFrame
      ? Math.max(0, Math.round(params.startFrame))
      : cursor;

    const segment = {
      start,
      end: start + frames,
      step,
      index,
      // 将轨道信息一并塞进 segment，方便时间轴核心逻辑使用
      trackId: typeof params.trackId === "string" ? params.trackId : undefined,
    };

    // 对于没有显式 startFrame 的步骤，保持顺序紧凑；
    // 对于有 startFrame 的步骤，cursor 至少推进到该片段的结束，
    // 这样后续默认步骤会排在其后面。
    cursor = Math.max(cursor, segment.end);
    return segment;
  });

  console.log(
    "[SkillTab] recompute skillTimelineSegments",
    JSON.stringify({
      stepCount: skill.steps.length,
      segments: segments.map((s) => ({
        index: s.index,
        type: s.step.type,
        start: s.start,
        end: s.end,
        frames: s.end - s.start,
        rawDuration: (s.step.params as any)?.duration,
        rawStartFrame: (s.step.params as any)?.startFrame,
      })),
    })
  );

  return segments;
});

const skillTimelineTotalFrames = computed(() => {
  const segments = skillTimelineSegments.value;
  if (!segments.length) return 240;
  const last = segments[segments.length - 1]!;
  return Math.max(60, last.end);
});

const previewTotalFrames = computed(() => skillTimelineTotalFrames.value);

const selectedStep = computed<SkillStep | null>(() => {
  if (
    selectedStepIndex.value !== null &&
    selectedStepIndex.value >= 0 &&
    selectedStepIndex.value < skill.steps.length
  ) {
    return skill.steps[selectedStepIndex.value] as SkillStep;
  }
  return null;
});

const addSkillStep = (type: keyof typeof stepPresets) => {
  const preset = stepPresets[type];
  if (!preset) return;
  skill.steps.push({
    type: preset.type,
    params: { ...preset.params },
  });
  selectedStepIndex.value = skill.steps.length - 1;
};

const deleteStep = (index: number) => {
  skill.steps.splice(index, 1);
  if (selectedStepIndex.value === index) {
    selectedStepIndex.value = null;
  }
};

const cloneSkillForRuntime = () => ({
  name: skill.name,
  steps: skill.steps.map((step) => ({
    type: step.type,
    params: { ...step.params },
  })),
  context: { ...skill.context },
  targeting: {
    modes: [...skill.targeting.modes],
    randomRange: [...skill.targeting.randomRange] as [number, number],
    expressions: { ...skill.targeting.expressions },
  },
  scaling: skill.scaling.map((entry) => ({ ...entry })),
});

const runSkill = () => {
  props.controller?.executeSkill(cloneSkillForRuntime());
};

const updateStepParam = (key: string, value: string | number | boolean) => {
  if (selectedStep.value && selectedStepIndex.value !== null) {
    selectedStep.value.params[key] = value;
  }
};

const handlePreviewToggleTarget = (unitId: string) => {
  const exists = skill.context.selectedTargetIds.includes(unitId);
  skill.context.selectedTargetIds = exists
    ? skill.context.selectedTargetIds.filter((id) => id !== unitId)
    : [...skill.context.selectedTargetIds, unitId];
};

const generateBattleConfig = (): BattleJSONConfig => {
  // 使用工具函数从沙盒单位生成战斗配置
  return generateBattleConfigFromSandbox(
    SKILL_SANDBOX_UNITS,
    800,
    600,
    [cloneSkillForRuntime()],
    []
  );
};

const battleConfig = computed(() => generateBattleConfig());
watchEffect(() => {
  console.log({ battleConfig });
});

const addTimelineEvent = (event: TimelineEvent) => {
  timelineEvents.value.push(event);
};

const removeTimelineEvent = (index: number) => {
  timelineEvents.value.splice(index, 1);
};

const updateTimelineEvent = (index: number, event: TimelineEvent) => {
  timelineEvents.value[index] = event;
};

// 处理时间轴段更新：把开始帧写回 startFrame，把长度写回 duration，并做上限限制
const handleUpdateSegment = (index: number, start: number, end: number) => {
  const step = skill.steps[index];
  const frames = Math.max(1, end - start);

  // 与上面 skillTimelineSegments 中的含义保持一致
  const MAX_FRAMES_PER_STEP = 600;
  const clampedFrames = Math.min(frames, MAX_FRAMES_PER_STEP);
  const clampedStart = Math.max(0, Math.round(start));

  console.log("[SkillTab] handleUpdateSegment BEFORE", {
    index,
    start,
    end,
    frames,
    clampedFrames,
    clampedStart,
    stepExists: !!step,
    prevDuration: step ? (step.params as any).duration : undefined,
    prevStartFrame: step ? (step.params as any).startFrame : undefined,
  });

  if (step) {
    const params = step.params as any;
    params.duration = clampedFrames;
    params.startFrame = clampedStart;

    console.log("[SkillTab] handleUpdateSegment AFTER", {
      index,
      start,
      end,
      frames,
      clampedFrames,
      clampedStart,
      nextDuration: clampedFrames,
      nextStartFrame: clampedStart,
      stepType: step.type,
    });
  }
};

// 处理拖拽放置步骤
const handleDropStep = (
  stepIndex: number,
  targetTime: number,
  trackId: string
) => {
  console.log("[SkillTab] handleDropStep", { stepIndex, targetTime, trackId });
  if (stepIndex < 0 || stepIndex >= skill.steps.length) return;

  // 将目标时间转换为帧数
  const targetFrame = Math.round(targetTime * fps.value);

  // 仅更新该步骤的时间与轨道信息，不改变 steps 数组顺序，避免其它标签位置跳动
  const step = skill.steps[stepIndex]!;
  const params = (step.params ?? {}) as any;
  params.startFrame = targetFrame;
  if (trackId) {
    params.trackId = trackId;
  }
  step.params = params;

  // 更新选中索引，保持当前步骤被选中
  selectedStepIndex.value = stepIndex;
};

// 从库拖拽到时间轴：完全基于 mousemove/mouseup 结束时的位置
const handleDropStepFromLibrary = (payload: {
  type: string;
  label: string;
  clientX: number;
  clientY: number;
  overTimeline?: boolean;
  targetTime?: number;
  trackId?: string;
}) => {
  console.log("[SkillTab] handleDropStepFromLibrary payload", payload);

  // 只有在拖拽结束时鼠标仍位于时间轴区域内时才真正创建步骤
  if (!payload.overTimeline) {
    return;
  }

  const preset = stepPresets[payload.type as keyof typeof stepPresets];
  if (!preset) return;

  skill.steps.push({
    type: preset.type,
    params: { ...preset.params },
  });
  const newStepIndex = skill.steps.length - 1;

  // 归一化从库拖出的步骤时长：统一使用本 Tab 中定义的 STEP_FRAME_DEFAULT，
  // 避免某些预设里的 duration 过大导致一放下就变成 20s 之类的极端长度。
  const newStep = skill.steps[newStepIndex]!;
  const newParams = (newStep.params ?? {}) as any;
  const defaultFrames = STEP_FRAME_DEFAULT[newStep.type] ?? 30;
  newParams.duration = defaultFrames;
  newStep.params = newParams;

  // 使用时间轴在拖拽过程中计算好的目标时间与轨道
  const targetTime = payload.targetTime ?? 0;
  const trackId = payload.trackId ?? "main-track";

  handleDropStep(newStepIndex, targetTime, trackId);
};

// 注意：由于 props.skill 是 reactive 的，直接修改属性会自动同步到父组件
// 不需要 watch，因为 skill 和 props.skill 指向同一个对象

const activeTool = ref<"skill">("skill");
const characterConfig = reactive<CharacterConfig>({ ...DEFAULT_CHARACTER });
const effectConfig = reactive<EffectConfig>({ ...DEFAULT_EFFECT });

const {
  showLibraryPanel,
  activeLibraryList,
  activeLibraryTitle,
  activeLibraryDescription,
  selectedLibraryId,
  libraryStatus,
  selectLibraryItem,
  saveCurrentToLibrary,
  deleteLibraryItem,
  createNewConfig,
  clearSelection,
} = useDesignerLibraryPanel({
  activeTool,
  characterConfig,
  effectConfig,
  skill,
  selectedStepIndex,
  refreshPreview: () => {
    // Skill tab 不需要刷新预览
  },
});
</script>

<template>
  <DesignerTabLayout>
    <template #left>
      <DesignerLibraryPanel
        v-if="showLibraryPanel"
        :items="activeLibraryList"
        :title="activeLibraryTitle"
        :description="activeLibraryDescription"
        :selected-id="selectedLibraryId"
        :status="libraryStatus"
        @save="saveCurrentToLibrary"
        @create="createNewConfig"
        @clear="clearSelection"
        @select="selectLibraryItem"
        @delete="deleteLibraryItem"
      />

      <SkillTabPanel
        :selected-step-index="selectedStepIndex"
        :selected-step="selectedStep"
        :skill="skill"
        @add-step="addSkillStep"
        @delete-step="deleteStep"
        @run-skill="runSkill"
        @select-step="(index) => (selectedStepIndex = index)"
        @update-step-param="
          ({ key, value }) => {
            updateStepParam(key, value);
          }
        "
        @drop-step-from-library="handleDropStepFromLibrary"
      />
    </template>

    <template #right>
      <div class="flex h-full w-full flex-1 flex-col overflow-hidden">
        <div class="aspect-video w-full overflow-hidden">
          <BattleCanvas
            ref="battleCanvasRef"
            :config="battleConfig"
            :skill="skill"
            @unit-click="handlePreviewToggleTarget"
            @ready="
              () => {
                // 高亮当前选中的目标
                if (battleCanvasRef?.highlightUnit) {
                  battleCanvasRef.highlightUnit(skill.context.casterId);
                }
              }
            "
          />
        </div>
        <div class="h-80 w-full shrink-0">
          <DesignerTimeline
            :total-frames="previewTotalFrames"
            :current-frame="currentFrame"
            :fps="fps"
            :playing="playing"
            :events="timelineEvents"
            @update:current-frame="currentFrame = $event"
            @update:fps="fps = $event"
            @update:playing="playing = $event"
            @add-event="addTimelineEvent"
            @remove-event="removeTimelineEvent"
            @update-event="updateTimelineEvent"
          >
            <template #timeline>
              <SkillTimeline
                :segments="skillTimelineSegments"
                :total-frames="previewTotalFrames"
                :current-frame="currentFrame"
                :fps="fps"
                :selected-step-index="selectedStepIndex"
                @update:current-frame="currentFrame = $event"
                @select-step="(index) => (selectedStepIndex = index)"
                @delete-step="deleteStep"
                @update-segment="handleUpdateSegment"
                @drop-step="handleDropStep"
              />
            </template>
          </DesignerTimeline>
        </div>
      </div>
    </template>
  </DesignerTabLayout>
</template>
