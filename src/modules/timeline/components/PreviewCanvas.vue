<script setup lang="ts">
/**
 * @file 预览画布组件
 * 在时间轴编辑器中集成 Phaser 预览画布
 * Requirements: 9.5-9.7
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import Phaser from "phaser";
import {
  PlayArrowOutlined,
  PauseOutlined,
  StopOutlined,
  SkipPreviousOutlined,
  SkipNextOutlined,
  SettingsOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@vicons/material";
import type { TimelineSegment, SkillStep, CharacterConfig } from "@/types";
import { usePreview } from "../composables/usePreview";
import { StepExecutor, createDefaultContext, type ExecutionContext } from "../core/StepExecutor";

// ============ Props & Emits ============

const props = withDefaults(
  defineProps<{
    /** 帧率 */
    fps?: number;
    /** 总帧数 */
    totalFrames?: number;
    /** 片段列表 */
    segments?: TimelineSegment[];
    /** 步骤列表 */
    steps?: SkillStep[];
    /** 画布宽度 */
    width?: number;
    /** 画布高度 */
    height?: number;
    /** 攻击方角色配置 */
    attacker?: CharacterConfig | null;
    /** 被攻击方角色配置列表 */
    targets?: CharacterConfig[];
  }>(),
  {
    fps: 30,
    totalFrames: 300,
    segments: () => [],
    steps: () => [],
    width: 400,
    height: 300,
    attacker: null,
    targets: () => [],
  },
);

const emit = defineEmits<{
  /** 帧变化 */
  frameChange: [frame: number];
  /** 播放状态变化 */
  playingChange: [isPlaying: boolean];
}>();

// ============ 响应式引用 ============

const fpsRef = computed(() => props.fps);
const totalFramesRef = computed(() => props.totalFrames);
const segmentsRef = computed(() => props.segments);
const stepsRef = computed(() => props.steps);

// ============ 状态 ============

/** 画布容器引用 */
const containerRef = ref<HTMLDivElement | null>(null);

/** Phaser 游戏实例 */
let game: Phaser.Game | null = null;

/** 预览场景实例 */
let previewScene: PreviewScene | null = null;

/** 步骤执行器 */
let stepExecutor: StepExecutor | null = null;

/** 是否已初始化 */
const isInitialized = ref(false);

/** 是否显示设置面板 */
const showSettings = ref(false);

/** 被攻击方数量 */
const targetCount = ref(1);

/** 画布缩放 */
const canvasZoom = ref(1);

// ============ 预览 Hook ============

const preview = usePreview({
  fps: fpsRef,
  totalFrames: totalFramesRef,
  segments: segmentsRef,
  steps: stepsRef,
  onExecuteStep: (step, progress) => {
    if (stepExecutor) {
      stepExecutor.execute(step, progress);
    }
  },
  onFrameChange: (frame) => {
    emit("frameChange", frame);
    updatePreviewScene();
  },
});

// ============ 监听播放状态 ============

watch(
  () => preview.isPlaying.value,
  (isPlaying) => {
    emit("playingChange", isPlaying);
  },
);

// ============ 预览场景类 ============

class PreviewScene extends Phaser.Scene {
  private attackerSprite: Phaser.GameObjects.Rectangle | null = null;
  private targetSprites: Phaser.GameObjects.Rectangle[] = [];
  private context: ExecutionContext;

  constructor() {
    super({ key: "PreviewScene" });
    this.context = createDefaultContext(props.width, props.height);
  }

  create(): void {
    this.createBackground();
    this.createUnits();
    this.setupExecutor();
  }

  /** 创建背景 */
  private createBackground(): void {
    const { width, height } = this.scale;

    // 渐变背景
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    graphics.fillRect(0, 0, width, height);

    // 网格线
    graphics.lineStyle(1, 0x333355, 0.3);
    const gridSize = 30;
    for (let x = 0; x <= width; x += gridSize) {
      graphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      graphics.lineBetween(0, y, width, y);
    }

    // 中线
    graphics.lineStyle(2, 0x444466, 0.5);
    graphics.lineBetween(width / 2, 0, width / 2, height);
  }

  /** 创建单位 */
  private createUnits(): void {
    const { width, height } = this.scale;

    // 攻击方（左侧）
    const attackerX = width * 0.25;
    const attackerY = height * 0.5;
    this.attackerSprite = this.add.rectangle(attackerX, attackerY, 40, 60, 0x3b82f6);
    this.attackerSprite.setStrokeStyle(2, 0x60a5fa);

    // 添加标签
    this.add
      .text(attackerX, attackerY - 45, "攻击方", {
        fontSize: "12px",
        color: "#60a5fa",
      })
      .setOrigin(0.5);

    // 更新上下文
    this.context.attackerPosition = { x: attackerX, y: attackerY };
    this.context.attackerOriginPosition = { x: attackerX, y: attackerY };

    // 创建被攻击方
    this.updateTargets();
  }

  /** 更新被攻击方 */
  updateTargets(): void {
    const { width, height } = this.scale;
    const count = targetCount.value;

    // 清除现有目标
    this.targetSprites.forEach((sprite) => sprite.destroy());
    this.targetSprites = [];
    this.context.targetPositions = [];

    // 创建新目标
    const targetX = width * 0.75;
    const spacing = 70;
    const startY = height * 0.5 - ((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      const y = startY + i * spacing;
      const sprite = this.add.rectangle(targetX, y, 40, 60, 0xef4444);
      sprite.setStrokeStyle(2, 0xf87171);
      this.targetSprites.push(sprite);
      this.context.targetPositions.push({ x: targetX, y });

      // 添加标签
      this.add
        .text(targetX, y - 45, `目标 ${i + 1}`, {
          fontSize: "12px",
          color: "#f87171",
        })
        .setOrigin(0.5);
    }

    // 更新执行器上下文
    if (stepExecutor) {
      stepExecutor.updateContext(this.context);
    }
  }

  /** 设置步骤执行器 */
  private setupExecutor(): void {
    stepExecutor = new StepExecutor(this.context, {
      onMove: (target, x, y, duration, ease) => {
        if (target === "attacker" && this.attackerSprite) {
          this.tweens.add({
            targets: this.attackerSprite,
            x,
            y,
            duration,
            ease,
          });
        }
      },
      onDamage: (targetIndex, value) => {
        const sprite = this.targetSprites[targetIndex];
        if (sprite) {
          this.showDamage(sprite.x, sprite.y - 40, value);
          // 闪烁效果
          this.tweens.add({
            targets: sprite,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
          });
        }
      },
      onEffect: (_effectId, x, y) => {
        // 简单的特效表示
        const circle = this.add.circle(x, y, 30, 0x8b5cf6, 0.7);
        this.tweens.add({
          targets: circle,
          scale: 2,
          alpha: 0,
          duration: 500,
          onComplete: () => circle.destroy(),
        });
      },
      onCameraMove: (x, y, zoom, duration) => {
        this.cameras.main.pan(x, y, duration);
        this.cameras.main.zoomTo(zoom, duration);
      },
      onShake: (intensity, duration) => {
        this.cameras.main.shake(duration, intensity / 1000);
      },
      onBackgroundChange: (color) => {
        if (color) {
          const colorNum = parseInt(color.replace("#", ""), 16);
          this.cameras.main.setBackgroundColor(colorNum);
        }
      },
    });
  }

  /** 显示伤害数字 */
  private showDamage(x: number, y: number, value: number): void {
    const color = value > 0 ? "#ef4444" : "#22c55e";
    const text = this.add
      .text(x, y, `${value > 0 ? "-" : "+"}${Math.abs(value)}`, {
        fontSize: "18px",
        color,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  /** 重置场景 */
  reset(): void {
    const { width, height } = this.scale;

    // 重置攻击方位置
    if (this.attackerSprite) {
      this.attackerSprite.setPosition(width * 0.25, height * 0.5);
    }

    // 重置镜头
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(width / 2, height / 2);

    // 更新上下文
    this.context.attackerPosition = { x: width * 0.25, y: height * 0.5 };
    if (stepExecutor) {
      stepExecutor.updateContext(this.context);
    }
  }

  /** 获取执行上下文 */
  getContext(): ExecutionContext {
    return this.context;
  }
}

// ============ 生命周期 ============

onMounted(() => {
  initGame();
});

onUnmounted(() => {
  destroyGame();
});

// ============ 监听目标数量变化 ============

watch(targetCount, () => {
  if (previewScene) {
    previewScene.updateTargets();
  }
});

// ============ 方法 ============

/** 初始化 Phaser 游戏 */
function initGame(): void {
  if (!containerRef.value || game) return;

  previewScene = new PreviewScene();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: containerRef.value,
    width: props.width,
    height: props.height,
    backgroundColor: "#1a1a2e",
    scene: previewScene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  };

  game = new Phaser.Game(config);

  // 等待场景创建完成
  game.events.once("ready", () => {
    isInitialized.value = true;
  });

  // 备用：延迟设置初始化状态
  setTimeout(() => {
    isInitialized.value = true;
  }, 500);
}

/** 销毁游戏实例 */
function destroyGame(): void {
  preview.pause();
  if (game) {
    game.destroy(true);
    game = null;
    previewScene = null;
    stepExecutor = null;
    isInitialized.value = false;
  }
}

/** 更新预览场景 */
function updatePreviewScene(): void {
  // 场景更新逻辑（如果需要）
}

/** 处理停止 */
function handleStop(): void {
  preview.stop();
  if (previewScene) {
    previewScene.reset();
  }
}

/** 缩放画布 */
function zoomIn(): void {
  canvasZoom.value = Math.min(canvasZoom.value + 0.25, 2);
}

function zoomOut(): void {
  canvasZoom.value = Math.max(canvasZoom.value - 0.25, 0.5);
}

// ============ 暴露方法 ============

defineExpose({
  preview,
  isInitialized,
});
</script>

<template>
  <div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <!-- 工具栏 -->
    <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
      <!-- 播放控制 -->
      <div class="flex items-center gap-1">
        <button
          class="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          title="后退一帧"
          @click="preview.stepBackward()"
        >
          <SkipPreviousOutlined class="size-4" />
        </button>

        <button
          class="flex size-9 items-center justify-center rounded-lg transition-colors"
          :class="
            preview.isPlaying.value ? 'bg-amber-100 text-amber-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          "
          :title="preview.isPlaying.value ? '暂停' : '播放'"
          @click="preview.toggle()"
        >
          <component :is="preview.isPlaying.value ? PauseOutlined : PlayArrowOutlined" class="size-5" />
        </button>

        <button
          class="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          title="停止"
          @click="handleStop"
        >
          <StopOutlined class="size-4" />
        </button>

        <button
          class="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          title="前进一帧"
          @click="preview.stepForward()"
        >
          <SkipNextOutlined class="size-4" />
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="h-5 w-px bg-slate-200" />

      <!-- 时间显示 -->
      <div class="min-w-16 font-mono text-xs text-slate-600">{{ preview.currentTime.value.toFixed(2) }}s</div>

      <!-- 进度条 -->
      <div class="mx-2 flex-1">
        <input
          type="range"
          :value="preview.progress.value * 100"
          min="0"
          max="100"
          step="0.1"
          class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
          @input="preview.seekToProgress(Number(($event.target as HTMLInputElement).value) / 100)"
        />
      </div>

      <!-- 分隔线 -->
      <div class="h-5 w-px bg-slate-200" />

      <!-- 缩放控制 -->
      <div class="flex items-center gap-1">
        <button
          class="flex size-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          title="缩小"
          @click="zoomOut"
        >
          <ZoomOutOutlined class="size-4" />
        </button>
        <span class="min-w-10 text-center font-mono text-xs text-slate-600">
          {{ (canvasZoom * 100).toFixed(0) }}%
        </span>
        <button
          class="flex size-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          title="放大"
          @click="zoomIn"
        >
          <ZoomInOutlined class="size-4" />
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="h-5 w-px bg-slate-200" />

      <!-- 设置按钮 -->
      <button
        class="flex size-8 items-center justify-center rounded-lg transition-colors"
        :class="
          showSettings ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
        "
        title="设置"
        @click="showSettings = !showSettings"
      >
        <SettingsOutlined class="size-4" />
      </button>
    </div>

    <!-- 设置面板 -->
    <div v-if="showSettings" class="border-b border-slate-100 bg-slate-50/50 px-4 py-2.5">
      <div class="flex items-center gap-6 text-sm">
        <!-- 被攻击方数量 -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">被攻击方数量:</span>
          <select
            v-model="targetCount"
            class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors outline-none focus:border-indigo-400"
          >
            <option :value="1">1</option>
            <option :value="2">2</option>
            <option :value="3">3</option>
            <option :value="4">4</option>
          </select>
        </div>

        <!-- 播放速度 -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">播放速度:</span>
          <select
            v-model="preview.playbackRate.value"
            class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors outline-none focus:border-indigo-400"
          >
            <option :value="0.25">0.25x</option>
            <option :value="0.5">0.5x</option>
            <option :value="1">1x</option>
            <option :value="1.5">1.5x</option>
            <option :value="2">2x</option>
          </select>
        </div>

        <!-- 循环播放 -->
        <label class="flex cursor-pointer items-center gap-2">
          <input
            v-model="preview.loop.value"
            type="checkbox"
            class="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span class="text-xs text-slate-500">循环播放</span>
        </label>
      </div>
    </div>

    <!-- 画布区域 -->
    <div
      class="relative flex flex-1 items-center justify-center overflow-auto bg-slate-100"
      :style="{ minHeight: `${height + 20}px` }"
    >
      <!-- 棋盘格背景 -->
      <div class="checkerboard-bg absolute inset-0" />

      <div
        ref="containerRef"
        class="preview-canvas relative"
        :style="{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${canvasZoom})`,
          transformOrigin: 'center center',
        }"
      />

      <!-- 加载遮罩 -->
      <div v-if="!isInitialized" class="absolute inset-0 flex items-center justify-center bg-slate-100">
        <div class="flex flex-col items-center gap-2">
          <div class="size-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span class="text-xs text-slate-500">初始化预览...</span>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div
      class="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-1.5 text-xs text-slate-500"
    >
      <span
        >帧: <span class="font-mono font-medium text-slate-700">{{ preview.currentFrame.value }}</span> /
        {{ totalFrames }}</span
      >
      <span
        >FPS: <span class="font-mono font-medium text-slate-700">{{ fps }}</span></span
      >
      <span
        >激活片段:
        <span class="font-mono font-medium text-slate-700">{{ preview.activeSegments.value.length }}</span></span
      >
    </div>
  </div>
</template>

<style scoped>
.checkerboard-bg {
  background-color: #f8fafc;
  background-image:
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%, #e2e8f0),
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%, #e2e8f0);
  background-size: 24px 24px;
  background-position:
    0 0,
    12px 12px;
}
</style>
