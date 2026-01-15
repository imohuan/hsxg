<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { SpriteSheetPreviewConfig } from "@/core/designer/types";
import { PreviewPlayer } from "@/core/designer/PreviewPlayer";
import CanvasContainer from "@/components/common/CanvasContainer.vue";
import { useContainerVisibility } from "@/composables/useContainerVisibility";

const props = defineProps<{
  config: SpriteSheetPreviewConfig;
  fps: number;
  currentFrame: number;
  playing: boolean;
}>();

const emit = defineEmits<{
  "update:fps": [value: number];
  "update:currentFrame": [value: number];
  "update:playing": [value: boolean];
  refresh: [];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const canvasContainerRef = ref<InstanceType<typeof CanvasContainer> | null>(
  null
);
const wrapperRef = ref<HTMLDivElement | null>(null);
const player = new PreviewPlayer(canvasRef);

// 缩放和平移状态（从 CanvasContainer 获取）
const scale = ref(1);
const showInfo = ref(true);
const previewMode = ref<"effect" | "image">("effect");
const imageDisplayWidth = ref(0);
const imageDisplayHeight = ref(0);

// 使用 hooks 监听容器可见性变化，当从隐藏变为可见时重置视图
// 需要在 resetView 函数定义之后调用，所以先定义 resetView
const resetView = () => {
  if (canvasContainerRef.value) {
    if (previewMode.value === "image") {
      // 图片模式下，适应视口显示
      if (imageDisplayWidth.value > 0 && imageDisplayHeight.value > 0) {
        canvasContainerRef.value.resetView(
          true,
          imageDisplayWidth.value,
          imageDisplayHeight.value
        );
      } else {
        canvasContainerRef.value.resetView();
      }
    } else {
      // 效果模式下，使用单帧尺寸适应视口
      const displaySize = player.getDisplaySize();
      if (displaySize.width > 0 && displaySize.height > 0) {
        canvasContainerRef.value.resetView(
          true,
          displaySize.width,
          displaySize.height
        );
      } else {
        canvasContainerRef.value.resetView();
      }
    }
  }
};

useContainerVisibility(wrapperRef, resetView, {
  delay: 50,
  triggerOnMount: true,
});

onMounted(() => {
  player.bindConfig(computed(() => props.config));
  player.setFPS(props.fps);
  player.setPlaying(props.playing);
  player.setPreviewMode(previewMode.value);

  // 设置帧变化回调
  player.setOnFrameChange((frame) => {
    emit("update:currentFrame", frame);
  });

  // 设置图片加载完成回调
  player.setOnImageLoad(() => {
    // 图片加载完成后，调整画布大小并重置视图以居中显示
    if (previewMode.value === "effect") {
      // 确保偏移量为 0
      player.setOffset(0, 0);
      // 调整画布大小，完成后重置视图以居中显示
      resizeCanvas(() => {
        // 获取单帧尺寸并重置视图以居中显示
        const displaySize = player.getDisplaySize();
        if (
          displaySize.width > 0 &&
          displaySize.height > 0 &&
          canvasContainerRef.value
        ) {
          canvasContainerRef.value.resetView(
            true,
            displaySize.width,
            displaySize.height
          );
        }
      });
    }
  });

  // 禁用 PreviewPlayer 的缩放和平移，使用 CanvasContainer 的
  player.setScale(1, 0, 0);
  // 不调用 resetView，因为我们会通过 CanvasContainer 来处理视图
  // 直接设置偏移量为 0，确保内容从 canvas 的 (0, 0) 开始绘制
  // 禁用 PreviewPlayer 的背景绘制，使用 CanvasContainer 的 background slot
  player.setDisableBackground(true);

  player.start();

  // 设置初始画布大小
  resizeCanvas();
  // 窗口大小变化时调整画布大小（不需要回调）
  window.addEventListener("resize", handleResize);
});

// 窗口大小变化处理函数（需要在组件作用域中定义，以便正确移除监听器）
const handleResize = () => {
  resizeCanvas();
};

onBeforeUnmount(() => {
  player.stop();
  window.removeEventListener("resize", handleResize);
});

// 监听播放状态变化
watch(
  () => props.playing,
  (newPlaying) => {
    if (newPlaying !== player.isPlaying()) {
      player.togglePlay();
    }
  }
);

// 监听FPS变化
watch(
  () => props.fps,
  (newFPS) => {
    player.setFPS(newFPS);
  }
);

// 监听帧数变化
watch(
  () => props.currentFrame,
  (newFrame) => {
    if (newFrame !== player.getCurrentFrame()) {
      player.setFrame(newFrame);
    }
  }
);

// 监听配置变化
watch(
  () => props.config,
  () => {
    if (previewMode.value === "image") {
      // 图片模式下，等待图片加载完成后更新尺寸
      // img 的 @load 事件会触发 updateImageSize
      setTimeout(() => {
        updateImageSize();
        setTimeout(() => {
          resetView();
        }, 50);
      }, 100);
    } else {
      // 效果模式下，图片加载完成回调会处理画布大小和视图重置
      // 这里只需要确保偏移量为 0
      player.setOffset(0, 0);
    }
  },
  { deep: true }
);

// 画布大小调整（仅效果模式）
const resizeCanvas = (onComplete?: () => void) => {
  if (!canvasRef.value || !containerRef.value) {
    onComplete?.();
    return;
  }

  // 画布大小应该等于单帧尺寸，保持正确的宽高比
  requestAnimationFrame(() => {
    if (!canvasRef.value || !containerRef.value) {
      onComplete?.();
      return;
    }

    // 获取单帧的显示尺寸
    const displaySize = player.getDisplaySize();
    const frameWidth = displaySize.width;
    const frameHeight = displaySize.height;

    if (frameWidth > 0 && frameHeight > 0) {
      // canvas 的内部尺寸应该等于单帧尺寸，保持原始宽高比
      // 这样绘制时就不会变形
      canvasRef.value.width = frameWidth;
      canvasRef.value.height = frameHeight;
    } else {
      // 如果单帧尺寸无效，使用默认值
      const containerWidth = containerRef.value.clientWidth;
      const containerHeight = containerRef.value.clientHeight;
      if (containerWidth > 0 && containerHeight > 0) {
        canvasRef.value.width = containerWidth;
        canvasRef.value.height = containerHeight;
      } else {
        canvasRef.value.width = 800;
        canvasRef.value.height = 600;
      }
    }

    // 在下一个帧调用回调，确保 canvas 尺寸已更新
    requestAnimationFrame(() => {
      onComplete?.();
    });
  });
};

// 更新图片尺寸（图片模式）
const updateImageSize = () => {
  if (previewMode.value !== "image" || !imageRef.value) return;
  // 直接从 img 元素获取尺寸
  if (imageRef.value.naturalWidth > 0 && imageRef.value.naturalHeight > 0) {
    imageDisplayWidth.value = imageRef.value.naturalWidth;
    imageDisplayHeight.value = imageRef.value.naturalHeight;
    // 图片尺寸更新后，重置视图以适应新尺寸
    setTimeout(() => {
      resetView();
    }, 50);
  }
};

// 监听 CanvasContainer 的缩放变化
const handleScaleChange = (newScale: number) => {
  scale.value = newScale;
};

const togglePreviewMode = () => {
  previewMode.value = previewMode.value === "effect" ? "image" : "effect";
  player.setPreviewMode(previewMode.value);
  scale.value = 1;

  // 切换模式后，等待 DOM 更新
  setTimeout(() => {
    if (previewMode.value === "image") {
      // 图片模式：更新图片尺寸（如果图片已加载）
      if (imageRef.value && imageRef.value.complete) {
        updateImageSize();
        setTimeout(() => {
          resetView();
        }, 50);
      }
      // 如果图片未加载，@load 事件会触发 updateImageSize
    } else {
      // 效果模式：调整画布大小
      resizeCanvas();
      setTimeout(() => {
        resetView();
      }, 50);
    }
  }, 0);
};

const triggerManualRefresh = () => {
  player.resetView();
  player.refresh();
  scale.value = 1;
  emit("refresh");
};

defineExpose({ triggerRefresh: triggerManualRefresh });
</script>

<template>
  <div ref="wrapperRef" class="h-full w-full">
    <CanvasContainer
      ref="canvasContainerRef"
      :min-scale="0.1"
      :max-scale="8"
      @scale-change="handleScaleChange"
    >
      <!-- 背景 - 不受缩放影响 -->
      <template #background>
        <div class="checkerboard-background-dark h-full w-full" />
      </template>

      <!-- 内容区域 - 受缩放影响 -->
      <div
        ref="containerRef"
        :class="[
          'relative',
          previewMode === 'image' ? 'image-container' : 'h-full w-full',
        ]"
        :style="
          previewMode === 'image'
            ? {
                width: `${imageDisplayWidth}px`,
                height: `${imageDisplayHeight}px`,
              }
            : {}
        "
      >
        <!-- Canvas - 效果模式显示 -->
        <canvas
          v-show="previewMode === 'effect'"
          ref="canvasRef"
          class="block"
        />
        <!-- 图片 - 图片模式显示 -->
        <img
          v-show="previewMode === 'image'"
          ref="imageRef"
          :src="config.url"
          class="block select-none pointer-events-none"
          draggable="false"
          :style="{
            width: `${imageDisplayWidth}px`,
          }"
          @load="updateImageSize"
          @dragstart.prevent
        />
      </div>

      <template #toolbar>
        <slot name="toolbar">
          <button
            class="rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            type="button"
            @click="resetView"
          >
            <i class="fa fa-crosshairs mr-1" />
            重置视图
          </button>
          <button
            class="rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            type="button"
            @click="showInfo = !showInfo"
          >
            <i :class="['fa', showInfo ? 'fa-eye' : 'fa-eye-slash', 'mr-1']" />
            {{ showInfo ? "隐藏" : "显示" }}信息
          </button>
          <button
            class="rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            type="button"
            @click="togglePreviewMode"
          >
            <i
              :class="[
                'fa',
                previewMode === 'image' ? 'fa-bolt' : 'fa-image',
                'mr-1',
              ]"
            />
            {{ previewMode === "image" ? "显示效果" : "显示图片" }}
          </button>
        </slot>
      </template>

      <template #overlay>
        <!-- 信息显示 -->
        <div
          v-if="showInfo"
          class="absolute right-4 top-4 rounded-lg border border-white/10 bg-slate-900/90 p-3 text-xs text-slate-300 backdrop-blur-sm"
        >
          <div class="space-y-1">
            <div>
              <span class="text-slate-500">缩放:</span> {{ scale.toFixed(2) }}x
            </div>
            <div>
              <span class="text-slate-500">帧数:</span> {{ currentFrame + 1 }} /
              {{ player.getTotalFrames() }}
            </div>
            <div><span class="text-slate-500">FPS:</span> {{ fps }}</div>
          </div>
        </div>

        <!-- 操作提示 -->
        <div
          class="hidden absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-xs text-slate-400 backdrop-blur-sm"
        >
          <i class="fa fa-mouse-pointer mr-2" />
          鼠标滚轮缩放 · 拖拽移动 · 空格播放/暂停
        </div>
      </template>
    </CanvasContainer>
  </div>
</template>

<style scoped>
canvas {
  display: block;
  /* 移除 width 和 height，使用 canvas 的内部尺寸 */
  background: transparent;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.checkerboard-background-light {
  background-color: #ffffff;
  background-image: linear-gradient(
      45deg,
      #e5e5e5 25%,
      transparent 25%,
      transparent 75%,
      #e5e5e5 75%,
      #e5e5e5
    ),
    linear-gradient(
      45deg,
      #e5e5e5 25%,
      transparent 25%,
      transparent 75%,
      #e5e5e5 75%,
      #e5e5e5
    );
  background-size: 48px 48px;
  background-position: 0 0, 24px 24px;
}

.checkerboard-background-dark {
  background-color: #1a1a1a;
  background-image: linear-gradient(
      45deg,
      #2a2a2a 25%,
      transparent 25%,
      transparent 75%,
      #2a2a2a 75%,
      #2a2a2a
    ),
    linear-gradient(
      45deg,
      #2a2a2a 25%,
      transparent 25%,
      transparent 75%,
      #2a2a2a 75%,
      #2a2a2a
    );
  background-size: 48px 48px;
  background-position: 0 0, 24px 24px;
}
</style>
