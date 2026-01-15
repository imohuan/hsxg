<script setup lang="ts">
/**
 * @file JSON 配置页面
 * @description 整合 JSON 配置面板，提供配置数据的导入导出和编辑功能
 */
import JsonPanel from "@/modules/json-config/components/JsonPanel.vue";
</script>

<template>
  <div class="h-full w-full overflow-hidden bg-slate-100 p-4">
    <JsonPanel />
  </div>
</template>
