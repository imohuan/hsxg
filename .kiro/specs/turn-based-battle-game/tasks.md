# 实现计划：回合制战斗游戏系统

## 概述

本实现计划将设计文档分解为可执行的编码任务，按照模块化方式逐步构建战斗系统、设计工坊和时间轴编辑器。

## 任务列表

- [x] 1. 项目基础设施搭建
  - [x] 1.1 配置路由结构
    - 创建 `/battle`、`/designer`、`/designer/character`、`/designer/effect`、`/designer/skill`、`/designer/json` 路由
    - _Requirements: 11.1-11.7_
  - [x] 1.2 创建核心类型定义
    - 在 `src/types/index.ts` 中添加所有战斗、设计器、时间轴相关类型
    - _Requirements: 全部_
  - [x] 1.3 创建 Pinia Store 骨架
    - 创建 `battle.store.ts`、`designer.store.ts`、`config.store.ts`
    - _Requirements: 10.1-10.5_
  - [x] 1.4 安装必要依赖
    - 安装 Phaser 3、fast-check 等依赖
    - _Requirements: 全部_

- [x] 2. 战斗系统核心实现
  - [x] 2.1 实现战斗单位类 (Unit)
    - 创建 `src/modules/battle/core/Unit.ts`
    - 实现生命值、魔法值、属性管理
    - 实现动画播放、伤害显示
    - _Requirements: 1.3, 3.5, 3.6_
  - [x] 2.2 编写 Unit 类属性测试

    - **Property 5: 死亡状态不变量**
    - **Validates: Requirements 3.6**
  - [x] 2.3 实现战斗场景 (BattleScene)
    - 创建 `src/modules/battle/core/BattleScene.ts`
    - 实现单位加载、位置布局
    - 实现动画和特效播放
    - _Requirements: 1.1, 1.2, 1.4, 3.3, 3.4_
  - [x] 2.4 编写单位位置属性测试

    - **Property 1: 单位阵营位置正确性**
    - **Validates: Requirements 1.1, 1.2**
  - [x] 2.5 实现行动队列管理 (useActionQueue)
    - 创建 `src/modules/battle/composables/useActionQueue.ts`
    - 实现行动收集、排序、执行
    - _Requirements: 3.1, 3.2_
  - [x] 2.6 编写行动队列排序属性测试

    - **Property 2: 行动队列排序正确性**
    - **Validates: Requirements 3.1, 3.2**
  - [x] 2.7 实现行动执行器 (ActionExecutor)
    - 创建 `src/modules/battle/core/ActionExecutor.ts`
    - 实现攻击、技能、物品、防御、逃跑、召唤行动
    - _Requirements: 3.3-3.9_
  - [x] 2.8 编写胜负判定属性测试

    - **Property 6: 胜负判定正确性**
    - **Validates: Requirements 3.7, 3.8, 3.9**

- [x] 3. 检查点 - 战斗核心功能验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 4. 战斗界面实现
  - [x] 4.1 实现战斗画布组件 (BattleCanvas)
    - 创建 `src/modules/battle/components/BattleCanvas.vue`
    - 集成 Phaser 游戏实例
    - _Requirements: 1.1-1.5_
  - [x] 4.2 实现操作菜单组件 (BattleMenu)
    - 创建 `src/modules/battle/components/BattleMenu.vue`
    - 实现攻击、技能、物品、防御、逃跑、召唤菜单
    - _Requirements: 2.2-2.9_
  - [x] 4.3 实现战斗流程控制 (useBattle)
    - 创建 `src/modules/battle/composables/useBattle.ts`
    - 实现操作阶段、执行阶段切换
    - 实现 60 秒倒计时
    - _Requirements: 2.1, 2.10, 2.11_
  - [ ]* 4.4 编写角色激活顺序属性测试
    - **Property 3: 角色激活顺序正确性**
    - **Validates: Requirements 2.1**
  - [ ]* 4.5 编写召唤限制属性测试
    - **Property 4: 召唤数量限制**
    - **Validates: Requirements 2.9**
  - [x] 4.6 实现战斗页面 (BattlePage)
    - 创建 `src/modules/battle/pages/BattlePage.vue`
    - 整合画布、菜单、HUD 组件
    - _Requirements: 1.1-3.9_

- [ ] 5. 检查点 - 战斗界面功能验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 6. 设计工坊 - 雪碧图编辑器
  - [x] 6.1 实现雪碧图解析 (useSpriteSheet)
    - 创建 `src/modules/designer/composables/useSpriteSheet.ts`
    - 实现图片加载、网格切割、帧序列生成
    - _Requirements: 4.1, 4.2_
  - [ ]* 6.2 编写雪碧图切割属性测试
    - **Property 7: 雪碧图帧切割正确性**
    - **Validates: Requirements 4.2**
  - [x] 6.3 实现雪碧图编辑器组件 (SpriteEditor)
    - 创建 `src/modules/designer/components/SpriteEditor.vue`
    - 实现图片上传、网格配置、帧预览
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 6.4 实现动画预览组件 (AnimationPreview)
    - 创建 `src/modules/designer/components/AnimationPreview.vue`
    - 实现动画播放、帧率调整
    - _Requirements: 4.3, 4.4_

- [ ] 7. 设计工坊 - 角色与特效编辑
  - [ ] 7.1 实现角色编辑面板 (CharacterPanel)
    - 创建 `src/modules/designer/components/CharacterPanel.vue`
    - 实现角色创建、动画配置、保存
    - _Requirements: 4.5, 4.6, 4.7_
  - [ ] 7.2 实现特效编辑面板 (EffectPanel)
    - 创建 `src/modules/designer/components/EffectPanel.vue`
    - 实现特效创建、参数配置、保存
    - _Requirements: 5.1-5.5_
  - [ ] 7.3 实现设计器 Store (designer.store)
    - 完善 `src/stores/designer.store.ts`
    - 实现角色、特效、技能的 CRUD 操作
    - _Requirements: 4.5-4.7, 5.1-5.5_

- [ ] 8. 设计工坊 - JSON 配置管理
  - [ ] 8.1 实现配置 Store (config.store)
    - 完善 `src/stores/config.store.ts`
    - 实现序列化、反序列化、localStorage 存储
    - _Requirements: 6.1-6.5, 10.1-10.5_
  - [ ]* 8.2 编写配置往返属性测试
    - **Property 8: 配置数据往返一致性**
    - **Validates: Requirements 6.5, 10.4**
  - [ ]* 8.3 编写数据验证属性测试
    - **Property 14: 数据验证正确性**
    - **Validates: Requirements 6.3, 10.5**
  - [ ] 8.4 实现 JSON 配置面板 (JsonPanel)
    - 创建 `src/modules/designer/components/JsonPanel.vue`
    - 实现导入、导出、验证功能
    - _Requirements: 6.1-6.4_

- [ ] 9. 检查点 - 设计工坊功能验证
  - 确保所有测试通过，如有问题请询问用户

- [ ] 10. 时间轴编辑器 - 核心功能
  - [ ] 10.1 实现时间轴核心逻辑 (useTimeline)
    - 创建 `src/modules/timeline/composables/useTimeline.ts`
    - 实现轨道管理、片段管理、时间计算
    - _Requirements: 7.1-7.8_
  - [ ]* 10.2 编写轨道不重叠属性测试
    - **Property 9: 时间轴轨道不重叠约束**
    - **Validates: Requirements 7.7**
  - [ ] 10.3 实现拖拽逻辑 (useDragDrop)
    - 创建 `src/modules/timeline/composables/useDragDrop.ts`
    - 实现片段拖拽、缩放、吸附
    - _Requirements: 7.3-7.6_
  - [ ]* 10.4 编写片段更新属性测试
    - **Property 10: 片段时间更新正确性**
    - **Validates: Requirements 7.4, 7.5**
  - [ ]* 10.5 编写吸附逻辑属性测试
    - **Property 11: 吸附逻辑正确性**
    - **Validates: Requirements 7.6**

- [ ] 11. 时间轴编辑器 - UI 组件
  - [ ] 11.1 实现时间刻度尺组件 (TimelineRuler)
    - 创建 `src/modules/timeline/components/TimelineRuler.vue`
    - 实现时间刻度显示、缩放
    - _Requirements: 7.1, 9.8_
  - [ ]* 11.2 编写时间轴缩放属性测试
    - **Property 12: 时间轴缩放正确性**
    - **Validates: Requirements 9.8**
  - [ ] 11.3 实现轨道组件 (TimelineTrack)
    - 创建 `src/modules/timeline/components/TimelineTrack.vue`
    - 实现轨道显示、锁定、隐藏
    - _Requirements: 7.2_
  - [ ] 11.4 实现片段组件 (TimelineSegment)
    - 创建 `src/modules/timeline/components/TimelineSegment.vue`
    - 实现片段显示、选中、删除
    - _Requirements: 7.3, 7.8_
  - [ ] 11.5 实现步骤编辑器 (StepEditor)
    - 创建 `src/modules/timeline/components/StepEditor.vue`
    - 实现各类步骤的参数编辑
    - _Requirements: 8.1-8.8_
  - [ ] 11.6 实现时间轴主组件 (Timeline)
    - 创建 `src/modules/timeline/components/Timeline.vue`
    - 整合刻度尺、轨道、片段组件
    - _Requirements: 7.1-7.8_

- [ ] 12. 时间轴编辑器 - 预览功能
  - [ ] 12.1 实现预览播放逻辑 (usePreview)
    - 创建 `src/modules/timeline/composables/usePreview.ts`
    - 实现播放、暂停、跳转
    - _Requirements: 9.1-9.4_
  - [ ]* 12.2 编写预览同步属性测试
    - **Property 13: 预览播放同步正确性**
    - **Validates: Requirements 9.2, 9.3**
  - [ ] 12.3 实现步骤执行器 (StepExecutor)
    - 创建 `src/modules/timeline/core/StepExecutor.ts`
    - 实现移动、伤害、特效、等待、镜头、震动、背景步骤
    - _Requirements: 8.1-8.7_
  - [ ] 12.4 实现预览画布组件
    - 在时间轴编辑器中集成 Phaser 预览画布
    - 实现攻击方/被攻击方配置
    - _Requirements: 9.5-9.7_

- [ ] 13. 检查点 - 时间轴编辑器功能验证
  - 确保所有测试通过，如有问题请询问用户

- [ ] 14. 设计工坊页面整合
  - [ ] 14.1 实现设计工坊主页 (DesignerPage)
    - 创建 `src/modules/designer/pages/DesignerPage.vue`
    - 实现标签页导航
    - _Requirements: 11.2-11.6_
  - [ ] 14.2 实现角色标签页 (CharacterTab)
    - 创建 `src/modules/designer/pages/CharacterTab.vue`
    - 整合雪碧图编辑器和角色面板
    - _Requirements: 4.1-4.8_
  - [ ] 14.3 实现特效标签页 (EffectTab)
    - 创建 `src/modules/designer/pages/EffectTab.vue`
    - 整合雪碧图编辑器和特效面板
    - _Requirements: 5.1-5.5_
  - [ ] 14.4 实现技能标签页 (SkillTab)
    - 创建 `src/modules/designer/pages/SkillTab.vue`
    - 整合时间轴编辑器和预览功能
    - _Requirements: 7.1-9.8_
  - [ ] 14.5 实现 JSON 标签页 (JsonTab)
    - 创建 `src/modules/designer/pages/JsonTab.vue`
    - 整合 JSON 配置面板
    - _Requirements: 6.1-6.5_

- [ ] 15. 最终检查点 - 全功能验证
  - 确保所有测试通过，如有问题请询问用户

## 备注

- 标记 `*` 的任务为可选测试任务，可跳过以加快 MVP 开发
- 每个任务都引用了具体的需求条目以便追溯
- 检查点任务用于阶段性验证，确保增量开发的正确性
- 属性测试使用 fast-check 库，每个测试至少运行 100 次迭代
