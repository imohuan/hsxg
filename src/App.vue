<script setup lang="ts">
/**
 * @file 应用根组件
 * @description 提供路由视图
 */
import { useEventListener } from "@vueuse/core";

// 监听ctrl + shift + p
// useEventListener()
useEventListener("keydown", (e: KeyboardEvent) => {
  if (e.ctrlKey && e.shiftKey && e.key === "P") {
    debugger;
  }
});
</script>

<template>
  <router-view />
</template>
