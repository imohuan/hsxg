<script setup lang="ts">
/**
 * @file 技能编排页面
 * @description 整合战斗预览、时间轴编辑器和步骤面板
 */
import { ref, computed, reactive, watch } from "vue";
import { AddOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from "@vicons/material";
import { useDesignerStore } from "@/stores/designer.store";
import DesignerTabLayout from "@/components/layout/DesignerTabLayout.vue";
import SkillBattlePreview from "@/modules/skill/components/SkillBattlePreview.vue";
import SkillTimeline from "@/modules/skill/components/SkillTimeline.vue";
import SkillTimelineControls from "@/modules/skill/components/SkillTimelineControls.vue";
import SkillTabPanel from "@/modules/skill/components/SkillTabPanel.vue";
import type { SkillDesign, SkillStep, StepType, TimelineSegment } from "@/types";
import type { LibraryDragPayload } from "@/modules/skill/composables/useLibraryDragToTimeline";
import { DEFAULT_ACTOR_ID, DEFAULT_TARGET_IDS } from "@/modules/skill/core/sandboxConfig";
import { useSplitPane } from "@/modules/designer/composables/useSplitPane";

// ============ Store ============

const designerStore = useDesignerStore();

// ============ 状态 ============

const showCreateDialog = ref(false);
const newSkillName = ref("");
const isEditing = ref(false);
const editingName = ref("");
const currentFrame = ref(0);
const playing = ref(false);
const fps = ref(10);
const selectedStepIndex = ref<number | null>(null);

// 当前编辑的技能（响应式对象）
const currentSkillData = reactive<{
  id: string;
  name: string;
  steps: SkillStep[];
  casterId: string;
  selectedTargetIds: string[];
  targetingModes: string[];
}>({
  id: "",
  name: "",
  steps: [],
  casterId: DEFAULT_ACTOR_ID,
  selectedTargetIds: [...DEFAULT_TARGET_IDS],
  targetingModes: ["enemy"],
});

// ============ 计算属性 ============

const currentSkill = computed(() => {
  if (!designerStore.currentSkillId) return null;
  return designerStore.getSkill(designerStore.currentSkillId);
});

const skills = computed(() => designerStore.skills);

// 步骤默认帧数
const STEP_FRAME_DEFAULT: Record<string, number> = {
  move: 50,
  damage: 30,
  effect: 40,
  wait: 30,
};

// 将步骤转换为时间轴片段
const skillTimelineSegments = computed<TimelineSegment[]>(() => {
  let cursor = 0;
  const MAX_FRAMES_PER_STEP = 600;

  return currentSkillData.steps.map((step, index) => {
    const params = step.params as Record<string, unknown>;
    const raw =
      typeof params.duration === "number"
        ? params.duration
        : Number(params.duration) || STEP_FRAME_DEFAULT[step.type] || 30;
    const frames = Math.max(1, Math.min(MAX_FRAMES_PER_STEP, Math.round(raw)));
    const hasStartFrame =
      typeof params.startFrame === "number" && Number.isFinite(params.startFrame);
    const start = hasStartFrame ? Math.max(0, Math.round(params.startFrame as number)) : cursor;

    const segment: TimelineSegment = {
      id: `segment-${index}`,
      stepId: `step-${index}`,
      trackId: typeof params.trackId === "string" ? params.trackId : "main-track",
      startFrame: start,
      endFrame: start + frames,
      step,
    };

    cursor = Math.max(cursor, segment.endFrame);
    return segment;
  });
});

const totalFrames = computed(() => {
  const segments = skillTimelineSegments.value;
  if (!segments.length) return 240;
  const last = segments[segments.length - 1];
  return Math.max(60, last?.endFrame ?? 60);
});

const selectedStep = computed<SkillStep | null>(() => {
  if (
    selectedStepIndex.value !== null &&
    selectedStepIndex.value >= 0 &&
    selectedStepIndex.value < currentSkillData.steps.length
  ) {
    return currentSkillData.steps[selectedStepIndex.value] as SkillStep;
  }
  return null;
});

// ============ 方法 ============

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function openCreateDialog(): void {
  newSkillName.value = "";
  showCreateDialog.value = true;
}

function closeCreateDialog(): void {
  showCreateDialog.value = false;
  newSkillName.value = "";
}

function createSkill(): void {
  const name = newSkillName.value.trim();
  if (!name) return;

  const newSkill: SkillDesign = {
    id: generateId("skill"),
    name,
    steps: [],
    segments: [],
    tracks: [{ id: generateId("track"), name: "轨道 1", locked: false, hidden: false }],
    totalFrames: 300,
    fps: 10,
  };

  designerStore.addSkill(newSkill);
  designerStore.currentSkillId = newSkill.id;
  closeCreateDialog();
}

function selectSkill(skill: SkillDesign): void {
  designerStore.currentSkillId = skill.id;
  currentFrame.value = 0;
  playing.value = false;
  selectedStepIndex.value = null;
}

function deleteSkill(id: string): void {
  if (!confirm("确定要删除这个技能吗？")) return;
  designerStore.removeSkill(id);
  if (designerStore.currentSkillId === id) {
    designerStore.currentSkillId = null;
  }
}

function startEditName(): void {
  if (!currentSkill.value) return;
  editingName.value = currentSkill.value.name;
  isEditing.value = true;
}

function saveEditName(): void {
  if (!currentSkill.value || !editingName.value.trim()) {
    isEditing.value = false;
    return;
  }
  designerStore.updateSkill(currentSkill.value.id, { name: editingName.value.trim() });
  isEditing.value = false;
}

function cancelEditName(): void {
  isEditing.value = false;
  editingName.value = "";
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter") saveEditName();
  else if (event.key === "Escape") cancelEditName();
}

// 同步当前技能数据到响应式对象
function syncCurrentSkillData(): void {
  if (currentSkill.value) {
    currentSkillData.id = currentSkill.value.id;
    currentSkillData.name = currentSkill.value.name;
    currentSkillData.steps = [...currentSkill.value.steps];
    fps.value = currentSkill.value.fps || 10;
  } else {
    currentSkillData.id = "";
    currentSkillData.name = "";
    currentSkillData.steps = [];
  }
}

// 保存当前技能数据到 store
function saveCurrentSkillData(): void {
  if (!currentSkillData.id) return;
  designerStore.updateSkill(currentSkillData.id, {
    name: currentSkillData.name,
    steps: currentSkillData.steps,
    fps: fps.value,
  });
}

// 添加步骤
function addStep(type: StepType): void {
  const defaultParams: Record<string, unknown> = {
    duration: STEP_FRAME_DEFAULT[type] || 30,
  };

  if (type === "move") {
    defaultParams.targetX = "targetX - 60";
    defaultParams.targetY = "targetY";
  } else if (type === "damage") {
    defaultParams.value = 100;
  } else if (type === "effect") {
    defaultParams.effectId = "";
    defaultParams.x = "targetX";
    defaultParams.y = "targetY";
  }

  currentSkillData.steps.push({ type, params: defaultParams });
  selectedStepIndex.value = currentSkillData.steps.length - 1;
  saveCurrentSkillData();
}

// 删除步骤
function deleteStep(index: number): void {
  currentSkillData.steps.splice(index, 1);
  if (selectedStepIndex.value === index) {
    selectedStepIndex.value = null;
  }
  saveCurrentSkillData();
}

// 更新步骤参数
function updateStepParam(payload: { key: string; value: string | number | boolean }): void {
  if (selectedStep.value && selectedStepIndex.value !== null) {
    selectedStep.value.params[payload.key] = payload.value;
    saveCurrentSkillData();
  }
}

// 处理时间轴片段更新
function handleUpdateSegment(index: number, start: number, end: number, trackId?: string): void {
  const step = currentSkillData.steps[index];
  if (step) {
    const frames = Math.max(1, end - start);
    const params = step.params as Record<string, unknown>;
    params.duration = frames;
    params.startFrame = Math.max(0, Math.round(start));
    if (trackId) params.trackId = trackId;
    saveCurrentSkillData();
  }
}

// 处理拖拽放置步骤
function handleDropStep(stepIndex: number, targetTime: number, trackId: string): void {
  if (stepIndex < 0 || stepIndex >= currentSkillData.steps.length) return;

  const targetFrame = Math.round(targetTime * fps.value);
  const step = currentSkillData.steps[stepIndex];
  if (step) {
    const params = step.params as Record<string, unknown>;
    params.startFrame = targetFrame;
    if (trackId) params.trackId = trackId;
    saveCurrentSkillData();
  }
  selectedStepIndex.value = stepIndex;
}

// 从库拖拽到时间轴
function handleDropStepFromLibrary(payload: LibraryDragPayload): void {
  if (!payload.overTimeline) return;

  addStep(payload.type as StepType);
  const newStepIndex = currentSkillData.steps.length - 1;
  const targetTime = payload.targetTime ?? 0;
  const trackId = payload.trackId ?? "main-track";
  handleDropStep(newStepIndex, targetTime, trackId);
}

// 切换目标
function handleToggleTarget(unitId: string): void {
  const exists = currentSkillData.selectedTargetIds.includes(unitId);
  if (exists) {
    currentSkillData.selectedTargetIds = currentSkillData.selectedTargetIds.filter(
      (id) => id !== unitId,
    );
  } else {
    currentSkillData.selectedTargetIds = [...currentSkillData.selectedTargetIds, unitId];
  }
}

// ============ 分割面板 ============

const splitPane = useSplitPane({
  storageKey: "skill-tab-split-percent",
  initialTopPercent: 45,
  minTopPercent: 25,
  maxTopPercent: 70,
});

const previewStyle = splitPane.topStyle;
const timelineStyle = splitPane.bottomStyle;
const isSplitDragging = splitPane.isDragging;
const startSplitDrag = splitPane.startDrag;

// ============ 监听 ============

watch(
  () => designerStore.currentSkillId,
  () => {
    syncCurrentSkillData();
    currentFrame.value = 0;
    playing.value = false;
    selectedStepIndex.value = null;
  },
  { immediate: true },
);
</script>

<template>
  <DesignerTabLayout>
    <!-- 左侧面板 -->
    <template #left>
      <!-- 技能列表 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-800">技能列表</h3>
          <button
            class="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-indigo-600 hover:shadow"
            @click="openCreateDialog"
          >
            <AddOutlined class="size-3.5" />
            新建
          </button>
        </div>

        <div class="max-h-48 overflow-auto">
          <div v-if="skills.length === 0" class="p-4 text-center text-xs text-slate-400">
            暂无技能，点击上方按钮创建
          </div>
          <div v-else class="divide-y divide-slate-100">
            <div
              v-for="skill in skills"
              :key="skill.id"
              class="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50"
              :class="{ 'bg-indigo-50': designerStore.currentSkillId === skill.id }"
              @click="selectSkill(skill)"
            >
              <div class="min-w-0 flex-1">
                <p
                  class="truncate text-sm font-medium"
                  :class="
                    designerStore.currentSkillId === skill.id ? 'text-indigo-600' : 'text-slate-700'
                  "
                >
                  {{ skill.name }}
                </p>
                <p class="text-xs text-slate-400">{{ skill.steps.length }} 步骤</p>
              </div>
              <button
                class="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="删除"
                @click.stop="deleteSkill(skill.id)"
              >
                <DeleteOutlined class="size-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- 当前技能编辑 -->
        <div v-if="currentSkill" class="border-t border-slate-100 bg-slate-50/50 p-3">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500">当前:</span>
              <template v-if="isEditing">
                <input
                  v-model="editingName"
                  type="text"
                  class="w-24 rounded border border-indigo-300 bg-white px-2 py-1 text-sm text-slate-800 ring-2 ring-indigo-100 outline-none"
                  autofocus
                  @keydown="handleKeydown"
                  @blur="saveEditName"
                />
              </template>
              <template v-else>
                <span class="text-sm font-medium text-slate-800">{{ currentSkill.name }}</span>
                <button
                  class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                  title="编辑名称"
                  @click="startEditName"
                >
                  <EditOutlined class="size-3.5" />
                </button>
              </template>
            </div>
            <button
              class="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-all hover:bg-emerald-600 hover:shadow"
              @click="saveCurrentSkillData"
            >
              <SaveOutlined class="size-3" />
              保存
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="rounded-lg bg-white p-2 shadow-sm">
              <span class="text-slate-500">帧数:</span>
              <span class="ml-1 font-medium text-slate-700">{{ totalFrames }}</span>
            </div>
            <div class="rounded-lg bg-white p-2 shadow-sm">
              <span class="text-slate-500">FPS:</span>
              <span class="ml-1 font-medium text-slate-700">{{ fps }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤面板 -->
      <SkillTabPanel
        v-if="currentSkill"
        :selected-step-index="selectedStepIndex"
        :selected-step="selectedStep"
        @select-step="(index) => (selectedStepIndex = index)"
        @delete-step="deleteStep"
        @add-step="addStep"
        @update-step-param="updateStepParam"
        @drop-step-from-library="handleDropStepFromLibrary"
      />
    </template>

    <!-- 右侧编辑区域 -->
    <template #right>
      <div
        v-if="currentSkill"
        :ref="(el) => (splitPane.containerRef.value = el as HTMLElement)"
        class="flex h-full w-full flex-col overflow-hidden"
      >
        <!-- 预览画布 -->
        <div class="shrink-0 overflow-hidden" :style="previewStyle">
          <SkillBattlePreview
            :current-frame="currentFrame"
            :total-frames="totalFrames"
            :playing="playing"
            :fps="fps"
            :segments="skillTimelineSegments"
            :caster-id="currentSkillData.casterId"
            :selected-target-ids="currentSkillData.selectedTargetIds"
            :targeting-modes="currentSkillData.targetingModes"
            @update:current-frame="currentFrame = $event"
            @toggle-target="handleToggleTarget"
          />
        </div>

        <!-- 拖拽分割条 -->
        <div
          class="group relative z-10 flex h-1 shrink-0 cursor-row-resize items-center justify-center bg-slate-200 transition-colors hover:bg-indigo-400"
          :class="{ 'bg-indigo-500': isSplitDragging }"
          @mousedown="startSplitDrag"
        >
          <!-- 拖拽手柄指示器 -->
          <div
            class="absolute flex h-4 w-12 items-center justify-center rounded-full bg-slate-300 opacity-0 transition-opacity group-hover:opacity-100"
            :class="{ 'opacity-100 bg-indigo-500': isSplitDragging }"
          >
            <div class="flex gap-0.5">
              <div class="h-0.5 w-3 rounded-full bg-white" />
            </div>
          </div>
        </div>

        <!-- 时间轴控制栏 -->
        <SkillTimelineControls
          :total-frames="totalFrames"
          :current-frame="currentFrame"
          :fps="fps"
          :playing="playing"
          @update:current-frame="currentFrame = $event"
          @update:fps="fps = $event"
          @update:playing="playing = $event"
        />

        <!-- 时间轴编辑器 -->
        <div class="min-h-0 flex-1" :style="timelineStyle">
          <SkillTimeline
            :segments="skillTimelineSegments"
            :total-frames="totalFrames"
            :current-frame="currentFrame"
            :fps="fps"
            :selected-step-index="selectedStepIndex"
            @update:current-frame="currentFrame = $event"
            @select-step="(index) => (selectedStepIndex = index)"
            @delete-step="deleteStep"
            @update-segment="handleUpdateSegment"
            @drop-step="handleDropStep"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="flex h-full items-center justify-center bg-slate-50">
        <div class="text-center">
          <div
            class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100"
          >
            <svg
              class="size-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p class="mb-1 text-base font-medium text-slate-700">请选择或创建技能</p>
          <p class="text-sm text-slate-500">在左侧列表中选择一个技能，或点击"新建"按钮创建</p>
        </div>
      </div>
    </template>
  </DesignerTabLayout>

  <!-- 新建对话框 -->
  <Teleport to="body">
    <div
      v-if="showCreateDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      @click.self="closeCreateDialog"
    >
      <div class="min-w-96 rounded-2xl bg-white p-6 shadow-2xl">
        <h3 class="mb-4 text-lg font-semibold text-slate-800">新建技能</h3>
        <div class="mb-6">
          <label class="mb-2 block text-sm font-medium text-slate-600">技能名称</label>
          <input
            v-model="newSkillName"
            type="text"
            placeholder="输入技能名称"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            autofocus
            @keydown.enter="createSkill"
          />
        </div>
        <div class="flex justify-end gap-3">
          <button
            class="rounded-lg px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            @click="closeCreateDialog"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-600 hover:shadow disabled:opacity-50"
            :disabled="!newSkillName.trim()"
            @click="createSkill"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
