<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import DesignerTabLayout from "@/components/designer/DesignerTabLayout.vue";
import DesignerLibraryPanel from "@/components/designer/DesignerLibraryPanel.vue";
import { DesignerCanvasPreview, DesignerTimeline } from "@/components/designer";
import CharacterTabPanel from "./CharacterTabPanel.vue";
import {
  DEFAULT_CHARACTER,
  DEFAULT_EFFECT,
  createDefaultSkill,
} from "@/core/config/defaults";
import type {
  CharacterConfig,
  EffectConfig,
  SkillDesign,
  TimelineEvent,
} from "@/core/designer/types";
import { useDesignerLibraryPanel } from "@/composables/useDesignerLibraryPanel";

const props = defineProps<{
  config: CharacterConfig;
}>();

const emit = defineEmits<{
  (e: "update:config", config: CharacterConfig): void;
}>();

// 直接使用 props.config，因为父组件已经传递了 reactive 对象
const characterConfig = props.config;
const previewCharacterConfig = ref<CharacterConfig>({ ...DEFAULT_CHARACTER });
const playing = ref(false);
const currentFrame = ref(0);
const fps = ref(25);
const timelineEvents = ref<TimelineEvent[]>([]);

type DesignerCanvasPreviewInstance = InstanceType<typeof DesignerCanvasPreview>;
const canvasPreviewRef = ref<DesignerCanvasPreviewInstance | null>(null);

const previewConfig = computed(() => previewCharacterConfig.value);

const basePreviewFrames = computed(() => {
  const config = previewConfig.value;
  return config.frameCount || config.rows * config.cols;
});

const previewTotalFrames = computed(() => basePreviewFrames.value);

const refreshPreview = () => {
  previewCharacterConfig.value = { ...characterConfig };
  currentFrame.value = 0;
  playing.value = false;
  canvasPreviewRef.value?.triggerRefresh();
};

const handleCanvasRefresh = () => {
  currentFrame.value = 0;
  playing.value = false;
};

const addTimelineEvent = (event: TimelineEvent) => {
  timelineEvents.value.push(event);
};

const removeTimelineEvent = (index: number) => {
  timelineEvents.value.splice(index, 1);
};

const updateTimelineEvent = (index: number, event: TimelineEvent) => {
  timelineEvents.value[index] = event;
};

// 注意：由于 props.config 是 reactive 的，直接修改属性会自动同步到父组件
// 不需要 watch，因为 characterConfig 和 props.config 指向同一个对象

const activeTool = ref<"character">("character");
const effectConfig = reactive<EffectConfig>({ ...DEFAULT_EFFECT });
const skill = reactive<SkillDesign>(createDefaultSkill());
const selectedStepIndex = ref<number | null>(null);

const {
  showLibraryPanel,
  activeLibraryList,
  activeLibraryTitle,
  activeLibraryDescription,
  selectedLibraryId,
  libraryStatus,
  selectLibraryItem,
  saveCurrentToLibrary,
  deleteLibraryItem,
  createNewConfig,
  clearSelection,
} = useDesignerLibraryPanel({
  activeTool,
  characterConfig,
  effectConfig,
  skill,
  selectedStepIndex,
  refreshPreview,
});

refreshPreview();
</script>

<template>
  <DesignerTabLayout>
    <template #left>
      <DesignerLibraryPanel
        v-if="showLibraryPanel"
        :items="activeLibraryList"
        :title="activeLibraryTitle"
        :description="activeLibraryDescription"
        :selected-id="selectedLibraryId"
        :status="libraryStatus"
        @save="saveCurrentToLibrary"
        @create="createNewConfig"
        @clear="clearSelection"
        @select="selectLibraryItem"
        @delete="deleteLibraryItem"
      />

      <CharacterTabPanel
        :config="characterConfig"
        :refresh-preview="refreshPreview"
      />
    </template>

    <template #right>
      <div class="flex h-full w-full flex-1 flex-col overflow-hidden">
        <div class="flex-2 w-full overflow-hidden">
          <DesignerCanvasPreview
            ref="canvasPreviewRef"
            :config="previewConfig"
            :fps="fps"
            :current-frame="currentFrame"
            :playing="playing"
            @update:fps="fps = $event"
            @update:current-frame="currentFrame = $event"
            @update:playing="playing = $event"
            @refresh="handleCanvasRefresh"
          />
        </div>

        <div class="h-48 w-full shrink-0">
          <DesignerTimeline
            :total-frames="previewTotalFrames"
            :current-frame="currentFrame"
            :fps="fps"
            :playing="playing"
            :events="timelineEvents"
            @update:current-frame="currentFrame = $event"
            @update:fps="fps = $event"
            @update:playing="playing = $event"
            @add-event="addTimelineEvent"
            @remove-event="removeTimelineEvent"
            @update-event="updateTimelineEvent"
          />
        </div>
      </div>
    </template>
  </DesignerTabLayout>
</template>
