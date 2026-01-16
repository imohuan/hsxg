# 实现计划：完善战斗系统

## 概述

本实现计划将设计文档分解为可执行的编码任务，按照模块化方式逐步完善战斗系统，实现角色精灵图渲染、亮色主题、菜单功能和数据联动。

## 任务列表

- [x] 1. 基础工具函数
  - [x] 1.1 创建随机数值生成工具
    - 创建 `src/modules/battle/utils/randomStats.ts`
    - 实现 `generateRandomStats` 函数，生成 HP、MP、速度、攻击、防御、幸运数值
    - 实现 `randomInRange` 辅助函数
    - 定义 `DEFAULT_STATS_RANGE` 常量
    - _Requirements: 8.6, 8.7_
  - [ ]\* 1.2 编写随机数值范围属性测试
    - **Property 4: 随机数值范围正确性**
    - **Validates: Requirements 8.6, 8.7**
  - [x] 1.3 创建角色数据转换工具
    - 创建 `src/modules/battle/composables/useCharacterConverter.ts`
    - 实现 `convertCharacterToBattleUnit` 函数
    - 保留精灵图配置、动画配置和角色名称
    - _Requirements: 7.4, 7.5_
  - [ ]\* 1.4 编写数据转换完整性属性测试
    - **Property 2: 数据转换完整性**
    - **Validates: Requirements 7.4, 7.5**

- [ ] 2. 检查点 - 基础工具验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 3. 亮色主题和菜单优化
  - [x] 3.1 更新战斗画布亮色主题
    - 修改 `src/modules/battle/components/UnifiedBattleCanvas.vue`
    - 将背景色改为亮色（slate-50/slate-200）
    - 将文字改为深色（slate-800）
    - 更新头部信息栏样式
    - _Requirements: 2.1-2.5_
  - [x] 3.2 优化菱形菜单布局
    - 修改 `src/modules/battle/components/DiamondMenu.vue`
    - 增加按钮间距（至少 8px）
    - 确保按钮不会贴在一起
    - _Requirements: 3.1-3.5_
  - [ ]\* 3.3 编写菱形菜单间距属性测试
    - **Property 11: 菱形菜单按钮间距**
    - **Validates: Requirements 3.1**

- [ ] 4. 战斗配置面板
  - [ ] 4.1 创建战斗配置面板组件
    - 创建 `src/modules/battle/components/BattleConfigPanel.vue`
    - 实现我方/敌方角色数量选择（1-6）
    - 显示可用角色预览
    - 实现"开始战斗"按钮
    - _Requirements: 8.1-8.5, 8.8_
  - [ ]\* 4.2 编写角色数量范围属性测试
    - **Property 3: 角色数量范围限制**
    - **Validates: Requirements 8.2, 8.3**

- [ ] 5. 检查点 - 配置面板验证
  - 确保所有测试通过，如有问题请询问用户

- [ ] 6. 精灵图渲染
  - [ ] 6.1 扩展 Canvas 渲染器支持精灵图
    - 修改 `src/modules/battle/composables/useCanvasRenderer.ts`
    - 实现精灵图加载和缓存
    - 实现帧切割逻辑（根据 rows/cols）
    - 实现动画帧播放
    - _Requirements: 1.2, 1.3, 1.5, 1.6_
  - [ ] 6.2 实现占位图渲染
    - 当精灵图缺失时显示带角色名称的占位图
    - 使用圆角矩形和文字
    - _Requirements: 1.4_
  - [ ]\* 6.3 编写精灵图帧切割属性测试
    - **Property 12: 精灵图帧切割正确性**
    - **Validates: Requirements 1.5**

- [ ] 7. 目标选择功能
  - [ ] 7.1 创建目标选择逻辑
    - 创建 `src/modules/battle/composables/useTargetSelection.ts`
    - 实现进入/退出目标选择模式
    - 实现可选目标高亮
    - 实现目标点击选择
    - _Requirements: 4.1-4.6_
  - [ ]\* 7.2 编写攻击行动记录属性测试
    - **Property 5: 攻击行动记录正确性**
    - **Validates: Requirements 4.3**

- [ ] 8. 防御功能
  - [ ] 8.1 实现防御行动逻辑
    - 在战斗流程中添加防御行动处理
    - 记录防御行动到行动队列
    - 自动切换到下一个待操作角色
    - 显示防御状态图标
    - _Requirements: 5.1-5.4_
  - [ ]\* 8.2 编写防御行动处理属性测试
    - **Property 6: 防御行动处理正确性**
    - **Validates: Requirements 5.1, 5.3**

- [ ] 9. 检查点 - 核心功能验证
  - 确保所有测试通过，如有问题请询问用户

- [ ] 10. 招将功能
  - [ ] 10.1 创建招将面板组件
    - 创建 `src/modules/battle/components/SummonPanel.vue`
    - 显示设计工坊中的角色列表
    - 显示角色名称、精灵图预览
    - 实现选择和关闭功能
    - _Requirements: 6.1-6.3, 6.7_
  - [ ] 10.2 实现召唤逻辑
    - 检查我方单位数量限制（最多6个）
    - 将选中角色添加到我方阵营
    - 为新角色生成随机数值
    - _Requirements: 6.4-6.6_
  - [ ]\* 10.3 编写召唤数量限制属性测试
    - **Property 7: 召唤数量限制**
    - **Validates: Requirements 6.4**
  - [ ]\* 10.4 编写召唤后单位增加属性测试
    - **Property 8: 召唤后单位增加**
    - **Validates: Requirements 6.5**

- [ ] 11. 战斗流程控制
  - [ ] 11.1 创建战斗流程控制逻辑
    - 创建 `src/modules/battle/composables/useBattleFlow.ts`
    - 实现配置阶段 -> 操作阶段 -> 执行阶段 -> 结果阶段
    - 实现 60 秒操作倒计时
    - 实现回合数管理
    - _Requirements: 9.1-9.4, 10.1-10.4_
  - [ ]\* 11.2 编写倒计时超时处理属性测试
    - **Property 9: 倒计时超时处理**
    - **Validates: Requirements 9.3**
  - [ ]\* 11.3 编写回合数递增属性测试
    - **Property 10: 回合数递增正确性**
    - **Validates: Requirements 10.4**

- [ ] 12. 检查点 - 战斗流程验证
  - 确保所有测试通过，如有问题请询问用户

- [ ] 13. 数据联动集成
  - [ ] 13.1 集成设计工坊数据
    - 修改 `src/modules/battle/pages/BattlePage.vue`
    - 从 designer.store 读取角色列表
    - 实现角色随机选取逻辑
    - 处理设计工坊为空的情况（使用默认角色）
    - _Requirements: 1.1, 7.1-7.3_
  - [ ]\* 13.2 编写数据加载一致性属性测试
    - **Property 1: 数据加载一致性**
    - **Validates: Requirements 1.1, 7.1, 7.2**

- [ ] 14. 战斗页面重构
  - [ ] 14.1 重构战斗页面
    - 修改 `src/modules/battle/pages/BattlePage.vue`
    - 集成配置面板、战斗画布、招将面板
    - 实现完整的战斗流程
    - 应用亮色主题
    - _Requirements: 全部_
  - [ ] 14.2 实现菜单功能绑定
    - 绑定攻击按钮 -> 目标选择
    - 绑定防御按钮 -> 防御行动
    - 绑定招将按钮 -> 招将面板
    - _Requirements: 4.1, 5.1, 6.1_

- [ ] 15. 最终检查点 - 全功能验证
  - 确保所有测试通过，如有问题请询问用户

## 备注

- 标记 `*` 的任务为可选测试任务，可跳过以加快 MVP 开发
- 每个任务都引用了具体的需求条目以便追溯
- 检查点任务用于阶段性验证，确保增量开发的正确性
- 属性测试使用 fast-check 库，每个测试至少运行 100 次迭代
