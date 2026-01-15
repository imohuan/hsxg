<script setup lang="ts">
/**
 * @file 侧边栏卡片组件
 * @description 用于侧边栏的通用卡片容器
 */
defineProps<{
  title?: string;
  collapsible?: boolean;
}>();
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
    <!-- 标题栏 -->
    <div v-if="title" class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <h3 class="text-sm font-semibold text-slate-700">{{ title }}</h3>
      <slot name="header-extra" />
    </div>

    <!-- 内容区 -->
    <div class="p-4">
      <slot />
    </div>
  </div>
</template>
