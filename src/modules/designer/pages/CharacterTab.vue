<script setup lang="ts">
/**
 * 角色编辑标签页
 * 整合雪碧图编辑器和动画预览组件
 */
import { ref, computed, watch } from "vue";
import SpriteEditor from "../components/SpriteEditor.vue";
import AnimationPreview from "../components/AnimationPreview.vue";
import { useSpriteSheet, type SpriteFrame } from "../composables/useSpriteSheet";
import type { SpriteConfig, AnimationConfig } from "../../../types";

// ============ 状态 ============

/** 雪碧图解析 */
const spriteSheet = useSpriteSheet();

/** 当前选中的帧 */
const selectedFrames = ref<number[]>([]);

/** 动画列表 */
const animations = ref<AnimationConfig[]>([]);

/** 当前编辑的动画索引 */
const currentAnimationIndex = ref<number | null>(null);

/** 新动画名称 */
const newAnimationName = ref("");

/** 动画帧率 */
const animationFps = ref(12);

/** 是否循环播放 */
const animationLoop = ref(true);

// ============ 计算属性 ============

/** 当前编辑的动画 */
const currentAnimation = computed(() => {
  if (currentAnimationIndex.value === null) return null;
  return animations.value[currentAnimationIndex.value] ?? null;
});

/** 当前动画的帧序列 */
const currentAnimationFrames = computed<SpriteFrame[]>(() => {
  if (!currentAnimation.value) return [];
  return currentAnimation.value.frames
    .map((index) => spriteSheet.getFrameAt(index))
    .filter((frame): frame is SpriteFrame => frame !== null);
});

// ============ 方法 ============

/** 处理雪碧图配置变更 */
function handleSpriteConfigChange(config: SpriteConfig): void {
  // 配置变更时可以在这里处理
  console.log("雪碧图配置变更:", config);
}

/** 处理帧选中 */
function handleFrameSelect(frame: SpriteFrame): void {
  // 如果正在编辑动画，将选中的帧添加到动画中
  if (currentAnimationIndex.value !== null) {
    const animation = animations.value[currentAnimationIndex.value];
    if (animation && !animation.frames.includes(frame.index)) {
      animation.frames.push(frame.index);
    }
  }
}

/** 添加新动画 */
function addAnimation(): void {
  const newAnimation: AnimationConfig = {
    key: newAnimationName.value.trim() || `anim_${Date.now()}`,
    frames: [...selectedFrames.value],
    fps: animationFps.value,
    repeat: animationLoop.value ? -1 : 0,
  };
  animations.value.push(newAnimation);
  currentAnimationIndex.value = animations.value.length - 1;
  newAnimationName.value = "";
  selectedFrames.value = [];
}

/** 删除动画 */
function deleteAnimation(index: number): void {
  animations.value.splice(index, 1);
  if (currentAnimationIndex.value === index) {
    currentAnimationIndex.value = null;
  } else if (currentAnimationIndex.value !== null && currentAnimationIndex.value > index) {
    currentAnimationIndex.value--;
  }
}

/** 选择动画进行编辑 */
function selectAnimation(index: number): void {
  currentAnimationIndex.value = index;
  const anim = animations.value[index];
  if (anim) {
    animationFps.value = anim.fps;
    animationLoop.value = anim.repeat === -1;
  }
}

/** 从动画中移除帧 */
function removeFrameFromAnimation(frameIndex: number): void {
  if (currentAnimationIndex.value === null) return;
  const animation = animations.value[currentAnimationIndex.value];
  if (animation) {
    const idx = animation.frames.indexOf(frameIndex);
    if (idx !== -1) {
      animation.frames.splice(idx, 1);
    }
  }
}

/** 更新动画帧率 */
function updateAnimationFps(fps: number): void {
  animationFps.value = fps;
  if (currentAnimationIndex.value !== null) {
    const anim = animations.value[currentAnimationIndex.value];
    if (anim) {
      anim.fps = fps;
    }
  }
}

/** 清空当前动画帧 */
function clearAnimationFrames(): void {
  if (currentAnimationIndex.value !== null) {
    const anim = animations.value[currentAnimationIndex.value];
    if (anim) {
      anim.frames = [];
    }
  }
}

// ============ 监听 ============

// 监听帧率变化，同步到当前动画
watch(animationFps, (newFps) => {
  if (currentAnimationIndex.value !== null) {
    const anim = animations.value[currentAnimationIndex.value];
    if (anim) {
      anim.fps = newFps;
    }
  }
});

// 监听循环设置变化
watch(animationLoop, (loop) => {
  if (currentAnimationIndex.value !== null) {
    const anim = animations.value[currentAnimationIndex.value];
    if (anim) {
      anim.repeat = loop ? -1 : 0;
    }
  }
});
</script>

<template>
  <div class="flex h-full gap-4 p-4">
    <!-- 左侧：雪碧图编辑器 -->
    <div class="flex-1 overflow-hidden">
      <SpriteEditor
        @change="handleSpriteConfigChange"
        @frame-select="handleFrameSelect"
      />
    </div>

    <!-- 右侧：动画配置面板 -->
    <div class="flex w-80 flex-col gap-4">
      <!-- 动画预览 -->
      <AnimationPreview
        v-if="spriteSheet.imageElement.value && currentAnimationFrames.length > 0"
        :image-url="spriteSheet.imageUrl.value"
        :image-width="spriteSheet.imageElement.value.naturalWidth"
        :image-height="spriteSheet.imageElement.value.naturalHeight"
        :frames="currentAnimationFrames"
        :initial-fps="animationFps"
        :loop="animationLoop"
        :scale="2"
        @fps-change="updateAnimationFps"
      />

      <!-- 动画列表 -->
      <div class="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
          <span class="text-sm font-medium">动画列表</span>
          <span class="text-xs text-gray-500">{{ animations.length }} 个</span>
        </div>

        <!-- 添加动画 -->
        <div class="flex gap-2 border-b border-gray-100 p-2">
          <input
            v-model="newAnimationName"
            type="text"
            placeholder="动画名称"
            class="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            class="rounded bg-green-500 px-3 py-1 text-sm text-white transition-colors hover:bg-green-600"
            @click="addAnimation"
          >
            添加
          </button>
        </div>

        <!-- 动画列表 -->
        <div class="max-h-48 overflow-auto">
          <div
            v-for="(anim, index) in animations"
            :key="anim.key"
            class="flex cursor-pointer items-center justify-between border-b border-gray-100 px-3 py-2 transition-colors hover:bg-gray-50"
            :class="{ 'bg-blue-50': currentAnimationIndex === index }"
            @click="selectAnimation(index)"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm">{{ anim.key }}</span>
              <span class="text-xs text-gray-400">({{ anim.frames.length }} 帧)</span>
            </div>
            <button
              class="rounded p-1 text-red-500 transition-colors hover:bg-red-50"
              title="删除"
              @click.stop="deleteAnimation(index)"
            >
              <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          </div>

          <div v-if="animations.length === 0" class="p-4 text-center text-sm text-gray-400">
            暂无动画，点击上方按钮添加
          </div>
        </div>
      </div>

      <!-- 当前动画帧编辑 -->
      <div
        v-if="currentAnimation"
        class="rounded-lg border border-gray-200 bg-white"
      >
        <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
          <span class="text-sm font-medium">动画帧序列</span>
          <button
            class="text-xs text-red-500 hover:text-red-600"
            @click="clearAnimationFrames"
          >
            清空
          </button>
        </div>

        <div class="p-2">
          <!-- 帧序列显示 -->
          <div class="mb-2 flex flex-wrap gap-1">
            <div
              v-for="(frameIndex, idx) in currentAnimation.frames"
              :key="idx"
              class="group relative flex size-10 items-center justify-center rounded border border-gray-200 bg-gray-50 text-xs"
            >
              {{ frameIndex }}
              <button
                class="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                @click="removeFrameFromAnimation(frameIndex)"
              >
                ×
              </button>
            </div>
            <div
              v-if="currentAnimation.frames.length === 0"
              class="w-full py-2 text-center text-xs text-gray-400"
            >
              点击左侧帧添加到动画
            </div>
          </div>

          <!-- 动画设置 -->
          <div class="flex items-center gap-4 border-t border-gray-100 pt-2">
            <label class="flex items-center gap-2">
              <span class="text-xs text-gray-500">FPS:</span>
              <input
                v-model.number="animationFps"
                type="number"
                min="1"
                max="60"
                class="w-14 rounded border border-gray-300 px-2 py-1 text-center text-xs"
              />
            </label>
            <label class="flex cursor-pointer items-center gap-1">
              <input v-model="animationLoop" type="checkbox" class="size-3" />
              <span class="text-xs text-gray-500">循环</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
