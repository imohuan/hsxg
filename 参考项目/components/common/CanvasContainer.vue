<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  dragThreshold?: number;
  disableControls?: boolean; // 禁用内置的缩放和平移控制
}>();

const emit = defineEmits<{
  "view-reset": [];
  "scale-change": [scale: number];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const contentRef = ref<HTMLDivElement | null>(null);

// 缩放和平移状态
const scale = ref(props.initialScale ?? 1);
const offsetX = ref(0);
const offsetY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

const minScale = props.minScale ?? 0.5;
const maxScale = props.maxScale ?? 2.5;

// 重置视图
const resetView = (
  fitToViewport?: boolean,
  contentWidth?: number,
  contentHeight?: number
) => {
  if (fitToViewport && contentWidth && contentHeight && containerRef.value) {
    // 适应视口模式：计算合适的缩放比例，使内容完整显示在视口中
    const containerWidth = containerRef.value.clientWidth;
    const containerHeight = containerRef.value.clientHeight;
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const fitScale = Math.min(scaleX, scaleY, maxScale) * 0.95; // 留一点边距
    scale.value = Math.max(fitScale, minScale);

    // 居中显示
    offsetX.value = (containerWidth - contentWidth * scale.value) / 2;
    offsetY.value = (containerHeight - contentHeight * scale.value) / 2;
  } else {
    // 默认模式：重置到初始状态
    scale.value = props.initialScale ?? 1;
    offsetX.value = 0;
    offsetY.value = 0;
  }
  updateTransform();
  emit("view-reset");
};

// 缩放
const zoomIn = () => {
  setScale(scale.value * 1.2);
};

const zoomOut = () => {
  setScale(scale.value * 0.8);
};

const setScale = (newScale: number) => {
  scale.value = Math.max(minScale, Math.min(maxScale, newScale));
  updateTransform();
  emit("scale-change", scale.value);
};

// 平移
const startDrag = (x: number, y: number) => {
  isDragging.value = true;
  dragStart.value = { x: x - offsetX.value, y: y - offsetY.value };
};

const drag = (x: number, y: number) => {
  if (!isDragging.value) return;

  // 直接更新偏移量（参考 PreviewPlayer 的逻辑）
  offsetX.value = x - dragStart.value.x;
  offsetY.value = y - dragStart.value.y;
  updateTransform();
};

const endDrag = () => {
  isDragging.value = false;
};

// 滚轮缩放
const handleWheel = (event: WheelEvent) => {
  if (props.disableControls) return; // 如果禁用了控制，不处理
  event.preventDefault();
  if (!containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // 计算鼠标在内容坐标系中的位置
  const contentX = (mouseX - offsetX.value) / scale.value;
  const contentY = (mouseY - offsetY.value) / scale.value;

  // 更新缩放
  const delta = -event.deltaY * 0.001;
  const newScale = Math.max(
    minScale,
    Math.min(maxScale, scale.value * (1 + delta))
  );
  scale.value = newScale;

  // 调整偏移量，使缩放以鼠标位置为中心
  offsetX.value = mouseX - contentX * scale.value;
  offsetY.value = mouseY - contentY * scale.value;

  updateTransform();
  emit("scale-change", scale.value);
};

// 鼠标事件处理
const handleMouseDown = (event: MouseEvent) => {
  if (props.disableControls) return; // 如果禁用了控制，不处理
  if (event.button !== 0) return; // 只响应左键
  if (!containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  startDrag(event.clientX - rect.left, event.clientY - rect.top);
};

const handleMouseMove = (event: MouseEvent) => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  drag(event.clientX - rect.left, event.clientY - rect.top);
};

const handleMouseUp = () => {
  endDrag();
};

// 更新变换
const updateTransform = () => {
  if (!contentRef.value) return;
  // 使用 transform 同时应用平移和缩放
  // transform-origin 设置为左上角，这样缩放会从左上角开始
  // 使用 will-change 优化性能，避免渲染残留
  contentRef.value.style.willChange = "transform";
  contentRef.value.style.transform = `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`;
  contentRef.value.style.transformOrigin = "0 0";
};

onMounted(() => {
  updateTransform();
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
});

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
});

defineExpose({
  resetView,
  zoomIn,
  zoomOut,
  setScale,
  getScale: () => scale.value,
});
</script>

<template>
  <div
    ref="containerRef"
    :class="[
      'relative h-full w-full overflow-hidden',
      props.disableControls ? '' : 'cursor-grab active:cursor-grabbing',
      $attrs.class as string,
    ]"
    @wheel="handleWheel"
    @mousedown="handleMouseDown"
  >
    <!-- 背景插槽 - 不受缩放影响 -->
    <div class="absolute inset-0 z-0">
      <slot name="background" />
    </div>

    <!-- 内容区域 - 受缩放和平移影响 -->
    <div
      ref="contentRef"
      :class="['absolute top-0 left-0 w-full h-full z-10']"
      style="will-change: transform; backface-visibility: hidden"
    >
      <slot />
    </div>

    <!-- 工具栏插槽 -->
    <div
      class="absolute left-4 top-4 z-10 flex gap-2 rounded-lg border border-white/10 bg-slate-900/90 p-2 backdrop-blur-sm"
    >
      <slot name="toolbar">
        <button
          class="rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
          type="button"
          @click="() => resetView()"
        >
          <i class="fa fa-crosshairs mr-1" />
          重置视图
        </button>
        <button
          class="rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
          type="button"
          @click="zoomIn"
        >
          <i class="fa fa-search-plus mr-1" />
          放大
        </button>
        <button
          class="rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
          type="button"
          @click="zoomOut"
        >
          <i class="fa fa-search-minus mr-1" />
          缩小
        </button>
      </slot>
    </div>

    <!-- 额外内容插槽 -->
    <slot name="overlay" />
  </div>
</template>

<style scoped>
.content-wrapper {
  will-change: transform;
}
</style>
