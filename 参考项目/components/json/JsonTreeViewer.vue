<template>
  <div class="json-tree-viewer font-mono">
    <div v-if="props.data == null" class="json-tree-empty">
      暂无可显示的 JSON 数据
    </div>
    <div v-else class="json-tree-list">
      <JsonTreeNode
        :data="props.data"
        :depth="0"
        :path="''"
        :is-last="true"
        :expand-all="props.expandAll"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import JsonTreeNode from "./JsonTreeNode.vue";

interface Props {
  /** JSON 数据 */
  data: unknown;
  /** 是否展开所有节点 */
  expandAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  expandAll: false,
});
</script>

<style scoped>
.json-tree-viewer {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
    "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.6;
}

.json-tree-list {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 0.5rem;
}

.json-tree-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: rgba(226, 232, 240, 0.8);
  text-align: center;
  padding: 1rem;
}
</style>
