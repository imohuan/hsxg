<script setup lang="ts">
import { computed, watchEffect } from "vue";
import type {
  SkillDesign,
  SkillStep,
  SkillStepType,
  SkillTargetMode,
} from "@/core/designer/types";
import { SKILL_SANDBOX_UNITS } from "@/core/config/sandboxConfig";
import type { SkillSandboxUnit } from "@/core/utils/sandbox";
import { ExpressionEvaluator } from "@/core/game/ExpressionEvaluator";
import { useLibraryDragToTimeline } from "@/composables/useLibraryDragToTimeline";

const props = defineProps<{
  skill: SkillDesign;
  selectedStepIndex: number | null;
  selectedStep: SkillStep | null;
}>();

const emits = defineEmits<{
  (e: "select-step", index: number): void;
  (e: "delete-step", index: number): void;
  (e: "add-step", type: SkillStepType): void;
  (
    e: "update-step-param",
    payload: { key: string; value: string | number | boolean }
  ): void;
  (e: "run-skill"): void;
  (
    e: "drop-step-from-library",
    payload: { type: string; label: string; clientX: number; clientY: number }
  ): void;
}>();

const stepButtons: Array<{
  label: string;
  type: SkillStepType;
  description: string;
}> = [
  {
    label: "移动 / 突进",
    type: "move",
    description: "控制人物或特效的位置（位移、拉近拉远、画面运动的基础）",
  },
  {
    label: "造成伤害 / 扣血",
    type: "damage",
    description: "对目标单位应用一次数值伤害或扣血效果",
  },
  {
    label: "播放特效 / 动画",
    type: "effect",
    description: "在人物或目标位置播放特效、人物演出、命中特效等",
  },
  {
    label: "等待 / 定时",
    type: "wait",
    description: "插入停顿、节奏间隔、镜头保留时间，控制整体节奏",
  },
];

const targetModeOptions: Array<{
  value: SkillTargetMode;
  label: string;
  desc: string;
  accent: string;
}> = [
  {
    value: "enemy",
    label: "敌方单位",
    desc: "对稻草人造成伤害",
    accent: "text-red-300",
  },
  {
    value: "ally",
    label: "友方单位",
    desc: "为队友提供增益或治疗",
    accent: "text-sky-300",
  },
  {
    value: "self",
    label: "自身",
    desc: "例如自我增益或冲锋前摇",
    accent: "text-emerald-300",
  },
];

const SKILL_LEVEL_MIN = 1;
const SKILL_LEVEL_MAX = 9;
const PROFICIENCY_MIN_DELTA = 2000;
const PROFICIENCY_MAX_DELTA = 6000;

const sandboxUnits = SKILL_SANDBOX_UNITS;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getProficiencyRange = (level: number) => {
  const safeLevel = clamp(
    Number.isFinite(level) ? level : SKILL_LEVEL_MIN,
    SKILL_LEVEL_MIN,
    SKILL_LEVEL_MAX
  );
  return {
    min: (safeLevel - 1) * PROFICIENCY_MIN_DELTA,
    max: safeLevel * PROFICIENCY_MAX_DELTA,
    level: safeLevel,
  };
};

const proficiencyRange = computed(() =>
  getProficiencyRange(props.skill.context.level)
);

const proficiencyRangeLabel = computed(() => {
  const { min, max } = proficiencyRange.value;
  const format = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return {
    minLabel: format(min),
    maxLabel: format(max),
  };
});

watchEffect(() => {
  props.skill.context.level = clamp(
    props.skill.context.level ?? SKILL_LEVEL_MIN,
    SKILL_LEVEL_MIN,
    SKILL_LEVEL_MAX
  );
});

watchEffect(() => {
  const { min, max } = proficiencyRange.value;
  const current = props.skill.context.proficiency ?? min;
  if (current < min) {
    props.skill.context.proficiency = min;
  } else if (current > max) {
    props.skill.context.proficiency = max;
  }
});

watchEffect(() => {
  const hasCaster = sandboxUnits.some(
    (unit) => unit.id === props.skill.context.casterId
  );
  if (!hasCaster) {
    const fallback = sandboxUnits.find((unit) => unit.side === "player");
    if (fallback) {
      props.skill.context.casterId = fallback.id;
    }
  }
});

watchEffect(() => {
  const validIds = props.skill.context.selectedTargetIds.filter((id) =>
    sandboxUnits.some((unit) => unit.id === id)
  );
  if (validIds.length !== props.skill.context.selectedTargetIds.length) {
    props.skill.context.selectedTargetIds = validIds;
  }
});

const evaluationContext = computed(() => ({
  level: props.skill.context.level,
  mastery: props.skill.context.mastery,
  proficiency: props.skill.context.proficiency,
  randomMin: props.skill.targeting.randomRange[0],
  randomMax: props.skill.targeting.randomRange[1],
  targetCount: props.skill.context.selectedTargetIds.length,
}));

const evaluateExpression = (expression?: string): number => {
  if (!expression) return 0;
  try {
    return ExpressionEvaluator.evaluate(expression, evaluationContext.value);
  } catch (error) {
    console.warn("表达式解析失败", error);
    return 0;
  }
};

const targetCountsPreview = computed(() => ({
  enemy: evaluateExpression(props.skill.targeting.expressions.enemy),
  ally: evaluateExpression(props.skill.targeting.expressions.ally),
  self: evaluateExpression(props.skill.targeting.expressions.self),
}));

const scalingPreview = computed(() =>
  props.skill.scaling.map((entry) => ({
    ...entry,
    value: evaluateExpression(entry.expression),
  }))
);

const selectedActor = computed<SkillSandboxUnit | null>(() => {
  return (
    sandboxUnits.find((unit) => unit.id === props.skill.context.casterId) ??
    sandboxUnits.find((unit) => unit.side === "player") ??
    null
  );
});

const selectedTargetUnits = computed(() =>
  props.skill.context.selectedTargetIds
    .map((id) => sandboxUnits.find((unit) => unit.id === id))
    .filter((unit): unit is SkillSandboxUnit => Boolean(unit))
);

const toggleTargetMode = (mode: SkillTargetMode) => {
  const currentModes = props.skill.targeting.modes;
  if (currentModes.includes(mode)) {
    props.skill.targeting.modes = currentModes.filter((m) => m !== mode);
  } else {
    props.skill.targeting.modes = [...currentModes, mode];
  }
};

const updateRandomRange = (type: "min" | "max", value: number) => {
  const clamped = Math.max(1, Math.min(6, value));
  const [min, max] = props.skill.targeting.randomRange;
  if (type === "min") {
    props.skill.targeting.randomRange = [Math.min(clamped, max), max];
  } else {
    props.skill.targeting.randomRange = [min, Math.max(clamped, min)];
  }
};

const updateScalingEntry = (
  index: number,
  key: "label" | "expression",
  value: string
) => {
  props.skill.scaling[index] = {
    ...props.skill.scaling[index]!,
    [key]: value,
  };
};

const addScalingFormula = () => {
  props.skill.scaling.push({
    id: `formula-${Date.now()}`,
    label: `输出项 ${props.skill.scaling.length + 1}`,
    expression: "level * 10",
  });
};

const removeScalingFormula = (id: string) => {
  props.skill.scaling = props.skill.scaling.filter((entry) => entry.id !== id);
};

// 使用自定义库拖拽到时间轴的 hook：完全基于 mousedown + mousemove + mouseup
// composable 会在 mouseup 时把最终坐标通过 payload 发给父组件。
const { dragging: libraryDragging, onMouseDown: handleLibraryMouseDown } =
  useLibraryDragToTimeline((payload) => {
    emits("drop-step-from-library", payload);
  });

const baseInputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400 focus:bg-slate-950/80";

const classes = {
  panel:
    "rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-inner shadow-black/40",
  panelHeader: "mb-4 flex flex-wrap items-center justify-between gap-4",
  eyebrow: "text-xs uppercase tracking-[0.4em] text-slate-400",
  title: "text-lg font-semibold text-white",
  ghostButton:
    "inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-emerald-400 hover:text-white",
  pillButton:
    "rounded-full border border-white/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-emerald-400",
  badge:
    "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-200",
  badgeGlow:
    "rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-emerald-200",
  field: "flex flex-col gap-1",
  fieldLabel:
    "text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-400",
  input: baseInputClass,
  textarea: `${baseInputClass} min-h-[5rem] resize-none`,
  sliderField:
    "rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-inner shadow-black/40",
  sliderLabel:
    "mb-2 flex items-center justify-between text-[0.73rem] font-semibold uppercase tracking-[0.25em] text-slate-400",
  sliderValue: "text-base font-semibold text-white",
  slider: "w-full accent-emerald-400",
  summaryWrapper: "flex flex-col gap-4",
  summaryCard:
    "flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/30 p-5",
  summaryHeader:
    "flex items-center justify-between text-[0.75rem] uppercase tracking-[0.3em] text-slate-400",
  summaryTag:
    "rounded-full bg-white/10 px-3 py-0.5 text-[0.65rem] uppercase tracking-[0.25em] text-slate-100",
  summaryMain: "text-lg font-semibold text-white",
  summarySub: "text-sm text-slate-200",
  summarySubtle: "text-xs text-slate-400",
  summaryHint: "text-xs text-slate-400",
  chipGrid: "flex flex-wrap gap-2",
  targetChip:
    "inline-flex items-center rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100",
  targetChipEmpty:
    "inline-flex items-center rounded-full border border-dashed border-slate-500/60 px-3 py-1 text-xs text-slate-200",
  targetingGrid: "mt-6 flex flex-col gap-4",
  targetingSection:
    "rounded-2xl border border-white/10 bg-slate-950/30 p-4 shadow-inner shadow-black/30",
  sectionTitle: "text-base font-semibold text-white",
  sectionDesc: "text-xs text-slate-400",
  modeList: "mt-3 flex flex-col gap-3",
  modeChip:
    "flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300 transition hover:border-emerald-400",
  rangePair: "mt-4 flex flex-col gap-4",
  rangeLabel:
    "flex flex-col gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-400",
  rangeValue: "text-lg font-semibold text-white",
  expressionGrid: "mt-4 flex flex-col gap-3",
  expressionLabel:
    "flex flex-col gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-400",
  expressionValue: "text-xs text-emerald-200",
  stepList: "flex flex-col gap-2",
  stepItem:
    "flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3 text-left transition hover:border-emerald-400 cursor-grab active:cursor-grabbing",
  stepItemActive: "border-emerald-400 bg-slate-900/80",
  stepTitle: "text-sm font-semibold text-white",
  stepDesc: "text-xs text-slate-400",
  stepDelete: "text-xs text-red-300 transition hover:text-red-100",
  emptyHint: "text-xs text-slate-400",
  stepEditor:
    "mt-4 flex flex-col gap-3 rounded-2xl border border-white/5 bg-slate-950/40 p-4",
  scalingRow:
    "flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4",
  scalingResult:
    "flex min-w-[140px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-400",
  scalingValue: "text-2xl font-semibold text-emerald-300",
  primaryButton:
    "inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400",
} as const;
</script>

<template>
  <div class="space-y-6 flex flex-col h-full">
    <!-- 动作步骤 / 时间轴编辑 卡片 -->
    <section :class="classes.panel">
      <header class="mb-3">
        <div class="mb-3">
          <p :class="classes.eyebrow">动作步骤</p>
          <h3 :class="classes.title">拖拽步骤到时间轴编排</h3>
        </div>
        <!-- 按钮一列，宽度占满整个卡片，使用自定义拖拽 -->
        <div class="flex flex-col gap-2 w-full">
          <button
            v-for="button in stepButtons"
            :key="button.type + button.label"
            class="w-full px-3 py-2 rounded-lg bg-slate-900/70 text-xs font-medium text-slate-100 cursor-grab active:cursor-grabbing flex items-center gap-2 transition-colors hover:bg-slate-800 text-left"
            type="button"
            @mousedown.stop="
              handleLibraryMouseDown(
                $event as MouseEvent,
                button.type,
                button.label
              )
            "
          >
            <span
              class="w-6 h-6 rounded flex items-center justify-center bg-emerald-600 text-white text-[10px] font-bold"
            >
              {{ button.label.charAt(0) }}
            </span>
            <span class="flex flex-col flex-1 min-w-0">
              <span class="truncate">{{ button.label }}</span>
              <span class="mt-0.5 text-[10px] text-slate-400 truncate">
                {{ button.description }}
              </span>
            </span>
          </button>
        </div>
      </header>
      <!-- 卡片内部：不再额外占位，仅保留上方标签说明 -->
    </section>

    <!-- 拖拽中的库元素克隆 -->
    <div
      v-if="libraryDragging && !libraryDragging.overTimeline"
      class="pointer-events-none fixed z-50"
      :style="{
        left: libraryDragging.x - 30 + 'px',
        top: libraryDragging.y - 16 + 'px',
      }"
    >
      <div
        class="w-full px-3 py-2 rounded-lg bg-slate-900 text-xs font-medium text-slate-100 flex items-center gap-2 shadow-lg border border-emerald-400/60 min-w-[160px]"
      >
        <span
          class="w-6 h-6 rounded flex items-center justify-center bg-emerald-600 text-white text-[10px] font-bold"
        >
          {{ libraryDragging.label.charAt(0) }}
        </span>
        <span class="truncate">{{ libraryDragging.label }}</span>
      </div>
    </div>

    <!-- 技能元数据 -->
    <section :class="classes.panel">
      <header :class="classes.panelHeader">
        <div>
          <p :class="classes.eyebrow">技能元数据</p>
          <h3 :class="classes.title">命名与等级上下文</h3>
        </div>
        <button
          :class="classes.ghostButton"
          type="button"
          @click="emits('run-skill')"
        >
          <i class="fa fa-bolt mr-2 text-amber-300" />
          在游戏中试放
        </button>
      </header>
      <div class="flex flex-col gap-4">
        <label :class="classes.field">
          <span :class="classes.fieldLabel">技能名称</span>
          <input
            v-model="props.skill.name"
            :class="classes.input"
            maxlength="32"
            placeholder="例如：烈焰突袭"
            type="text"
          />
        </label>
        <label :class="classes.field">
          <span :class="classes.fieldLabel">设计描述</span>
          <textarea
            v-model="props.skill.context.notes"
            :class="classes.textarea"
            placeholder="说明该技能的定位、演出要点和破招窗口"
          />
        </label>
        <div :class="classes.sliderField">
          <div :class="classes.sliderLabel">
            <span>技能等级</span>
            <strong :class="classes.sliderValue">
              Lv {{ props.skill.context.level }}
            </strong>
          </div>
          <input
            v-model.number="props.skill.context.level"
            :class="classes.slider"
            :max="SKILL_LEVEL_MAX"
            :min="SKILL_LEVEL_MIN"
            step="1"
            type="range"
          />
          <p class="mt-2 text-xs text-slate-400">
            技能等级上限为 9，每升一级会同步提高熟练度门槛。
          </p>
        </div>
        <div :class="classes.sliderField">
          <div :class="classes.sliderLabel">
            <span>技能熟练进度 (Proficiency)</span>
            <strong :class="classes.sliderValue">
              {{ props.skill.context.proficiency }}
            </strong>
          </div>
          <input
            v-model.number="props.skill.context.proficiency"
            :class="classes.slider"
            :max="proficiencyRange.max"
            :min="proficiencyRange.min"
            step="100"
            type="range"
          />
          <p class="mt-2 text-xs text-slate-400">
            当前等级的熟练度区间：{{ proficiencyRangeLabel.minLabel }} ~
            {{ proficiencyRangeLabel.maxLabel }}（每级上限 +6000、下限 +2000）
          </p>
        </div>
      </div>
      <footer
        class="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400"
      >
        <span :class="classes.badge">
          <i class="fa fa-database mr-1 text-emerald-300" />
          计算上下文：level / mastery / proficiency / randomMin / randomMax
        </span>
      </footer>
    </section>

    <section :class="classes.panel">
      <header :class="classes.panelHeader">
        <div>
          <p :class="classes.eyebrow">对战沙盒</p>
          <h3 :class="classes.title">施法者与目标预设</h3>
        </div>
        <div class="text-xs text-slate-400">
          请直接在画布点击稻草人来决定命中的单位
        </div>
      </header>
      <div :class="classes.summaryWrapper">
        <div :class="classes.summaryCard">
          <div :class="classes.summaryHeader">
            <span>施法者</span>
            <span :class="classes.summaryTag">自动锁定</span>
          </div>
          <template v-if="selectedActor">
            <p :class="classes.summaryMain">{{ selectedActor.name }}</p>
            <p :class="classes.summarySub">
              {{ selectedActor.title }} · Lv {{ selectedActor.level }}
            </p>
            <p :class="classes.summarySubtle">
              当前角色 ID：{{ selectedActor.id }}
            </p>
          </template>
          <p v-else :class="classes.summarySub">
            未找到施法者，默认使用第一位玩家单位
          </p>
          <p :class="classes.summaryHint">
            施法者固定为右侧队友，不支持手动切换。
          </p>
        </div>
        <div :class="classes.summaryCard">
          <div :class="classes.summaryHeader">
            <span>目标列表</span>
            <span :class="classes.summaryTag">点击画布添加</span>
          </div>
          <div :class="classes.chipGrid">
            <span
              v-for="unit in selectedTargetUnits"
              :key="unit.id"
              :class="classes.targetChip"
            >
              {{ unit.name }}
            </span>
            <span
              v-if="!selectedTargetUnits.length"
              :class="classes.targetChipEmpty"
            >
              未选择 · 点击稻草人添加
            </span>
          </div>
          <p :class="classes.summaryHint">
            仅当“可选目标类型”允许时，才能在画布中选中对应单位。
          </p>
        </div>
      </div>
      <div :class="classes.targetingGrid">
        <div :class="classes.targetingSection">
          <h4 :class="classes.sectionTitle">可选目标类型</h4>
          <p :class="classes.sectionDesc">控制画布中允许被选中的单位类别</p>
          <div :class="classes.modeList">
            <label
              v-for="mode in targetModeOptions"
              :key="mode.value"
              :class="classes.modeChip"
            >
              <input
                :checked="props.skill.targeting.modes.includes(mode.value)"
                class="h-4 w-4 accent-emerald-400"
                type="checkbox"
                @change="toggleTargetMode(mode.value)"
              />
              <div>
                <span :class="['text-sm font-semibold', mode.accent]">
                  {{ mode.label }}
                </span>
                <p class="text-xs text-slate-400">{{ mode.desc }}</p>
              </div>
            </label>
          </div>
        </div>
        <div :class="classes.targetingSection">
          <h4 :class="classes.sectionTitle">随机人数</h4>
          <p :class="classes.sectionDesc">用于 AOE 技能或弹射技能的上下限</p>
          <div :class="classes.rangePair">
            <label :class="classes.rangeLabel">
              <span>最少命中</span>
              <strong :class="classes.rangeValue">
                {{ props.skill.targeting.randomRange[0] }}
              </strong>
              <input
                :value="props.skill.targeting.randomRange[0]"
                :class="classes.slider"
                max="6"
                min="1"
                type="range"
                @input="
                  updateRandomRange(
                    'min',
                    Number(($event.target as HTMLInputElement).value)
                  )
                "
              />
            </label>
            <label :class="classes.rangeLabel">
              <span>最多命中</span>
              <strong :class="classes.rangeValue">
                {{ props.skill.targeting.randomRange[1] }}
              </strong>
              <input
                :value="props.skill.targeting.randomRange[1]"
                :class="classes.slider"
                max="6"
                min="1"
                type="range"
                @input="
                  updateRandomRange(
                    'max',
                    Number(($event.target as HTMLInputElement).value)
                  )
                "
              />
            </label>
          </div>
        </div>
        <div :class="classes.targetingSection">
          <h4 :class="classes.sectionTitle">人数表达式</h4>
          <p :class="classes.sectionDesc">
            允许输入 <code>x + 1</code>、<code>level * 0.5</code> 等公式
          </p>
          <div :class="classes.expressionGrid">
            <label :class="classes.expressionLabel">
              <span>敌方人数</span>
              <input
                v-model="props.skill.targeting.expressions.enemy"
                :class="classes.input"
                placeholder="例如：level + 1"
                type="text"
              />
              <em :class="classes.expressionValue">
                = {{ targetCountsPreview.enemy }}
              </em>
            </label>
            <label :class="classes.expressionLabel">
              <span>友方人数</span>
              <input
                v-model="props.skill.targeting.expressions.ally"
                :class="classes.input"
                placeholder="例如：Math.max(1, targetCount - 1)"
                type="text"
              />
              <em :class="classes.expressionValue">
                = {{ targetCountsPreview.ally }}
              </em>
            </label>
            <label :class="classes.expressionLabel">
              <span>自身重复次数</span>
              <input
                v-model="props.skill.targeting.expressions.self"
                :class="classes.input"
                placeholder="通常固定为 1"
                type="text"
              />
              <em :class="classes.expressionValue">
                = {{ targetCountsPreview.self }}
              </em>
            </label>
          </div>
        </div>
      </div>
    </section>

    <section :class="classes.panel">
      <header :class="classes.panelHeader">
        <div>
          <p :class="classes.eyebrow">步骤配置</p>
          <h3 :class="classes.title">编辑当前选中步骤的参数</h3>
        </div>
      </header>
      <div v-if="props.selectedStep" :class="classes.stepEditor">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs text-slate-400">
            <span>类型：</span>
            <span class="font-semibold text-emerald-300">
              {{ props.selectedStep.type }}
            </span>
          </div>
          <button
            class="text-xs text-red-300 hover:text-red-100"
            type="button"
            @click="
              props.selectedStepIndex !== null &&
                emits('delete-step', props.selectedStepIndex)
            "
          >
            删除该步骤
          </button>
        </div>

        <template v-if="props.selectedStep.type === 'move'">
          <label :class="classes.field">
            <span :class="classes.fieldLabel">目标 X</span>
            <input
              :value="(props.selectedStep.params.targetX as string | number | boolean | undefined) ?? ''"
              :class="classes.input"
              placeholder="例如：targetX - 60"
              type="text"
              @input="
                emits('update-step-param', {
                  key: 'targetX',
                  value: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label :class="classes.field">
            <span :class="classes.fieldLabel">目标 Y</span>
            <input
              :value="(props.selectedStep.params.targetY as string | number | boolean | undefined) ?? ''"
              :class="classes.input"
              placeholder="例如：targetY"
              type="text"
              @input="
                emits('update-step-param', {
                  key: 'targetY',
                  value: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label :class="classes.field">
            <span :class="classes.fieldLabel">持续时间 (ms)</span>
            <input
              :value="Number(props.selectedStep.params.duration ?? 300)"
              :class="classes.input"
              min="0"
              type="number"
              @input="
                emits('update-step-param', {
                  key: 'duration',
                  value: Number(($event.target as HTMLInputElement).value || 0),
                })
              "
            />
          </label>
        </template>

        <template v-else-if="props.selectedStep.type === 'damage'">
          <label :class="classes.field">
            <span :class="classes.fieldLabel">伤害数值</span>
            <input
              :value="Number(props.selectedStep.params.val ?? 0)"
              :class="classes.input"
              min="0"
              type="number"
              @input="
                emits('update-step-param', {
                  key: 'val',
                  value: Number(($event.target as HTMLInputElement).value || 0),
                })
              "
            />
          </label>
        </template>

        <template v-else-if="props.selectedStep.type === 'effect'">
          <label :class="classes.field">
            <span :class="classes.fieldLabel">特效 Key</span>
            <input
              :value="(props.selectedStep.params.key as string | number | boolean | undefined) ?? ''"
              :class="classes.input"
              placeholder="例如：explosion 或动画资源 key"
              type="text"
              @input="
                emits('update-step-param', {
                  key: 'key',
                  value: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label :class="classes.field">
            <span :class="classes.fieldLabel">位置 X</span>
            <input
              :value="(props.selectedStep.params.x as string | number | boolean | undefined) ?? ''"
              :class="classes.input"
              placeholder="例如：targetX"
              type="text"
              @input="
                emits('update-step-param', {
                  key: 'x',
                  value: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label :class="classes.field">
            <span :class="classes.fieldLabel">位置 Y</span>
            <input
              :value="(props.selectedStep.params.y as string | number | boolean | undefined) ?? ''"
              :class="classes.input"
              placeholder="例如：targetY"
              type="text"
              @input="
                emits('update-step-param', {
                  key: 'y',
                  value: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label class="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              :checked="Boolean(props.selectedStep.params.wait)"
              class="h-4 w-4 accent-emerald-400"
              type="checkbox"
              @change="
                emits('update-step-param', {
                  key: 'wait',
                  value: ($event.target as HTMLInputElement).checked,
                })
              "
            />
            <span>等待特效播放完成再继续后续步骤</span>
          </label>
        </template>

        <template v-else-if="props.selectedStep.type === 'wait'">
          <label :class="classes.field">
            <span :class="classes.fieldLabel">等待时长 (ms)</span>
            <input
              :value="Number(props.selectedStep.params.duration ?? 200)"
              :class="classes.input"
              min="0"
              type="number"
              @input="
                emits('update-step-param', {
                  key: 'duration',
                  value: Number(($event.target as HTMLInputElement).value || 0),
                })
              "
            />
          </label>
        </template>

        <p v-else class="text-xs text-slate-400">
          当前步骤类型暂时没有专用编辑 UI，可以在 JSON 中直接扩展参数。
        </p>
      </div>
      <p v-else :class="classes.emptyHint">
        请选择时间轴中的一个步骤，以编辑它的具体参数（位置、伤害、特效等）。
      </p>
    </section>

    <section :class="classes.panel">
      <header :class="classes.panelHeader">
        <div>
          <p :class="classes.eyebrow">数值曲线</p>
          <h3 :class="classes.title">等级/熟练度驱动的参数</h3>
        </div>
        <button
          :class="classes.ghostButton"
          type="button"
          @click="addScalingFormula"
        >
          <i class="fa fa-plus mr-2" />
          新增输出项
        </button>
      </header>
      <div class="space-y-3">
        <div
          v-for="(entry, index) in props.skill.scaling"
          :key="entry.id"
          :class="classes.scalingRow"
        >
          <div class="flex flex-1 flex-col gap-2">
            <div :class="classes.field">
              <div class="flex items-center justify-between">
                <span :class="classes.fieldLabel">表现名称</span>
                <button
                  class="text-red-400 transition hover:text-red-300 hover:scale-110"
                  type="button"
                  @click="removeScalingFormula(entry.id)"
                >
                  <i class="fa fa-times" />
                </button>
              </div>
              <input
                :value="entry.label"
                :class="classes.input"
                maxlength="20"
                placeholder="例如：爆发伤害"
                type="text"
                @input="
                  updateScalingEntry(
                    index,
                    'label',
                    ($event.target as HTMLInputElement).value
                  )
                "
              />
            </div>
            <label :class="classes.field">
              <span :class="classes.fieldLabel">计算公式</span>
              <input
                :value="entry.expression"
                :class="[classes.input, 'font-mono text-xs']"
                placeholder="level * 12 + mastery * 4"
                type="text"
                @input="
                  updateScalingEntry(
                    index,
                    'expression',
                    ($event.target as HTMLInputElement).value
                  )
                "
              />
            </label>
          </div>
          <div :class="classes.scalingResult">
            <span>当前结果</span>
            <strong :class="classes.scalingValue">
              {{ scalingPreview[index]?.value ?? 0 }}
            </strong>
          </div>
        </div>
        <p class="text-xs text-slate-500">
          变量上下文：level / mastery / proficiency / randomMin / randomMax /
          targetCount
        </p>
      </div>
    </section>

    <footer
      class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/70 via-slate-900/40 to-slate-900/70 px-4 py-3"
    >
      <div class="text-sm text-slate-300">
        当前选中的
        {{ props.skill.context.selectedTargetIds.length }}
        个目标将作为右侧画布的演示输入。
      </div>
      <button
        :class="classes.primaryButton"
        type="button"
        @click="emits('run-skill')"
      >
        <i class="fa fa-play mr-2" />
        推送到战斗场景
      </button>
    </footer>
  </div>
</template>
