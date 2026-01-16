<script setup lang="ts">
/**
 * @file 技能编排左侧面板
 * @description 步骤库、步骤参数编辑
 */
import { computed } from "vue";
import type { SkillStep, StepType } from "@/types";
import {
  useLibraryDragToTimeline,
  type LibraryDragPayload,
} from "@/modules/skill/composables/useLibraryDragToTimeline";

// ============ Props/Emits ============

const props = defineProps<{
  selectedStepIndex: number | null;
  selectedStep: SkillStep | null;
}>();

const emit = defineEmits<{
  "select-step": [index: number];
  "delete-step": [index: number];
  "add-step": [type: StepType];
  "update-step-param": [payload: { key: string; value: string | number | boolean }];
  "drop-step-from-library": [payload: LibraryDragPayload];
}>();

// ============ 配置 ============

const stepButtons: Array<{ label: string; type: StepType; description: string; icon: string }> = [
  { label: "移动", type: "move", description: "控制角色位置移动", icon: "M" },
  { label: "伤害", type: "damage", description: "对目标造成伤害", icon: "D" },
  { label: "特效", type: "effect", description: "播放特效动画", icon: "E" },
  { label: "等待", type: "wait", description: "插入时间间隔", icon: "W" },
];

// ============ 拖拽 ============

const { dragging: libraryDragging, onMouseDown: handleLibraryMouseDown } = useLibraryDragToTimeline((payload) => {
  emit("drop-step-from-library", payload);
});

// ============ 计算属性 ============

const stepTypeName = computed(() => {
  const names: Record<string, string> = {
    move: "移动",
    damage: "伤害",
    effect: "特效",
    wait: "等待",
  };
  return props.selectedStep ? names[props.selectedStep.type] || props.selectedStep.type : "";
});
</script>

<template>
  <div class="flex h-full flex-col space-y-4 overflow-auto">
    <!-- 动作步骤库 -->
    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header class="mb-3">
        <p class="text-[10px] font-medium tracking-wider text-slate-400 uppercase">动作步骤</p>
        <h3 class="text-sm font-semibold text-slate-800">拖拽到时间轴</h3>
      </header>
      <div class="flex flex-col gap-2">
        <button
          v-for="button in stepButtons"
          :key="button.type"
          class="flex w-full cursor-grab items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-sm active:cursor-grabbing"
          type="button"
          @mousedown.stop="handleLibraryMouseDown($event as MouseEvent, button.type, button.label)"
        >
          <span
            class="flex size-7 items-center justify-center rounded-lg bg-indigo-500 text-[11px] font-bold text-white shadow-sm"
          >
            {{ button.icon }}
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate font-medium">{{ button.label }}</span>
            <span class="mt-0.5 truncate text-[10px] text-slate-400">{{ button.description }}</span>
          </span>
        </button>
      </div>
    </section>

    <!-- 拖拽中的克隆元素 -->
    <Teleport to="body">
      <div
        v-if="libraryDragging && !libraryDragging.overTimeline"
        class="pointer-events-none fixed z-50"
        :style="{ left: libraryDragging.x - 30 + 'px', top: libraryDragging.y - 16 + 'px' }"
      >
        <div
          class="flex min-w-35 items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-lg"
        >
          <span
            class="flex size-6 items-center justify-center rounded-md bg-indigo-500 text-[10px] font-bold text-white"
          >
            {{ libraryDragging.label.charAt(0) }}
          </span>
          <span class="truncate">{{ libraryDragging.label }}</span>
        </div>
      </div>
    </Teleport>

    <!-- 步骤参数编辑 -->
    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header class="mb-3">
        <p class="text-[10px] font-medium tracking-wider text-slate-400 uppercase">步骤配置</p>
        <h3 class="text-sm font-semibold text-slate-800">编辑选中步骤</h3>
      </header>

      <div v-if="selectedStep" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs text-slate-500">
            <span>类型：</span>
            <span class="font-semibold text-indigo-600">{{ stepTypeName }}</span>
          </div>
          <button
            class="text-xs font-medium text-red-500 transition hover:text-red-600"
            type="button"
            @click="selectedStepIndex !== null && emit('delete-step', selectedStepIndex)"
          >
            删除该步骤
          </button>
        </div>

        <!-- 移动步骤参数 -->
        <template v-if="selectedStep.type === 'move'">
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">目标 X</span>
            <input
              :value="(selectedStep.params.targetX as string | number | undefined) ?? ''"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              placeholder="例如：targetX - 60"
              type="text"
              @input="
                emit('update-step-param', {
                  key: 'targetX',
                  value: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">目标 Y</span>
            <input
              :value="(selectedStep.params.targetY as string | number | undefined) ?? ''"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              placeholder="例如：targetY"
              type="text"
              @input="
                emit('update-step-param', {
                  key: 'targetY',
                  value: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">持续帧数</span>
            <input
              :value="Number(selectedStep.params.duration ?? 50)"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              min="1"
              type="number"
              @input="
                emit('update-step-param', {
                  key: 'duration',
                  value: Number(($event.target as HTMLInputElement).value || 1),
                })
              "
            />
          </label>
        </template>

        <!-- 伤害步骤参数 -->
        <template v-else-if="selectedStep.type === 'damage'">
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">伤害数值</span>
            <input
              :value="Number(selectedStep.params.value ?? 0)"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              min="0"
              type="number"
              @input="
                emit('update-step-param', {
                  key: 'value',
                  value: Number(($event.target as HTMLInputElement).value || 0),
                })
              "
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">持续帧数</span>
            <input
              :value="Number(selectedStep.params.duration ?? 30)"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              min="1"
              type="number"
              @input="
                emit('update-step-param', {
                  key: 'duration',
                  value: Number(($event.target as HTMLInputElement).value || 1),
                })
              "
            />
          </label>
        </template>

        <!-- 特效步骤参数 -->
        <template v-else-if="selectedStep.type === 'effect'">
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">特效 ID</span>
            <input
              :value="(selectedStep.params.effectId as string | undefined) ?? ''"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              placeholder="特效资源 ID"
              type="text"
              @input="
                emit('update-step-param', {
                  key: 'effectId',
                  value: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">位置 X</span>
            <input
              :value="(selectedStep.params.x as string | number | undefined) ?? ''"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              placeholder="例如：targetX"
              type="text"
              @input="
                emit('update-step-param', {
                  key: 'x',
                  value: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">位置 Y</span>
            <input
              :value="(selectedStep.params.y as string | number | undefined) ?? ''"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              placeholder="例如：targetY"
              type="text"
              @input="
                emit('update-step-param', {
                  key: 'y',
                  value: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">持续帧数</span>
            <input
              :value="Number(selectedStep.params.duration ?? 40)"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              min="1"
              type="number"
              @input="
                emit('update-step-param', {
                  key: 'duration',
                  value: Number(($event.target as HTMLInputElement).value || 1),
                })
              "
            />
          </label>
        </template>

        <!-- 等待步骤参数 -->
        <template v-else-if="selectedStep.type === 'wait'">
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-600">等待帧数</span>
            <input
              :value="Number(selectedStep.params.duration ?? 30)"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              min="1"
              type="number"
              @input="
                emit('update-step-param', {
                  key: 'duration',
                  value: Number(($event.target as HTMLInputElement).value || 1),
                })
              "
            />
          </label>
        </template>
      </div>

      <p v-else class="text-xs text-slate-400">请在时间轴中选择一个步骤，以编辑它的参数。</p>
    </section>
  </div>
</template>
