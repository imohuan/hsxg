# 需求文档

## 简介

完善回合制战斗系统，实现战斗界面与设计工坊的数据联动，统一视觉主题，并实现完整的战斗菜单功能（普通攻击、防御、招将等）。

## 术语表

- **Battle_Canvas**: 战斗画布，渲染战斗场景和角色精灵图
- **Designer_Store**: 设计工坊数据存储，包含角色、特效、技能配置
- **Diamond_Menu**: 菱形操作菜单，包含攻击、技能、招降、物品、招将、防御、逃跑按钮
- **Target_Selection**: 目标选择模式，玩家选择攻击/技能的目标
- **Summon_Panel**: 招将面板，显示可召唤的角色列表
- **Unit_Sprite**: 单位精灵图，使用设计工坊配置的雪碧图渲染角色
- **Light_Theme**: 亮色主题，与设计工坊保持一致的视觉风格

## 需求

### 需求 1：角色精灵图渲染

**用户故事：** 作为玩家，我希望在战斗界面看到设计工坊中配置的角色精灵图，以便获得完整的视觉体验。

#### 验收标准

1. WHEN 战斗界面加载 THEN Battle_Canvas SHALL 从 Designer_Store 读取角色配置数据
2. WHEN 角色配置包含精灵图 THEN Battle_Canvas SHALL 使用该精灵图渲染角色
3. WHEN 角色配置包含动画 THEN Battle_Canvas SHALL 播放角色的待机动画
4. IF 角色配置缺失精灵图 THEN Battle_Canvas SHALL 显示默认占位图（带角色名称）
5. THE Battle_Canvas SHALL 根据精灵图配置的行列数正确切割帧序列
6. THE Battle_Canvas SHALL 根据精灵图配置的 fps 播放动画

### 需求 2：亮色主题统一

**用户故事：** 作为用户，我希望战斗界面与设计工坊使用相同的亮色主题，以便获得一致的视觉体验。

#### 验收标准

1. THE Battle_Canvas SHALL 使用亮色背景（白色或浅灰色）
2. THE Battle_Canvas SHALL 使用深色文字以保证可读性
3. THE Diamond_Menu SHALL 使用与设计工坊一致的配色方案
4. THE 战斗头部信息栏 SHALL 使用亮色背景和深色文字
5. THE 单位信息条 SHALL 使用与亮色主题协调的颜色

### 需求 3：菱形菜单布局优化

**用户故事：** 作为玩家，我希望菱形菜单按钮之间有合适的间距，以便清晰区分和点击。

#### 验收标准

1. THE Diamond_Menu SHALL 在按钮之间保持至少 8px 的间距
2. THE Diamond_Menu SHALL 使用两列交错排列，视觉上形成菱形
3. THE Diamond_Menu SHALL 每个按钮显示图标和文字标签
4. WHEN 鼠标悬停在按钮上 THEN Diamond_Menu SHALL 显示悬停效果
5. THE Diamond_Menu SHALL 支持禁用特定按钮（如无法逃跑时禁用逃跑按钮）

### 需求 4：普通攻击功能

**用户故事：** 作为玩家，我希望点击攻击按钮后能选择攻击目标，以便执行普通攻击。

#### 验收标准

1. WHEN 玩家点击"攻击"按钮 THEN Battle_Canvas SHALL 进入目标选择模式
2. WHEN 进入目标选择模式 THEN Battle_Canvas SHALL 高亮显示所有可选择的敌方单位
3. WHEN 玩家点击敌方单位 THEN Battle_Canvas SHALL 记录攻击行动并退出目标选择模式
4. WHEN 玩家点击空白区域或按 ESC THEN Battle_Canvas SHALL 取消目标选择并返回菜单
5. THE Target_Selection SHALL 在被选中的目标周围显示红色边框
6. THE Target_Selection SHALL 降低不可选择单位的透明度

### 需求 5：防御功能

**用户故事：** 作为玩家，我希望点击防御按钮后角色进入防御状态，以便减少受到的伤害。

#### 验收标准

1. WHEN 玩家点击"防御"按钮 THEN Battle_Canvas SHALL 记录防御行动
2. WHEN 防御行动被记录 THEN Battle_Canvas SHALL 在角色上显示防御图标或效果
3. WHEN 防御行动被记录 THEN Battle_Canvas SHALL 自动切换到下一个待操作角色
4. THE 防御状态 SHALL 在当前回合结束后自动解除

### 需求 6：招将功能

**用户故事：** 作为玩家，我希望点击招将按钮后能从角色列表中选择召唤新角色，以便增加我方战力。

#### 验收标准

1. WHEN 玩家点击"招将"按钮 THEN Battle_Canvas SHALL 显示 Summon_Panel
2. THE Summon_Panel SHALL 显示 Designer_Store 中所有可用角色
3. THE Summon_Panel SHALL 显示每个角色的名称、精灵图预览和基础属性
4. WHEN 我方单位数量已达 6 个 THEN Summon_Panel SHALL 禁用召唤功能并显示提示
5. WHEN 玩家选择角色 THEN Battle_Canvas SHALL 将该角色添加到我方阵营
6. WHEN 角色被召唤 THEN Battle_Canvas SHALL 播放召唤动画效果
7. THE Summon_Panel SHALL 支持关闭返回菜单

### 需求 7：数据联动

**用户故事：** 作为用户，我希望战斗界面自动使用设计工坊中配置的角色数据，以便无需手动配置。

#### 验收标准

1. WHEN 战斗界面初始化 THEN Battle_Canvas SHALL 从 Designer_Store 加载角色列表
2. WHEN Designer_Store 中有角色数据 THEN Battle_Canvas SHALL 使用这些角色作为默认战斗单位
3. IF Designer_Store 为空 THEN Battle_Canvas SHALL 使用预设的默认角色数据
4. THE Battle_Canvas SHALL 将 Designer_Store 中的 CharacterConfig 转换为 BattleUnit
5. THE 转换过程 SHALL 保留精灵图配置、动画配置和角色名称

### 需求 8：战斗初始化配置

**用户故事：** 作为玩家，我希望在开始战斗前能选择双方人物数量，以便自定义战斗规模。

#### 验收标准

1. WHEN 进入战斗界面 THEN Battle_Canvas SHALL 显示战斗配置面板
2. THE 配置面板 SHALL 允许选择我方角色数量（1-6个）
3. THE 配置面板 SHALL 允许选择敌方角色数量（1-6个）
4. WHEN 玩家确认配置 THEN Battle_Canvas SHALL 从 Designer_Store 随机选取指定数量的角色
5. IF Designer_Store 角色数量不足 THEN Battle_Canvas SHALL 使用默认角色补充
6. THE Battle_Canvas SHALL 为每个角色随机生成战斗数值（HP、MP、速度、攻击、防御、幸运）
7. THE 随机数值 SHALL 在合理范围内（如 HP: 80-200, 攻击: 10-50, 速度: 10-30）
8. THE 配置面板 SHALL 显示"开始战斗"按钮

### 需求 9：战斗倒计时显示

**用户故事：** 作为玩家，我希望在操作阶段看到倒计时，以便了解剩余操作时间。

#### 验收标准

1. WHEN 操作阶段开始 THEN Battle_Canvas SHALL 显示 60 秒倒计时
2. THE 倒计时 SHALL 在界面左上角显示，格式为"剩余时间: XX"
3. WHEN 倒计时归零 THEN Battle_Canvas SHALL 为未操作角色自动选择防御
4. THE 倒计时 SHALL 使用醒目的颜色（如红色）当时间少于 10 秒时

### 需求 10：回合信息显示

**用户故事：** 作为玩家，我希望看到当前回合数和当前行动角色，以便了解战斗进度。

#### 验收标准

1. THE Battle_Canvas SHALL 在顶部中央显示当前回合数
2. THE Battle_Canvas SHALL 显示当前行动角色的名称
3. WHEN 角色处于行动状态 THEN Battle_Canvas SHALL 在该角色脚下显示黄色光圈
4. THE 回合信息 SHALL 在每个回合开始时更新
