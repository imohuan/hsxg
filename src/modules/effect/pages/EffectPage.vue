<script setup lang="ts">
/**
 * @file 特效编辑页面
 * @description 整合雪碧图编辑器、特效面板和动画预览组件（现代 SaaS 风格）
 * 使用 GameCanvas 进行特效预览
 */
import { ref, computed, reactive } from "vue";
import {
  RefreshOutlined,
  UploadFileOutlined,
  SaveOutlined,
  PlayArrowOutlined,
} from "@vicons/material";
import DesignerTabLayout from "@/components/layout/DesignerTabLayout.vue";
import LibraryPanel from "@/components/common/LibraryPanel.vue";
import GameCanvas from "@/components/gamecanvas/GameCanvas.vue";
import Timeline from "@/components/common/Timeline.vue";
import type { LibraryItem } from "@/components/common/LibraryPanel.vue";
import type { SpriteSheetPreviewConfig } from "@/modules/designer/core/PreviewPlayer";
import type { GameData, EffectConfig } from "@/types";
import { useDesignerStore } from "@/stores/designer.store";

// ============ Store ============
const designerStore = useDesignerStore();

// ============ 状态 ============
const effectConfig = reactive<SpriteSheetPreviewConfig>({
  url: "",
  rows: 5,
  cols: 5,
  frameCount: 25,
  scale: 1,
});

const playing = ref(false);
const currentFrame = ref(0);
const fps = ref(24);
const effectName = ref("新特效");
const blendMode = ref("normal");
const status = ref("");

const fileInputRef = ref<HTMLInputElement | null>(null);

const blendModes = [
  { value: "normal", label: "正常" },
  { value: "add", label: "叠加" },
  { value: "multiply", label: "正片叠底" },
  { value: "screen", label: "滤色" },
];

// GameCanvas 引用
type GameCanvasInstance = InstanceType<typeof GameCanvas>;
const canvasRef = ref<GameCanvasInstance | null>(null);

// ============ 计算属性 ============
const previewTotalFrames = computed(() => {
  return effectConfig.frameCount || effectConfig.rows * effectConfig.cols;
});

const libraryItems = computed<LibraryItem[]>(() => {
  return designerStore.effects.map((e) => ({
    id: e.id,
    name: e.name,
    url: e.sprite.url,
    rows: e.sprite.rows,
    cols: e.sprite.cols,
    frameCount: e.sprite.frameCount,
  }));
});

const selectedLibraryId = computed(() => designerStore.currentEffectId);

// 判断当前是否为本地上传的图片
const isLocalImage = computed(() => effectConfig.url.startsWith("data:"));

// 构建 GameData 用于 GameCanvas
const gameData = computed<GameData>(() => {
  // 将当前编辑的特效配置转换为 EffectConfig
  const currentEffect: EffectConfig = {
    id: "preview_effect",
    name: effectName.value,
    sprite: {
      url: effectConfig.url,
      rows: effectConfig.rows,
      cols: effectConfig.cols,
      frameCount: effectConfig.frameCount,
      scale: effectConfig.scale,
      fps: fps.value,
    },
    animations: [],
    blendMode: blendMode.value,
  };

  // 合并 store 中的特效和当前预览特效
  const allEffects = [...designerStore.effects];
  // 如果当前特效有 URL，添加到列表中
  if (effectConfig.url) {
    allEffects.push(currentEffect);
  }

  return {
    scene: {
      name: "特效预览",
      backgroundColor: "#f9fafb",
    },
    players: {
      enemy: { id: "", name: "" },
      self: { id: "", name: "" },
    },
    units: [],
    effects: allEffects,
    sounds: [],
    skills: [],
    items: [],
  };
});

// ============ 方法 ============
function refreshPreview(): void {
  currentFrame.value = 0;
  playing.value = false;
  // 停止所有特效
  canvasRef.value?.stopAllEffects();
}

function selectLibraryItem(item: LibraryItem): void {
  designerStore.currentEffectId = item.id;
  const effect = designerStore.getEffect(item.id);
  if (effect) {
    effectName.value = effect.name;
    effectConfig.url = effect.sprite.url;
    effectConfig.rows = effect.sprite.rows;
    effectConfig.cols = effect.sprite.cols;
    effectConfig.frameCount = effect.sprite.frameCount;
    effectConfig.scale = effect.sprite.scale ?? 1;
    blendMode.value = effect.blendMode ?? "normal";
    refreshPreview();
  }
}

function saveCurrentToLibrary(): void {
  if (designerStore.currentEffectId) {
    designerStore.updateEffect(designerStore.currentEffectId, {
      name: effectName.value,
      sprite: {
        url: effectConfig.url,
        rows: effectConfig.rows,
        cols: effectConfig.cols,
        frameCount: effectConfig.frameCount,
        scale: effectConfig.scale,
      },
      blendMode: blendMode.value,
    });
    status.value = "已保存";
    setTimeout(() => (status.value = ""), 2000);
  } else {
    const newId = designerStore.addEffect({
      id: `effect_${Date.now()}`,
      name: effectName.value,
      sprite: {
        url: effectConfig.url,
        rows: effectConfig.rows,
        cols: effectConfig.cols,
        frameCount: effectConfig.frameCount,
        scale: effectConfig.scale,
      },
      animations: [],
      blendMode: blendMode.value,
    });
    designerStore.currentEffectId = newId;
    status.value = "已创建";
    setTimeout(() => (status.value = ""), 2000);
  }
}

function createNewConfig(): void {
  designerStore.currentEffectId = null;
  effectName.value = "新特效";
  effectConfig.url = "";
  effectConfig.rows = 5;
  effectConfig.cols = 5;
  effectConfig.frameCount = 25;
  effectConfig.scale = 1;
  blendMode.value = "normal";
  refreshPreview();
}

function clearSelection(): void {
  designerStore.currentEffectId = null;
  createNewConfig();
}

function deleteLibraryItem(id: string): void {
  designerStore.removeEffect(id);
  if (designerStore.currentEffectId === id) {
    createNewConfig();
  }
}

// 处理文件上传
function triggerFileInput(): void {
  fileInputRef.value?.click();
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    status.value = "请选择图片文件";
    setTimeout(() => (status.value = ""), 2000);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    effectConfig.url = dataUrl;
    status.value = "图片已加载";
    setTimeout(() => (status.value = ""), 2000);
    refreshPreview();
  };
  reader.readAsDataURL(file);
  input.value = "";
}

// 播放当前特效
async function playCurrentEffect(): Promise<void> {
  if (!effectConfig.url || !canvasRef.value) return;

  // 获取画布尺寸，在中心播放特效
  const size = canvasRef.value.getCanvasSize();
  const centerX = size.width / 2;
  const centerY = size.height / 2;

  try {
    await canvasRef.value.playEffect("preview_effect", centerX, centerY, {
      scale: effectConfig.scale,
    });
  } catch (error) {
    console.error("播放特效失败:", error);
    status.value = "播放失败";
    setTimeout(() => (status.value = ""), 2000);
  }
}

// 画布就绪回调
function onCanvasReady(): void {
  console.log("特效预览画布已就绪");
}

// 输入框样式
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
</script>

<template>
  <DesignerTabLayout>
    <template #left>
      <!-- 特效列表 -->
      <LibraryPanel
        title="特效列表"
        description="选择现有特效配置，方便快速切换"
        :items="libraryItems"
        :selected-id="selectedLibraryId"
        :status="status"
        @create="createNewConfig"
        @clear="clearSelection"
        @select="selectLibraryItem"
        @delete="deleteLibraryItem"
      />

      <!-- 特效属性 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-3">
          <h3 class="font-semibold text-slate-800">特效属性</h3>
        </div>

        <div class="space-y-4 p-4">
          <!-- 名称 -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">名称</span>
            <input
              v-model="effectName"
              :class="inputClass"
              type="text"
              placeholder="输入特效名称"
            />
          </label>

          <!-- 图片：URL 输入 + 上传按钮并排 -->
          <div>
            <span class="mb-1.5 block text-xs font-medium text-slate-600">图片</span>
            <div class="flex gap-2">
              <input
                v-model="effectConfig.url"
                :class="[inputClass, 'flex-1']"
                type="text"
                placeholder="输入图片 URL 或上传本地图片"
                :disabled="isLocalImage"
              />
              <button
                type="button"
                class="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                @click="triggerFileInput"
              >
                <UploadFileOutlined class="size-4" />
                <span>上传</span>
              </button>
            </div>
            <p v-if="isLocalImage" class="mt-1.5 text-xs text-emerald-600">✓ 已加载本地图片</p>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFileChange"
            />
          </div>

          <!-- 行列设置 -->
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="mb-1.5 block text-xs font-medium text-slate-600">行</span>
              <input v-model.number="effectConfig.rows" :class="inputClass" min="1" type="number" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-medium text-slate-600">列</span>
              <input v-model.number="effectConfig.cols" :class="inputClass" min="1" type="number" />
            </label>
          </div>

          <!-- 帧数量 -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">帧数量</span>
            <input
              v-model.number="effectConfig.frameCount"
              :class="inputClass"
              min="1"
              type="number"
              :placeholder="`默认: ${effectConfig.rows * effectConfig.cols}`"
            />
          </label>

          <!-- 缩放比例 -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">缩放比例</span>
            <input
              v-model.number="effectConfig.scale"
              :class="inputClass"
              min="0.1"
              max="10"
              step="0.1"
              type="number"
              placeholder="默认: 1"
            />
          </label>

          <!-- 混合模式 -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">混合模式</span>
            <select v-model="blendMode" :class="inputClass">
              <option v-for="mode in blendModes" :key="mode.value" :value="mode.value">
                {{ mode.label }}
              </option>
            </select>
          </label>

          <!-- 刷新预览和保存按钮 -->
          <div class="flex gap-2">
            <button
              class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              type="button"
              @click="refreshPreview"
            >
              <RefreshOutlined class="size-4" />
              <span>刷新预览</span>
            </button>

            <button
              class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              type="button"
              @click="saveCurrentToLibrary"
            >
              <SaveOutlined class="size-4" />
              <span>保存</span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <template #right>
      <div class="flex h-full w-full flex-1 flex-col overflow-hidden">
        <!-- 预览画布 - 使用 GameCanvas -->
        <div class="relative w-full flex-1 overflow-hidden">
          <GameCanvas
            ref="canvasRef"
            :game-data="gameData"
            :show-units="false"
            :enable-transform="true"
            @canvas:ready="onCanvasReady"
          >
            <!-- 覆盖层：播放特效按钮 -->
            <template #overlay="{ canvasSize }">
              <div class="absolute bottom-4 left-4 z-10 flex gap-2">
                <button
                  class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                  type="button"
                  :disabled="!effectConfig.url"
                  :class="{ 'cursor-not-allowed opacity-50': !effectConfig.url }"
                  @click="playCurrentEffect"
                >
                  <PlayArrowOutlined class="size-4" />
                  <span>播放特效</span>
                </button>
              </div>
              <div
                class="absolute bottom-4 right-4 z-10 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-600 backdrop-blur-sm"
              >
                {{ canvasSize.width }} × {{ canvasSize.height }}
              </div>
            </template>
          </GameCanvas>
        </div>

        <!-- 时间轴 -->
        <div class="h-40 w-full shrink-0">
          <Timeline
            :total-frames="previewTotalFrames"
            :current-frame="currentFrame"
            :fps="fps"
            :playing="playing"
            @update:current-frame="currentFrame = $event"
            @update:fps="fps = $event"
            @update:playing="playing = $event"
          />
        </div>
      </div>
    </template>
  </DesignerTabLayout>
</template>
