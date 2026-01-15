<script setup lang="ts">
/**
 * @file 技能战斗预览画布
 * @description 使用 Canvas 绘制战斗预览，支持缩放、平移、单位选择
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { TimelineSegment } from "@/types";
import {
  SKILL_SANDBOX_UNITS,
  getSandboxUnitById,
  calculateStaggeredPositions,
  type SkillSandboxUnit,
} from "../core/sandboxConfig";

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
}>();

const emit = defineEmits<{
  "update:current-frame": [number];
  "toggle-target": [string];
}>();

// ============ 状态 ============

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);

// 相机状态
const camera = ref({
  scale: 0.95,
  offsetX: 0,
  offsetY: 0,
});

// 拖拽状态
const draggingState = ref({
  dragging: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
});

// 基础画布尺寸
const base = {
  width: 960,
  height: 540,
};

// 动画帧句柄
const rafHandle = ref<number | null>(null);
const lastTick = ref(0);

// ============ 计算属性 ============

// 计算单位站位
const unitPositions = computed(() => {
  const playerUnits = SKILL_SANDBOX_UNITS.filter((u) => u.side === "player");
  const enemyUnits = SKILL_SANDBOX_UNITS.filter((u) => u.side === "enemy");
  const playerPositions = calculateStaggeredPositions(playerUnits, base.width, base.height);
  const enemyPositions = calculateStaggeredPositions(enemyUnits, base.width, base.height);

  const allPositions = new Map<string, { x: number; y: number }>();
  playerPositions.forEach((pos, id) => allPositions.set(id, pos));
  enemyPositions.forEach((pos, id) => allPositions.set(id, pos));
  return allPositions;
});

// 当前激活的片段
const activeSegment = computed(() => {
  return (
    props.segments.find(
      (segment) => props.currentFrame >= segment.startFrame && props.currentFrame < segment.endFrame,
    ) ?? null
  );
});

// 施法者单位
const actorUnit = computed(() => {
  return getSandboxUnitById(props.casterId) ?? SKILL_SANDBOX_UNITS.find((unit) => unit.side === "player") ?? null;
});

// 预览目标
const previewTargets = computed(() => {
  const ids = props.selectedTargetIds;
  if (ids.length) {
    return SKILL_SANDBOX_UNITS.filter((unit) => ids.includes(unit.id));
  }
  if (props.targetingModes.includes("enemy")) {
    return SKILL_SANDBOX_UNITS.filter((unit) => unit.side === "enemy").slice(0, 1);
  }
  if (actorUnit.value) {
    return [actorUnit.value];
  }
  return [];
});

// ============ 方法 ============

// 确保画布尺寸
const ensureCanvasSize = () => {
  if (!containerRef.value || !canvasRef.value) return;
  const { clientWidth, clientHeight } = containerRef.value;
  canvasRef.value.width = clientWidth;
  canvasRef.value.height = clientHeight;
};

// 重置视图
const resetView = () => {
  camera.value = { scale: 0.95, offsetX: 0, offsetY: 0 };
  draw();
};

// 世界坐标转屏幕坐标
const project = (unit: SkillSandboxUnit) => {
  if (!canvasRef.value) return { x: 0, y: 0 };
  const { width, height } = canvasRef.value;
  const position = unitPositions.value.get(unit.id) || { x: base.width / 2, y: base.height / 2 };
  const worldX = position.x - base.width / 2;
  const worldY = position.y - base.height / 2;
  const x = (worldX + camera.value.offsetX) * camera.value.scale + width / 2;
  const y = (worldY + camera.value.offsetY) * camera.value.scale + height / 2;
  return { x, y };
};

// 绘制背景
const drawBackground = () => {
  if (!ctx.value || !canvasRef.value) return;
  const { width, height } = canvasRef.value;

  // 亮色渐变背景
  const gradient = ctx.value.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(0.6, "#f1f5f9");
  gradient.addColorStop(1, "#e2e8f0");
  ctx.value.fillStyle = gradient;
  ctx.value.fillRect(0, 0, width, height);

  // 网格线
  ctx.value.strokeStyle = "rgba(148,163,184,0.2)";
  ctx.value.lineWidth = 1;
  for (let i = -base.width; i <= base.width; i += 100) {
    const start = { x: (i + camera.value.offsetX) * camera.value.scale + width / 2, y: 0 };
    ctx.value.beginPath();
    ctx.value.moveTo(start.x, 0);
    ctx.value.lineTo(start.x, height);
    ctx.value.stroke();
  }
  for (let j = -base.height; j <= base.height; j += 80) {
    const y = (j + camera.value.offsetY) * camera.value.scale + height / 2;
    ctx.value.beginPath();
    ctx.value.moveTo(0, y);
    ctx.value.lineTo(width, y);
    ctx.value.stroke();
  }

  // 地面阴影
  ctx.value.fillStyle = "rgba(226,232,240,0.6)";
  const groundY = (100 + camera.value.offsetY) * camera.value.scale + height / 2;
  ctx.value.fillRect(0, groundY, width, height - groundY);
};

// 绘制圆角矩形
const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) => {
  const r = Math.min(radius, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
};

// 绘制单位
const drawUnit = (unit: SkillSandboxUnit, highlight: "actor" | "target" | null) => {
  if (!ctx.value) return;
  const { x, y } = project(unit);
  const bodyWidth = 90 * camera.value.scale;
  const bodyHeight = 120 * camera.value.scale;

  // 高亮圈
  if (highlight === "actor") {
    ctx.value.strokeStyle = "rgba(99, 102, 241, 0.8)";
    ctx.value.lineWidth = 6;
    ctx.value.beginPath();
    ctx.value.arc(x, y + 20 * camera.value.scale, bodyWidth, 0, Math.PI * 2);
    ctx.value.stroke();
  } else if (highlight === "target") {
    ctx.value.strokeStyle = "rgba(245, 158, 11, 0.9)";
    ctx.value.lineWidth = 4;
    ctx.value.beginPath();
    ctx.value.arc(x, y + 20 * camera.value.scale, bodyWidth * 0.9, 0, Math.PI * 2);
    ctx.value.stroke();
  }

  // 身体
  ctx.value.fillStyle = unit.side === "player" ? "rgba(99,102,241,0.7)" : "rgba(244,63,94,0.7)";
  ctx.value.strokeStyle = "#1e293b";
  ctx.value.lineWidth = 2;
  drawRoundedRect(ctx.value, x - bodyWidth / 2, y - bodyHeight / 2, bodyWidth, bodyHeight, 12 * camera.value.scale);
  ctx.value.fill();
  ctx.value.stroke();

  // 名称背景
  ctx.value.fillStyle = "rgba(255,255,255,0.9)";
  drawRoundedRect(
    ctx.value,
    x - bodyWidth / 2,
    y - bodyHeight / 2 - 30 * camera.value.scale,
    bodyWidth,
    32 * camera.value.scale,
    10 * camera.value.scale,
  );
  ctx.value.fill();

  // 名称文字
  ctx.value.fillStyle = "#334155";
  ctx.value.font = `${12 * camera.value.scale}px sans-serif`;
  ctx.value.textAlign = "center";
  ctx.value.fillText(unit.name, x, y - bodyHeight / 2 - 12 * camera.value.scale);

  // 血条
  const hpPercent = unit.hp / unit.maxHp;
  ctx.value.fillStyle = "rgba(226,232,240,0.9)";
  const barWidth = bodyWidth;
  const barHeight = 8 * camera.value.scale;
  ctx.value.fillRect(x - barWidth / 2, y + bodyHeight / 2 + 6 * camera.value.scale, barWidth, barHeight);
  ctx.value.fillStyle = hpPercent > 0.4 ? "#10b981" : "#f43f5e";
  ctx.value.fillRect(
    x - barWidth / 2,
    y + bodyHeight / 2 + 6 * camera.value.scale,
    barWidth * Math.max(0, Math.min(1, hpPercent)),
    barHeight,
  );
};

// 绘制当前激活的效果
const drawActiveEffect = () => {
  if (!ctx.value || !actorUnit.value) return;
  const segment = activeSegment.value;
  if (!segment) return;

  const actorPos = project(actorUnit.value);
  const targets = previewTargets.value;
  const center =
    targets.length > 0
      ? targets
          .map((unit) => project(unit))
          .reduce((acc, pos) => ({ x: acc.x + pos.x / targets.length, y: acc.y + pos.y / targets.length }), {
            x: 0,
            y: 0,
          })
      : actorPos;

  const stepType = segment.step?.type;

  if (stepType === "move") {
    ctx.value.strokeStyle = "rgba(99,102,241,0.8)";
    ctx.value.lineWidth = 3;
    ctx.value.setLineDash([10, 8]);
    ctx.value.beginPath();
    ctx.value.moveTo(actorPos.x, actorPos.y);
    ctx.value.lineTo(center.x, center.y);
    ctx.value.stroke();
    ctx.value.setLineDash([]);
  } else if (stepType === "damage") {
    targets.forEach((unit) => {
      const pos = project(unit);
      ctx.value!.strokeStyle = "rgba(244,63,94,0.9)";
      ctx.value!.lineWidth = 5;
      ctx.value!.beginPath();
      ctx.value!.arc(pos.x, pos.y, 40 * camera.value.scale, 0, Math.PI * 2);
      ctx.value!.stroke();
    });
  } else if (stepType === "effect") {
    ctx.value.fillStyle = "rgba(139,92,246,0.25)";
    ctx.value.beginPath();
    ctx.value.arc(center.x, center.y, 120 * camera.value.scale, 0, Math.PI * 2);
    ctx.value.fill();
  }
};

// 绘制 HUD
const drawHud = () => {
  if (!ctx.value || !canvasRef.value) return;
  const { width } = canvasRef.value;

  // 左上角信息
  const info = `帧 ${props.currentFrame + 1}/${Math.max(1, props.totalFrames)}`;
  ctx.value.fillStyle = "rgba(255,255,255,0.95)";
  ctx.value.strokeStyle = "rgba(148,163,184,0.3)";
  ctx.value.lineWidth = 1;
  drawRoundedRect(ctx.value, 20, 20, 200, 50, 8);
  ctx.value.fill();
  ctx.value.stroke();
  ctx.value.fillStyle = "#334155";
  ctx.value.font = "14px sans-serif";
  ctx.value.textAlign = "left";
  ctx.value.fillText(info, 36, 42);
  if (activeSegment.value) {
    ctx.value.fillStyle = "#64748b";
    ctx.value.fillText(`当前: ${activeSegment.value.step?.type || "无"}`, 36, 60);
  }

  // 右上角信息
  ctx.value.fillStyle = "rgba(255,255,255,0.95)";
  drawRoundedRect(ctx.value, width - 180, 20, 160, 50, 8);
  ctx.value.fill();
  ctx.value.stroke();
  ctx.value.fillStyle = "#6366f1";
  ctx.value.textAlign = "left";
  ctx.value.fillText(`缩放 ${camera.value.scale.toFixed(2)}x`, width - 160, 42);
  ctx.value.fillStyle = "#0891b2";
  ctx.value.fillText(`目标 ${previewTargets.value.length}`, width - 160, 60);
};

// 主绘制函数
const draw = () => {
  if (!ctx.value || !canvasRef.value) return;
  ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  drawBackground();

  SKILL_SANDBOX_UNITS.forEach((unit) => {
    let highlight: "actor" | "target" | null = null;
    if (actorUnit.value && unit.id === actorUnit.value.id) {
      highlight = "actor";
    } else if (previewTargets.value.some((target) => target.id === unit.id)) {
      highlight = "target";
    }
    drawUnit(unit, highlight);
  });

  drawActiveEffect();
  drawHud();
};

// 动画循环
const tick = (timestamp: number) => {
  if (!props.playing || props.totalFrames <= 1) {
    lastTick.value = timestamp;
  } else if (timestamp - lastTick.value >= 1000 / props.fps) {
    const next = props.currentFrame + 1 >= props.totalFrames ? 0 : props.currentFrame + 1;
    emit("update:current-frame", next);
    lastTick.value = timestamp;
  }
  draw();
  rafHandle.value = requestAnimationFrame(tick);
};

// 滚轮缩放
const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  const delta = -event.deltaY * 0.001;
  const nextScale = Math.min(2.5, Math.max(0.5, camera.value.scale + delta));
  camera.value.scale = nextScale;
  draw();
};

// 获取鼠标下的单位
const getUnitUnderPointer = (event: PointerEvent): SkillSandboxUnit | null => {
  if (!canvasRef.value) return null;
  const rect = canvasRef.value.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;

  for (const unit of SKILL_SANDBOX_UNITS) {
    const { x, y } = project(unit);
    const w = 90 * camera.value.scale;
    const h = 120 * camera.value.scale;
    if (Math.abs(pointerX - x) <= w / 2 && Math.abs(pointerY - y) <= h / 2) {
      return unit;
    }
  }
  return null;
};

// 判断单位是否可选
const isUnitSelectable = (unit: SkillSandboxUnit): boolean => {
  const modes = props.targetingModes;
  const actorId = actorUnit.value?.id;
  if (unit.id === actorId) return modes.includes("self");
  if (unit.side === "player") return modes.includes("ally");
  if (unit.side === "enemy") return modes.includes("enemy");
  return false;
};

// 鼠标按下
const handlePointerDown = (event: PointerEvent) => {
  const targetUnit = getUnitUnderPointer(event);
  if (event.button === 0 && targetUnit) {
    if (isUnitSelectable(targetUnit)) {
      emit("toggle-target", targetUnit.id);
    }
    return;
  }

  draggingState.value = {
    dragging: true,
    startX: event.clientX,
    startY: event.clientY,
    originX: camera.value.offsetX,
    originY: camera.value.offsetY,
  };
};

// 鼠标移动
const handlePointerMove = (event: PointerEvent) => {
  if (!draggingState.value.dragging) return;
  const dx = (event.clientX - draggingState.value.startX) / camera.value.scale;
  const dy = (event.clientY - draggingState.value.startY) / camera.value.scale;
  camera.value.offsetX = draggingState.value.originX + dx;
  camera.value.offsetY = draggingState.value.originY + dy;
  draw();
};

// 停止拖拽
const stopDragging = () => {
  draggingState.value.dragging = false;
};

// ============ 生命周期 ============

onMounted(() => {
  ensureCanvasSize();
  ctx.value = canvasRef.value?.getContext("2d") ?? null;
  draw();
  window.addEventListener("resize", ensureCanvasSize);
  window.addEventListener("pointerup", stopDragging);
  window.addEventListener("pointermove", handlePointerMove);
  rafHandle.value = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  if (rafHandle.value) cancelAnimationFrame(rafHandle.value);
  window.removeEventListener("resize", ensureCanvasSize);
  window.removeEventListener("pointerup", stopDragging);
  window.removeEventListener("pointermove", handlePointerMove);
});

// 监听数据变化重绘
watch(
  () => ({
    frame: props.currentFrame,
    caster: props.casterId,
    targets: props.selectedTargetIds.slice(),
    modes: props.targetingModes.slice(),
    segments: props.segments.map((s) => ({ start: s.startFrame, end: s.endFrame, type: s.step?.type })),
  }),
  () => draw(),
  { deep: true },
);
</script>

<template>
  <div
    ref="containerRef"
    class="relative flex h-full w-full overflow-hidden rounded-t-xl border-b border-slate-200 bg-slate-100"
    @wheel="handleWheel"
  >
    <canvas ref="canvasRef" class="h-full w-full cursor-grab active:cursor-grabbing" @pointerdown="handlePointerDown" />
    <!-- 控制按钮 -->
    <div
      class="absolute top-4 left-4 flex flex-wrap gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur"
    >
      <button
        class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-600"
        type="button"
        @click="resetView"
      >
        重置视图
      </button>
      <button
        class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-600"
        type="button"
        @click="$emit('update:current-frame', 0)"
      >
        回到开始
      </button>
    </div>
  </div>
</template>
