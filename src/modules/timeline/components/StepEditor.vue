<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { SkillStep, StepType, StepParams } from "@/types";

// Props
const props = defineProps<{
  /** 当前编辑的步骤 */
  step: SkillStep | null;
}>();

// Emits
const emit = defineEmits<{
  /** 更新步骤参数 */
  update: [stepId: string, params: StepParams];
  /** 更新步骤类型 */
  updateType: [stepId: string, type: StepType];
}>();

// 步骤类型选项
const stepTypeOptions: { value: StepType; label: string }[] = [
  { value: "move", label: "移动" },
  { value: "damage", label: "伤害" },
  { value: "effect", label: "特效" },
  { value: "wait", label: "等待" },
  { value: "camera", label: "镜头" },
  { value: "shake", label: "震动" },
  { value: "background", label: "背景" },
];

// 缓动函数选项
const easeOptions = [
  { value: "Linear", label: "线性" },
  { value: "Quad.easeIn", label: "二次缓入" },
  { value: "Quad.easeOut", label: "二次缓出" },
  { value: "Quad.easeInOut", label: "二次缓入缓出" },
  { value: "Cubic.easeIn", label: "三次缓入" },
  { value: "Cubic.easeOut", label: "三次缓出" },
  { value: "Cubic.easeInOut", label: "三次缓入缓出" },
  { value: "Back.easeIn", label: "回弹缓入" },
  { value: "Back.easeOut", label: "回弹缓出" },
  { value: "Bounce.easeOut", label: "弹跳" },
];

// 本地编辑状态
const localParams = ref<StepParams>({});

// 监听步骤变化，同步本地状态
watch(
  () => props.step,
  (newStep) => {
    if (newStep) {
      localParams.value = { ...newStep.params };
    } else {
      localParams.value = {};
    }
  },
  { immediate: true, deep: true },
);

// 当前步骤类型
const currentType = computed(() => props.step?.type || "move");

// 更新参数
function updateParam<K extends keyof StepParams>(key: K, value: StepParams[K]) {
  if (!props.step) return;
  
  localParams.value[key] = value;
  emit("update", props.step.id, { ...localParams.value });
}

// 更新步骤类型
function handleTypeChange(event: Event) {
  if (!props.step) return;
  
  const target = event.target as HTMLSelectElement;
  emit("updateType", props.step.id, target.value as StepType);
}
</script>

<template>
  <div class="flex h-full flex-col bg-gray-800 p-4">
    <!-- 无选中状态 -->
    <div v-if="!step" class="flex flex-1 items-center justify-center text-gray-500">
      选择一个片段以编辑参数
    </div>
    
    <!-- 编辑面板 -->
    <template v-else>
      <!-- 步骤类型选择 -->
      <div class="mb-4">
        <label class="mb-1 block text-sm text-gray-400">步骤类型</label>
        <select
          :value="currentType"
          class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          @change="handleTypeChange"
        >
          <option
            v-for="option in stepTypeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
      
      <!-- 移动步骤参数 -->
      <template v-if="currentType === 'move'">
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">目标 X</label>
          <input
            type="text"
            :value="localParams.targetX"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="数值或表达式"
            @input="updateParam('targetX', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">目标 Y</label>
          <input
            type="text"
            :value="localParams.targetY"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="数值或表达式"
            @input="updateParam('targetY', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">持续时间 (ms)</label>
          <input
            type="number"
            :value="localParams.duration"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="500"
            min="0"
            @input="updateParam('duration', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">缓动函数</label>
          <select
            :value="localParams.ease || 'Linear'"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            @change="updateParam('ease', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in easeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </template>
      
      <!-- 伤害步骤参数 -->
      <template v-else-if="currentType === 'damage'">
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">伤害值</label>
          <input
            type="text"
            :value="localParams.value"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="数值或表达式"
            @input="updateParam('value', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </template>
      
      <!-- 特效步骤参数 -->
      <template v-else-if="currentType === 'effect'">
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">特效 ID</label>
          <input
            type="text"
            :value="localParams.effectId"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="特效资源 ID"
            @input="updateParam('effectId', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">X 坐标</label>
          <input
            type="text"
            :value="localParams.x"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="数值或表达式"
            @input="updateParam('x', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">Y 坐标</label>
          <input
            type="text"
            :value="localParams.y"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="数值或表达式"
            @input="updateParam('y', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </template>
      
      <!-- 等待步骤参数 -->
      <template v-else-if="currentType === 'wait'">
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">等待时长 (ms)</label>
          <input
            type="number"
            :value="localParams.delay"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1000"
            min="0"
            @input="updateParam('delay', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
      </template>
      
      <!-- 镜头步骤参数 -->
      <template v-else-if="currentType === 'camera'">
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">缩放比例</label>
          <input
            type="number"
            :value="localParams.zoom"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1.0"
            min="0.1"
            max="5"
            step="0.1"
            @input="updateParam('zoom', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">X 偏移</label>
          <input
            type="number"
            :value="localParams.offsetX"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            @input="updateParam('offsetX', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">Y 偏移</label>
          <input
            type="number"
            :value="localParams.offsetY"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            @input="updateParam('offsetY', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">持续时间 (ms)</label>
          <input
            type="number"
            :value="localParams.duration"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="500"
            min="0"
            @input="updateParam('duration', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
      </template>
      
      <!-- 震动步骤参数 -->
      <template v-else-if="currentType === 'shake'">
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">震动强度</label>
          <input
            type="number"
            :value="localParams.intensity"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10"
            min="1"
            max="100"
            @input="updateParam('intensity', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">持续时间 (ms)</label>
          <input
            type="number"
            :value="localParams.duration"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="200"
            min="0"
            @input="updateParam('duration', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
      </template>
      
      <!-- 背景步骤参数 -->
      <template v-else-if="currentType === 'background'">
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">背景颜色</label>
          <div class="flex gap-2">
            <input
              type="color"
              :value="localParams.color || '#000000'"
              class="h-10 w-12 cursor-pointer rounded bg-gray-700"
              @input="updateParam('color', ($event.target as HTMLInputElement).value)"
            />
            <input
              type="text"
              :value="localParams.color"
              class="flex-1 rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#000000"
              @input="updateParam('color', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-400">背景图片 URL</label>
          <input
            type="text"
            :value="localParams.image"
            class="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="图片路径"
            @input="updateParam('image', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </template>
    </template>
  </div>
</template>
