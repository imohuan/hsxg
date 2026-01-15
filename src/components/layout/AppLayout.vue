<script setup lang="ts">
/**
 * @file 应用主布局组件
 * @description 提供顶部导航和主内容区域的标准布局
 * 现代 SaaS 风格：亮色主题 + Slate 色系 + 靛蓝主色调
 */
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  SportsEsportsOutlined,
  BrushOutlined,
  PersonOutlined,
  AutoAwesomeOutlined,
  TimelineOutlined,
  DataObjectOutlined,
  CircleOutlined,
} from "@vicons/material";
import { useDesignerStore } from "@/stores/designer.store";

const route = useRoute();
const router = useRouter();
const designerStore = useDesignerStore();

// 一级导航标签配置
const navTabs = [
  { label: "游戏界面", key: "battle", icon: SportsEsportsOutlined },
  { label: "设计工坊", key: "designer", icon: BrushOutlined },
];

// 二级标签页配置（设计工坊）
const designerTabs = [
  { key: "character", label: "角色设计", icon: PersonOutlined, path: "/designer/character" },
  { key: "effect", label: "特效设计", icon: AutoAwesomeOutlined, path: "/designer/effect" },
  { key: "skill", label: "技能编排", icon: TimelineOutlined, path: "/designer/skill" },
  { key: "json", label: "JSON 配置", icon: DataObjectOutlined, path: "/designer/json" },
];

// 当前激活的一级标签
const activeTab = computed(() => {
  const path = route.path;
  if (path.startsWith("/designer")) return "designer";
  if (path.startsWith("/battle")) return "battle";
  return "battle";
});

// 当前激活的二级标签
const activeDesignerTab = computed(() => {
  const path = route.path;
  const tab = designerTabs.find((t) => path.startsWith(t.path));
  return tab?.key ?? "character";
});

// 是否显示设计工坊二级标签
const showDesignerTabs = computed(() => activeTab.value === "designer");

// 获取标签页的统计数量
function getTabCount(key: string): number {
  switch (key) {
    case "character":
      return designerStore.characterCount;
    case "effect":
      return designerStore.effectCount;
    case "skill":
      return designerStore.skillCount;
    default:
      return 0;
  }
}

// 切换一级标签
function switchTab(key: string) {
  if (key === "battle") {
    router.push("/battle");
  } else if (key === "designer") {
    router.push("/designer");
  }
}

// 切换二级标签
function switchDesignerTab(path: string) {
  router.push(path);
}
</script>

<template>
  <div class="flex h-full min-h-screen flex-col bg-slate-50 text-slate-800">
    <!-- 顶部导航栏 -->
    <header
      class="flex items-center border-b border-slate-200 bg-white px-6 py-3 shadow-sm"
    >
      <!-- Logo 和标题 -->
      <div class="flex items-center gap-3 text-lg font-bold text-slate-800">
        <div class="flex size-8 items-center justify-center rounded-lg bg-indigo-500 text-white">
          <SportsEsportsOutlined class="size-5" />
        </div>
        <span>回合制战斗系统</span>
      </div>

      <!-- 一级导航标签 -->
      <nav class="ml-10 flex gap-1">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
          :class="
            activeTab === tab.key
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          "
          type="button"
          @click="switchTab(tab.key)"
        >
          <component :is="tab.icon" class="size-4" />
          {{ tab.label }}
        </button>
      </nav>

      <!-- 二级标签页（设计工坊） -->
      <nav v-if="showDesignerTabs" class="ml-6 flex items-center gap-1 border-l border-slate-200 pl-6">
        <button
          v-for="tab in designerTabs"
          :key="tab.key"
          class="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            activeDesignerTab === tab.key
              ? 'bg-slate-100 text-indigo-600'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          "
          type="button"
          @click="switchDesignerTab(tab.path)"
        >
          <component :is="tab.icon" class="size-4" />
          {{ tab.label }}
          <!-- 数量徽章 -->
          <span
            v-if="getTabCount(tab.key) > 0"
            class="rounded-full px-1.5 py-0.5 text-xs"
            :class="
              activeDesignerTab === tab.key
                ? 'bg-indigo-100 text-indigo-600'
                : 'bg-slate-100 text-slate-500'
            "
          >
            {{ getTabCount(tab.key) }}
          </span>
        </button>
      </nav>

      <!-- 右侧工具区域 -->
      <div class="ml-auto flex items-center gap-2">
        <!-- 未保存提示 -->
        <div v-if="showDesignerTabs && designerStore.hasUnsavedChanges" class="flex items-center gap-1.5 text-xs text-amber-600">
          <CircleOutlined class="size-2 animate-pulse fill-current" />
          <span>有未保存的更改</span>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="flex flex-1 overflow-hidden">
      <router-view />
    </main>
  </div>
</template>
