<script setup lang="ts">
/**
 * @file 设计工坊主页
 * @description 直接渲染子路由内容，标签页导航已移至顶部导航栏
 * Requirements: 11.2-11.6
 */
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <!-- 内容区域 -->
    <div class="flex-1 overflow-hidden">
      <router-view />
    </div>
  </div>
</template>
