<script setup lang="ts">
/**
 * @file 战斗操作菜单组件
 * @description 提供攻击、技能、物品、防御、逃跑、召唤等操作选项
 * 现代 SaaS 风格：亮色主题
 */
import { ref, computed } from "vue";
import {
  GavelOutlined,
  AutoFixHighOutlined,
  LocalHospitalOutlined,
  ShieldOutlined,
  DirectionsRunOutlined,
  GroupAddOutlined,
  ArrowBackOutlined,
} from "@vicons/material";
import type { ActionType, UnitConfig } from "@/types";

// ============ Props & Emits ============

interface SkillInfo {
  id: string;
  name: string;
  mpCost: number;
  description?: string;
}

interface ItemInfo {
  id: string;
  name: string;
  count: number;
  description?: string;
}

interface SummonInfo {
  id: string;
  name: string;
  description?: string;
}

const props = defineProps<{
  currentActor?: UnitConfig;
  targets: UnitConfig[];
  skills?: SkillInfo[];
  items?: ItemInfo[];
  summons?: SummonInfo[];
  teamSize?: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  action: [type: ActionType, targetId?: string, skillId?: string, itemId?: string];
  cancel: [];
}>();

// ============ 状态 ============

type MenuState = "main" | "target" | "skill" | "item" | "summon";

const menuState = ref<MenuState>("main");
const pendingAction = ref<ActionType | null>(null);
const selectedSkillId = ref<string | null>(null);
const selectedItemId = ref<string | null>(null);

// ============ 计算属性 ============

const canSummon = computed(() => {
  return (props.teamSize ?? 0) < 6 && (props.summons?.length ?? 0) > 0;
});

// ============ 主菜单选项 ============

const mainMenuItems = computed(() => [
  { key: "attack", label: "攻击", icon: GavelOutlined, color: "text-red-500", bgColor: "bg-red-50 hover:bg-red-100" },
  { key: "skill", label: "技能", icon: AutoFixHighOutlined, color: "text-purple-500", bgColor: "bg-purple-50 hover:bg-purple-100" },
  { key: "item", label: "物品", icon: LocalHospitalOutlined, color: "text-emerald-500", bgColor: "bg-emerald-50 hover:bg-emerald-100" },
  { key: "defend", label: "防御", icon: ShieldOutlined, color: "text-blue-500", bgColor: "bg-blue-50 hover:bg-blue-100" },
  { key: "escape", label: "逃跑", icon: DirectionsRunOutlined, color: "text-amber-500", bgColor: "bg-amber-50 hover:bg-amber-100" },
  { key: "summon", label: "召唤", icon: GroupAddOutlined, color: "text-indigo-500", bgColor: "bg-indigo-50 hover:bg-indigo-100", disabled: !canSummon.value },
]);

// ============ 方法 ============

function handleMainMenuClick(key: string): void {
  if (props.disabled) return;

  switch (key) {
    case "attack":
      pendingAction.value = "attack";
      menuState.value = "target";
      break;
    case "skill":
      menuState.value = "skill";
      break;
    case "item":
      menuState.value = "item";
      break;
    case "defend":
      emit("action", "defend");
      break;
    case "escape":
      emit("action", "escape");
      break;
    case "summon":
      if (canSummon.value) {
        menuState.value = "summon";
      }
      break;
  }
}

function handleSkillSelect(skillId: string): void {
  selectedSkillId.value = skillId;
  pendingAction.value = "skill";
  menuState.value = "target";
}

function handleItemSelect(itemId: string): void {
  selectedItemId.value = itemId;
  pendingAction.value = "item";
  menuState.value = "target";
}

function handleTargetSelect(targetId: string): void {
  if (pendingAction.value) {
    emit("action", pendingAction.value, targetId, selectedSkillId.value ?? undefined, selectedItemId.value ?? undefined);
  }
  resetMenu();
}

function handleSummonSelect(summonId: string): void {
  emit("action", "summon", undefined, summonId);
  resetMenu();
}

function goBack(): void {
  if (menuState.value === "target") {
    if (pendingAction.value === "skill") {
      menuState.value = "skill";
    } else if (pendingAction.value === "item") {
      menuState.value = "item";
    } else {
      menuState.value = "main";
    }
  } else {
    menuState.value = "main";
  }
  pendingAction.value = null;
  selectedSkillId.value = null;
  selectedItemId.value = null;
}

function resetMenu(): void {
  menuState.value = "main";
  pendingAction.value = null;
  selectedSkillId.value = null;
  selectedItemId.value = null;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 主菜单 -->
    <div v-if="menuState === 'main'" class="grid grid-cols-2 gap-2">
      <button
        v-for="item in mainMenuItems"
        :key="item.key"
        class="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium transition-all"
        :class="[
          item.bgColor,
          item.disabled ? 'cursor-not-allowed opacity-50' : '',
          disabled ? 'pointer-events-none opacity-50' : ''
        ]"
        :disabled="item.disabled || disabled"
        @click="handleMainMenuClick(item.key)"
      >
        <component :is="item.icon" class="size-5" :class="item.color" />
        <span class="text-slate-700">{{ item.label }}</span>
      </button>
    </div>

    <!-- 技能列表 -->
    <div v-else-if="menuState === 'skill'" class="flex flex-col gap-2">
      <div class="flex items-center gap-2 pb-2">
        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-100"
          @click="goBack"
        >
          <ArrowBackOutlined class="size-4" />
          返回
        </button>
        <span class="text-sm font-medium text-slate-700">选择技能</span>
      </div>
      <div class="flex flex-col gap-1">
        <button
          v-for="skill in skills"
          :key="skill.id"
          class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:border-purple-300 hover:bg-purple-50"
          :disabled="(currentActor?.stats.mp ?? 0) < skill.mpCost"
          :class="{ 'cursor-not-allowed opacity-50': (currentActor?.stats.mp ?? 0) < skill.mpCost }"
          @click="handleSkillSelect(skill.id)"
        >
          <div>
            <div class="font-medium text-slate-700">{{ skill.name }}</div>
            <div v-if="skill.description" class="text-xs text-slate-500">{{ skill.description }}</div>
          </div>
          <span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
            MP {{ skill.mpCost }}
          </span>
        </button>
      </div>
    </div>

    <!-- 物品列表 -->
    <div v-else-if="menuState === 'item'" class="flex flex-col gap-2">
      <div class="flex items-center gap-2 pb-2">
        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-100"
          @click="goBack"
        >
          <ArrowBackOutlined class="size-4" />
          返回
        </button>
        <span class="text-sm font-medium text-slate-700">选择物品</span>
      </div>
      <div class="flex flex-col gap-1">
        <button
          v-for="item in items"
          :key="item.id"
          class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50"
          :disabled="item.count <= 0"
          :class="{ 'cursor-not-allowed opacity-50': item.count <= 0 }"
          @click="handleItemSelect(item.id)"
        >
          <div>
            <div class="font-medium text-slate-700">{{ item.name }}</div>
            <div v-if="item.description" class="text-xs text-slate-500">{{ item.description }}</div>
          </div>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            ×{{ item.count }}
          </span>
        </button>
      </div>
    </div>

    <!-- 召唤列表 -->
    <div v-else-if="menuState === 'summon'" class="flex flex-col gap-2">
      <div class="flex items-center gap-2 pb-2">
        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-100"
          @click="goBack"
        >
          <ArrowBackOutlined class="size-4" />
          返回
        </button>
        <span class="text-sm font-medium text-slate-700">选择召唤</span>
      </div>
      <div class="flex flex-col gap-1">
        <button
          v-for="summon in summons"
          :key="summon.id"
          class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50"
          @click="handleSummonSelect(summon.id)"
        >
          <div>
            <div class="font-medium text-slate-700">{{ summon.name }}</div>
            <div v-if="summon.description" class="text-xs text-slate-500">{{ summon.description }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- 目标选择 -->
    <div v-else-if="menuState === 'target'" class="flex flex-col gap-2">
      <div class="flex items-center gap-2 pb-2">
        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-100"
          @click="goBack"
        >
          <ArrowBackOutlined class="size-4" />
          返回
        </button>
        <span class="text-sm font-medium text-slate-700">选择目标</span>
      </div>
      <div class="flex flex-col gap-1">
        <button
          v-for="target in targets"
          :key="target.id"
          class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:border-red-300 hover:bg-red-50"
          @click="handleTargetSelect(target.id)"
        >
          <div class="font-medium text-slate-700">{{ target.name }}</div>
          <div class="flex items-center gap-2">
            <div class="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
              <div
                class="h-full bg-red-500"
                :style="{ width: `${(target.stats.hp / target.stats.maxHp) * 100}%` }"
              />
            </div>
            <span class="text-xs text-slate-500">{{ target.stats.hp }}/{{ target.stats.maxHp }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
