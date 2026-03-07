<script setup lang="ts">
/**
 * @file 角色编辑页面
 * @description 整合雪碧图编辑器、角色面板和动画预览组件（现代 SaaS 风格）
 */
import { ref, computed, reactive } from "vue";
import { RefreshOutlined, UploadFileOutlined, SaveOutlined } from "@vicons/material";
import DesignerTabLayout from "@/components/layout/DesignerTabLayout.vue";
import LibraryPanel from "@/components/common/LibraryPanel.vue";
import CanvasPreview from "@/components/common/CanvasPreview.vue";
import Timeline from "@/components/common/Timeline.vue";
import type { LibraryItem } from "@/components/common/LibraryPanel.vue";
import type { SpriteSheetPreviewConfig } from "@/modules/designer/core/PreviewPlayer";
import { useDesignerStore } from "@/stores/designer.store";

// ============ Store ============
const designerStore = useDesignerStore();

// ============ 状态 ============
const characterConfig = reactive<SpriteSheetPreviewConfig>({
  url: "",
  rows: 5,
  cols: 5,
  frameCount: 22,
  scale: 1,
});

const previewConfig = ref<SpriteSheetPreviewConfig>({ ...characterConfig });
const playing = ref(false);
const currentFrame = ref(0);
const fps = ref(24);
const characterName = ref("新角色");
const status = ref("");

const fileInputRef = ref<HTMLInputElement | null>(null);

type CanvasPreviewInstance = InstanceType<typeof CanvasPreview>;
const canvasPreviewRef = ref<CanvasPreviewInstance | null>(null);

// ============ 计算属性 ============
const previewTotalFrames = computed(() => {
  const config = previewConfig.value;
  return config.frameCount || config.rows * config.cols;
});

const libraryItems = computed<LibraryItem[]>(() => {
  return designerStore.characters.map((c) => ({
    id: c.id,
    name: c.name,
    url: c.sprite.url,
    rows: c.sprite.rows,
    cols: c.sprite.cols,
    frameCount: c.sprite.frameCount,
  }));
});

const selectedLibraryId = computed(() => designerStore.currentCharacterId);

// 判断当前是否为本地上传的图片
const isLocalImage = computed(() => characterConfig.url.startsWith("data:"));

// ============ 方法 ============
function refreshPreview(): void {
  previewConfig.value = { ...characterConfig };
  currentFrame.value = 0;
  playing.value = false;
  canvasPreviewRef.value?.triggerRefresh();
}

function handleCanvasRefresh(): void {
  currentFrame.value = 0;
  playing.value = false;
}

function selectLibraryItem(item: LibraryItem): void {
  designerStore.currentCharacterId = item.id;
  const character = designerStore.getCharacter(item.id);
  if (character) {
    characterName.value = character.name;
    characterConfig.url = character.sprite.url;
    characterConfig.rows = character.sprite.rows;
    characterConfig.cols = character.sprite.cols;
    characterConfig.frameCount = character.sprite.frameCount;
    characterConfig.scale = character.sprite.scale ?? 1;
    refreshPreview();
  }
}

function saveCurrentToLibrary(): void {
  if (designerStore.currentCharacterId) {
    designerStore.updateCharacter(designerStore.currentCharacterId, {
      name: characterName.value,
      sprite: {
        url: characterConfig.url,
        rows: characterConfig.rows,
        cols: characterConfig.cols,
        frameCount: characterConfig.frameCount,
        scale: characterConfig.scale,
      },
    });
    status.value = "已保存";
    setTimeout(() => (status.value = ""), 2000);
  } else {
    const newId = designerStore.addCharacter({
      id: `char_${Date.now()}`,
      name: characterName.value,
      sprite: {
        url: characterConfig.url,
        rows: characterConfig.rows,
        cols: characterConfig.cols,
        frameCount: characterConfig.frameCount,
        scale: characterConfig.scale,
      },
      animations: [],
    });
    designerStore.currentCharacterId = newId;
    status.value = "已创建";
    setTimeout(() => (status.value = ""), 2000);
  }
}

function createNewConfig(): void {
  designerStore.currentCharacterId = null;
  characterName.value = "新角色";
  characterConfig.url = "";
  characterConfig.rows = 5;
  characterConfig.cols = 5;
  characterConfig.frameCount = 25;
  characterConfig.scale = 1;
  refreshPreview();
}

function clearSelection(): void {
  designerStore.currentCharacterId = null;
  createNewConfig();
}

function deleteLibraryItem(id: string): void {
  designerStore.removeCharacter(id);
  if (designerStore.currentCharacterId === id) {
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
    characterConfig.url = dataUrl;
    status.value = "图片已加载";
    setTimeout(() => (status.value = ""), 2000);
    refreshPreview();
  };
  reader.readAsDataURL(file);
  input.value = "";
}

// 输入框样式
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
</script>

<template>
  <DesignerTabLayout>
    <template #left>
      <!-- 人物列表 -->
      <LibraryPanel
        title="人物列表"
        description="选择现有人物配置，方便快速切换"
        :items="libraryItems"
        :selected-id="selectedLibraryId"
        :status="status"
        @create="createNewConfig"
        @clear="clearSelection"
        @select="selectLibraryItem"
        @delete="deleteLibraryItem"
      />

      <!-- 人物属性 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-3">
          <h3 class="font-semibold text-slate-800">人物属性</h3>
        </div>

        <div class="space-y-4 p-4">
          <!-- 名称 -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">名称</span>
            <input
              v-model="characterName"
              :class="inputClass"
              type="text"
              placeholder="输入角色名称"
            />
          </label>

          <!-- 图片：URL 输入 + 上传按钮并排 -->
          <div>
            <span class="mb-1.5 block text-xs font-medium text-slate-600">图片</span>
            <div class="flex gap-2">
              <input
                v-model="characterConfig.url"
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
              <input
                v-model.number="characterConfig.rows"
                :class="inputClass"
                min="1"
                type="number"
              />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-medium text-slate-600">列</span>
              <input
                v-model.number="characterConfig.cols"
                :class="inputClass"
                min="1"
                type="number"
              />
            </label>
          </div>

          <!-- 帧数量 -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">帧数量</span>
            <input
              v-model.number="characterConfig.frameCount"
              :class="inputClass"
              min="1"
              type="number"
              :placeholder="`默认: ${characterConfig.rows * characterConfig.cols}`"
            />
            <span class="mt-1 block text-xs text-slate-400"
              >用于指定实际使用的帧数，当图片未铺满时使用</span
            >
          </label>

          <!-- 缩放比例 -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">缩放比例</span>
            <input
              v-model.number="characterConfig.scale"
              :class="inputClass"
              min="0.1"
              max="10"
              step="0.1"
              type="number"
              placeholder="默认: 1"
            />
            <span class="mt-1 block text-xs text-slate-400"
              >战斗场景中的显示缩放，建议 0.5 - 3.0</span
            >
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
        <!-- 预览画布 -->
        <div class="w-full flex-1 overflow-hidden">
          <CanvasPreview
            ref="canvasPreviewRef"
            :config="previewConfig"
            :fps="fps"
            :current-frame="currentFrame"
            :playing="playing"
            @update:fps="fps = $event"
            @update:current-frame="currentFrame = $event"
            @update:playing="playing = $event"
            @refresh="handleCanvasRefresh"
          />
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
