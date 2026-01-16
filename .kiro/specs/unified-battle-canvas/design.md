# 设计文档：统一战斗画布组件

## 架构

```
UnifiedBattleCanvas.vue
├── Props
│   ├── gameData: GameData          # 完整游戏数据
│   ├── width / height              # 画布尺寸
│   ├── enableTransform             # 缩放平移开关
│   └── showUnits / debug           # 显示控制
├── Emits
│   ├── unit:click / hover / select # 单位交互
│   ├── canvas:click / ready        # 画布事件
│   ├── animation:start / end       # 动画事件
│   └── unit:hp-change / death      # 状态事件
├── Slots
│   ├── overlay                     # 覆盖层（菜单等）
│   ├── header / footer             # 顶部/底部信息
│   └── unit-info                   # 单位信息悬浮框
├── Composables
│   ├── useCanvasRenderer           # 渲染背景、单位、伤害数字
│   ├── useUnitManager              # 单位位置、动画、HP/MP
│   ├── useCameraController         # 缩放、平移、震动
│   ├── useEffectManager            # 特效播放
│   └── useAudioManager             # 音效播放
└── Core
    └── StepExecutor                # 步骤执行器
```

## 目录结构

```
src/modules/battle/
├── components/
│   └── UnifiedBattleCanvas.vue     # 主组件
├── composables/
│   ├── useCanvasRenderer.ts
│   ├── useUnitManager.ts
│   ├── useCameraController.ts
│   ├── useEffectManager.ts
│   ├── useAudioManager.ts
│   └── useStaggeredLayout.ts
└── core/
    ├── StepExecutor.ts
    └── EasingFunctions.ts
```

## 类型定义

所有类型定义在 `src/types/index.ts`：

```typescript
// ============ 游戏数据 ============

interface GameData {
  scene: SceneConfig;
  players: { enemy: PlayerInfo; self: PlayerInfo };
  units: BattleUnit[];
  effects: EffectConfig[];
  sounds: SoundConfig[];
  skills: SkillConfig[];
  items: ItemConfig[];
  turn?: TurnInfo;
}

interface SceneConfig {
  name: string;
  backgroundUrl?: string;
  backgroundColor?: string;
}

interface PlayerInfo {
  id: string;
  name: string;
  avatar?: string;
}

interface TurnInfo {
  number: number;
  activeUnitId?: string;
  phase: "command" | "execute" | "result";
}

// ============ 组件类型 ============

interface UnifiedBattleCanvasProps {
  gameData: GameData;
  width?: number;
  height?: number;
  enableTransform?: boolean;
  showUnits?: boolean;
  debug?: boolean;
}

interface UnifiedBattleCanvasEmits {
  "unit:click": [payload: { unit: BattleUnit; position: Point }];
  "unit:hover": [payload: { unit: BattleUnit | null }];
  "unit:select": [payload: { unit: BattleUnit | null }];
  "canvas:click": [payload: { position: Point }];
  "canvas:ready": [];
  "animation:start": [payload: { type: string; unitId?: string }];
  "animation:end": [payload: { type: string; unitId?: string }];
  "effect:start": [payload: { effectId: string; instanceId: string }];
  "effect:end": [payload: { effectId: string; instanceId: string }];
  "unit:hp-change": [payload: { unitId: string; oldHp: number; newHp: number }];
  "unit:mp-change": [payload: { unitId: string; oldMp: number; newMp: number }];
  "unit:death": [payload: { unitId: string }];
  "camera:change": [payload: { scale: number; offset: Point }];
}

interface UnifiedBattleCanvasExpose {
  // 渲染控制
  render(): void;
  getContext(): CanvasRenderingContext2D | null;
  getCanvasSize(): { width: number; height: number };

  // 单位控制
  moveUnit(unitId: string, targetX: number, targetY: number, options?: MoveOptions): Promise<void>;
  setUnitPosition(unitId: string, x: number, y: number): void;
  resetUnitPosition(unitId: string): void;
  resetAllUnitPositions(): void;
  playUnitAnimation(unitId: string, animationKey: string): Promise<void>;
  setUnitActive(unitId: string | null): void;
  setUnitSelected(unitId: string | null): void;
  getUnitPosition(unitId: string): Point | null;
  getUnitAtPosition(x: number, y: number): BattleUnit | null;

  // 特效控制
  playEffect(effectId: string, x: number, y: number, options?: EffectOptions): Promise<string>;
  playEffectOnUnit(effectId: string, unitId: string, options?: EffectOptions): Promise<string>;
  stopEffect(instanceId: string): void;
  stopAllEffects(): void;

  // 相机控制
  shakeCamera(intensity: number, duration: number): Promise<void>;
  moveCamera(
    offsetX: number,
    offsetY: number,
    duration: number,
    easing?: EasingType,
  ): Promise<void>;
  zoomCamera(scale: number, duration: number, easing?: EasingType): Promise<void>;
  resetCamera(duration?: number): Promise<void>;
  focusOnUnit(unitId: string, duration?: number): Promise<void>;
  getCameraState(): CameraState;

  // 背景控制
  setBackground(imageUrl: string): Promise<void>;
  setBackgroundColor(color: string): void;
  flashScreen(color: string, duration: number): Promise<void>;

  // 数值显示
  showDamageNumber(unitId: string, value: number, type?: DamageType): void;
  showFloatingText(x: number, y: number, text: string, options?: FloatingTextOptions): void;
  updateUnitHp(unitId: string, currentHp: number, maxHp?: number): void;
  updateUnitMp(unitId: string, currentMp: number, maxMp?: number): void;

  // 音效控制
  playSound(soundId: string, options?: SoundOptions): string;
  stopSound(instanceId: string): void;
  stopAllSounds(): void;

  // 步骤执行
  executeStep(step: SkillStep): Promise<void>;
  executeSteps(steps: SkillStep[]): Promise<void>;
  executeStepsParallel(steps: SkillStep[]): Promise<void>;
}
```

## 使用示例

### 战斗页面

```vue
<template>
  <UnifiedBattleCanvas
    ref="canvasRef"
    :game-data="gameData"
    @unit:click="handleUnitClick"
    @unit:hover="handleUnitHover"
  >
    <template #header="{ scene, players, turn }">
      <BattleHeader :scene="scene" :players="players" :turn="turn" />
    </template>

    <template #overlay="{ canvasSize }">
      <DiamondMenu
        v-if="phase === 'command'"
        :center-x="canvasSize.width / 2"
        :center-y="canvasSize.height / 2"
        @select="handleMenuSelect"
      />
    </template>

    <template #unit-info="{ unit, position }">
      <UnitInfoPopup v-if="unit" :unit="unit" :position="position" />
    </template>
  </UnifiedBattleCanvas>
</template>

<script setup lang="ts">
import { ref } from "vue";
import UnifiedBattleCanvas from "@/modules/battle/components/UnifiedBattleCanvas.vue";
import BattleHeader from "./BattleHeader.vue";
import DiamondMenu from "./DiamondMenu.vue";
import UnitInfoPopup from "./UnitInfoPopup.vue";
import type { BattleUnit, Point } from "@/types";

const canvasRef = ref<InstanceType<typeof UnifiedBattleCanvas>>();
const phase = ref<"command" | "execute">("command");

function handleUnitClick({ unit, position }: { unit: BattleUnit; position: Point }) {
  console.log("点击单位:", unit.name, position);
  canvasRef.value?.setUnitSelected(unit.id);
}

function handleUnitHover({ unit }: { unit: BattleUnit | null }) {
  // 显示/隐藏单位信息
}

function handleMenuSelect(action: string) {
  console.log("选择操作:", action);
}
</script>
```

### 特效编辑页面

```vue
<template>
  <UnifiedBattleCanvas
    ref="canvasRef"
    :game-data="emptyGameData"
    :show-units="false"
    :enable-transform="true"
    @canvas:ready="onCanvasReady"
  >
    <template #overlay>
      <div class="absolute bottom-4 left-4">
        <button @click="playCurrentEffect">播放特效</button>
      </div>
    </template>
  </UnifiedBattleCanvas>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { GameData } from "@/types";

const canvasRef = ref();
const currentEffectId = ref("fire_blast");

const emptyGameData = computed<GameData>(() => ({
  scene: { name: "特效预览", backgroundColor: "#1a1a2e" },
  players: { enemy: { id: "", name: "" }, self: { id: "", name: "" } },
  units: [],
  effects: designerStore.effects,
  sounds: [],
  skills: [],
  items: [],
}));

function playCurrentEffect() {
  canvasRef.value?.playEffect(currentEffectId.value, 400, 300, { scale: 2 });
}
</script>
```

### 技能编排预览

```vue
<template>
  <UnifiedBattleCanvas
    ref="canvasRef"
    :game-data="previewData"
    :enable-transform="true"
    @animation:end="onAnimationEnd"
  >
    <template #footer>
      <TimelineControls :steps="skillSteps" @play="executeAllSteps" @step="executeNextStep" />
    </template>
  </UnifiedBattleCanvas>
</template>

<script setup lang="ts">
const canvasRef = ref();

async function executeAllSteps() {
  await canvasRef.value?.executeSteps(skillSteps.value);
}

async function executeNextStep(step: SkillStep) {
  await canvasRef.value?.executeStep(step);
}
</script>
```
