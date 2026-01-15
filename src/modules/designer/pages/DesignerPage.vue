<script setup lang="ts">
// 设计工坊主页
import { useRoute } from "vue-router";

const route = useRoute();

// 标签页配置
const tabs = [
  { path: "/designer/character", label: "角色" },
  { path: "/designer/effect", label: "特效" },
  { path: "/designer/skill", label: "技能" },
  { path: "/designer/json", label: "JSON" },
];
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 标签页导航 -->
    <nav class="flex gap-1 border-b border-gray-200 bg-gray-50 px-4">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="px-4 py-2 text-sm transition-colors"
        :class="
          route.path === tab.path
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        "
      >
        {{ tab.label }}
      </router-link>
    </nav>

    <!-- 子路由内容 -->
    <div class="flex-1 overflow-auto">
      <router-view />
    </div>
  </div>
</template>
