<template>
  <div class="json-tree-node-wrapper">
    <div class="json-tree-node">
      <div class="json-indent">
        <template v-for="i in depth" :key="i">
          <div
            class="json-indent-unit"
            :class="{
              'has-line': shouldShowLineAtLevel(i - 1),
            }"
          ></div>
        </template>
      </div>

      <span class="json-content">
        <template v-if="keyName !== null">
          <span class="json-key">
            <span
              class="json-key-content"
              :class="{ 'can-toggle': isExpandable }"
              @click="handleKeyClick"
            >
              "{{ keyName }}"
            </span>
            <span class="json-colon">: </span>
          </span>
        </template>

        <template v-if="isExpandable">
          <span class="json-brackets cursor-pointer" @click="toggleExpand">
            {{ openBracket }}
          </span>

          <template v-if="!isExpanded">
            <span
              class="json-collapsed-content cursor-pointer"
              @click="toggleExpand"
            >
              ...
            </span>
            <span class="json-brackets cursor-pointer" @click="toggleExpand">
              {{ closeBracket }}
            </span>
            <span class="json-item-count"> // {{ itemCountLabel }} </span>
            <span v-if="!isLast" class="json-comma">,</span>
          </template>
        </template>

        <template v-else>
          <span class="json-value" :class="valueClass">
            {{ formattedValue }}
          </span>
          <span v-if="!isLast" class="json-comma">,</span>
        </template>
      </span>
    </div>

    <template v-if="isExpanded && isExpandable">
      <JsonTreeNode
        v-for="(childValue, childKey, index) in childEntries"
        :key="getChildKey(childKey, index)"
        :data="childValue"
        :key-name="isArrayNode ? null : String(childKey)"
        :depth="depth + 1"
        :path="getChildPath(childKey, index)"
        :is-last="isLastChild(index)"
        :parent-is-last="isLast"
        :expand-all="props.expandAll"
      />
      <div class="json-tree-node">
        <div class="json-indent">
          <template v-for="i in depth" :key="i">
            <div
              class="json-indent-unit"
              :class="{
                'has-line': shouldShowLineAtLevel(i - 1),
              }"
            ></div>
          </template>
        </div>
        <span class="json-content">
          <span class="json-brackets cursor-pointer" @click="toggleExpand">
            {{ closeBracket }}
          </span>
          <span v-if="!isLast" class="json-comma">,</span>
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

defineOptions({ name: "JsonTreeNode" });

interface Props {
  /** 节点数据 */
  data: unknown;
  /** 键名（null 表示数组元素） */
  keyName?: string | null;
  /** 嵌套深度 */
  depth?: number;
  /** JSON 路径 */
  path?: string;
  /** 是否为最后一个元素 */
  isLast?: boolean;
  /** 父节点是否为最后一个 */
  parentIsLast?: boolean;
  /** 是否展开所有节点 */
  expandAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  keyName: null,
  depth: 0,
  path: "",
  isLast: true,
  parentIsLast: true,
  expandAll: false,
});

const isExpanded = ref(props.expandAll || props.depth < 2);

watch(
  () => props.expandAll,
  (value) => {
    if (value) {
      isExpanded.value = true;
    }
  }
);

const isExpandable = computed(() => {
  return props.data !== null && typeof props.data === "object";
});

const handleKeyClick = () => {
  if (isExpandable.value) {
    toggleExpand();
  }
};

const isArrayNode = computed(() => Array.isArray(props.data));

const openBracket = computed(() => {
  if (Array.isArray(props.data)) return "[";
  if (typeof props.data === "object" && props.data !== null) return "{";
  return "";
});

const closeBracket = computed(() => {
  if (Array.isArray(props.data)) return "]";
  if (typeof props.data === "object" && props.data !== null) return "}";
  return "";
});

const childEntries = computed(() => {
  if (!isExpandable.value) return [];
  if (Array.isArray(props.data)) {
    return props.data;
  }
  return props.data as Record<string, unknown>;
});

const itemCountLabel = computed(() => {
  if (Array.isArray(props.data)) {
    const count = props.data.length;
    return count === 1 ? "1 item" : `${count} items`;
  }
  if (typeof props.data === "object" && props.data !== null) {
    const count = Object.keys(props.data).length;
    return count === 1 ? "1 key" : `${count} keys`;
  }
  return "";
});

const getChildKey = (key: string | number, index: number) => {
  if (isArrayNode.value) return index;
  return String(key);
};

const getChildPath = (key: string | number, index: number) => {
  if (isArrayNode.value) {
    return props.path ? `${props.path}[${index}]` : `[${index}]`;
  }
  const keyStr = String(key);
  return props.path ? `${props.path}.${keyStr}` : keyStr;
};

const isLastChild = (index: number) => {
  const entries = childEntries.value;
  if (Array.isArray(entries)) {
    return index === entries.length - 1;
  }
  const keys = Object.keys(entries);
  return index === keys.length - 1;
};

const shouldShowLineAtLevel = (level: number) => {
  if (!props.isLast) return true;

  if (props.isLast && props.parentIsLast === false) {
    return level < props.depth;
  }

  if (props.isLast && isExpandable.value && isExpanded.value) {
    if (props.depth === 0) {
      return false;
    }
    return level < props.depth;
  }

  if (props.isLast && props.depth > 0) {
    return level < props.depth;
  }

  return false;
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const dataType = computed(() => {
  if (props.data === null) return "null";
  if (Array.isArray(props.data)) return "array";
  return typeof props.data;
});

const formattedValue = computed(() => {
  switch (dataType.value) {
    case "string":
      return `"${props.data}"`;
    case "null":
      return "null";
    case "boolean":
    case "number":
      return String(props.data);
    default:
      return String(props.data);
  }
});

const valueClass = computed(() => {
  const typeStyleMap: Record<string, string> = {
    string: "json-value-string",
    number: "json-value-number",
    boolean: "json-value-boolean",
    null: "json-value-null",
  };
  return typeStyleMap[dataType.value] || "";
});
</script>

<style scoped>
.json-tree-node {
  display: flex;
  align-items: flex-start;
  min-height: 26px;
  position: relative;
  width: 100%;
}

.json-indent {
  display: flex;
  flex-shrink: 0;
  position: relative;
}

.json-indent-unit {
  width: 20px;
  position: relative;
  min-height: 26px;
}

.json-tree-node-wrapper {
  position: relative;
}

.json-indent-unit.has-line {
  position: relative;
}

.json-indent-unit.has-line::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 0;
  width: 1px;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(148, 163, 184, 0.35) 0,
    rgba(148, 163, 184, 0.35) 4px,
    transparent 4px,
    transparent 8px
  );
  background-size: 1px 8px;
  pointer-events: none;
  z-index: 0;
}

/* 虚线延伸到父容器底部（包含所有子节点） */
.json-tree-node-wrapper .json-indent-unit.has-line::before {
  bottom: 0;
  height: 100%;
}

/* 确保虚线在每个节点行都能完整显示 */
.json-tree-node .json-indent-unit.has-line::before {
  height: 100%;
}

.json-content {
  flex: 1;
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
  min-width: 0;
}

.json-brackets {
  color: rgb(203 213 225);
  font-weight: 500;
  user-select: none;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.15s;
}

.json-brackets:hover {
  /** background-color: rgb(239 246 255); */
  color: rgb(37 99 235);
}

.json-collapsed-content {
  user-select: none;
}

.json-item-count {
  font-style: italic;
  user-select: none;
  font-size: 0.9em;
}

.json-key {
  color: rgb(139 92 246);
}

.json-key-content {
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 3px;
  transition: background-color 0.15s;
  display: inline-block;
  cursor: default;
}

.json-key-content.can-toggle {
  cursor: pointer;
}

.json-key-content:hover:not(.is-highlight) {
  background-color: rgb(30 41 59 / 0.2);
}

.json-key-content.can-toggle:hover:not(.is-highlight) {
  background-color: rgb(30 41 59 / 0.5);
}

.json-key-content.is-dragging {
  opacity: 0.5;
}

.json-key-content.is-highlight {
  background-color: rgb(219 234 254) !important;
  opacity: 1 !important;
}

.json-colon {
  color: rgb(148 163 184);
  margin: 0 4px;
}

.json-value {
  color: rgb(226 232 240);
  padding: 1px 4px;
  border-radius: 3px;
  transition: background-color 0.15s;
  display: inline-block;
}

.json-value.is-highlight {
  background-color: rgb(219 234 254) !important;
  opacity: 1 !important;
}

.json-value-string {
  color: rgb(74 222 128);
}

.json-value-number {
  color: rgb(125 211 252);
}

.json-value-boolean {
  color: rgb(251 146 60);
}

.json-value-null {
  color: rgb(203 213 225);
  font-style: italic;
}

.json-comma {
  color: rgb(100 116 139);
  margin-left: 4px;
}
</style>
