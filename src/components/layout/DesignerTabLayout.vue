<script setup lang="ts">
/**
 * @file 设计器 Tab 通用布局组件
 * @description 提供左右两侧的标准布局结构
 * 现代 SaaS 风格：亮色主题
 */
</script>

<template>
  <div class="flex h-full w-full flex-1 overflow-hidden">
    <!-- 左侧配置面板 -->
    <section
      class="flex w-96 shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-5"
    >
      <slot name="left" />
    </section>

    <!-- 右侧预览区域 -->
    <section class="flex min-w-0 flex-1 flex-col bg-slate-100">
      <slot name="right" />
    </section>
  </div>
</template>
