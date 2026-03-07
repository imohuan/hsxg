<script setup lang="ts">
/**
 * @file 可折叠侧边栏组件
 * @description 通用的可折叠侧边栏，支持整体展开/收起切换
 */
import { ChevronLeftOutlined, ChevronRightOutlined } from "@vicons/material";
import { useLocalStorage } from "@vueuse/core";

// ============ Props ============

interface Props {
  /** 存储键名，用于持久化折叠状态 */
  storageKey?: string;
  /** 默认是否折叠 */
  defaultCollapsed?: boolean;
  /** 侧边栏宽度（展开时） */
  width?: string;
}

const props = withDefaults(defineProps<Props>(), {
  storageKey: "sidebar-collapsed",
  defaultCollapsed: false,
  width: "320px",
});

// ============ 状态 ============

const isCollapsed = useLocalStorage(props.storageKey, props.defaultCollapsed);

// ============ 方法 ============

function toggleCollapse(): void {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<template>
  <div
    class="relative flex h-full shrink-0 transition-all duration-300"
    :style="{ width: isCollapsed ? '0px' : width }"
  >
    <!-- 侧边栏内容 -->
    <div
      class="flex h-full flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 transition-opacity duration-300"
      :class="isCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'"
      :style="{ width }"
    >
      <slot />
    </div>

    <!-- 折叠/展开按钮 -->
    <button
      class="absolute top-4 -right-3 z-10 flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-lg"
      :title="isCollapsed ? '展开侧边栏' : '折叠侧边栏'"
      @click="toggleCollapse"
    >
      <ChevronLeftOutlined v-if="!isCollapsed" class="size-4 text-slate-600" />
      <ChevronRightOutlined v-else class="size-4 text-slate-600" />
    </button>
  </div>
</template>
