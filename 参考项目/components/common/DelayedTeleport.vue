<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";

interface Props {
  active: boolean;
  to?: string;
  delay?: number;
  waitForTarget?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  to: "#designer-tool-anchor",
  delay: 100,
  waitForTarget: false,
});

const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

const clearTimer = () => {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
};

const showWhenReady = () => {
  if (props.waitForTarget && typeof document !== "undefined") {
    const targetExists = !!document.querySelector(props.to);
    if (!targetExists) {
      timer = setTimeout(showWhenReady, 50);
      return;
    }
  }
  visible.value = true;
  timer = null;
};

const schedule = () => {
  clearTimer();
  if (!props.active) {
    visible.value = false;
    return;
  }

  visible.value = false;
  timer = setTimeout(showWhenReady, props.delay);
};

watch(
  () => [props.active, props.to, props.waitForTarget, props.delay] as const,
  () => {
    schedule();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearTimer();
});
</script>

<template>
  <Teleport v-if="visible" :to="props.to">
    <slot />
  </Teleport>
</template>
