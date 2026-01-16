<script setup lang="ts">
/**
 * @file 菱形操作菜单组件
 * @description 战斗中央菱形排列的操作按钮，包含攻击、技能、招降、物品、招将、防御、逃跑
 * 两列交错排列，每个按钮旋转 45 度实现菱形效果
 */
import { computed } from "vue";
import {
  GavelOutlined,
  AutoFixHighOutlined,
  HandshakeOutlined,
  LocalHospitalOutlined,
  GroupAddOutlined,
  ShieldOutlined,
  DirectionsRunOutlined,
} from "@vicons/material";
import type { DiamondMenuItem } from "@/types";

// ============ Props & Emits ============

const props = withDefaults(
  defineProps<{
    /** 是否禁用菜单 */
    disabled?: boolean;
    /** 禁用的菜单项 key 列表 */
    disabledItems?: string[];
    /** 按钮大小（像素） */
    itemSize?: number;
    /** 按钮间距（像素）- Requirements: 3.1 至少 8px */
    gap?: number;
  }>(),
  {
    disabled: false,
    disabledItems: () => [],
    itemSize: 56,
    gap: 10, // 默认 10px，确保按钮间距足够
  },
);

const emit = defineEmits<{
  /** 菜单项点击事件 */
  select: [key: string];
}>();

// ============ 菜单项配置 ============

/** 菱形菜单项配置 */
const DIAMOND_MENU_ITEMS: DiamondMenuItem[] = [
  { key: "attack", label: "攻击", row: 0, col: 0 },
  { key: "skill", label: "技能", row: 0, col: 1 },
  { key: "surrender", label: "招降", row: 1, col: 0 },
  { key: "item", label: "物品", row: 1, col: 1 },
  { key: "summon", label: "招将", row: 2, col: 0 },
  { key: "defend", label: "防御", row: 2, col: 1 },
  { key: "escape", label: "逃跑", row: 3, col: 0 },
];

/** 图标映射 */
const ICON_MAP: Record<string, unknown> = {
  attack: GavelOutlined,
  skill: AutoFixHighOutlined,
  surrender: HandshakeOutlined,
  item: LocalHospitalOutlined,
  summon: GroupAddOutlined,
  defend: ShieldOutlined,
  escape: DirectionsRunOutlined,
};

/** 颜色配置类型 */
interface ColorConfig {
  text: string;
  bg: string;
  hover: string;
  border: string;
}

/** 默认颜色 */
const DEFAULT_COLOR: ColorConfig = {
  text: "text-slate-600",
  bg: "bg-slate-50",
  hover: "hover:bg-slate-100",
  border: "border-slate-200",
};

/** 颜色映射 */
const COLOR_MAP: Record<string, ColorConfig> = {
  attack: {
    text: "text-red-600",
    bg: "bg-red-50",
    hover: "hover:bg-red-100",
    border: "border-red-200",
  },
  skill: {
    text: "text-purple-600",
    bg: "bg-purple-50",
    hover: "hover:bg-purple-100",
    border: "border-purple-200",
  },
  surrender: {
    text: "text-amber-600",
    bg: "bg-amber-50",
    hover: "hover:bg-amber-100",
    border: "border-amber-200",
  },
  item: {
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    hover: "hover:bg-emerald-100",
    border: "border-emerald-200",
  },
  summon: {
    text: "text-indigo-600",
    bg: "bg-indigo-50",
    hover: "hover:bg-indigo-100",
    border: "border-indigo-200",
  },
  defend: {
    text: "text-blue-600",
    bg: "bg-blue-50",
    hover: "hover:bg-blue-100",
    border: "border-blue-200",
  },
  escape: DEFAULT_COLOR,
};

/** 获取颜色配置 */
function getColorConfig(key: string): ColorConfig {
  return COLOR_MAP[key] ?? DEFAULT_COLOR;
}

// ============ 计算属性 ============

/**
 * 计算菜单项位置和样式
 * Requirements: 3.1-3.5 - 菱形菜单布局优化
 */
const menuItems = computed(() => {
  const { itemSize, gap } = props;
  // 旋转后的对角线长度（按钮实际占用的宽高）
  const diagonal = itemSize * Math.SQRT2;

  // 列间距：两个按钮中心之间的水平距离
  // 确保按钮边缘之间至少有 gap 像素的间距
  // 两个按钮边缘间距 = 中心距离 - diagonal/2 - diagonal/2 = 中心距离 - diagonal
  // 所以中心距离 = diagonal + gap
  const columnOffset = diagonal + gap;

  // 行间距：两个按钮中心之间的垂直距离
  // 同样确保边缘间距至少为 gap
  const rowOffset = diagonal * 0.6 + gap;

  // 第二列的 Y 偏移（交错效果）
  const staggerY = rowOffset / 2;

  return DIAMOND_MENU_ITEMS.map((item) => {
    // 计算相对于中心的位置
    const x = item.col === 0 ? -columnOffset / 2 : columnOffset / 2;
    const baseY = (item.row - 1.5) * rowOffset;
    const y = baseY + (item.col === 1 ? staggerY : 0);

    const isDisabled = props.disabled || props.disabledItems.includes(item.key);
    const colors = getColorConfig(item.key);

    return {
      ...item,
      x,
      y,
      icon: ICON_MAP[item.key],
      colors,
      isDisabled,
    };
  });
});

/**
 * 计算容器尺寸
 * Requirements: 3.2 - 两列交错排列
 */
const containerStyle = computed(() => {
  const { itemSize, gap } = props;
  const diagonal = itemSize * Math.SQRT2;
  const columnOffset = diagonal + gap;
  const rowOffset = diagonal * 0.6 + gap;
  // 4 行 + 交错偏移 + 额外边距
  const height = rowOffset * 4 + diagonal + gap;
  // 2 列 + 额外边距
  const width = columnOffset + diagonal + gap;

  return {
    width: `${width}px`,
    height: `${height}px`,
  };
});

// ============ 方法 ============

function handleClick(key: string, isDisabled: boolean): void {
  if (isDisabled) return;
  emit("select", key);
}
</script>

<template>
  <div class="relative" :style="containerStyle">
    <!-- 菜单项 -->
    <button
      v-for="item in menuItems"
      :key="item.key"
      class="absolute flex flex-col items-center justify-center border-2 shadow-sm transition-all duration-200"
      :class="[
        item.colors.bg,
        item.colors.border,
        item.isDisabled
          ? 'cursor-not-allowed opacity-40'
          : [item.colors.hover, 'cursor-pointer hover:scale-105 hover:shadow-md'],
      ]"
      :style="{
        width: `${itemSize}px`,
        height: `${itemSize}px`,
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${item.x}px), calc(-50% + ${item.y}px)) rotate(45deg)`,
        borderRadius: '8px',
      }"
      :disabled="item.isDisabled"
      :title="item.label"
      @click="handleClick(item.key, item.isDisabled)"
    >
      <!-- 内容需要反向旋转以保持正常显示 -->
      <div class="flex flex-col items-center gap-0.5" style="transform: rotate(-45deg)">
        <component :is="item.icon" class="size-5" :class="item.colors.text" />
        <span class="text-xs font-medium" :class="item.colors.text">{{ item.label }}</span>
      </div>
    </button>
  </div>
</template>
