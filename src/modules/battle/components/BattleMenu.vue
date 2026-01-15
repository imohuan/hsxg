<script setup lang="ts">
/**
 * @file 战斗操作菜单组件
 * 实现攻击、技能、物品、防御、逃跑、召唤菜单
 * Requirements: 2.2-2.9
 */
import { ref, computed } from "vue";
import type { ActionType, UnitConfig } from "@/types";

// ============ 类型定义 ============

/** 菜单项 */
interface MenuItem {
  type: ActionType;
  label: string;
  icon: string;
  disabled?: boolean;
}

/** 技能项 */
interface SkillItem {
  id: string;
  name: string;
  mpCost: number;
  description?: string;
}

/** 物品项 */
interface ItemEntry {
  id: string;
  name: string;
  count: number;
  description?: string;
}

/** 召唤项 */
interface SummonItem {
  id: string;
  name: string;
  description?: string;
}

// ============ Props & Emits ============

const props = defineProps<{
  /** 当前操作角色 */
  currentActor?: UnitConfig;
  /** 可选目标列表 */
  targets?: UnitConfig[];
  /** 技能列表 */
  skills?: SkillItem[];
  /** 物品列表 */
  items?: ItemEntry[];
  /** 可召唤角色列表 */
  summons?: SummonItem[];
  /** 当前队伍人数 */
  teamSize?: number;
  /** 是否禁用 */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  /** 选择行动 */
  action: [type: ActionType, targetId?: string, skillId?: string, itemId?: string];
  /** 取消选择 */
  cancel: [];
}>();

// ============ 状态 ============

/** 当前菜单层级: main | target | skill | item | summon */
type MenuLevel = "main" | "target" | "skill" | "item" | "summon";
const menuLevel = ref<MenuLevel>("main");

/** 当前选择的行动类型 */
const selectedAction = ref<ActionType | null>(null);

/** 当前选择的技能/物品 ID */
const selectedSkillId = ref<string | null>(null);
const selectedItemId = ref<string | null>(null);

// ============ 计算属性 ============

/** 主菜单项 */
const mainMenuItems = computed<MenuItem[]>(() => [
  { type: "attack", label: "攻击", icon: "⚔️" },
  { type: "skill", label: "技能", icon: "✨", disabled: !props.skills?.length },
  { type: "item", label: "物品", icon: "🎒", disabled: !props.items?.length },
  { type: "defend", label: "防御", icon: "🛡️" },
  { type: "escape", label: "逃跑", icon: "🏃" },
  {
    type: "summon",
    label: "召唤",
    icon: "📜",
    disabled: !props.summons?.length || (props.teamSize ?? 0) >= 6,
  },
]);

/** 是否显示返回按钮 */
const showBackButton = computed(() => menuLevel.value !== "main");

/** 菜单标题 */
const menuTitle = computed(() => {
  switch (menuLevel.value) {
    case "main":
      return props.currentActor?.name ?? "选择行动";
    case "target":
      return "选择目标";
    case "skill":
      return "选择技能";
    case "item":
      return "选择物品";
    case "summon":
      return "选择召唤";
    default:
      return "";
  }
});

// ============ 方法 ============

/** 选择主菜单项 */
function selectMainAction(item: MenuItem): void {
  if (item.disabled || props.disabled) return;

  selectedAction.value = item.type;

  switch (item.type) {
    case "attack":
      // 进入目标选择 (Requirements: 2.3)
      menuLevel.value = "target";
      break;
    case "skill":
      // 显示技能列表 (Requirements: 2.4)
      menuLevel.value = "skill";
      break;
    case "item":
      // 显示物品列表 (Requirements: 2.6)
      menuLevel.value = "item";
      break;
    case "defend":
      // 直接提交防御行动 (Requirements: 2.7)
      emit("action", "defend");
      resetMenu();
      break;
    case "escape":
      // 直接提交逃跑行动 (Requirements: 2.8)
      emit("action", "escape");
      resetMenu();
      break;
    case "summon":
      // 显示召唤列表 (Requirements: 2.9)
      menuLevel.value = "summon";
      break;
  }
}

/** 选择技能 (Requirements: 2.5) */
function selectSkill(skill: SkillItem): void {
  if (props.disabled) return;

  // 检查 MP 是否足够
  const currentMp = props.currentActor?.stats.mp ?? 0;
  if (currentMp < skill.mpCost) return;

  selectedSkillId.value = skill.id;
  // 进入目标选择
  menuLevel.value = "target";
}

/** 选择物品 */
function selectItem(item: ItemEntry): void {
  if (props.disabled || item.count <= 0) return;

  selectedItemId.value = item.id;
  // 进入目标选择
  menuLevel.value = "target";
}

/** 选择召唤目标 */
function selectSummon(summon: SummonItem): void {
  if (props.disabled) return;

  emit("action", "summon", undefined, summon.id);
  resetMenu();
}

/** 选择攻击/技能/物品目标 */
function selectTarget(target: UnitConfig): void {
  if (props.disabled) return;

  const action = selectedAction.value;
  if (!action) return;

  if (action === "skill" && selectedSkillId.value) {
    emit("action", "skill", target.id, selectedSkillId.value);
  } else if (action === "item" && selectedItemId.value) {
    emit("action", "item", target.id, undefined, selectedItemId.value);
  } else {
    emit("action", action, target.id);
  }

  resetMenu();
}

/** 返回上一级菜单 */
function goBack(): void {
  if (menuLevel.value === "target") {
    // 如果是从技能/物品进入的目标选择，返回对应菜单
    if (selectedSkillId.value) {
      menuLevel.value = "skill";
      selectedSkillId.value = null;
    } else if (selectedItemId.value) {
      menuLevel.value = "item";
      selectedItemId.value = null;
    } else {
      menuLevel.value = "main";
    }
  } else {
    menuLevel.value = "main";
  }
  selectedAction.value = null;
}

/** 重置菜单状态 */
function resetMenu(): void {
  menuLevel.value = "main";
  selectedAction.value = null;
  selectedSkillId.value = null;
  selectedItemId.value = null;
}

/** 取消操作 */
function handleCancel(): void {
  emit("cancel");
  resetMenu();
}

// ============ 暴露方法 ============

defineExpose({
  resetMenu,
});
</script>

<template>
  <div class="flex flex-col gap-2 rounded-lg bg-gray-800 p-4">
    <!-- 菜单标题 -->
    <div class="flex items-center justify-between border-b border-gray-700 pb-2">
      <h3 class="text-lg font-bold text-white">{{ menuTitle }}</h3>
      <button
        v-if="showBackButton"
        class="rounded px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
        @click="goBack"
      >
        ← 返回
      </button>
    </div>

    <!-- 主菜单 -->
    <div v-if="menuLevel === 'main'" class="grid grid-cols-3 gap-2">
      <button
        v-for="item in mainMenuItems"
        :key="item.type"
        class="flex flex-col items-center gap-1 rounded-lg p-3 transition-all"
        :class="[
          item.disabled || disabled
            ? 'cursor-not-allowed bg-gray-700 text-gray-500'
            : 'bg-gray-700 text-white hover:bg-blue-600',
        ]"
        :disabled="item.disabled || disabled"
        @click="selectMainAction(item)"
      >
        <span class="text-2xl">{{ item.icon }}</span>
        <span class="text-sm">{{ item.label }}</span>
      </button>
    </div>

    <!-- 目标选择 -->
    <div v-else-if="menuLevel === 'target'" class="flex flex-col gap-2">
      <p class="text-sm text-gray-400">点击选择目标</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="target in targets"
          :key="target.id"
          class="flex items-center gap-2 rounded-lg bg-gray-700 p-3 text-white transition-colors hover:bg-red-600"
          :disabled="disabled"
          @click="selectTarget(target)"
        >
          <span class="text-lg">👤</span>
          <div class="flex flex-col items-start">
            <span class="text-sm font-medium">{{ target.name }}</span>
            <span class="text-xs text-gray-400">
              HP: {{ target.stats.hp }}/{{ target.stats.maxHp }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- 技能列表 -->
    <div v-else-if="menuLevel === 'skill'" class="flex flex-col gap-2">
      <div class="max-h-48 overflow-y-auto">
        <button
          v-for="skill in skills"
          :key="skill.id"
          class="flex w-full items-center justify-between rounded-lg p-3 transition-colors"
          :class="[
            (currentActor?.stats.mp ?? 0) < skill.mpCost
              ? 'cursor-not-allowed bg-gray-700 text-gray-500'
              : 'bg-gray-700 text-white hover:bg-purple-600',
          ]"
          :disabled="(currentActor?.stats.mp ?? 0) < skill.mpCost || disabled"
          @click="selectSkill(skill)"
        >
          <div class="flex flex-col items-start">
            <span class="font-medium">{{ skill.name }}</span>
            <span v-if="skill.description" class="text-xs text-gray-400">
              {{ skill.description }}
            </span>
          </div>
          <span class="text-sm text-blue-400">MP {{ skill.mpCost }}</span>
        </button>
      </div>
    </div>

    <!-- 物品列表 -->
    <div v-else-if="menuLevel === 'item'" class="flex flex-col gap-2">
      <div class="max-h-48 overflow-y-auto">
        <button
          v-for="item in items"
          :key="item.id"
          class="flex w-full items-center justify-between rounded-lg p-3 transition-colors"
          :class="[
            item.count <= 0
              ? 'cursor-not-allowed bg-gray-700 text-gray-500'
              : 'bg-gray-700 text-white hover:bg-green-600',
          ]"
          :disabled="item.count <= 0 || disabled"
          @click="selectItem(item)"
        >
          <div class="flex flex-col items-start">
            <span class="font-medium">{{ item.name }}</span>
            <span v-if="item.description" class="text-xs text-gray-400">
              {{ item.description }}
            </span>
          </div>
          <span class="text-sm text-yellow-400">x{{ item.count }}</span>
        </button>
      </div>
    </div>

    <!-- 召唤列表 -->
    <div v-else-if="menuLevel === 'summon'" class="flex flex-col gap-2">
      <p class="text-sm text-gray-400">
        当前队伍: {{ teamSize ?? 0 }}/6
      </p>
      <div class="max-h-48 overflow-y-auto">
        <button
          v-for="summon in summons"
          :key="summon.id"
          class="flex w-full items-center gap-2 rounded-lg bg-gray-700 p-3 text-white transition-colors hover:bg-orange-600"
          :disabled="disabled"
          @click="selectSummon(summon)"
        >
          <span class="text-lg">📜</span>
          <div class="flex flex-col items-start">
            <span class="font-medium">{{ summon.name }}</span>
            <span v-if="summon.description" class="text-xs text-gray-400">
              {{ summon.description }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- 取消按钮 -->
    <button
      class="mt-2 rounded-lg bg-gray-600 py-2 text-white transition-colors hover:bg-gray-500"
      @click="handleCancel"
    >
      取消
    </button>
  </div>
</template>
