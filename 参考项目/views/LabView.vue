<script setup lang="ts">
import { ref } from "vue";
import { useStorage } from "@vueuse/core";
import { GameCanvas } from "@/components/game";
import DesignerWorkspace from "@/views/DesignerWorkspace/index.vue";
import type { BattleController } from "@/core/game/BattleController";

type TabKey = "game" | "design";

const activeTab = useStorage<TabKey>("lab-view-active-tab", "game");
const controller = ref<BattleController | null>(null);

const navTabs: Array<{ label: string; key: TabKey; icon: string }> = [
  { label: "游戏界面", key: "game", icon: "fa-dragon" },
  { label: "设计工坊", key: "design", icon: "fa-flask" },
];
</script>

<template>
  <div class="h-full flex min-h-screen flex-col bg-slate-950 text-slate-50">
    <header
      class="flex items-center border-b border-emerald-500/40 bg-black px-6 py-3 shadow-lg shadow-black/50"
    >
      <div class="flex items-center gap-3 text-lg font-bold text-white">
        <i class="fa fa-dragon text-emerald-400" />
        幻想三国OL - 游戏与设计工坊
      </div>
      <nav class="ml-10 mr-auto flex gap-2">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          class="rounded px-4 py-2 text-sm font-semibold uppercase tracking-wide transition"
          :class="
            activeTab === tab.key
              ? 'bg-emerald-500 text-white'
              : 'text-slate-400 hover:text-white'
          "
          type="button"
          @click="activeTab = tab.key"
        >
          <i :class="['fa', tab.icon, 'mr-2']" />
          {{ tab.label }}
        </button>
      </nav>
      <div id="designer-tool-anchor" class="flex items-center gap-2" />
    </header>

    <main class="flex flex-1 overflow-hidden">
      <section
        v-show="activeTab === 'game'"
        class="flex flex-1 items-center justify-center bg-black"
      >
        <GameCanvas class="h-full w-full" @ready="controller = $event" />
      </section>
      <section v-show="activeTab === 'design'" class="flex flex-1">
        <DesignerWorkspace
          :active="activeTab === 'design'"
          :controller="controller"
        />
      </section>
    </main>
  </div>
</template>
