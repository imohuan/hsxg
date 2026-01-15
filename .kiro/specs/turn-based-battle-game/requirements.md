# 需求文档

## 简介

本项目是一个基于 Vue 3 + TypeScript + Phaser 的回合制游戏系统，包含三大核心模块：
1. **游戏战斗界面** - 回合制战斗系统，支持角色操作、技能释放、战斗动画
2. **设计工坊** - 角色/特效/技能的可视化编辑器，支持雪碧图解析和动画预览
3. **时间轴编排** - 类似 AE 的技能动作编排系统，支持多轨道、拖拽、预览

## 术语表

- **Battle_System**: 战斗系统，管理回合制战斗流程和角色行动
- **Unit**: 战斗单位，包含玩家角色和敌方角色
- **Action**: 战斗行动，包括攻击、技能、物品、防御、逃跑、召唤
- **Action_Queue**: 行动队列，根据速度+幸运排序的待执行行动列表
- **Designer_Workshop**: 设计工坊，用于创建和编辑角色、特效、技能
- **Sprite_Sheet**: 雪碧图，包含多帧动画的图片资源
- **Timeline_Editor**: 时间轴编辑器，用于编排技能动作序列
- **Timeline_Track**: 时间轴轨道，承载时间轴片段的容器
- **Timeline_Segment**: 时间轴片段，表示一个动作步骤的时间范围
- **Skill_Step**: 技能步骤，包括移动、伤害、特效、等待等类型
- **Preview_Player**: 预览播放器，用于实时预览编排效果

## 需求

### 需求 1：战斗界面初始化

**用户故事：** 作为玩家，我希望进入战斗时能看到双方阵营的角色布局，以便了解战斗态势。

#### 验收标准

1. WHEN 战斗场景加载完成 THEN Battle_System SHALL 在画布左侧显示玩家阵营（最多6个角色）
2. WHEN 战斗场景加载完成 THEN Battle_System SHALL 在画布右侧显示敌方阵营
3. WHEN 角色被渲染 THEN Battle_System SHALL 显示角色名称、生命值条、魔法值条
4. WHEN 角色精灵图加载完成 THEN Battle_System SHALL 播放角色待机动画
5. IF 角色配置缺失 THEN Battle_System SHALL 使用默认占位图并记录警告日志

### 需求 2：回合操作阶段

**用户故事：** 作为玩家，我希望在操作阶段能为每个我方角色选择行动，以便制定战斗策略。

#### 验收标准

1. WHEN 操作阶段开始 THEN Battle_System SHALL 按从上到下顺序依次激活每个我方角色
2. WHEN 角色被激活 THEN Battle_System SHALL 显示操作菜单（攻击、技能、物品、防御、逃跑、召唤）
3. WHEN 玩家选择"攻击" THEN Battle_System SHALL 进入目标选择模式，高亮可选敌方角色
4. WHEN 玩家选择"技能" THEN Battle_System SHALL 显示该角色可用技能列表
5. WHEN 技能被选中 THEN Battle_System SHALL 根据技能配置决定目标选择方式（自由选择/随机/多目标）
6. WHEN 玩家选择"物品" THEN Battle_System SHALL 显示背包中可用物品列表
7. WHEN 玩家选择"防御" THEN Battle_System SHALL 记录防御行动并进入下一角色
8. WHEN 玩家选择"逃跑" THEN Battle_System SHALL 计算逃跑成功率并记录行动
9. WHEN 玩家选择"召唤" THEN Battle_System SHALL 显示可召唤角色列表（总数不超过6个）
10. WHILE 操作阶段进行中 THEN Battle_System SHALL 显示60秒倒计时
11. IF 操作时间耗尽 THEN Battle_System SHALL 为未操作角色自动选择防御

### 需求 3：战斗执行阶段

**用户故事：** 作为玩家，我希望看到双方角色按速度顺序执行行动，以便体验战斗过程。

#### 验收标准

1. WHEN 操作阶段结束 THEN Battle_System SHALL 收集所有角色的 Action 生成 Action_Queue
2. WHEN 生成 Action_Queue THEN Battle_System SHALL 按（速度 + 幸运）降序排列行动顺序
3. WHEN 执行攻击行动 THEN Battle_System SHALL 播放攻击者的攻击动画
4. WHEN 攻击动画播放完成 THEN Battle_System SHALL 在目标位置播放受击特效
5. WHEN 伤害计算完成 THEN Battle_System SHALL 在目标头顶显示伤害数字（红色减血/绿色加血）
6. WHEN 角色生命值归零 THEN Battle_System SHALL 播放死亡动画并将角色标记为不可行动
7. WHEN Action_Queue 执行完毕 THEN Battle_System SHALL 检查胜负条件
8. IF 一方全灭 THEN Battle_System SHALL 显示战斗结果并结束战斗
9. IF 双方均有存活 THEN Battle_System SHALL 进入下一回合操作阶段

### 需求 4：设计工坊 - 角色编辑

**用户故事：** 作为设计师，我希望能导入雪碧图并配置角色动画，以便创建游戏角色。

#### 验收标准

1. WHEN 用户上传雪碧图 THEN Designer_Workshop SHALL 显示图片预览和网格配置面板
2. WHEN 用户设置行列数 THEN Designer_Workshop SHALL 自动切割雪碧图为帧序列
3. WHEN 帧序列生成完成 THEN Designer_Workshop SHALL 在预览区播放动画
4. WHEN 用户调整帧率 THEN Designer_Workshop SHALL 实时更新动画播放速度
5. WHEN 用户点击"添加动画" THEN Designer_Workshop SHALL 创建新的动画配置条目
6. WHEN 用户保存角色 THEN Designer_Workshop SHALL 生成包含所有动画的 CharacterConfig JSON
7. THE Designer_Workshop SHALL 支持为同一角色配置多个动画（待机、攻击、受击、死亡等）
8. THE Designer_Workshop SHALL 预留 Spine 动画扩展接口

### 需求 5：设计工坊 - 特效编辑

**用户故事：** 作为设计师，我希望能创建和编辑技能特效动画，以便丰富战斗表现。

#### 验收标准

1. WHEN 用户上传特效雪碧图 THEN Designer_Workshop SHALL 解析并显示帧预览
2. WHEN 用户配置特效参数 THEN Designer_Workshop SHALL 实时预览特效动画
3. WHEN 用户保存特效 THEN Designer_Workshop SHALL 生成 EffectConfig JSON
4. THE Designer_Workshop SHALL 支持配置特效的缩放、旋转、透明度
5. THE Designer_Workshop SHALL 支持特效循环播放或单次播放模式

### 需求 6：设计工坊 - JSON 配置管理

**用户故事：** 作为设计师，我希望能导出和导入配置数据，以便在战斗系统中使用。

#### 验收标准

1. WHEN 用户点击"导出配置" THEN Designer_Workshop SHALL 生成包含所有角色、特效、技能的 JSON 文件
2. WHEN 用户导入 JSON 配置 THEN Designer_Workshop SHALL 解析并加载所有配置数据
3. WHEN 配置数据加载完成 THEN Designer_Workshop SHALL 验证数据完整性并报告错误
4. THE Designer_Workshop SHALL 支持配置数据的版本管理
5. FOR ALL 有效的配置 JSON，导出后再导入 SHALL 产生等价的配置对象（往返一致性）

### 需求 7：时间轴编辑器 - 基础功能

**用户故事：** 作为设计师，我希望能在时间轴上编排技能动作序列，以便创建复杂的技能效果。

#### 验收标准

1. WHEN 时间轴编辑器加载 THEN Timeline_Editor SHALL 显示时间刻度尺和轨道区域
2. WHEN 用户添加轨道 THEN Timeline_Editor SHALL 创建新的 Timeline_Track
3. WHEN 用户拖拽步骤到轨道 THEN Timeline_Editor SHALL 创建对应的 Timeline_Segment
4. WHEN 用户拖拽片段 THEN Timeline_Editor SHALL 更新片段的起始时间
5. WHEN 用户调整片段边缘 THEN Timeline_Editor SHALL 更新片段的持续时间
6. WHEN 片段接近其他片段边缘 THEN Timeline_Editor SHALL 显示吸附辅助线
7. THE Timeline_Editor SHALL 防止同一轨道上的片段重叠
8. WHEN 用户删除片段 THEN Timeline_Editor SHALL 从轨道移除该片段

### 需求 8：时间轴编辑器 - 步骤类型

**用户故事：** 作为设计师，我希望能使用多种步骤类型编排技能，以便实现丰富的战斗效果。

#### 验收标准

1. THE Timeline_Editor SHALL 支持"移动"步骤（配置目标坐标、持续时间、缓动函数）
2. THE Timeline_Editor SHALL 支持"伤害"步骤（配置伤害值、目标选择）
3. THE Timeline_Editor SHALL 支持"特效"步骤（配置特效资源、播放位置）
4. THE Timeline_Editor SHALL 支持"等待"步骤（配置等待时长）
5. THE Timeline_Editor SHALL 支持"背景修改"步骤（配置背景颜色/图片）
6. THE Timeline_Editor SHALL 支持"视口移动"步骤（配置镜头位置、缩放）
7. THE Timeline_Editor SHALL 支持"震动"步骤（配置震动强度、持续时间）
8. WHEN 用户选中片段 THEN Timeline_Editor SHALL 显示该步骤类型的参数编辑面板

### 需求 9：时间轴编辑器 - 预览功能

**用户故事：** 作为设计师，我希望能实时预览编排效果，以便调整和优化技能表现。

#### 验收标准

1. WHEN 用户点击播放 THEN Preview_Player SHALL 从当前时间点开始执行编排序列
2. WHEN 用户拖拽时间指示器 THEN Preview_Player SHALL 跳转到对应时间点并更新画面
3. WHEN 预览播放中 THEN Preview_Player SHALL 同步更新时间指示器位置
4. WHEN 用户点击暂停 THEN Preview_Player SHALL 停止播放并保持当前状态
5. THE Preview_Player SHALL 在预览窗口显示攻击方和被攻击方角色
6. THE Preview_Player SHALL 支持配置被攻击方数量
7. THE Preview_Player SHALL 支持画布缩放和平移操作
8. WHEN 用户按 Ctrl+滚轮 THEN Timeline_Editor SHALL 缩放时间轴显示比例

### 需求 10：数据持久化

**用户故事：** 作为用户，我希望我的设计数据能被保存和加载，以便持续编辑和使用。

#### 验收标准

1. WHEN 用户保存项目 THEN Battle_System SHALL 将所有配置序列化为 JSON
2. WHEN 用户加载项目 THEN Battle_System SHALL 反序列化 JSON 并恢复所有配置
3. THE Battle_System SHALL 使用 localStorage 存储项目数据
4. FOR ALL 有效的项目数据，序列化后再反序列化 SHALL 产生等价的数据对象（往返一致性）
5. IF 加载的数据格式无效 THEN Battle_System SHALL 显示错误提示并保持当前状态

### 需求 11：路由与导航

**用户故事：** 作为用户，我希望能在不同功能模块间便捷切换，以便高效使用系统。

#### 验收标准

1. THE Router SHALL 提供"/battle"路由访问战斗界面
2. THE Router SHALL 提供"/designer"路由访问设计工坊
3. THE Router SHALL 提供"/designer/character"子路由访问角色编辑
4. THE Router SHALL 提供"/designer/effect"子路由访问特效编辑
5. THE Router SHALL 提供"/designer/skill"子路由访问技能编排
6. THE Router SHALL 提供"/designer/json"子路由访问 JSON 配置
7. WHEN 用户刷新页面 THEN Router SHALL 恢复到当前路由状态
