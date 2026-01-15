<script setup lang="ts">
/**
 * @file 角色编辑标签页
 * @description 整合雪碧图编辑器、角色面板和动画预览组件
 * Requirements: 4.1-4.8
 */
import { ref, computed, watch } from "vue";
import { AddOutlined, DeleteOutlined, PlayArrowOutlined, RefreshOutlined } from "@vicons/material";
import DesignerTabLayout from "@/components/layout/DesignerTabLayout.vue";
import SpriteEditor from "../components/SpriteEditor.vue";
import AnimationPreview from "../components/AnimationPreview.vue";
import CharacterPanel from "../components/CharacterPanel.vue";
import { useSpriteSheet, type SpriteFrame } from "../composables/useSpriteSheet";
import { useDesignerStore } from "@/stores/designer.store";
import type { SpriteConfig, AnimationConfig, CharacterConfig } from "@/types";

// ============ Store ============

const designerStore = useDesignerStore();

// ============ 状态 ============

const spriteSheet = useSpriteSheet();
const selectedFrames = ref<number[]>([]);
const animations = ref<AnimationConfig[]>([]);
const currentAnimationIndex = ref<number | null>(null);
const newAnimationName = ref("");
const animationFps = ref(12);
const animationLoop = ref(true);

// ============ 计算属性 ============

const currentAnimation = computed(() => {
  if (currentAnimationIndex.value === null) return null;
  return animations.value[currentAnimationIndex.value] ?? null;
});

const currentAnimationFrames = computed<SpriteFrame[]>(() => {
  if (!currentAnimation.value) return [];
  return currentAnimation.value.frames
    .map((index) => spriteSheet.getFrameAt(index))
    .filter((frame): frame is SpriteFrame => frame !== null);
});

/** 当前雪碧图配置 */
const currentSpriteConfig = computed<SpriteConfig>(() => ({
  url: spriteSheet.imageUrl.value,
  rows: spriteSheet.rows.value,
  cols: spriteSheet.cols.value,
  frameCount: spriteSheet.frameCount.value,
  fps: animationFps.value,
  scale: 1,
}));

/** 当前角色 */
const currentCharacter = computed(() => {
  if (!designerStore.currentCharacterId) return null;
  return designerStore.getCharacter(designerStore.currentCharacterId);
});

// ============ 方法 ============

function handleSpriteConfigChange(config: SpriteConfig): void {
  // 如果有当前角色，更新其雪碧图配置
  if (currentCharacter.value) {
    designerStore.updateCharacter(currentCharacter.value.id, {
      sprite: config,
    });
  }
}

function handleFrameSelect(frame: SpriteFrame): void {
  if (currentAnimationIndex.value !== null) {
    const animation = animations.value[currentAnimationIndex.value];
    if (animation && !animation.frames.includes(frame.index)) {
      animation.frames.push(frame.index);
      saveAnimationsToStore();
    }
  }
}

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
  saveAnimationsToStore();
}

function deleteAnimation(index: number): void {
  animations.value.splice(index, 1);
  if (currentAnimationIndex.value === index) {
    currentAnimationIndex.value = null;
  } else if (currentAnimationIndex.value !== null && currentAnimationIndex.value > index) {
    currentAnimationIndex.value--;
  }
  saveAnimationsToStore();
}

function selectAnimation(index: number): void {
  currentAnimationIndex.value = index;
  const anim = animations.value[index];
  if (anim) {
    animationFps.value = anim.fps;
    animationLoop.value = anim.repeat === -1;
  }
}

function removeFrameFromAnimation(frameIndex: number): void {
  if (currentAnimationIndex.value === null) return;
  const animation = animations.value[currentAnimationIndex.value];
  if (animation) {
    const idx = animation.frames.indexOf(frameIndex);
    if (idx !== -1) {
      animation.frames.splice(idx, 1);
      saveAnimationsToStore();
    }
  }
}

function updateAnimationFps(fps: number): void {
  animationFps.value = fps;
  if (currentAnimationIndex.value !== null) {
    const anim = animations.value[currentAnimationIndex.value];
    if (anim) {
      anim.fps = fps;
      saveAnimationsToStore();
    }
  }
}

function clearAnimationFrames(): void {
  if (currentAnimationIndex.value !== null) {
    const anim = animations.value[currentAnimationIndex.value];
    if (anim) {
      anim.frames = [];
      saveAnimationsToStore();
    }
  }
}

/** 保存动画到 Store */
function saveAnimationsToStore(): void {
  if (currentCharacter.value) {
    designerStore.updateCharacter(currentCharacter.value.id, {
      animations: [...animations.value],
    });
  }
}

/** 处理角色选择 */
function handleCharacterSelect(character: CharacterConfig): void {
  // 加载角色的雪碧图和动画配置
  loadCharacterData(character);
}

/** 处理角色加载 */
function handleCharacterLoad(character: CharacterConfig): void {
  loadCharacterData(character);
}

/** 加载角色数据 */
async function loadCharacterData(character: CharacterConfig): Promise<void> {
  // 加载雪碧图
  if (character.sprite.url) {
    await spriteSheet.loadImage(character.sprite.url);
    spriteSheet.setGridSize(character.sprite.rows, character.sprite.cols);
    spriteSheet.setFrameCount(character.sprite.frameCount);
  } else {
    spriteSheet.reset();
  }

  // 加载动画列表
  animations.value = character.animations.map((anim) => ({ ...anim }));
  currentAnimationIndex.value = animations.value.length > 0 ? 0 : null;

  if (animations.value.length > 0) {
    const firstAnim = animations.value[0];
    animationFps.value = firstAnim.fps;
    animationLoop.value = firstAnim.repeat === -1;
  }
}

/** 处理新建角色 */
function handleCharacterCreate(): void {
  // 重置编辑器状态
  spriteSheet.reset();
  animations.value = [];
  currentAnimationIndex.value = null;
}

// ============ 监听 ============

watch(animationFps, (newFps) => {
  if (currentAnimationIndex.value !== null) {
    const anim = animations.value[currentAnimationIndex.value];
    if (anim) {
      anim.fps = newFps;
      saveAnimationsToStore();
    }
  }
});

watch(animationLoop, (loop) => {
  if (currentAnimationIndex.value !== null) {
    const anim = animations.value[currentAnimationIndex.value];
    if (anim) {
      anim.repeat = loop ? -1 : 0;
      saveAnimationsToStore();
    }
  }
});

// 监听当前角色变化
watch(
  () => designerStore.currentCharacterId,
  (newId) => {
    if (newId) {
      const character = designerStore.getCharacter(newId);
      if (character) {
        loadCharacterData(character);
      }
    }
  },
);
</script>

<template>
  <DesignerTabLayout>
    <template #left>
      <!-- 角色管理面板 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CharacterPanel
          :sprite-config="currentSpriteConfig"
          :animations="animations"
          @select="handleCharacterSelect"
          @create="handleCharacterCreate"
          @load="handleCharacterLoad"
        />
      </div>

      <!-- 雪碧图编辑器 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">雪碧图配置</h3>
        </div>
        <div class="p-4">
          <SpriteEditor
            :initial-config="currentCharacter?.sprite"
            @change="handleSpriteConfigChange"
            @frame-select="handleFrameSelect"
          />
        </div>
      </div>

      <!-- 动画列表 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">动画列表</h3>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {{ animations.length }} 个
          </span>
        </div>

        <!-- 添加动画 -->
        <div class="flex gap-2 border-b border-slate-100 p-3">
          <input
            v-model="newAnimationName"
            type="text"
            placeholder="动画名称"
            class="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-300 focus:bg-white"
            :disabled="!currentCharacter"
          />
          <button
            class="flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
            :disabled="!currentCharacter"
            @click="addAnimation"
          >
            <AddOutlined class="size-4" />
            添加
          </button>
        </div>

        <!-- 动画列表 -->
        <div class="max-h-48 overflow-auto">
          <div
            v-for="(anim, index) in animations"
            :key="anim.key"
            class="flex cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
            :class="{ 'bg-indigo-50': currentAnimationIndex === index }"
            @click="selectAnimation(index)"
          >
            <div class="flex items-center gap-2">
              <PlayArrowOutlined class="size-4 text-slate-400" />
              <span class="text-sm font-medium text-slate-700">{{ anim.key }}</span>
              <span class="text-xs text-slate-400">({{ anim.frames.length }} 帧)</span>
            </div>
            <button
              class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="删除"
              @click.stop="deleteAnimation(index)"
            >
              <DeleteOutlined class="size-4" />
            </button>
          </div>

          <div v-if="animations.length === 0" class="p-6 text-center text-sm text-slate-400">
            {{ currentCharacter ? '暂无动画，点击上方按钮添加' : '请先选择或创建角色' }}
          </div>
        </div>
      </div>

      <!-- 当前动画帧编辑 -->
      <div
        v-if="currentAnimation"
        class="rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">帧序列</h3>
          <button
            class="text-xs text-red-500 transition-colors hover:text-red-600"
            @click="clearAnimationFrames"
          >
            清空
          </button>
        </div>

        <div class="p-4">
          <!-- 帧序列显示 -->
          <div class="mb-3 flex flex-wrap gap-1">
            <div
              v-for="(frameIndex, idx) in currentAnimation.frames"
              :key="idx"
              class="group relative flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600"
            >
              {{ frameIndex }}
              <button
                class="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-red-500 text-xs text-white group-hover:flex"
                @click="removeFrameFromAnimation(frameIndex)"
              >
                ×
              </button>
            </div>
            <div
              v-if="currentAnimation.frames.length === 0"
              class="w-full py-3 text-center text-xs text-slate-400"
            >
              点击左侧帧添加到动画
            </div>
          </div>

          <!-- 动画设置 -->
          <div class="flex items-center gap-4 border-t border-slate-100 pt-3">
            <label class="flex items-center gap-2">
              <span class="text-xs text-slate-500">FPS:</span>
              <input
                v-model.number="animationFps"
                type="number"
                min="1"
                max="60"
                class="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs outline-none focus:border-indigo-300"
              />
            </label>
            <label class="flex cursor-pointer items-center gap-2">
              <input v-model="animationLoop" type="checkbox" class="size-3.5 rounded border-slate-300 text-indigo-500" />
              <span class="text-xs text-slate-500">循环播放</span>
            </label>
          </div>
        </div>
      </div>
    </template>

    <template #right>
      <div class="flex h-full flex-col gap-4 p-4">
        <!-- 动画预览 -->
        <div class="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 class="text-sm font-semibold text-slate-700">动画预览</h3>
            <button
              class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100"
            >
              <RefreshOutlined class="size-3.5" />
              刷新
            </button>
          </div>
          <div class="flex h-full items-center justify-center p-4">
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
            <div v-else class="text-center text-slate-400">
              <p class="mb-2">暂无预览</p>
              <p class="text-xs">
                {{ currentCharacter ? '请先上传雪碧图并选择动画帧' : '请先选择或创建角色' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </DesignerTabLayout>
</template>
