<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { SpriteSheetPreviewConfig } from "@/core/designer/types";
import { PreviewPlayer } from "@/core/designer/PreviewPlayer";

const props = defineProps<{
  config: SpriteSheetPreviewConfig;
  playing: boolean;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const player = new PreviewPlayer(canvasRef);

onMounted(() => {
  player.bindConfig(computed(() => props.config));
  player.start();
});

onBeforeUnmount(() => {
  player.stop();
});

watch(
  () => props.playing,
  (playing) => {
    if (playing && !player.isPlaying()) {
      player.togglePlay();
    } else if (!playing && player.isPlaying()) {
      player.togglePlay();
    }
  },
  { immediate: true }
);
</script>

<template>
  <canvas
    ref="canvasRef"
    width="800"
    height="600"
    class="max-w-full max-h-full rounded-xl border border-white/10 shadow-2xl"
    style="object-fit: contain"
  />
</template>
