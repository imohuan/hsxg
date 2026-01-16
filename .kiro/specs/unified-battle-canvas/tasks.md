# 实现计划：统一战斗画布组件

## 任务列表

- [x] 1. 更新类型定义
  - [x] 1.1 在 `src/types/index.ts` 添加 GameData、UnifiedBattleCanvasEmits 等类型
  - _Requirements: Props 配置、Emit 事件_

- [x] 2. 重构 UnifiedBattleCanvas 组件
  - [x] 2.1 修改 Props 为 gameData 统一入口
  - [x] 2.2 添加完整的 emit 事件定义
  - [x] 2.3 添加 Slots 支持（overlay, header, footer, unit-info）
  - [x] 2.4 添加 unit:hover 事件（鼠标悬停检测）
  - [x] 2.5 移除内置的 DiamondMenu 和 header
  - _Requirements: 1.1-1.7, 2.1-2.5, 6.1-6.5_

- [x] 3. 完善 API 导出
  - [x] 3.1 添加 getUnitAtPosition 方法
  - [x] 3.2 添加 showFloatingText 方法
  - [x] 3.3 添加 getCameraState 方法
  - [x] 3.4 添加 stopAllEffects 方法
  - _Requirements: 导出 API_

- [x] 4. 更新 BattlePage 使用新接口
  - [x] 4.1 创建 BattleHeader 组件（使用 header slot）
  - [x] 4.2 将 DiamondMenu 移到 overlay slot
  - [x] 4.3 创建 UnitInfoPopup 组件（使用 unit-info slot）
  - _Requirements: 使用示例_

- [x] 5. 更新 EffectPage 使用 UnifiedBattleCanvas
  - [x] 5.1 替换 CanvasPreview 为 UnifiedBattleCanvas
  - [x] 5.2 配置 showUnits=false, enableTransform=true
  - _Requirements: 特效编辑页面示例_

- [x] 6. 验证构建通过
  - 运行 `pnpm build` 确保无错误

- [x] 7. 将UnifiedBattleCanvas所有相关 hooks，等其他内容全部挪移到 src\components\gamecanvas\GameCanvas.vue中
  - 移动组件和composables
  - 移动src\modules\battle\components\UnifiedBattleCanvas.vue 到 GameCanvas.vue
  - 修复相关位置的引用

- [x] 8. 将 src\modules\battle和 src\modules\effect中的画布渲染 替换成 src\components\gamecanvas\GameCanvas.vue
  - 替换组件，并且删除多余代码文件
  - 在 battle 中完善菜单组件，和完善具体逻辑
  - 万载 effect 的使用逻辑
