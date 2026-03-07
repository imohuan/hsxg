# 可折叠组件使用指南

## CollapsibleSection

可折叠的菜单项组件，参考图1的折叠UI样式（亮色主题），带圆角和独立边框。

### 特点

- 独立的圆角边框容器
- 亮色主题（白色背景 + 浅灰色边框）
- 箭头图标指示展开/收起状态
- 平滑的展开/收起动画
- 支持 hover 交互效果

### 使用示例

```vue
<script setup lang="ts">
import CollapsibleSection from "@/components/common/CollapsibleSection.vue";
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 多个可折叠项，每个都有独立的圆角边框 -->
    <CollapsibleSection title="基本属性" :default-expanded="true">
      <div class="space-y-4">
        <label class="block">
          <span class="mb-1.5 block text-xs font-medium text-slate-600">名称</span>
          <input
            type="text"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </CollapsibleSection>

    <CollapsibleSection title="高级设置" :default-expanded="false">
      <div>高级配置内容</div>
    </CollapsibleSection>

    <CollapsibleSection title="特效设置" :default-expanded="false">
      <div>特效相关配置</div>
    </CollapsibleSection>
  </div>
</template>
```

### Props

| 属性            | 类型      | 默认值  | 说明                         |
| --------------- | --------- | ------- | ---------------------------- |
| title           | `string`  | -       | 标题（必填）                 |
| defaultExpanded | `boolean` | `false` | 默认是否展开                 |
| disabled        | `boolean` | `false` | 是否禁用折叠功能（始终展开） |

---

## CollapsibleSidebar

整体侧边栏容器，支持展开/收起切换。

### 使用示例

```vue
<script setup lang="ts">
import CollapsibleSidebar from "@/components/common/CollapsibleSidebar.vue";
import CollapsibleSection from "@/components/common/CollapsibleSection.vue";
</script>

<template>
  <CollapsibleSidebar storage-key="my-sidebar" :default-collapsed="false" width="320px">
    <div class="flex flex-col gap-3 p-4">
      <CollapsibleSection title="配置1" :default-expanded="true">
        <!-- 内容 -->
      </CollapsibleSection>

      <CollapsibleSection title="配置2" :default-expanded="true">
        <!-- 内容 -->
      </CollapsibleSection>
    </div>
  </CollapsibleSidebar>
</template>
```

### Props

| 属性             | 类型      | 默认值              | 说明                     |
| ---------------- | --------- | ------------------- | ------------------------ |
| storageKey       | `string`  | `sidebar-collapsed` | 本地存储键名，用于持久化 |
| defaultCollapsed | `boolean` | `false`             | 默认是否折叠             |
| width            | `string`  | `320px`             | 侧边栏宽度（展开时）     |

---

## 完整示例：技能配置页面

```vue
<script setup lang="ts">
import CollapsibleSection from "@/components/common/CollapsibleSection.vue";
import type { SkillConfig } from "@/types";

const props = defineProps<{
  config: SkillConfig;
}>();

const emit = defineEmits<{
  "update:config": [config: SkillConfig];
}>();
</script>

<template>
  <!-- 左侧面板容器 -->
  <div class="flex h-full flex-col gap-3 overflow-auto">
    <!-- 技能列表 -->
    <CollapsibleSection title="技能列表" :default-expanded="true">
      <div class="space-y-2">
        <!-- 技能项 -->
      </div>
    </CollapsibleSection>

    <!-- 动作步骤 -->
    <CollapsibleSection title="动作步骤" :default-expanded="true">
      <div class="flex flex-col gap-2">
        <!-- 步骤按钮 -->
      </div>
    </CollapsibleSection>

    <!-- 步骤配置 -->
    <CollapsibleSection title="步骤配置" :default-expanded="true">
      <div class="space-y-4">
        <!-- 配置表单 -->
      </div>
    </CollapsibleSection>

    <!-- 技能配置 -->
    <CollapsibleSection title="技能配置" :default-expanded="true">
      <div class="space-y-4">
        <!-- 技能属性配置 -->
      </div>
    </CollapsibleSection>
  </div>
</template>
```

---

## 样式说明

- 每个 `CollapsibleSection` 都有独立的圆角边框（`rounded-xl`）
- 使用亮色主题（白色背景 + 浅灰色边框）
- 折叠图标使用 `KeyboardArrowRightOutlined` 和 `KeyboardArrowDownOutlined`
- 标题栏支持 hover 效果
- 内容区域使用平滑的展开/收起动画
- 多个 `CollapsibleSection` 之间使用 `gap-3` 间隔

---

## 注意事项

1. 使用 `gap-3` 在多个 `CollapsibleSection` 之间添加间隔
2. 每个 `CollapsibleSection` 都是独立的圆角容器
3. 使用 `defaultExpanded` 控制初始展开状态
4. 使用 `disabled` 可以让某个区域始终展开（不可折叠）
5. 外层容器建议使用 `flex flex-col gap-3` 布局
