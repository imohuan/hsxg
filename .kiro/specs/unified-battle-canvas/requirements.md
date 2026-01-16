# 需求文档：统一战斗画布组件

## 简介

`UnifiedBattleCanvas` 是一个功能完善的游戏 Canvas 渲染组件，支持：

- 战斗场景渲染（单位、血条、菜单）
- 特效预览（雪碧图动画播放）
- 技能编排预览

通过 Props 配置控制显示模式，通过 API 控制角色、特效、相机等。

## 核心设计

### Props 配置

| 属性              | 类型              | 默认值 | 说明                     |
| ----------------- | ----------------- | ------ | ------------------------ |
| config            | BattleSceneConfig | 必填   | 场景配置（单位、背景等） |
| showMenu          | boolean           | false  | 是否显示菱形操作菜单     |
| showUnits         | boolean           | true   | 是否显示单位             |
| showHeader        | boolean           | true   | 是否显示顶部信息栏       |
| enableTransform   | boolean           | false  | 是否启用缩放平移         |
| width             | number            | 800    | 画布宽度                 |
| height            | number            | 500    | 画布高度                 |
| effects           | EffectConfig[]    | []     | 特效配置列表             |
| sounds            | SoundConfig[]     | []     | 音效配置列表             |
| disabledMenuItems | string[]          | []     | 禁用的菜单项             |

### 使用场景

1. **战斗页面**：`showMenu=true, showUnits=true, showHeader=true`
2. **特效编辑**：`showMenu=false, showUnits=false, showHeader=false, enableTransform=true`
3. **技能编排**：`showMenu=false, showUnits=true, enableTransform=true`

## 需求列表

### 需求 1：场景渲染

1.1 支持设置背景颜色或背景图片
1.2 支持渲染敌方单位（左侧）和我方单位（右侧）
1.3 单位使用交错布局，每侧最多 2 列 × 3 行
1.4 单位下方显示速度序号、血条、蓝条
1.5 当前行动单位显示黄色光圈
1.6 被选中单位显示红色边框

### 需求 2：顶部信息栏

2.1 左侧显示敌方玩家名称
2.2 中央显示场景名称和回合信息
2.3 右侧显示我方玩家名称
2.4 可通过 `showHeader` 控制显示/隐藏

### 需求 3：菱形操作菜单

3.1 在画布中央显示菱形排列的操作按钮
3.2 包含：攻击、技能、招降、物品、招将、防御、逃跑
3.3 点击按钮触发 `menuSelect` 事件
3.4 可通过 `showMenu` 控制显示/隐藏
3.5 可通过 `disabledMenuItems` 禁用特定按钮

### 需求 4：缩放平移

4.1 启用时支持鼠标滚轮缩放（0.5x ~ 2.5x）
4.2 启用时支持鼠标拖拽平移
4.3 显示当前缩放比例
4.4 提供重置视图按钮
4.5 可通过 `enableTransform` 控制启用/禁用

### 需求 5：单位点击交互

5.1 点击单位触发 `unitClick` 事件
5.2 点击单位触发 `unitSelect` 事件
5.3 点击空白区域取消选中
5.4 死亡或不可选择的单位不响应点击

## 导出 API

### 角色控制

| 方法                  | 参数                               | 返回值        | 说明               |
| --------------------- | ---------------------------------- | ------------- | ------------------ |
| moveUnit              | unitId, targetX, targetY, options? | Promise<void> | 移动角色到指定位置 |
| playUnitAnimation     | unitId, animationKey               | Promise<void> | 播放角色动画       |
| setUnitPosition       | unitId, x, y                       | void          | 直接设置角色位置   |
| resetUnitPosition     | unitId                             | void          | 重置角色到初始位置 |
| resetAllUnitPositions | -                                  | void          | 重置所有角色位置   |

### 特效控制

| 方法             | 参数                       | 返回值          | 说明               |
| ---------------- | -------------------------- | --------------- | ------------------ |
| playEffect       | effectId, x, y, options?   | Promise<string> | 在指定位置播放特效 |
| playEffectOnUnit | effectId, unitId, options? | Promise<string> | 在角色位置播放特效 |
| stopEffect       | effectInstanceId           | void            | 停止特效           |

### 视角控制

| 方法        | 参数                              | 返回值        | 说明       |
| ----------- | --------------------------------- | ------------- | ---------- |
| shakeCamera | intensity, duration               | Promise<void> | 视角震动   |
| moveCamera  | offsetX, offsetY, duration, ease? | Promise<void> | 视角位移   |
| zoomCamera  | scale, duration, easing?          | Promise<void> | 视角缩放   |
| resetCamera | duration?                         | Promise<void> | 重置视角   |
| focusOnUnit | unitId, duration?                 | Promise<void> | 聚焦到角色 |

### 背景控制

| 方法               | 参数                  | 返回值        | 说明         |
| ------------------ | --------------------- | ------------- | ------------ |
| setBackground      | imageUrl              | Promise<void> | 设置背景图片 |
| setBackgroundColor | color                 | void          | 设置背景颜色 |
| fadeBackground     | targetColor, duration | Promise<void> | 背景渐变     |
| flashScreen        | color, duration       | Promise<void> | 屏幕闪烁     |

### 音效控制

| 方法          | 参数              | 返回值 | 说明         |
| ------------- | ----------------- | ------ | ------------ |
| playSound     | soundId, options? | string | 播放音效     |
| stopSound     | soundInstanceId   | void   | 停止音效     |
| stopAllSounds | -                 | void   | 停止所有音效 |

### 伤害显示

| 方法             | 参数                      | 返回值 | 说明         |
| ---------------- | ------------------------- | ------ | ------------ |
| showDamageNumber | unitId, value, type?      | void   | 显示伤害数字 |
| updateUnitHp     | unitId, currentHp, maxHp? | void   | 更新血量     |
| updateUnitMp     | unitId, currentMp, maxMp? | void   | 更新蓝量     |

### 步骤执行

| 方法                 | 参数  | 返回值        | 说明             |
| -------------------- | ----- | ------------- | ---------------- |
| executeStep          | step  | Promise<void> | 执行单个步骤     |
| executeSteps         | steps | Promise<void> | 顺序执行多个步骤 |
| executeStepsParallel | steps | Promise<void> | 并行执行多个步骤 |

### 选中控制

| 方法          | 参数           | 返回值 | 说明             |
| ------------- | -------------- | ------ | ---------------- |
| setTargetUnit | unitId \| null | void   | 设置目标单位选中 |
| setActiveUnit | unitId \| null | void   | 设置当前行动单位 |
