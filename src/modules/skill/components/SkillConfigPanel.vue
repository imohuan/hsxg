<script setup lang="ts">
/**
 * @file 技能配置面板
 * @description 配置技能的基本属性：普通攻击、目标职业、效果范围、目标数量
 */
import { computed } from "vue";
import type { SkillTargetConfig, SkillTargetScope, TargetRoleType } from "@/types";

// ============ Props/Emits ============

const props = defineProps<{
  config: SkillTargetConfig;
}>();

const emit = defineEmits<{
  "update:config": [config: SkillTargetConfig];
}>();

// ============ 配置选项 ============

const roleOptions: Array<{ value: TargetRoleType; label: string }> = [
  { value: "any", label: "任意职业" },
  { value: "warrior", label: "战士" },
  { value: "mage", label: "法师" },
  { value: "support", label: "辅助" },
];

const scopeOptions: Array<{ value: SkillTargetScope; label: string; description: string }> = [
  { value: "enemy", label: "敌方", description: "可选择敌方单位" },
  { value: "ally", label: "我方", description: "可选择我方单位" },
  { value: "self", label: "自身", description: "可选择施法者自己" },
];

// ============ 计算属性 ============

const isNormalAttack = computed({
  get: () => props.config.isNormalAttack,
  set: (value: boolean) => {
    emit("update:config", { ...props.config, isNormalAttack: value });
  },
});

const targetRole = computed({
  get: () => props.config.targetRole,
  set: (value: TargetRoleType) => {
    emit("update:config", { ...props.config, targetRole: value });
  },
});

const targetCount = computed({
  get: () => props.config.targetCount,
  set: (value: number) => {
    emit("update:config", { ...props.config, targetCount: Math.max(0, value) });
  },
});

// ============ 方法 ============

function isScopeSelected(scope: SkillTargetScope): boolean {
  return props.config.targetScope.includes(scope);
}

function toggleScope(scope: SkillTargetScope): void {
  const currentScopes = [...props.config.targetScope];
  const index = currentScopes.indexOf(scope);

  if (index >= 0) {
    // 至少保留一个范围
    if (currentScopes.length > 1) {
      currentScopes.splice(index, 1);
    }
  } else {
    currentScopes.push(scope);
  }

  emit("update:config", { ...props.config, targetScope: currentScopes });
}

/** 获取目标数量描述 */
const targetCountLabel = computed(() => {
  if (props.config.targetCount === 0) return "无限制";
  if (props.config.targetCount === 1) return "单体";
  return `${props.config.targetCount} 个目标`;
});
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <header class="mb-3">
      <p class="text-[10px] font-medium tracking-wider text-slate-400 uppercase">技能配置</p>
      <h3 class="text-sm font-semibold text-slate-800">基本属性</h3>
    </header>

    <div class="space-y-4">
      <!-- 普通攻击开关 -->
      <div class="flex items-center justify-between">
        <div>
          <span class="text-xs font-medium text-slate-700">普通攻击</span>
          <p class="text-[10px] text-slate-400">标记为普通攻击类型</p>
        </div>
        <button
          type="button"
          class="relative h-5 w-9 rounded-full transition-colors"
          :class="isNormalAttack ? 'bg-indigo-500' : 'bg-slate-200'"
          @click="isNormalAttack = !isNormalAttack"
        >
          <span
            class="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform"
            :class="{ 'translate-x-4': isNormalAttack }"
          />
        </button>
      </div>

      <!-- 目标职业 -->
      <div>
        <label class="mb-1.5 block text-xs font-medium text-slate-700">目标职业</label>
        <p class="mb-2 text-[10px] text-slate-400">不同职业可能有不同的攻击表现</p>
        <select
          v-model="targetRole"
          class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        >
          <option v-for="option in roleOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- 技能效果范围 -->
      <div>
        <label class="mb-1.5 block text-xs font-medium text-slate-700">效果范围</label>
        <p class="mb-2 text-[10px] text-slate-400">配置后可在画布中选择对应目标</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in scopeOptions"
            :key="option.value"
            type="button"
            class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
            :class="
              isScopeSelected(option.value)
                ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            "
            :title="option.description"
            @click="toggleScope(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- 目标数量 -->
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs font-medium text-slate-700">目标数量</label>
          <span class="text-[10px] text-indigo-500">{{ targetCountLabel }}</span>
        </div>
        <p class="mb-2 text-[10px] text-slate-400">0 表示无限制，可选择任意数量</p>
        <div class="flex items-center gap-2">
          <input
            v-model.number="targetCount"
            type="number"
            min="0"
            max="12"
            class="w-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          <div class="flex gap-1">
            <button
              type="button"
              class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
              :class="{ 'border-indigo-300 bg-indigo-50 text-indigo-600': targetCount === 1 }"
              @click="targetCount = 1"
            >
              单体
            </button>
            <button
              type="button"
              class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
              :class="{ 'border-indigo-300 bg-indigo-50 text-indigo-600': targetCount === 0 }"
              @click="targetCount = 0"
            >
              群体
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
