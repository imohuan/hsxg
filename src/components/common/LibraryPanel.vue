<script setup lang="ts">
/**
 * @file 设计器资源库面板
 * @description 管理角色/特效列表（现代 SaaS 风格 - Slate + 靛蓝）
 */
import { DeleteOutlined, CheckOutlined, AddOutlined, ClearAllOutlined } from "@vicons/material";

export interface LibraryItem {
  id: string;
  name?: string;
  url?: string;
  rows: number;
  cols: number;
  frameCount?: number;
  steps?: unknown[];
}

const props = defineProps<{
  title: string;
  description: string;
  items: LibraryItem[];
  selectedId: string | null;
  status?: string;
}>();

const emit = defineEmits<{
  create: [];
  clear: [];
  select: [item: LibraryItem];
  delete: [id: string];
}>();

function deriveLibraryTitle(item: LibraryItem): string {
  if (item.name) return item.name;
  if (item.url) {
    try {
      const url = new URL(item.url, window.location.href);
      return url.pathname.split("/").pop() || "未命名资源";
    } catch {
      return item.url || "未命名资源";
    }
  }
  return "未命名配置";
}

function renderLibraryMeta(item: LibraryItem): string {
  if (item.steps) return `${item.steps.length} 个步骤`;
  const frame = item.frameCount && item.frameCount > 0 ? item.frameCount : item.rows * item.cols;
  return `${item.rows} × ${item.cols} · ${frame} 帧`;
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
    <!-- 标题栏 -->
    <div class="border-b border-slate-100 px-4 py-3">
      <h3 class="font-semibold text-slate-800">{{ props.title }}</h3>
      <p class="text-xs text-slate-500">{{ props.description }}</p>
    </div>

    <!-- 内容区 -->
    <div class="p-4">
      <!-- 空状态 -->
      <div
        v-if="!props.items.length"
        class="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
      >
        暂无数据，先在下方编辑并保存当前配置
      </div>

      <!-- 列表 -->
      <ul v-else class="max-h-40 space-y-2 overflow-y-auto">
        <li
          v-for="item in props.items"
          :key="item.id"
          class="group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition"
          :class="
            props.selectedId === item.id
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          "
          @click="emit('select', item)"
        >
          <!-- 选中指示器 -->
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition"
            :class="
              props.selectedId === item.id
                ? 'border-indigo-500 bg-indigo-500 text-white'
                : 'border-slate-300 group-hover:border-slate-400'
            "
          >
            <CheckOutlined v-if="props.selectedId === item.id" class="size-3" />
          </span>

          <!-- 信息 -->
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-slate-700">{{ deriveLibraryTitle(item) }}</p>
            <p class="truncate text-xs text-slate-500">{{ renderLibraryMeta(item) }}</p>
          </div>

          <!-- 删除按钮 -->
          <button
            class="rounded p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
            type="button"
            @click.stop="emit('delete', item.id)"
          >
            <DeleteOutlined class="size-4" />
          </button>
        </li>
      </ul>

      <!-- 操作按钮 -->
      <div class="mt-3 flex gap-2">
        <button
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          type="button"
          @click="emit('create')"
        >
          <AddOutlined class="size-4" />
          <span>新建</span>
        </button>
        <button
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          type="button"
          @click="emit('clear')"
        >
          <ClearAllOutlined class="size-4" />
          <span>清空</span>
        </button>
      </div>

      <!-- 状态提示 -->
      <p v-if="props.status" class="mt-2 text-xs text-emerald-600">{{ props.status }}</p>
    </div>
  </div>
</template>
