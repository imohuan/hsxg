<script setup lang="ts">
/**
 * @file 技能战斗预览画布
 * @description 使用 GameCanvas 绘制战斗预览，支持缩放、平移、单位选择
 * 集成步骤执行器，使用 executeStep API 执行技能步骤
 * Requirements: 1.6, 15.1-15.6
 */
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import type { TimelineSegment, BattleUnit, SkillStep } from "@/types";
import GameCanvas from "@/components/gamecanvas/GameCanvas.vue";
import {
  SKILL_SANDBOX_UNITS,
  getSandboxUnitById,
  calculateStaggeredPositions,
  type SkillSandboxUnit,
} from "@/modules/skill/core/sandboxConfig";

// ============ Props/Emits ============

const props = defineProps<{
  currentFrame: number;
  totalFrames: number;
  playing: boolean;
  fps: number;
  segments: TimelineSegment[];
  casterId: string;
  selectedTargetIds: string[];
  targetingModes: string[];
  /** 目标数量限制（0 表示无限制） */
  targetCount?: number;
}>();

const emit = defineEmits<{
  "update:current-frame": [number];
  "toggle-target": [string];
}>();

// ============ 状态 ============

const canvasRef = ref<InstanceType<typeof GameCanvas> | null>(null);

// 动画帧句柄
const rafHandle = ref<number | null>(null);
const lastTick = ref(0);

// 当前正在执行的片段 ID（避免重复执行）
const executingSegmentId = ref<string | null>(null);

// 画布尺寸
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

// ============ 计算属性 ============

/** 将 SkillSandboxUnit 转换为 BattleUnit */
function toBattleUnit(unit: SkillSandboxUnit): BattleUnit {
  return {
    id: unit.id,
    name: unit.name,
    hp: unit.hp,
    maxHp: unit.maxHp,
    mp: unit.mp,
    maxMp: unit.maxMp,
    speed: unit.level,
    isDead: unit.hp <= 0,
    selectable: true, // 所有单位都可选，避免半透明效果
    isPlayer: unit.side === "player",
  };
}

/** 判断单位是否可选 */
function isUnitSelectable(unit: SkillSandboxUnit): boolean {
  const modes = props.targetingModes;
  const actorId = props.casterId;
  if (unit.id === actorId) return modes.includes("self");
  if (unit.side === "player") return modes.includes("ally");
  if (unit.side === "enemy") return modes.includes("enemy");
  return false;
}

/** 获取选择模式描述 */
const selectionModeLabel = computed(() => {
  const count = props.targetCount ?? 1;
  if (count === 0) return "多选";
  if (count === 1) return "单选";
  return `最多 ${count} 个`;
});

/** 施法者单位 */
const actorUnit = computed(() => {
  return (
    getSandboxUnitById(props.casterId) ??
    SKILL_SANDBOX_UNITS.find((unit) => unit.side === "player") ??
    null
  );
});

/** 画布场景配置 - 使用新版 gameData 格式 */
const gameData = computed(() => {
  const playerUnits = SKILL_SANDBOX_UNITS.filter((u) => u.side === "player").map(toBattleUnit);
  const enemyUnits = SKILL_SANDBOX_UNITS.filter((u) => u.side === "enemy").map(toBattleUnit);

  return {
    scene: {
      name: "技能预览",
      backgroundColor: "#f1f5f9",
    },
    players: {
      enemy: { id: "enemy", name: "敌方" },
      self: { id: "player", name: "我方" },
    },
    units: [...enemyUnits, ...playerUnits],
    effects: [],
    sounds: [],
    skills: [],
    items: [],
    turn: {
      number: 1,
      activeUnitId: actorUnit.value?.id,
      phase: "command" as const,
    },
  };
});

/** 当前激活的片段 */
const activeSegment = computed(() => {
  return (
    props.segments.find(
      (segment) =>
        props.currentFrame >= segment.startFrame && props.currentFrame < segment.endFrame,
    ) ?? null
  );
});

/** 计算单位位置映射 */
const unitPositions = computed(() => {
  const playerUnits = SKILL_SANDBOX_UNITS.filter((u) => u.side === "player");
  const enemyUnits = SKILL_SANDBOX_UNITS.filter((u) => u.side === "enemy");
  const playerPositions = calculateStaggeredPositions(playerUnits, CANVAS_WIDTH, CANVAS_HEIGHT);
  const enemyPositions = calculateStaggeredPositions(enemyUnits, CANVAS_WIDTH, CANVAS_HEIGHT);

  const allPositions = new Map<string, { x: number; y: number }>();
  playerPositions.forEach((pos, id) => allPositions.set(id, pos));
  enemyPositions.forEach((pos, id) => allPositions.set(id, pos));
  return allPositions;
});

// ============ 方法 ============

/** 重置视图 */
function resetView(): void {
  canvasRef.value?.resetCamera(300);
}

/** 回到开始 */
function goToStart(): void {
  emit("update:current-frame", 0);
  // 重置所有单位位置
  canvasRef.value?.resetAllUnitPositions();
  executingSegmentId.value = null;
}

/** 处理单位点击 */
function handleUnitClick(unitId: string): void {
  const unit = getSandboxUnitById(unitId);
  if (unit && isUnitSelectable(unit)) {
    emit("toggle-target", unitId);
  }
}

/**
 * 解析步骤参数中的表达式
 * 支持 actorX, actorY, targetX, targetY 等变量
 * Requirements: 15.1-15.6
 */
function resolveStepParams(step: SkillStep): SkillStep {
  const actorId = props.casterId;
  const targetIds = props.selectedTargetIds;
  const firstTargetId = targetIds.length > 0 ? targetIds[0] : null;

  // 获取施法者位置
  const actorPos = unitPositions.value.get(actorId) || {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
  };
  // 获取第一个目标位置
  const targetPos = firstTargetId
    ? unitPositions.value.get(firstTargetId) || { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }
    : { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

  // 创建变量上下文
  const context: Record<string, number> = {
    actorX: actorPos.x,
    actorY: actorPos.y,
    targetX: targetPos.x,
    targetY: targetPos.y,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
  };

  // 解析参数
  const resolvedParams = { ...step.params };

  // 解析数值表达式
  const resolveValue = (value: unknown): unknown => {
    if (typeof value === "string") {
      // 尝试解析为表达式
      try {
        // 简单的表达式解析：替换变量名为实际值
        let expr = value;
        for (const [key, val] of Object.entries(context)) {
          expr = expr.replace(new RegExp(`\\b${key}\\b`, "g"), String(val));
        }
        // 计算简单的数学表达式
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${expr}`)();
        if (typeof result === "number" && !isNaN(result)) {
          return result;
        }
      } catch {
        // 解析失败，返回原值
      }
    }
    return value;
  };

  // 解析关键参数
  if (resolvedParams.targetX !== undefined) {
    resolvedParams.targetX = resolveValue(resolvedParams.targetX) as number;
  }
  if (resolvedParams.targetY !== undefined) {
    resolvedParams.targetY = resolveValue(resolvedParams.targetY) as number;
  }
  if (resolvedParams.x !== undefined) {
    resolvedParams.x = resolveValue(resolvedParams.x) as number;
  }
  if (resolvedParams.y !== undefined) {
    resolvedParams.y = resolveValue(resolvedParams.y) as number;
  }

  // 设置默认的 unitId（施法者）
  if (!resolvedParams.unitId && step.type === "move") {
    resolvedParams.unitId = actorId;
  }

  return {
    ...step,
    params: resolvedParams,
  };
}

/**
 * 执行当前片段的步骤
 * Requirements: 15.1-15.6
 */
async function executeCurrentSegmentStep(): Promise<void> {
  const segment = activeSegment.value;
  if (!segment || !segment.step || !canvasRef.value) return;

  // 避免重复执行同一片段
  if (executingSegmentId.value === segment.id) return;
  executingSegmentId.value = segment.id;

  // 解析步骤参数
  const resolvedStep = resolveStepParams(segment.step);

  try {
    // 使用 executeStep API 执行步骤
    await canvasRef.value.executeStep(resolvedStep);
  } catch (error) {
    console.warn("[SkillBattlePreview] 步骤执行失败:", error);
  }
}

/** 动画循环 - 处理帧播放 */
function tick(timestamp: number): void {
  if (!props.playing || props.totalFrames <= 1) {
    lastTick.value = timestamp;
  } else if (timestamp - lastTick.value >= 1000 / props.fps) {
    const next = props.currentFrame + 1 >= props.totalFrames ? 0 : props.currentFrame + 1;
    emit("update:current-frame", next);
    lastTick.value = timestamp;

    // 如果回到开始，重置执行状态
    if (next === 0) {
      executingSegmentId.value = null;
      canvasRef.value?.resetAllUnitPositions();
    }
  }
  rafHandle.value = requestAnimationFrame(tick);
}

// ============ 生命周期 ============

onMounted(() => {
  rafHandle.value = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  if (rafHandle.value) {
    cancelAnimationFrame(rafHandle.value);
  }
});

// ============ 监听变化更新高亮 ============

watch(
  () => props.casterId,
  (newCasterId) => {
    // 更新当前行动单位高亮
    canvasRef.value?.setActiveUnit(newCasterId ? newCasterId : null);
  },
  { immediate: true },
);

watch(
  () => props.selectedTargetIds,
  (newTargetIds) => {
    if (!canvasRef.value) return;

    // 使用新的多选 API
    canvasRef.value.setUnitsSelected(newTargetIds);
  },
  { deep: true, immediate: true },
);

// 监听当前帧变化，执行对应步骤
watch(
  () => activeSegment.value,
  (newSegment, oldSegment) => {
    // 当进入新片段时执行步骤
    if (newSegment && newSegment.id !== oldSegment?.id && props.playing) {
      executeCurrentSegmentStep();
    }
  },
);

// 监听播放状态变化
watch(
  () => props.playing,
  (isPlaying) => {
    if (!isPlaying) {
      // 暂停时重置执行状态，允许下次播放时重新执行
      executingSegmentId.value = null;
    }
  },
);
</script>

<template>
  <div class="relative h-full w-full overflow-hidden border border-slate-200 bg-slate-100">
    <!-- 顶部标题栏：精简信息 -->
    <div
      class="absolute top-0 right-0 left-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2"
    >
      <!-- 左侧：帧信息 -->
      <span class="text-xs text-slate-600">
        帧 {{ currentFrame + 1 }}/{{ Math.max(1, totalFrames) }}
      </span>

      <!-- 中间：当前步骤 -->
      <span v-if="activeSegment" class="text-xs text-slate-600">
        当前步骤: {{ activeSegment.step?.type || "无" }}
      </span>
      <span v-else class="text-xs text-slate-400">无步骤</span>

      <!-- 右侧：控制按钮 -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-500">
          目标: {{ selectedTargetIds.length }}
          <span class="text-slate-400">({{ selectionModeLabel }})</span>
        </span>
        <button
          class="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-600"
          type="button"
          @click="resetView"
        >
          重置视图
        </button>
        <button
          class="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-600"
          type="button"
          @click="goToStart"
        >
          回到开始
        </button>
      </div>
    </div>

    <!-- 游戏画布 -->
    <GameCanvas
      ref="canvasRef"
      :game-data="gameData"
      :enable-transform="true"
      :width="CANVAS_WIDTH"
      :height="CANVAS_HEIGHT"
      class="absolute inset-0 h-full w-full"
      @unit-click="handleUnitClick"
    >
      <!-- 空 header slot，使用外部自定义顶部栏 -->
      <template #header />
    </GameCanvas>
  </div>
</template>
