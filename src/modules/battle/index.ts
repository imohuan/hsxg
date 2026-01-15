// 战斗模块导出

// 核心类
export { Unit } from "./core/Unit";
export type { UnitAnimationType, UnitBattleState } from "./core/Unit";

export { BattleScene } from "./core/BattleScene";
export type { BattleSceneEvents } from "./core/BattleScene";

export { ActionExecutor } from "./core/ActionExecutor";
export type { ActionResult, SkillConfig, ItemConfig, ActionExecutorConfig } from "./core/ActionExecutor";

// Composables
export { useActionQueue, sortActionQueue } from "./composables/useActionQueue";
export type { ActionQueueItem, ActionQueueState, UseActionQueueReturn } from "./composables/useActionQueue";

export { useBattle } from "./composables/useBattle";
export type { BattleState, UseBattleOptions, UseBattleReturn } from "./composables/useBattle";

// 组件
export { default as BattleCanvas } from "./components/BattleCanvas.vue";
export { default as BattleMenu } from "./components/BattleMenu.vue";

// 页面
export { default as BattlePage } from "./pages/BattlePage.vue";
