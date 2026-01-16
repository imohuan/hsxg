# 需求文档

## 简介

重构统一的战斗画布组件，使游戏战斗界面和技能编排预览共用同一个画布组件。画布需要符合经典回合制游戏的视觉风格：左右两侧交错站位、中间菱形操作菜单、角色下方显示速度序号和血蓝条。

## 术语表

- **Unified_Battle_Canvas**: 统一战斗画布组件，可在游戏战斗和技能编排中复用
- **Staggered_Layout**: 交错布局，左右两侧角色按行交错排列
- **Diamond_Menu**: 菱形菜单，中间显示的操作按钮（攻击、技能、招降、物品、招将、防御、逃跑）
- **Unit_Info_Bar**: 单位信息条，显示速度序号、血条、蓝条
- **Battle_Header**: 战斗头部，显示场景名称和双方玩家名称
- **Canvas_Transform**: 画布变换，支持缩放和平移操作

## 需求

### 需求 1：统一画布组件架构

**用户故事：** 作为开发者，我希望游戏战斗和技能编排共用同一个画布组件，以便减少代码重复和维护成本。

#### 验收标准

1. THE Unified_Battle_Canvas SHALL 接受 JSON 配置数据（角色、特效、技能编排）作为输入
2. THE Unified_Battle_Canvas SHALL 提供 `showMenu` 配置项控制菱形菜单的显示
3. THE Unified_Battle_Canvas SHALL 提供 `enableTransform` 配置项控制画布缩放平移功能
4. THE Unified_Battle_Canvas SHALL 提供 slot 插槽用于自定义菜单内容
5. WHEN 在游戏战斗中使用 THEN Unified_Battle_Canvas SHALL 显示菱形菜单
6. WHEN 在技能编排中使用 THEN Unified_Battle_Canvas SHALL 隐藏菱形菜单

### 需求 2：战斗头部信息栏

**用户故事：** 作为玩家，我希望在战斗界面顶部看到场景名称和双方玩家名称，以便了解当前战斗信息。

#### 验收标准

1. THE Battle_Header SHALL 在顶部中央显示场景/关卡名称
2. THE Battle_Header SHALL 在左侧显示敌方玩家名称
3. THE Battle_Header SHALL 在右侧显示我方玩家名称
4. THE Battle_Header SHALL 在中央显示当前行动角色名称和回合信息
5. WHEN 配置数据包含场景名称 THEN Battle_Header SHALL 显示该名称
6. IF 场景名称未配置 THEN Battle_Header SHALL 显示默认文本"战斗"

### 需求 3：交错站位布局

**用户故事：** 作为玩家，我希望看到左右两侧角色交错排列，以便清晰区分敌我双方。

#### 验收标准

1. THE Staggered_Layout SHALL 将敌方单位显示在画布左侧
2. THE Staggered_Layout SHALL 将我方单位显示在画布右侧
3. THE Staggered_Layout SHALL 使用两列布局，每列最多容纳 3 个单位
4. THE Staggered_Layout SHALL 对两列应用相反的 Y 轴偏移实现交错效果
5. WHEN 单位数量为奇数 THEN Staggered_Layout SHALL 将多余单位放置在第一列
6. FOR ALL 单位位置，左侧列的 Y 坐标应与右侧列的 Y 坐标交错排列

### 需求 4：单位信息显示

**用户故事：** 作为玩家，我希望在每个角色下方看到速度序号、血条和蓝条，以便了解角色状态。

#### 验收标准

1. THE Unit_Info_Bar SHALL 在单位精灵下方显示速度排序序号
2. THE Unit_Info_Bar SHALL 显示血量条（红色）
3. THE Unit_Info_Bar SHALL 显示蓝量条（蓝色）
4. THE Unit_Info_Bar SHALL 显示当前值/最大值的数字
5. WHEN 血量低于 30% THEN Unit_Info_Bar SHALL 将血条颜色变为深红色
6. WHEN 单位死亡 THEN Unit_Info_Bar SHALL 将血条显示为空

### 需求 5：菱形操作菜单

**用户故事：** 作为玩家，我希望在画布中央看到菱形排列的操作按钮，以便快速选择战斗行动。

#### 验收标准

1. THE Diamond_Menu SHALL 在画布中央显示菱形排列的操作按钮
2. THE Diamond_Menu SHALL 包含以下按钮：攻击、技能、招降、物品、招将、防御、逃跑
3. THE Diamond_Menu SHALL 使用 45 度旋转的方形按钮实现菱形效果
4. THE Diamond_Menu SHALL 按两列交错排列按钮
5. WHEN 玩家点击按钮 THEN Diamond_Menu SHALL 触发对应的操作事件
6. WHEN showMenu 为 false THEN Diamond_Menu SHALL 完全隐藏

### 需求 6：画布缩放平移

**用户故事：** 作为设计师，我希望能够缩放和平移画布，以便查看技能效果的细节。

#### 验收标准

1. WHEN enableTransform 为 true THEN Canvas_Transform SHALL 支持鼠标滚轮缩放
2. WHEN enableTransform 为 true THEN Canvas_Transform SHALL 支持鼠标拖拽平移
3. THE Canvas_Transform SHALL 限制缩放范围在 0.5x 到 2.5x 之间
4. THE Canvas_Transform SHALL 提供重置视图按钮
5. THE Canvas_Transform SHALL 在右上角显示当前缩放比例
6. WHEN enableTransform 为 false THEN Canvas_Transform SHALL 禁用缩放平移功能

### 需求 7：角色选中高亮

**用户故事：** 作为玩家，我希望当前行动角色有明显的高亮效果，以便知道轮到谁行动。

#### 验收标准

1. WHEN 角色处于行动状态 THEN Unified_Battle_Canvas SHALL 在角色脚下显示黄色光圈
2. WHEN 角色被选为目标 THEN Unified_Battle_Canvas SHALL 在角色周围显示红色边框
3. THE Unified_Battle_Canvas SHALL 支持点击角色进行选择
4. WHEN 角色不可选择 THEN Unified_Battle_Canvas SHALL 降低角色透明度

### 需求 8：数据驱动渲染

**用户故事：** 作为开发者，我希望画布完全由 JSON 数据驱动，以便灵活配置战斗场景。

#### 验收标准

1. THE Unified_Battle_Canvas SHALL 接受 BattleSceneConfig 类型的配置对象
2. THE BattleSceneConfig SHALL 包含场景信息（名称、背景）
3. THE BattleSceneConfig SHALL 包含双方玩家信息（名称）
4. THE BattleSceneConfig SHALL 包含单位列表（敌方和我方）
5. WHEN 配置数据更新 THEN Unified_Battle_Canvas SHALL 重新渲染画布
6. FOR ALL 有效的 BattleSceneConfig，渲染结果应与配置数据一致

### 需求 9：角色控制 API

**用户故事：** 作为设计师，我希望能通过 API 控制角色的移动和动画，以便在技能编排中实现复杂的战斗效果。

#### 验收标准

1. THE Unified_Battle_Canvas SHALL 导出 `moveUnit(unitId, targetX, targetY, duration, easing)` 方法控制角色移动
2. THE Unified_Battle_Canvas SHALL 导出 `playUnitAnimation(unitId, animationKey)` 方法播放角色动画
3. THE Unified_Battle_Canvas SHALL 导出 `setUnitPosition(unitId, x, y)` 方法直接设置角色位置
4. THE Unified_Battle_Canvas SHALL 导出 `resetUnitPosition(unitId)` 方法将角色重置到初始位置
5. THE moveUnit 方法 SHALL 返回 Promise，在移动完成后 resolve
6. THE playUnitAnimation 方法 SHALL 支持 idle、attack、hit、death、skill 等动画类型
7. WHEN 动画播放完成 THEN playUnitAnimation SHALL 返回的 Promise resolve

### 需求 10：特效播放 API

**用户故事：** 作为设计师，我希望能通过 API 在指定位置播放特效，以便实现技能的视觉效果。

#### 验收标准

1. THE Unified_Battle_Canvas SHALL 导出 `playEffect(effectId, x, y, options)` 方法播放特效
2. THE Unified_Battle_Canvas SHALL 导出 `playEffectOnUnit(effectId, unitId, options)` 方法在角色位置播放特效
3. THE playEffect 方法 SHALL 支持配置特效的缩放、旋转、透明度
4. THE playEffect 方法 SHALL 返回 Promise，在特效播放完成后 resolve
5. THE Unified_Battle_Canvas SHALL 导出 `stopEffect(effectInstanceId)` 方法停止正在播放的特效
6. WHEN 特效为循环播放模式 THEN playEffect SHALL 返回特效实例 ID 用于后续停止

### 需求 11：视角控制 API

**用户故事：** 作为设计师，我希望能通过 API 控制画布视角，以便实现镜头特效。

#### 验收标准

1. THE Unified_Battle_Canvas SHALL 导出 `shakeCamera(intensity, duration)` 方法实现视角震动
2. THE Unified_Battle_Canvas SHALL 导出 `moveCamera(offsetX, offsetY, duration, easing)` 方法实现视角位移
3. THE Unified_Battle_Canvas SHALL 导出 `zoomCamera(scale, duration, easing)` 方法实现视角缩放
4. THE Unified_Battle_Canvas SHALL 导出 `resetCamera(duration)` 方法重置视角到初始状态
5. THE Unified_Battle_Canvas SHALL 导出 `focusOnUnit(unitId, duration)` 方法将视角聚焦到指定角色
6. ALL 视角控制方法 SHALL 返回 Promise，在动画完成后 resolve

### 需求 12：背景控制 API

**用户故事：** 作为设计师，我希望能通过 API 控制战斗背景，以便实现场景切换效果。

#### 验收标准

1. THE Unified_Battle_Canvas SHALL 导出 `setBackground(imageUrl)` 方法设置背景图片
2. THE Unified_Battle_Canvas SHALL 导出 `setBackgroundColor(color)` 方法设置背景颜色
3. THE Unified_Battle_Canvas SHALL 导出 `fadeBackground(targetColor, duration)` 方法实现背景渐变
4. THE Unified_Battle_Canvas SHALL 导出 `flashScreen(color, duration)` 方法实现屏幕闪烁效果
5. WHEN 背景切换时 THEN Unified_Battle_Canvas SHALL 支持淡入淡出过渡效果

### 需求 13：音效控制 API

**用户故事：** 作为设计师，我希望能通过 API 播放音效，以便配合技能效果增强战斗体验。

#### 验收标准

1. THE Unified_Battle_Canvas SHALL 导出 `playSound(soundId, options)` 方法播放音效
2. THE playSound 方法 SHALL 支持配置音量、循环、播放速率
3. THE Unified_Battle_Canvas SHALL 导出 `stopSound(soundInstanceId)` 方法停止音效
4. THE Unified_Battle_Canvas SHALL 导出 `stopAllSounds()` 方法停止所有音效
5. WHEN 音效为循环模式 THEN playSound SHALL 返回音效实例 ID 用于后续停止

### 需求 14：伤害显示 API

**用户故事：** 作为设计师，我希望能通过 API 显示伤害数字，以便在技能命中时展示伤害效果。

#### 验收标准

1. THE Unified_Battle_Canvas SHALL 导出 `showDamageNumber(unitId, value, type)` 方法显示伤害数字
2. THE showDamageNumber 方法 SHALL 支持 damage（红色）、heal（绿色）、miss（灰色）类型
3. THE 伤害数字 SHALL 从角色头顶弹出并向上飘动后消失
4. THE Unified_Battle_Canvas SHALL 导出 `updateUnitHp(unitId, currentHp, maxHp)` 方法更新血条显示
5. THE Unified_Battle_Canvas SHALL 导出 `updateUnitMp(unitId, currentMp, maxMp)` 方法更新蓝条显示

### 需求 15：批量执行与时间轴集成

**用户故事：** 作为设计师，我希望能批量执行多个效果或按时间轴顺序执行，以便实现复杂的技能编排。

#### 验收标准

1. THE Unified_Battle_Canvas SHALL 导出 `executeStep(step)` 方法执行单个技能步骤
2. THE executeStep 方法 SHALL 支持 move、damage、effect、wait、camera、shake、background 步骤类型
3. THE Unified_Battle_Canvas SHALL 导出 `executeSteps(steps)` 方法按顺序执行多个步骤
4. THE Unified_Battle_Canvas SHALL 导出 `executeStepsParallel(steps)` 方法并行执行多个步骤
5. THE executeStep 方法 SHALL 返回 Promise，在步骤执行完成后 resolve
6. WHEN 执行 wait 步骤 THEN Unified_Battle_Canvas SHALL 等待指定时长后继续
