<script setup lang="ts">
/**
 * @file 战斗顶部信息栏组件
 * @description 显示敌方/我方玩家名称、场景名称和回合信息
 * 用于 UnifiedBattleCanvas 的 header slot
 */
import type { SceneConfig, PlayerInfo, TurnInfo } from "@/types";

// ============ Props ============

withDefaults(
  defineProps<{
    /** 场景配置 */
    scene: SceneConfig;
    /** 玩家信息 */
    players: { enemy: PlayerInfo; self: PlayerInfo };
    /** 回合信息 */
    turn?: TurnInfo;
    /** 倒计时（秒） */
    timer?: number;
    /** 是否显示倒计时 */
    showTimer?: boolean;
  }>(),
  {
    showTimer: false,
  },
);

// ============ 计算属性 ============
</script>

<template>
  <div class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
    <!-- 左侧：敌方玩家 -->
    <div class="flex items-center gap-2">
      <div
        v-if="players.enemy.avatar"
        class="size-8 overflow-hidden rounded-full border-2 border-red-500"
      >
        <img :src="players.enemy.avatar" :alt="players.enemy.name" class="size-full object-cover" />
      </div>
      <span class="text-sm font-bold text-red-600">{{ players.enemy.name || "敌方" }}</span>
    </div>

    <!-- 中央：场景名称和回合信息 -->
    <div class="flex flex-col items-center">
      <span class="text-lg font-bold text-amber-600">{{ scene.name || "战斗" }}</span>
      <span v-if="turn" class="text-xs text-gray-500">
        第 {{ turn.number }} 回合
        <template v-if="turn.phase === 'command'">· 指令阶段</template>
        <template v-else-if="turn.phase === 'execute'">· 执行中</template>
      </span>
    </div>

    <!-- 右侧：我方玩家 -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-bold text-blue-600">{{ players.self.name || "我方" }}</span>
      <div
        v-if="players.self.avatar"
        class="size-8 overflow-hidden rounded-full border-2 border-blue-500"
      >
        <img :src="players.self.avatar" :alt="players.self.name" class="size-full object-cover" />
      </div>
    </div>
  </div>
</template>
