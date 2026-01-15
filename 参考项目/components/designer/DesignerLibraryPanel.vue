<script setup lang="ts">
import type { LibraryItem } from "@/composables/useDesignerLibraryPanel";

const props = defineProps<{
  title: string;
  description: string;
  items: LibraryItem[];
  selectedId: string | null;
  status: string;
}>();

const emit = defineEmits<{
  save: [];
  create: [];
  clear: [];
  select: [item: LibraryItem];
  delete: [id: string];
}>();

const deriveLibraryTitle = (item: LibraryItem) => {
  if ("name" in item && item.name) {
    return item.name;
  }
  if ("url" in item) {
    try {
      const url = new URL(item.url, window.location.href);
      return url.pathname.split("/").pop() || "未命名资源";
    } catch {
      return item.url || "未命名资源";
    }
  }
  return "未命名配置";
};

const renderLibraryMeta = (item: LibraryItem) => {
  if ("steps" in item) {
    return `${item.steps.length} 个步骤`;
  }
  const frame =
    item.frameCount && item.frameCount > 0
      ? item.frameCount
      : item.rows * item.cols;
  return `${item.rows} x ${item.cols} · 帧数 ${frame}`;
};
</script>

<template>
  <div class="side-card space-y-3">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h3 class="text-lg font-semibold text-white">{{ props.title }}</h3>
        <p class="text-xs text-slate-400">{{ props.description }}</p>
      </div>
      <button
        class="btn-secondary whitespace-nowrap"
        type="button"
        @click="emit('save')"
      >
        <i class="fa fa-save mr-1" /> 保存
      </button>
    </div>
    <div
      v-if="!props.items.length"
      class="rounded-lg border border-dashed border-white/10 bg-slate-950/40 p-3 text-xs text-slate-400"
    >
      暂无数据，先在下方编辑并保存当前配置。
    </div>
    <ul v-else class="library-list max-h-48 space-y-2 overflow-y-auto pr-1">
      <li
        v-for="item in props.items"
        :key="item.id"
        class="library-item flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm transition"
        :data-selected="props.selectedId === item.id"
        @click="emit('select', item)"
      >
        <span class="library-item__indicator">
          <i class="fa fa-check" />
        </span>
        <div class="flex-1 overflow-hidden">
          <p class="truncate">
            {{ deriveLibraryTitle(item) }}
          </p>
          <p class="truncate text-xs text-slate-400">
            {{ renderLibraryMeta(item) }}
          </p>
        </div>
        <button
          class="text-xs text-red-400 transition hover:text-red-300"
          type="button"
          @click.stop="emit('delete', item.id)"
        >
          <i class="fa fa-trash" />
        </button>
      </li>
    </ul>
    <div class="flex gap-2">
      <button
        class="btn-secondary flex-1"
        type="button"
        @click="emit('create')"
      >
        <i class="fa fa-plus mr-1" /> 新建
      </button>
      <button class="btn-secondary flex-1" type="button" @click="emit('clear')">
        <i class="fa fa-eraser mr-1" /> 清空
      </button>
    </div>
    <p v-if="props.status" class="text-xs text-emerald-300">
      {{ props.status }}
    </p>
  </div>
</template>

<style scoped>
.library-list {
  scrollbar-gutter: stable;
}

.library-item {
  border-color: rgba(255, 255, 255, 0.08);
  background: radial-gradient(circle at top, rgba(15, 23, 42, 0.8), #0f172a);
}

.library-item__indicator {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: transparent;
  transition: all 0.2s ease;
}

.library-item:hover {
  border-color: rgba(16, 185, 129, 0.3);
}

.library-item[data-selected="true"] {
  border-color: rgba(16, 185, 129, 0.8);
  background: linear-gradient(
    130deg,
    rgba(16, 185, 129, 0.18),
    rgba(15, 23, 42, 0.95)
  );
  color: white;
  font-weight: 600;
}

.library-item[data-selected="true"] .library-item__indicator {
  background-color: rgb(16, 185, 129);
  border-color: rgb(16, 185, 129);
  color: white;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
}

.library-item button {
  opacity: 0.7;
}

.library-item:hover button {
  opacity: 1;
}
</style>
