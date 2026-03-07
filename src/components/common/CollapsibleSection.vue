<script setup lang="ts">
/**
 * @file 可折叠菜单项组件
 * @description 支持展开/收起的菜单项，参考图1的折叠UI样式（亮色主题）
 */
import { ref } from "vue";
import { KeyboardArrowRightOutlined, KeyboardArrowDownOutlined } from "@vicons/material";

// ============ Props ============

interface Props {
  /** 标题 */
  title: string;
  /** 默认是否展开 */
  defaultExpanded?: boolean;
  /** 是否禁用折叠功能（始终展开） */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpanded: false,
  disabled: false,
});

// ============ 状态 ============

const isExpanded = ref(props.defaultExpanded);

// ============ 方法 ============

function toggleExpand(): void {
  if (!props.disabled) {
    isExpanded.value = !isExpanded.value;
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <!-- 标题栏 -->
    <button
      class="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors"
      :class="disabled ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50 active:bg-slate-100'"
      @click="toggleExpand"
    >
      <!-- 折叠图标 -->
      <KeyboardArrowRightOutlined
        v-if="!isExpanded && !disabled"
        class="size-5 text-slate-500 transition-transform"
      />
      <KeyboardArrowDownOutlined
        v-else-if="isExpanded && !disabled"
        class="size-5 text-slate-500 transition-transform"
      />
      <div v-else class="size-5" />

      <!-- 标题 -->
      <span class="flex-1 text-sm font-medium text-slate-700">{{ title }}</span>
    </button>

    <!-- 内容区域 -->
    <div v-show="isExpanded || disabled" class="overflow-hidden transition-all duration-200">
      <div class="border-t border-slate-100 px-4 py-4">
        <slot />
      </div>
    </div>
  </div>
</template>
