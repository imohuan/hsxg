<script setup lang="ts">
/**
 * @file 画布容器组件
 * @description 提供缩放和平移功能的通用画布容器
 */
import { onBeforeUnmount, onMounted, ref } from "vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    minScale?: number;
    maxScale?: number;
    initialScale?: number;
    disableControls?: boolean;
  }>(),
  {
    minScale: 0.1,
    maxScale: 8,
    initialScale: 1,
    disableControls: false,
  },
);

const emit = defineEmits<{
  "view-reset": [];
  "scale-change": [scale: number];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const contentRef = ref<HTMLDivElement | null>(null);

// 缩放和平移状态
const scale = ref(props.initialScale);
const offsetX = ref(0);
const offsetY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

// 重置视图
function resetView(fitToViewport?: boolean, contentWidth?: number, contentHeight?: number): void {
  if (fitToViewport && contentWidth && contentHeight && containerRef.value) {
    const containerWidth = containerRef.value.clientWidth;
    const containerHeight = containerRef.value.clientHeight;
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const fitScale = Math.min(scaleX, scaleY, props.maxScale) * 0.9;
    scale.value = Math.max(fitScale, props.minScale);
    offsetX.value = (containerWidth - contentWidth * scale.value) / 2;
    offsetY.value = (containerHeight - contentHeight * scale.value) / 2;
  } else {
    scale.value = props.initialScale;
    offsetX.value = 0;
    offsetY.value = 0;
  }
  updateTransform();
  emit("view-reset");
}

function setScale(newScale: number): void {
  scale.value = Math.max(props.minScale, Math.min(props.maxScale, newScale));
  updateTransform();
  emit("scale-change", scale.value);
}

function zoomIn(): void {
  setScale(scale.value * 1.2);
}

function zoomOut(): void {
  setScale(scale.value * 0.8);
}

// 滚轮缩放
function handleWheel(event: WheelEvent): void {
  if (props.disableControls) return;
  event.preventDefault();
  if (!containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // 计算鼠标在内容坐标系中的位置
  const contentX = (mouseX - offsetX.value) / scale.value;
  const contentY = (mouseY - offsetY.value) / scale.value;

  // 计算新缩放值
  const delta = -event.deltaY * 0.001;
  const oldScale = scale.value;
  const newScale = Math.max(props.minScale, Math.min(props.maxScale, oldScale * (1 + delta)));
  scale.value = newScale;

  // 以鼠标位置为中心调整偏移量
  offsetX.value = mouseX - contentX * newScale;
  offsetY.value = mouseY - contentY * newScale;

  // 如果正在拖拽，更新拖拽起始点以保持一致性
  if (isDragging.value) {
    dragStart.value = {
      x: mouseX - offsetX.value,
      y: mouseY - offsetY.value,
    };
  }

  updateTransform();
  emit("scale-change", scale.value);
}

function handleMouseDown(event: MouseEvent): void {
  if (props.disableControls || event.button !== 0) return;
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  isDragging.value = true;
  dragStart.value = {
    x: event.clientX - rect.left - offsetX.value,
    y: event.clientY - rect.top - offsetY.value,
  };
}

function handleMouseMove(event: MouseEvent): void {
  if (!isDragging.value || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  offsetX.value = event.clientX - rect.left - dragStart.value.x;
  offsetY.value = event.clientY - rect.top - dragStart.value.y;
  updateTransform();
}

function handleMouseUp(): void {
  isDragging.value = false;
}

function updateTransform(): void {
  if (!contentRef.value) return;
  contentRef.value.style.willChange = "transform";
  contentRef.value.style.transform = `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`;
  contentRef.value.style.transformOrigin = "0 0";
}

onMounted(() => {
  updateTransform();
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
});

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
});

defineExpose({ resetView, zoomIn, zoomOut, setScale, getScale: () => scale.value });
</script>

<template>
  <div
    ref="containerRef"
    :class="[
      'relative h-full w-full overflow-hidden',
      props.disableControls ? '' : 'cursor-grab active:cursor-grabbing',
    ]"
    @wheel="handleWheel"
    @mousedown="handleMouseDown"
  >
    <!-- 背景插槽 -->
    <div class="absolute inset-0 z-0">
      <slot name="background" />
    </div>

    <!-- 内容区域 -->
    <div ref="contentRef" class="absolute top-0 left-0 z-10">
      <slot />
    </div>

    <!-- 工具栏插槽 -->
    <div class="absolute top-4 left-4 z-20 flex gap-2">
      <slot name="toolbar">
        <button
          class="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white"
          type="button"
          @click="() => resetView()"
        >
          重置视图
        </button>
      </slot>
    </div>

    <!-- 额外内容插槽 -->
    <slot name="overlay" />
  </div>
</template>
