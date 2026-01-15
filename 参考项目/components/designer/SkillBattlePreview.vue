<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { SkillDesign, SkillStep } from "@/core/designer/types";
import { SKILL_SANDBOX_UNITS } from "@/core/config/sandboxConfig";
import {
  getSandboxUnitById,
  type SkillSandboxUnit,
} from "@/core/utils/sandbox";
import { calculateStaggeredPositions } from "@/core/utils/position";

type TimelineSegment = {
  start: number;
  end: number;
  step: SkillStep;
};

const props = defineProps<{
  skill: SkillDesign;
  currentFrame: number;
  totalFrames: number;
  playing: boolean;
  fps: number;
  segments: TimelineSegment[];
}>();

const emit = defineEmits<{
  "update:current-frame": [number];
  "toggle-target": [string];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);
const camera = ref({
  scale: 0.95,
  offsetX: 0,
  offsetY: 0,
});

const draggingState = ref({
  dragging: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
});

const base = {
  width: 960,
  height: 540,
};

// 计算站位
const unitPositions = computed(() => {
  const playerUnits = SKILL_SANDBOX_UNITS.filter((u) => u.side === "player");
  const enemyUnits = SKILL_SANDBOX_UNITS.filter((u) => u.side === "enemy");
  const playerPositions = calculateStaggeredPositions(
    playerUnits,
    base.width,
    base.height
  );
  const enemyPositions = calculateStaggeredPositions(
    enemyUnits,
    base.width,
    base.height
  );
  // 合并两个位置映射
  const allPositions = new Map<string, { x: number; y: number }>();
  playerPositions.forEach((pos, id) => allPositions.set(id, pos));
  enemyPositions.forEach((pos, id) => allPositions.set(id, pos));
  return allPositions;
});

const rafHandle = ref<number | null>(null);
const lastTick = ref(0);

const activeSegment = computed(() => {
  return (
    props.segments.find(
      (segment) =>
        props.currentFrame >= segment.start && props.currentFrame < segment.end
    ) ?? null
  );
});

const actorUnit = computed(() => {
  return (
    getSandboxUnitById(props.skill.context.casterId, SKILL_SANDBOX_UNITS) ??
    SKILL_SANDBOX_UNITS.find((unit) => unit.side === "player") ??
    null
  );
});

const previewTargets = computed(() => {
  const ids = props.skill.context.selectedTargetIds;
  if (ids.length) {
    return SKILL_SANDBOX_UNITS.filter((unit) => ids.includes(unit.id));
  }
  if (props.skill.targeting.modes.includes("enemy")) {
    return SKILL_SANDBOX_UNITS.filter((unit) => unit.side === "enemy").slice(
      0,
      props.skill.targeting.randomRange[0]
    );
  }
  if (actorUnit.value) {
    return [actorUnit.value];
  }
  return [];
});

const ensureCanvasSize = () => {
  if (!containerRef.value || !canvasRef.value) return;
  const { clientWidth, clientHeight } = containerRef.value;
  canvasRef.value.width = clientWidth;
  canvasRef.value.height = clientHeight;
};

const resetView = () => {
  camera.value = {
    scale: 0.95,
    offsetX: 0,
    offsetY: 0,
  };
  draw();
};

const project = (unit: SkillSandboxUnit) => {
  if (!canvasRef.value) return { x: 0, y: 0 };
  const { width, height } = canvasRef.value;
  const position = unitPositions.value.get(unit.id) || {
    x: base.width / 2,
    y: base.height / 2,
  };
  const worldX = position.x - base.width / 2;
  const worldY = position.y - base.height / 2;
  const x = (worldX + camera.value.offsetX) * camera.value.scale + width / 2;
  const y = (worldY + camera.value.offsetY) * camera.value.scale + height / 2;
  return { x, y };
};

const drawBackground = () => {
  if (!ctx.value || !canvasRef.value) return;
  const { width, height } = canvasRef.value;
  const gradient = ctx.value.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(0.6, "#1f2937");
  gradient.addColorStop(1, "#0a0f1c");
  ctx.value.fillStyle = gradient;
  ctx.value.fillRect(0, 0, width, height);

  ctx.value.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.value.lineWidth = 1;
  for (let i = -base.width; i <= base.width; i += 100) {
    const start = {
      x: (i + camera.value.offsetX) * camera.value.scale + width / 2,
      y: 0,
    };
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

  ctx.value.fillStyle = "rgba(15,23,42,0.6)";
  const groundY =
    (100 + camera.value.offsetY) * camera.value.scale + height / 2;
  ctx.value.fillRect(0, groundY, width, height - groundY);
};

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
};

const drawUnit = (
  unit: SkillSandboxUnit,
  highlight: "actor" | "target" | null
) => {
  if (!ctx.value) return;
  const { x, y } = project(unit);
  const bodyWidth = 90 * camera.value.scale;
  const bodyHeight = 120 * camera.value.scale;

  if (highlight === "actor") {
    ctx.value.strokeStyle = "rgba(16, 185, 129, 0.8)";
    ctx.value.lineWidth = 6;
    ctx.value.beginPath();
    ctx.value.arc(x, y + 20 * camera.value.scale, bodyWidth, 0, Math.PI * 2);
    ctx.value.stroke();
  } else if (highlight === "target") {
    ctx.value.strokeStyle = "rgba(250, 204, 21, 0.9)";
    ctx.value.lineWidth = 4;
    ctx.value.beginPath();
    ctx.value.arc(
      x,
      y + 20 * camera.value.scale,
      bodyWidth * 0.9,
      0,
      Math.PI * 2
    );
    ctx.value.stroke();
  }

  ctx.value.fillStyle =
    unit.side === "player" ? "rgba(34,197,94,0.6)" : "rgba(248,113,113,0.6)";
  ctx.value.strokeStyle = "#020617";
  ctx.value.lineWidth = 2;
  drawRoundedRect(
    ctx.value,
    x - bodyWidth / 2,
    y - bodyHeight / 2,
    bodyWidth,
    bodyHeight,
    12 * camera.value.scale
  );
  ctx.value.fill();
  ctx.value.stroke();

  ctx.value.fillStyle = "rgba(15,23,42,0.6)";
  drawRoundedRect(
    ctx.value,
    x - bodyWidth / 2,
    y - bodyHeight / 2 - 30 * camera.value.scale,
    bodyWidth,
    32 * camera.value.scale,
    10 * camera.value.scale
  );
  ctx.value.fill();

  ctx.value.fillStyle = "#e2e8f0";
  ctx.value.font = `${12 * camera.value.scale}px 'JetBrains Mono', monospace`;
  ctx.value.textAlign = "center";
  ctx.value.fillText(
    unit.name,
    x,
    y - bodyHeight / 2 - 12 * camera.value.scale
  );

  const hpPercent = unit.hp / unit.maxHp;
  ctx.value.fillStyle = "rgba(15,23,42,0.8)";
  const barWidth = bodyWidth;
  const barHeight = 8 * camera.value.scale;
  ctx.value.fillRect(
    x - barWidth / 2,
    y + bodyHeight / 2 + 6 * camera.value.scale,
    barWidth,
    barHeight
  );
  ctx.value.fillStyle = hpPercent > 0.4 ? "#34d399" : "#f87171";
  ctx.value.fillRect(
    x - barWidth / 2,
    y + bodyHeight / 2 + 6 * camera.value.scale,
    barWidth * Math.max(0, Math.min(1, hpPercent)),
    barHeight
  );
};

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
          .reduce(
            (acc, pos) => ({
              x: acc.x + pos.x / targets.length,
              y: acc.y + pos.y / targets.length,
            }),
            { x: 0, y: 0 }
          )
      : actorPos;

  if (segment.step.type === "move") {
    ctx.value.strokeStyle = "rgba(59,130,246,0.8)";
    ctx.value.lineWidth = 3;
    ctx.value.setLineDash([10, 8]);
    ctx.value.beginPath();
    ctx.value.moveTo(actorPos.x, actorPos.y);
    ctx.value.lineTo(center.x, center.y);
    ctx.value.stroke();
    ctx.value.setLineDash([]);
  } else if (segment.step.type === "damage") {
    if (!ctx.value) return;
    targets.forEach((unit) => {
      const pos = project(unit);
      ctx.value.strokeStyle = "rgba(248,113,113,0.9)";
      ctx.value.lineWidth = 5;
      ctx.value.beginPath();
      ctx.value.arc(pos.x, pos.y, 40 * camera.value.scale, 0, Math.PI * 2);
      ctx.value.stroke();
    });
  } else if (segment.step.type === "effect") {
    ctx.value.fillStyle = "rgba(129,140,248,0.25)";
    ctx.value.beginPath();
    ctx.value.arc(center.x, center.y, 120 * camera.value.scale, 0, Math.PI * 2);
    ctx.value.fill();
  }
};

const drawHud = () => {
  if (!ctx.value || !canvasRef.value) return;
  const { width } = canvasRef.value;
  const info = `${props.skill.name} · 帧 ${props.currentFrame + 1}/${Math.max(
    1,
    props.totalFrames
  )}`;
  ctx.value.fillStyle = "rgba(15,23,42,0.75)";
  ctx.value.fillRect(20, 20, 280, 60);
  ctx.value.fillStyle = "#e2e8f0";
  ctx.value.font = "14px 'JetBrains Mono', monospace";
  ctx.value.fillText(info, 36, 48);
  if (activeSegment.value) {
    ctx.value.fillText(`Active: ${activeSegment.value.step.type}`, 36, 68);
  }

  ctx.value.fillStyle = "rgba(15,23,42,0.75)";
  ctx.value.fillRect(width - 220, 20, 200, 60);
  ctx.value.fillStyle = "#a5b4fc";
  ctx.value.fillText(`Zoom ${camera.value.scale.toFixed(2)}x`, width - 200, 48);
  ctx.value.fillStyle = "#67e8f9";
  ctx.value.fillText(`Targets ${previewTargets.value.length}`, width - 200, 68);
};

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

const tick = (timestamp: number) => {
  if (!props.playing || props.totalFrames <= 1) {
    lastTick.value = timestamp;
  } else if (timestamp - lastTick.value >= 1000 / props.fps) {
    const next =
      props.currentFrame + 1 >= props.totalFrames ? 0 : props.currentFrame + 1;
    emit("update:current-frame", next);
    lastTick.value = timestamp;
  }
  draw();
  rafHandle.value = requestAnimationFrame(tick);
};

const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  const delta = -event.deltaY * 0.001;
  const nextScale = Math.min(2.5, Math.max(0.5, camera.value.scale + delta));
  camera.value.scale = nextScale;
  draw();
};

const getUnitUnderPointer = (event: PointerEvent): SkillSandboxUnit | null => {
  if (!canvasRef.value) return null;
  const rect = canvasRef.value.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  for (const unit of SKILL_SANDBOX_UNITS) {
    const { x, y } = project(unit);
    const width = 90 * camera.value.scale;
    const height = 120 * camera.value.scale;
    if (
      Math.abs(pointerX - x) <= width / 2 &&
      Math.abs(pointerY - y) <= height / 2
    ) {
      return unit;
    }
  }
  return null;
};

const isUnitSelectable = (unit: SkillSandboxUnit): boolean => {
  const modes = props.skill.targeting.modes;
  const actorId = actorUnit.value?.id;
  if (unit.id === actorId) {
    return modes.includes("self");
  }
  if (unit.side === "player") {
    return modes.includes("ally");
  }
  if (unit.side === "enemy") {
    return modes.includes("enemy");
  }
  return false;
};

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

const handlePointerMove = (event: PointerEvent) => {
  if (!draggingState.value.dragging) return;
  const dx = (event.clientX - draggingState.value.startX) / camera.value.scale;
  const dy = (event.clientY - draggingState.value.startY) / camera.value.scale;
  camera.value.offsetX = draggingState.value.originX + dx;
  camera.value.offsetY = draggingState.value.originY + dy;
  draw();
};

const stopDragging = () => {
  draggingState.value.dragging = false;
};

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

watch(
  () => ({
    frame: props.currentFrame,
    caster: props.skill.context.casterId,
    targets: props.skill.context.selectedTargetIds.slice(),
    modes: props.skill.targeting.modes.slice(),
    segments: props.segments.map((segment) => ({
      start: segment.start,
      end: segment.end,
      type: segment.step.type,
    })),
  }),
  () => draw(),
  { deep: true }
);
</script>

<template>
  <div
    ref="containerRef"
    class="relative flex h-full w-full overflow-hidden rounded-t-2xl border-b border-white/10 bg-slate-950"
    @wheel="handleWheel"
  >
    <canvas
      ref="canvasRef"
      class="h-full w-full cursor-grab active:cursor-grabbing"
      @pointerdown="handlePointerDown"
    />
    <div
      class="absolute left-4 top-4 flex flex-wrap gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white backdrop-blur"
    >
      <button
        class="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-slate-200 transition hover:bg-white/10"
        type="button"
        @click="resetView"
      >
        <i class="fa fa-crosshairs mr-1" />
        重置视图
      </button>
      <button
        class="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-slate-200 transition hover:bg-white/10"
        type="button"
        @click="$emit('update:current-frame', 0)"
      >
        <i class="fa fa-undo mr-1" />
        回到开始
      </button>
    </div>
  </div>
</template>
