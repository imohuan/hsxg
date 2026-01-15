<script setup lang="ts">
/**
 * 特效编辑面板组件
 * 实现特效创建、参数配置、保存功能
 * Requirements: 5.1-5.5
 */
import { ref, computed, watch } from "vue";
import { AddOutlined, DeleteOutlined, SaveOutlined, EditOutlined, AutoAwesomeOutlined } from "@vicons/material";
import { useDesignerStore } from "@/stores/designer.store";
import type { EffectConfig, SpriteConfig, AnimationConfig } from "@/types";

// ============ Props & Emits ============

const props = defineProps<{
  /** 当前雪碧图配置 */
  spriteConfig?: SpriteConfig;
  /** 当前动画列表 */
  animations?: AnimationConfig[];
  /** 缩放比例 */
  scale?: number;
  /** 混合模式 */
  blendMode?: string;
}>();

const emit = defineEmits<{
  /** 选择特效事件 */
  select: [effect: EffectConfig];
  /** 新建特效事件 */
  create: [];
  /** 加载特效事件 */
  load: [effect: EffectConfig];
  /** 参数变更事件 */
  paramsChange: [params: { scale: number; blendMode: string }];
}>();

// ============ Store ============

const designerStore = useDesignerStore();

// ============ 状态 ============

/** 是否显示新建对话框 */
const showCreateDialog = ref(false);

/** 新特效名称 */
const newEffectName = ref("");

/** 是否处于编辑模式 */
const isEditing = ref(false);

/** 编辑中的特效名称 */
const editingName = ref("");

// ============ 计算属性 ============

/** 当前选中的特效 */
const currentEffect = computed(() => {
  if (!designerStore.currentEffectId) return null;
  return designerStore.getEffect(designerStore.currentEffectId);
});

/** 特效列表 */
const effects = computed(() => designerStore.effects);

// ============ 方法 ============

/** 生成唯一 ID */
function generateId(): string {
  return `effect_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 打开新建对话框 */
function openCreateDialog(): void {
  newEffectName.value = "";
  showCreateDialog.value = true;
}

/** 关闭新建对话框 */
function closeCreateDialog(): void {
  showCreateDialog.value = false;
  newEffectName.value = "";
}

/** 创建新特效 */
function createEffect(): void {
  const name = newEffectName.value.trim();
  if (!name) return;

  const newEffect: EffectConfig = {
    id: generateId(),
    name,
    sprite: props.spriteConfig ?? {
      url: "",
      rows: 1,
      cols: 1,
      scale: props.scale ?? 1,
    },
    animations: [],
    blendMode: props.blendMode ?? "normal",
  };

  designerStore.addEffect(newEffect);
  designerStore.currentEffectId = newEffect.id;
  closeCreateDialog();
  emit("create");
}

/** 选择特效 */
function selectEffect(effect: EffectConfig): void {
  designerStore.currentEffectId = effect.id;
  emit("select", effect);
  emit("load", effect);
}

/** 删除特效 */
function deleteEffect(id: string): void {
  if (!confirm("确定要删除这个特效吗？")) return;

  designerStore.removeEffect(id);
  if (designerStore.currentEffectId === id) {
    designerStore.currentEffectId = null;
  }
}

/** 开始编辑特效名称 */
function startEditName(): void {
  if (!currentEffect.value) return;
  editingName.value = currentEffect.value.name;
  isEditing.value = true;
}

/** 保存特效名称 */
function saveEditName(): void {
  if (!currentEffect.value || !editingName.value.trim()) {
    isEditing.value = false;
    return;
  }

  designerStore.updateEffect(currentEffect.value.id, {
    name: editingName.value.trim(),
  });
  isEditing.value = false;
}

/** 取消编辑 */
function cancelEditName(): void {
  isEditing.value = false;
  editingName.value = "";
}

/** 保存当前特效配置 */
function saveCurrentEffect(): void {
  if (!currentEffect.value) return;

  // 更新雪碧图配置、动画列表和特效参数
  const updatedSprite = props.spriteConfig
    ? { ...props.spriteConfig, scale: props.scale ?? 1 }
    : currentEffect.value.sprite;

  designerStore.updateEffect(currentEffect.value.id, {
    sprite: updatedSprite,
    animations: props.animations ?? currentEffect.value.animations,
    blendMode: props.blendMode ?? currentEffect.value.blendMode,
  });
}

/** 处理键盘事件 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter") {
    saveEditName();
  } else if (event.key === "Escape") {
    cancelEditName();
  }
}

/** 获取混合模式显示名称 */
function getBlendModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    normal: "正常",
    add: "叠加",
    multiply: "正片叠底",
    screen: "滤色",
  };
  return labels[mode] ?? mode;
}

// ============ 监听 ============

// 当 props 变化时自动保存
watch(
  () => [props.spriteConfig, props.animations, props.scale, props.blendMode],
  () => {
    if (currentEffect.value && (props.spriteConfig || props.animations)) {
      saveCurrentEffect();
    }
  },
  { deep: true },
);
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <h3 class="text-sm font-semibold text-slate-700">特效管理</h3>
      <button
        class="flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600"
        @click="openCreateDialog"
      >
        <AddOutlined class="size-3.5" />
        新建
      </button>
    </div>

    <!-- 特效列表 -->
    <div class="flex-1 overflow-auto">
      <div v-if="effects.length === 0" class="flex flex-col items-center justify-center p-8 text-slate-400">
        <AutoAwesomeOutlined class="mb-2 size-12 opacity-50" />
        <p class="text-sm">暂无特效</p>
        <p class="text-xs">点击上方按钮创建</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="effect in effects"
          :key="effect.id"
          class="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
          :class="{ 'bg-indigo-50': designerStore.currentEffectId === effect.id }"
          @click="selectEffect(effect)"
        >
          <!-- 特效图标 -->
          <div
            class="flex size-10 items-center justify-center rounded-lg bg-slate-100"
            :class="{ 'bg-indigo-100': designerStore.currentEffectId === effect.id }"
          >
            <AutoAwesomeOutlined
              class="size-5"
              :class="designerStore.currentEffectId === effect.id ? 'text-indigo-500' : 'text-slate-400'"
            />
          </div>

          <!-- 特效信息 -->
          <div class="min-w-0 flex-1">
            <p
              class="truncate text-sm font-medium"
              :class="designerStore.currentEffectId === effect.id ? 'text-indigo-700' : 'text-slate-700'"
            >
              {{ effect.name }}
            </p>
            <p class="text-xs text-slate-400">
              {{ effect.animations.length }} 个动画 · {{ getBlendModeLabel(effect.blendMode ?? "normal") }}
            </p>
          </div>

          <!-- 操作按钮 -->
          <button
            class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="删除"
            @click.stop="deleteEffect(effect.id)"
          >
            <DeleteOutlined class="size-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 当前特效编辑区 -->
    <div v-if="currentEffect" class="border-t border-slate-200 bg-slate-50 p-4">
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">当前编辑:</span>
          <!-- 名称编辑 -->
          <template v-if="isEditing">
            <input
              v-model="editingName"
              type="text"
              class="w-32 rounded border border-indigo-300 bg-white px-2 py-1 text-sm outline-none"
              autofocus
              @keydown="handleKeydown"
              @blur="saveEditName"
            />
          </template>
          <template v-else>
            <span class="text-sm font-medium text-slate-700">{{ currentEffect.name }}</span>
            <button
              class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              title="编辑名称"
              @click="startEditName"
            >
              <EditOutlined class="size-3.5" />
            </button>
          </template>
        </div>

        <!-- 保存按钮 -->
        <button
          class="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-600"
          @click="saveCurrentEffect"
        >
          <SaveOutlined class="size-3.5" />
          保存
        </button>
      </div>

      <!-- 特效信息摘要 -->
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div class="rounded-lg bg-white p-2">
          <span class="text-slate-500">雪碧图:</span>
          <span class="ml-1 text-slate-700">
            {{ currentEffect.sprite.url ? "已配置" : "未配置" }}
          </span>
        </div>
        <div class="rounded-lg bg-white p-2">
          <span class="text-slate-500">动画数:</span>
          <span class="ml-1 text-slate-700">{{ currentEffect.animations.length }}</span>
        </div>
        <div class="rounded-lg bg-white p-2">
          <span class="text-slate-500">混合:</span>
          <span class="ml-1 text-slate-700">{{ getBlendModeLabel(currentEffect.blendMode ?? "normal") }}</span>
        </div>
      </div>
    </div>

    <!-- 新建对话框 -->
    <Teleport to="body">
      <div
        v-if="showCreateDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="closeCreateDialog"
      >
        <div class="w-80 rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-semibold text-slate-800">新建特效</h3>

          <div class="mb-4">
            <label class="mb-1.5 block text-sm text-slate-600">特效名称</label>
            <input
              v-model="newEffectName"
              type="text"
              placeholder="输入特效名称"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors outline-none focus:border-indigo-300 focus:bg-white"
              autofocus
              @keydown.enter="createEffect"
            />
          </div>

          <div class="flex justify-end gap-2">
            <button
              class="rounded-lg px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
              @click="closeCreateDialog"
            >
              取消
            </button>
            <button
              class="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
              :disabled="!newEffectName.trim()"
              @click="createEffect"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
