<script setup lang="ts">
/**
 * 角色编辑面板组件
 * 实现角色创建、动画配置、保存功能
 * Requirements: 4.5, 4.6, 4.7
 */
import { ref, computed, watch } from "vue";
import {
  AddOutlined,
  DeleteOutlined,
  SaveOutlined,
  EditOutlined,
  PersonOutlined,
} from "@vicons/material";
import { useDesignerStore } from "@/stores/designer.store";
import type { CharacterConfig, SpriteConfig, AnimationConfig } from "@/types";

// ============ Props & Emits ============

const props = defineProps<{
  /** 当前雪碧图配置 */
  spriteConfig?: SpriteConfig;
  /** 当前动画列表 */
  animations?: AnimationConfig[];
}>();

const emit = defineEmits<{
  /** 选择角色事件 */
  select: [character: CharacterConfig];
  /** 新建角色事件 */
  create: [];
  /** 加载角色事件 */
  load: [character: CharacterConfig];
}>();

// ============ Store ============

const designerStore = useDesignerStore();

// ============ 状态 ============

/** 是否显示新建对话框 */
const showCreateDialog = ref(false);

/** 新角色名称 */
const newCharacterName = ref("");

/** 是否处于编辑模式 */
const isEditing = ref(false);

/** 编辑中的角色名称 */
const editingName = ref("");

// ============ 计算属性 ============

/** 当前选中的角色 */
const currentCharacter = computed(() => {
  if (!designerStore.currentCharacterId) return null;
  return designerStore.getCharacter(designerStore.currentCharacterId);
});

/** 角色列表 */
const characters = computed(() => designerStore.characters);

// ============ 方法 ============

/** 生成唯一 ID */
function generateId(): string {
  return `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 打开新建对话框 */
function openCreateDialog(): void {
  newCharacterName.value = "";
  showCreateDialog.value = true;
}

/** 关闭新建对话框 */
function closeCreateDialog(): void {
  showCreateDialog.value = false;
  newCharacterName.value = "";
}

/** 创建新角色 */
function createCharacter(): void {
  const name = newCharacterName.value.trim();
  if (!name) return;

  const newCharacter: CharacterConfig = {
    id: generateId(),
    name,
    sprite: props.spriteConfig ?? {
      url: "",
      rows: 1,
      cols: 1,
    },
    animations: [],
  };

  designerStore.addCharacter(newCharacter);
  designerStore.currentCharacterId = newCharacter.id;
  closeCreateDialog();
  emit("create");
}

/** 选择角色 */
function selectCharacter(character: CharacterConfig): void {
  designerStore.currentCharacterId = character.id;
  emit("select", character);
  emit("load", character);
}

/** 删除角色 */
function deleteCharacter(id: string): void {
  if (!confirm("确定要删除这个角色吗？")) return;

  designerStore.removeCharacter(id);
  if (designerStore.currentCharacterId === id) {
    designerStore.currentCharacterId = null;
  }
}

/** 开始编辑角色名称 */
function startEditName(): void {
  if (!currentCharacter.value) return;
  editingName.value = currentCharacter.value.name;
  isEditing.value = true;
}

/** 保存角色名称 */
function saveEditName(): void {
  if (!currentCharacter.value || !editingName.value.trim()) {
    isEditing.value = false;
    return;
  }

  designerStore.updateCharacter(currentCharacter.value.id, {
    name: editingName.value.trim(),
  });
  isEditing.value = false;
}

/** 取消编辑 */
function cancelEditName(): void {
  isEditing.value = false;
  editingName.value = "";
}

/** 保存当前角色配置 */
function saveCurrentCharacter(): void {
  if (!currentCharacter.value) return;

  // 更新雪碧图配置和动画列表
  designerStore.updateCharacter(currentCharacter.value.id, {
    sprite: props.spriteConfig ?? currentCharacter.value.sprite,
    animations: props.animations ?? currentCharacter.value.animations,
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

// ============ 监听 ============

// 当 props 变化时自动保存
watch(
  () => [props.spriteConfig, props.animations],
  () => {
    if (currentCharacter.value && (props.spriteConfig || props.animations)) {
      // 延迟保存，避免频繁更新
      saveCurrentCharacter();
    }
  },
  { deep: true },
);
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <h3 class="text-sm font-semibold text-slate-700">角色管理</h3>
      <button
        class="flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600"
        @click="openCreateDialog"
      >
        <AddOutlined class="size-3.5" />
        新建
      </button>
    </div>

    <!-- 角色列表 -->
    <div class="flex-1 overflow-auto">
      <div v-if="characters.length === 0" class="flex flex-col items-center justify-center p-8 text-slate-400">
        <PersonOutlined class="mb-2 size-12 opacity-50" />
        <p class="text-sm">暂无角色</p>
        <p class="text-xs">点击上方按钮创建</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="character in characters"
          :key="character.id"
          class="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
          :class="{ 'bg-indigo-50': designerStore.currentCharacterId === character.id }"
          @click="selectCharacter(character)"
        >
          <!-- 角色图标 -->
          <div
            class="flex size-10 items-center justify-center rounded-lg bg-slate-100"
            :class="{ 'bg-indigo-100': designerStore.currentCharacterId === character.id }"
          >
            <PersonOutlined
              class="size-5"
              :class="designerStore.currentCharacterId === character.id ? 'text-indigo-500' : 'text-slate-400'"
            />
          </div>

          <!-- 角色信息 -->
          <div class="flex-1 min-w-0">
            <p
              class="truncate text-sm font-medium"
              :class="designerStore.currentCharacterId === character.id ? 'text-indigo-700' : 'text-slate-700'"
            >
              {{ character.name }}
            </p>
            <p class="text-xs text-slate-400">
              {{ character.animations.length }} 个动画
            </p>
          </div>

          <!-- 操作按钮 -->
          <button
            class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="删除"
            @click.stop="deleteCharacter(character.id)"
          >
            <DeleteOutlined class="size-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 当前角色编辑区 -->
    <div v-if="currentCharacter" class="border-t border-slate-200 bg-slate-50 p-4">
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
            <span class="text-sm font-medium text-slate-700">{{ currentCharacter.name }}</span>
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
          @click="saveCurrentCharacter"
        >
          <SaveOutlined class="size-3.5" />
          保存
        </button>
      </div>

      <!-- 角色信息摘要 -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="rounded-lg bg-white p-2">
          <span class="text-slate-500">雪碧图:</span>
          <span class="ml-1 text-slate-700">
            {{ currentCharacter.sprite.url ? '已配置' : '未配置' }}
          </span>
        </div>
        <div class="rounded-lg bg-white p-2">
          <span class="text-slate-500">动画数:</span>
          <span class="ml-1 text-slate-700">{{ currentCharacter.animations.length }}</span>
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
        <div class="min-w-96 rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-semibold text-slate-800">新建角色</h3>

          <div class="mb-6">
            <label class="mb-2 block text-sm text-slate-600">角色名称</label>
            <input
              v-model="newCharacterName"
              type="text"
              placeholder="输入角色名称"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-indigo-300 focus:bg-white"
              autofocus
              @keydown.enter="createCharacter"
            />
          </div>

          <div class="flex justify-end gap-3">
            <button
              class="rounded-lg px-5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
              @click="closeCreateDialog"
            >
              取消
            </button>
            <button
              class="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
              :disabled="!newCharacterName.trim()"
              @click="createCharacter"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
