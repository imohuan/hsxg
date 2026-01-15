<script setup lang="ts">
/**
 * @file 技能编排标签页
 * @description 整合时间轴编辑器和预览功能
 * Requirements: 7.1-9.8
 */
import { ref, computed, watch } from "vue";
import {
  AddOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  TimelineOutlined,
  PlayArrowOutlined,
  PauseOutlined,
  SkipPreviousOutlined,
} from "@vicons/material";
import { useDesignerStore } from "@/stores/designer.store";
import Timeline from "@/modules/timeline/components/Timeline.vue";
import PreviewCanvas from "@/modules/timeline/components/PreviewCanvas.vue";
import type { SkillDesign, SkillStep, TimelineSegment, TimelineTrack } from "@/types";

// ============ Store ============

const designerStore = useDesignerStore();

// ============ 状态 ============

/** 是否显示新建对话框 */
const showCreateDialog = ref(false);

/** 新技能名称 */
const newSkillName = ref("");

/** 是否处于编辑模式 */
const isEditing = ref(false);

/** 编辑中的技能名称 */
const editingName = ref("");

/** 当前帧 */
const currentFrame = ref(0);

/** 是否正在播放 */
const isPlaying = ref(false);

// ============ 计算属性 ============

/** 当前选中的技能 */
const currentSkill = computed(() => {
  if (!designerStore.currentSkillId) return null;
  return designerStore.getSkill(designerStore.currentSkillId);
});

/** 技能列表 */
const skills = computed(() => designerStore.skills);

/** 当前技能的步骤 */
const currentSteps = computed(() => currentSkill.value?.steps ?? []);

/** 当前技能的片段 */
const currentSegments = computed(() => currentSkill.value?.segments ?? []);

/** 当前技能的轨道 */
const currentTracks = computed(() => currentSkill.value?.tracks ?? []);

/** 当前技能的总帧数 */
const totalFrames = computed(() => currentSkill.value?.totalFrames ?? 300);

/** 当前技能的帧率 */
const fps = computed(() => currentSkill.value?.fps ?? 30);

// ============ 方法 ============

/** 生成唯一 ID */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 打开新建对话框 */
function openCreateDialog(): void {
  newSkillName.value = "";
  showCreateDialog.value = true;
}

/** 关闭新建对话框 */
function closeCreateDialog(): void {
  showCreateDialog.value = false;
  newSkillName.value = "";
}

/** 创建新技能 */
function createSkill(): void {
  const name = newSkillName.value.trim();
  if (!name) return;

  const newSkill: SkillDesign = {
    id: generateId("skill"),
    name,
    steps: [],
    segments: [],
    tracks: [
      {
        id: generateId("track"),
        name: "轨道 1",
        locked: false,
        hidden: false,
      },
    ],
    totalFrames: 300,
    fps: 30,
  };

  designerStore.addSkill(newSkill);
  designerStore.currentSkillId = newSkill.id;
  closeCreateDialog();
}

/** 选择技能 */
function selectSkill(skill: SkillDesign): void {
  designerStore.currentSkillId = skill.id;
  currentFrame.value = 0;
  isPlaying.value = false;
}

/** 删除技能 */
function deleteSkill(id: string): void {
  if (!confirm("确定要删除这个技能吗？")) return;

  designerStore.removeSkill(id);
  if (designerStore.currentSkillId === id) {
    designerStore.currentSkillId = null;
  }
}

/** 开始编辑技能名称 */
function startEditName(): void {
  if (!currentSkill.value) return;
  editingName.value = currentSkill.value.name;
  isEditing.value = true;
}

/** 保存技能名称 */
function saveEditName(): void {
  if (!currentSkill.value || !editingName.value.trim()) {
    isEditing.value = false;
    return;
  }

  designerStore.updateSkill(currentSkill.value.id, {
    name: editingName.value.trim(),
  });
  isEditing.value = false;
}

/** 取消编辑 */
function cancelEditName(): void {
  isEditing.value = false;
  editingName.value = "";
}

/** 处理键盘事件 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter") {
    saveEditName();
  } else if (event.key === "Escape") {
    cancelEditName();
  }
}

/** 处理步骤变化 */
function handleStepsChange(steps: SkillStep[]): void {
  if (currentSkill.value) {
    designerStore.updateSkill(currentSkill.value.id, { steps });
  }
}

/** 处理片段变化 */
function handleSegmentsChange(segments: TimelineSegment[]): void {
  if (currentSkill.value) {
    designerStore.updateSkill(currentSkill.value.id, { segments });
  }
}

/** 处理轨道变化 */
function handleTracksChange(tracks: TimelineTrack[]): void {
  if (currentSkill.value) {
    designerStore.updateSkill(currentSkill.value.id, { tracks });
  }
}

/** 处理帧变化 */
function handleFrameChange(frame: number): void {
  currentFrame.value = frame;
}

/** 处理播放状态变化 */
function handlePlayingChange(playing: boolean): void {
  isPlaying.value = playing;
}

/** 保存当前技能 */
function saveCurrentSkill(): void {
  if (!currentSkill.value) return;
  // 技能数据已经通过事件实时保存，这里只是触发一个保存确认
  designerStore.markDirty();
}

// ============ 监听 ============

// 监听当前技能变化
watch(
  () => designerStore.currentSkillId,
  () => {
    currentFrame.value = 0;
    isPlaying.value = false;
  },
);
</script>

<template>
  <div class="flex h-full w-full">
    <!-- 左侧技能列表 -->
    <div class="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 class="text-sm font-semibold text-slate-700">技能列表</h3>
        <button
          class="flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600"
          @click="openCreateDialog"
        >
          <AddOutlined class="size-3.5" />
          新建
        </button>
      </div>

      <!-- 技能列表 -->
      <div class="flex-1 overflow-auto">
        <div v-if="skills.length === 0" class="flex flex-col items-center justify-center p-8 text-slate-400">
          <TimelineOutlined class="mb-2 size-12 opacity-50" />
          <p class="text-sm">暂无技能</p>
          <p class="text-xs">点击上方按钮创建</p>
        </div>

        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="skill in skills"
            :key="skill.id"
            class="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
            :class="{ 'bg-indigo-50': designerStore.currentSkillId === skill.id }"
            @click="selectSkill(skill)"
          >
            <!-- 技能图标 -->
            <div
              class="flex size-10 items-center justify-center rounded-lg bg-slate-100"
              :class="{ 'bg-indigo-100': designerStore.currentSkillId === skill.id }"
            >
              <TimelineOutlined
                class="size-5"
                :class="designerStore.currentSkillId === skill.id ? 'text-indigo-500' : 'text-slate-400'"
              />
            </div>

            <!-- 技能信息 -->
            <div class="min-w-0 flex-1">
              <p
                class="truncate text-sm font-medium"
                :class="designerStore.currentSkillId === skill.id ? 'text-indigo-700' : 'text-slate-700'"
              >
                {{ skill.name }}
              </p>
              <p class="text-xs text-slate-400">
                {{ skill.steps.length }} 步骤 · {{ skill.tracks.length }} 轨道
              </p>
            </div>

            <!-- 操作按钮 -->
            <button
              class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="删除"
              @click.stop="deleteSkill(skill.id)"
            >
              <DeleteOutlined class="size-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- 当前技能编辑区 -->
      <div v-if="currentSkill" class="border-t border-slate-200 bg-slate-50 p-4">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500">当前:</span>
            <!-- 名称编辑 -->
            <template v-if="isEditing">
              <input
                v-model="editingName"
                type="text"
                class="w-24 rounded border border-indigo-300 bg-white px-2 py-1 text-sm outline-none"
                autofocus
                @keydown="handleKeydown"
                @blur="saveEditName"
              />
            </template>
            <template v-else>
              <span class="text-sm font-medium text-slate-700">{{ currentSkill.name }}</span>
              <button
                class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                title="编辑名称"
                @click="startEditName"
              >
                <EditOutlined class="size-3.5" />
              </button>
            </template>
          </div>

          <!-- 保存按钮 -->
          <button
            class="flex items-center gap-1 rounded-lg bg-green-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-green-600"
            @click="saveCurrentSkill"
          >
            <SaveOutlined class="size-3" />
            保存
          </button>
        </div>

        <!-- 技能信息摘要 -->
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="rounded-lg bg-white p-2">
            <span class="text-slate-500">帧数:</span>
            <span class="ml-1 text-slate-700">{{ currentSkill.totalFrames }}</span>
          </div>
          <div class="rounded-lg bg-white p-2">
            <span class="text-slate-500">FPS:</span>
            <span class="ml-1 text-slate-700">{{ currentSkill.fps }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧编辑区域 -->
    <div class="flex min-w-0 flex-1 flex-col bg-slate-100">
      <template v-if="currentSkill">
        <!-- 预览画布 -->
        <div class="h-80 shrink-0 border-b border-slate-200 p-4">
          <PreviewCanvas
            :fps="fps"
            :total-frames="totalFrames"
            :segments="currentSegments"
            :steps="currentSteps"
            :width="600"
            :height="280"
            @frame-change="handleFrameChange"
            @playing-change="handlePlayingChange"
          />
        </div>

        <!-- 时间轴编辑器 -->
        <div class="min-h-0 flex-1">
          <Timeline
            :fps="fps"
            :total-frames="totalFrames"
            @steps-change="handleStepsChange"
            @segments-change="handleSegmentsChange"
            @tracks-change="handleTracksChange"
          />
        </div>
      </template>

      <!-- 空状态 -->
      <div v-else class="flex h-full items-center justify-center">
        <div class="text-center text-slate-400">
          <TimelineOutlined class="mx-auto mb-4 size-16 opacity-50" />
          <p class="mb-2 text-lg">请选择或创建技能</p>
          <p class="text-sm">在左侧列表中选择一个技能，或点击"新建"按钮创建</p>
        </div>
      </div>
    </div>

    <!-- 新建对话框 -->
    <Teleport to="body">
      <div
        v-if="showCreateDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="closeCreateDialog"
      >
        <div class="w-80 rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-semibold text-slate-800">新建技能</h3>

          <div class="mb-4">
            <label class="mb-1.5 block text-sm text-slate-600">技能名称</label>
            <input
              v-model="newSkillName"
              type="text"
              placeholder="输入技能名称"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-300 focus:bg-white"
              autofocus
              @keydown.enter="createSkill"
            />
          </div>

          <div class="flex justify-end gap-2">
            <button
              class="rounded-lg px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
              @click="closeCreateDialog"
            >
              取消
            </button>
            <button
              class="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
              :disabled="!newSkillName.trim()"
              @click="createSkill"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
