import { ref, computed, type Ref } from "vue";

/**
 * 雪碧图帧信息
 */
export interface SpriteFrame {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 雪碧图配置选项
 */
export interface SpriteSheetOptions {
  rows?: Ref<number>;
  cols?: Ref<number>;
  frameCount?: Ref<number | undefined>;
}

/**
 * useSpriteSheet 返回类型
 */
export interface UseSpriteSheetReturn {
  // 状态
  imageUrl: Ref<string>;
  imageElement: Ref<HTMLImageElement | null>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  rows: Ref<number>;
  cols: Ref<number>;
  frameCount: Ref<number | undefined>;

  // 计算属性
  frameWidth: Ref<number>;
  frameHeight: Ref<number>;
  totalFrames: Ref<number>;
  frames: Ref<SpriteFrame[]>;

  // 方法
  loadImage: (url: string) => Promise<void>;
  loadFromFile: (file: File) => Promise<void>;
  setGridSize: (rows: number, cols: number) => void;
  setFrameCount: (count: number | undefined) => void;
  getFrameAt: (index: number) => SpriteFrame | null;
  reset: () => void;
}

/**
 * 雪碧图解析 Composable
 * 实现图片加载、网格切割、帧序列生成
 *
 * @param options - 可选的初始配置
 * @returns 雪碧图状态和方法
 */
export function useSpriteSheet(options?: SpriteSheetOptions): UseSpriteSheetReturn {
  // ============ 状态 ============

  /** 图片 URL */
  const imageUrl = ref("");

  /** 图片元素 */
  const imageElement = ref<HTMLImageElement | null>(null);

  /** 加载状态 */
  const isLoading = ref(false);

  /** 错误信息 */
  const error = ref<string | null>(null);

  /** 行数 */
  const rows = options?.rows ?? ref(1);

  /** 列数 */
  const cols = options?.cols ?? ref(1);

  /** 帧数（可选，默认为 rows * cols） */
  const frameCount = options?.frameCount ?? ref<number | undefined>(undefined);

  // ============ 计算属性 ============

  /** 单帧宽度 */
  const frameWidth = computed(() => {
    if (!imageElement.value || cols.value <= 0) return 0;
    return Math.floor(imageElement.value.naturalWidth / cols.value);
  });

  /** 单帧高度 */
  const frameHeight = computed(() => {
    if (!imageElement.value || rows.value <= 0) return 0;
    return Math.floor(imageElement.value.naturalHeight / rows.value);
  });

  /** 总帧数 */
  const totalFrames = computed(() => {
    const maxFrames = rows.value * cols.value;
    return frameCount.value !== undefined ? Math.min(frameCount.value, maxFrames) : maxFrames;
  });

  /** 帧序列 */
  const frames = computed<SpriteFrame[]>(() => {
    if (!imageElement.value || frameWidth.value <= 0 || frameHeight.value <= 0) {
      return [];
    }

    const result: SpriteFrame[] = [];
    const count = totalFrames.value;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols.value);
      const col = i % cols.value;

      result.push({
        index: i,
        x: col * frameWidth.value,
        y: row * frameHeight.value,
        width: frameWidth.value,
        height: frameHeight.value,
      });
    }

    return result;
  });

  // ============ 方法 ============

  /**
   * 从 URL 加载图片
   */
  async function loadImage(url: string): Promise<void> {
    if (!url) {
      error.value = "图片 URL 不能为空";
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("图片加载失败"));
        img.src = url;
      });

      imageUrl.value = url;
      imageElement.value = img;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "图片加载失败";
      imageElement.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 从文件加载图片
   */
  async function loadFromFile(file: File): Promise<void> {
    if (!file) {
      error.value = "文件不能为空";
      return;
    }

    if (!file.type.startsWith("image/")) {
      error.value = "请选择图片文件";
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const url = URL.createObjectURL(file);
      await loadImage(url);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "文件读取失败";
      imageElement.value = null;
      isLoading.value = false;
    }
  }

  /**
   * 设置网格大小
   */
  function setGridSize(newRows: number, newCols: number): void {
    if (newRows > 0) rows.value = newRows;
    if (newCols > 0) cols.value = newCols;
  }

  /**
   * 设置帧数
   */
  function setFrameCount(count: number | undefined): void {
    frameCount.value = count;
  }

  /**
   * 获取指定索引的帧
   */
  function getFrameAt(index: number): SpriteFrame | null {
    if (index < 0 || index >= frames.value.length) {
      return null;
    }
    return frames.value[index] ?? null;
  }

  /**
   * 重置状态
   */
  function reset(): void {
    // 释放 blob URL
    if (imageUrl.value.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl.value);
    }

    imageUrl.value = "";
    imageElement.value = null;
    isLoading.value = false;
    error.value = null;
    rows.value = 1;
    cols.value = 1;
    frameCount.value = undefined;
  }

  return {
    // 状态
    imageUrl,
    imageElement,
    isLoading,
    error,
    rows,
    cols,
    frameCount,
    // 计算属性
    frameWidth,
    frameHeight,
    totalFrames,
    frames,
    // 方法
    loadImage,
    loadFromFile,
    setGridSize,
    setFrameCount,
    getFrameAt,
    reset,
  };
}
