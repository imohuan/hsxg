<script setup lang="ts">
/**
 * @file JSON 配置面板组件
 * @description 实现配置的导入、导出、验证功能
 * Requirements: 6.1-6.4
 */
import { ref, computed, watch } from "vue";
import {
  FileDownloadOutlined,
  FileUploadOutlined,
  ContentCopyOutlined,
  CheckOutlined,
  RefreshOutlined,
  WarningAmberOutlined,
  SaveOutlined,
  DeleteOutlined,
  ErrorOutlined,
} from "@vicons/material";
import { useConfigStore, type ValidationError } from "@/stores/config.store";
import { useDesignerStore } from "@/stores/designer.store";

// ============ Store ============

const configStore = useConfigStore();
const designerStore = useDesignerStore();

// ============ 状态 ============

const jsonText = ref("");
const validationErrors = ref<ValidationError[]>([]);
const copied = ref(false);
const importSuccess = ref(false);
const saveSuccess = ref(false);
const showValidationPanel = ref(false);

// ============ 计算属性 ============

/** JSON 格式是否有效 */
const isValidJson = computed(() => {
  if (!jsonText.value.trim()) return true;
  try {
    JSON.parse(jsonText.value);
    return true;
  } catch {
    return false;
  }
});

/** 是否有验证错误 */
const hasValidationErrors = computed(() => validationErrors.value.length > 0);

/** 配置统计信息 */
const stats = computed(() => configStore.stats);

/** 最后保存时间格式化 */
const lastSavedAtFormatted = computed(() => {
  if (!configStore.lastSavedAt) return "从未保存";
  return configStore.lastSavedAt.toLocaleString("zh-CN");
});

// ============ 方法 ============

/** 从 designer store 同步数据并生成 JSON */
function generateConfig(): void {
  // 先从 designer store 同步数据
  configStore.syncFromDesignerStore({
    characters: designerStore.characters,
    effects: designerStore.effects,
    skills: designerStore.skills,
  });
  // 生成 JSON
  jsonText.value = configStore.exportConfigAsJson();
  validationErrors.value = [];
}

/** 验证当前 JSON */
function validateJson(): void {
  if (!jsonText.value.trim()) {
    validationErrors.value = [{ path: "", message: "请输入 JSON 配置" }];
    showValidationPanel.value = true;
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText.value);
  } catch (e) {
    validationErrors.value = [
      { path: "", message: `JSON 解析失败: ${e instanceof Error ? e.message : "未知错误"}` },
    ];
    showValidationPanel.value = true;
    return;
  }

  const result = configStore.validateConfigDetailed(parsed);
  validationErrors.value = result.errors;
  showValidationPanel.value = true;
}

/** 导入配置 */
function importConfig(): void {
  if (!jsonText.value.trim()) {
    validationErrors.value = [{ path: "", message: "请输入 JSON 配置" }];
    showValidationPanel.value = true;
    return;
  }

  const result = configStore.importConfigFromJson(jsonText.value);
  if (!result.valid) {
    validationErrors.value = result.errors;
    showValidationPanel.value = true;
    return;
  }

  // 同步到 designer store
  const data = configStore.exportToDesignerStore();
  designerStore.importData(data);

  validationErrors.value = [];
  showValidationPanel.value = false;
  importSuccess.value = true;
  setTimeout(() => {
    importSuccess.value = false;
  }, 2000);
}

/** 复制到剪贴板 */
async function copyToClipboard(): Promise<void> {
  try {
    await navigator.clipboard.writeText(jsonText.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error("复制失败:", e);
  }
}

/** 下载 JSON 文件 */
function downloadJson(): void {
  if (!jsonText.value.trim()) {
    generateConfig();
  }
  const blob = new Blob([jsonText.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${configStore.projectName || "config"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 处理文件上传 */
async function handleFileUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const result = await configStore.importConfigFromFile(file);
  if (!result.valid) {
    validationErrors.value = result.errors;
    showValidationPanel.value = true;
  } else {
    // 同步到 designer store
    const data = configStore.exportToDesignerStore();
    designerStore.importData(data);
    // 更新 JSON 文本
    jsonText.value = configStore.exportConfigAsJson();
    validationErrors.value = [];
    showValidationPanel.value = false;
    importSuccess.value = true;
    setTimeout(() => {
      importSuccess.value = false;
    }, 2000);
  }

  input.value = "";
}

/** 格式化 JSON */
function formatJson(): void {
  if (!jsonText.value.trim()) return;
  try {
    const parsed = JSON.parse(jsonText.value);
    jsonText.value = JSON.stringify(parsed, null, 2);
    validationErrors.value = [];
  } catch (e) {
    validationErrors.value = [
      { path: "", message: `格式化失败: ${e instanceof Error ? e.message : "未知错误"}` },
    ];
    showValidationPanel.value = true;
  }
}

/** 保存到 localStorage */
function saveToLocalStorage(): void {
  // 先同步数据
  configStore.syncFromDesignerStore({
    characters: designerStore.characters,
    effects: designerStore.effects,
    skills: designerStore.skills,
  });

  const success = configStore.saveToLocalStorage();
  if (success) {
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 2000);
  }
}

/** 从 localStorage 加载 */
function loadFromLocalStorage(): void {
  const success = configStore.loadFromLocalStorage();
  if (success) {
    // 同步到 designer store
    const data = configStore.exportToDesignerStore();
    designerStore.importData(data);
    // 更新 JSON 文本
    jsonText.value = configStore.exportConfigAsJson();
    importSuccess.value = true;
    setTimeout(() => {
      importSuccess.value = false;
    }, 2000);
  }
}

/** 清除本地存储 */
function clearLocalStorage(): void {
  if (confirm("确定要清除本地存储的配置吗？此操作不可撤销。")) {
    configStore.clearLocalStorage();
  }
}

/** 重置所有配置 */
function resetAll(): void {
  if (confirm("确定要重置所有配置吗？此操作不可撤销。")) {
    configStore.reset();
    designerStore.reset();
    jsonText.value = "";
    validationErrors.value = [];
  }
}

// ============ 监听 ============

// 监听 designer store 变化，标记有未保存的更改
watch(
  () => [designerStore.characters, designerStore.effects, designerStore.skills],
  () => {
    configStore.markAsChanged();
  },
  { deep: true },
);
</script>

<template>
  <div class="flex h-full gap-4">
    <!-- 左侧面板 -->
    <div class="flex w-72 shrink-0 flex-col gap-4">
      <!-- 项目信息 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">项目信息</h3>
        </div>
        <div class="space-y-3 p-4">
          <label class="block">
            <span class="text-sm text-slate-600">项目名称</span>
            <input
              v-model="configStore.projectName"
              type="text"
              class="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-300 focus:bg-white"
            />
          </label>
          <label class="block">
            <span class="text-sm text-slate-600">版本号</span>
            <input
              v-model="configStore.version"
              type="text"
              class="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-300 focus:bg-white"
            />
          </label>
          <div class="text-xs text-slate-400">
            最后保存: {{ lastSavedAtFormatted }}
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">配置操作</h3>
        </div>
        <div class="flex flex-col gap-2 p-4">
          <button
            class="flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
            @click="generateConfig"
          >
            <RefreshOutlined class="size-4" />
            生成配置
          </button>

          <button
            class="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            @click="validateJson"
          >
            <CheckOutlined class="size-4" />
            验证配置
          </button>

          <button
            class="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            :class="{ 'border-emerald-300 bg-emerald-50 text-emerald-600': importSuccess }"
            @click="importConfig"
          >
            <CheckOutlined v-if="importSuccess" class="size-4" />
            <FileUploadOutlined v-else class="size-4" />
            {{ importSuccess ? "导入成功" : "导入配置" }}
          </button>
        </div>
      </div>

      <!-- 文件操作 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">文件操作</h3>
        </div>
        <div class="flex flex-col gap-2 p-4">
          <button
            class="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            :class="{ 'border-emerald-300 bg-emerald-50 text-emerald-600': copied }"
            @click="copyToClipboard"
          >
            <CheckOutlined v-if="copied" class="size-4" />
            <ContentCopyOutlined v-else class="size-4" />
            {{ copied ? "已复制" : "复制" }}
          </button>

          <button
            class="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            @click="downloadJson"
          >
            <FileDownloadOutlined class="size-4" />
            下载 JSON
          </button>

          <label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
            <FileUploadOutlined class="size-4" />
            上传文件
            <input
              type="file"
              accept=".json"
              class="hidden"
              @change="handleFileUpload"
            />
          </label>
        </div>
      </div>

      <!-- 本地存储 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">本地存储</h3>
        </div>
        <div class="flex flex-col gap-2 p-4">
          <button
            class="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
            :class="{ 'bg-emerald-600': saveSuccess }"
            @click="saveToLocalStorage"
          >
            <CheckOutlined v-if="saveSuccess" class="size-4" />
            <SaveOutlined v-else class="size-4" />
            {{ saveSuccess ? "已保存" : "保存到本地" }}
          </button>

          <button
            class="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            :disabled="!configStore.hasSavedConfig()"
            :class="{ 'cursor-not-allowed opacity-50': !configStore.hasSavedConfig() }"
            @click="loadFromLocalStorage"
          >
            <FileUploadOutlined class="size-4" />
            从本地加载
          </button>

          <button
            class="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            @click="clearLocalStorage"
          >
            <DeleteOutlined class="size-4" />
            清除本地存储
          </button>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">统计</h3>
        </div>
        <div class="space-y-2 p-4 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-slate-500">角色数量</span>
            <span class="font-medium text-slate-700">{{ stats.characterCount }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">特效数量</span>
            <span class="font-medium text-slate-700">{{ stats.effectCount }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">技能数量</span>
            <span class="font-medium text-slate-700">{{ stats.skillCount }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">动画总数</span>
            <span class="font-medium text-slate-700">{{ stats.totalAnimations }}</span>
          </div>
        </div>
      </div>

      <!-- 危险操作 -->
      <div class="rounded-xl border border-red-200 bg-red-50/50 shadow-sm">
        <div class="border-b border-red-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-red-700">危险操作</h3>
        </div>
        <div class="p-4">
          <button
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            @click="resetAll"
          >
            <DeleteOutlined class="size-4" />
            重置所有配置
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧 JSON 编辑器 -->
    <div class="flex flex-1 flex-col gap-4">
      <!-- 验证错误面板 -->
      <div
        v-if="showValidationPanel"
        class="rounded-xl border shadow-sm"
        :class="hasValidationErrors ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'"
      >
        <div
          class="flex items-center justify-between border-b px-4 py-3"
          :class="hasValidationErrors ? 'border-red-100' : 'border-emerald-100'"
        >
          <div class="flex items-center gap-2">
            <ErrorOutlined v-if="hasValidationErrors" class="size-5 text-red-500" />
            <CheckOutlined v-else class="size-5 text-emerald-500" />
            <h3
              class="text-sm font-semibold"
              :class="hasValidationErrors ? 'text-red-700' : 'text-emerald-700'"
            >
              {{ hasValidationErrors ? `验证失败 (${validationErrors.length} 个错误)` : "验证通过" }}
            </h3>
          </div>
          <button
            class="rounded p-1 transition-colors hover:bg-white/50"
            @click="showValidationPanel = false"
          >
            ✕
          </button>
        </div>
        <div v-if="hasValidationErrors" class="max-h-48 overflow-y-auto p-4">
          <ul class="space-y-2 text-sm">
            <li
              v-for="(error, index) in validationErrors"
              :key="index"
              class="flex items-start gap-2 text-red-600"
            >
              <WarningAmberOutlined class="mt-0.5 size-4 shrink-0" />
              <div>
                <span v-if="error.path" class="font-mono text-red-700">{{ error.path }}:</span>
                {{ error.message }}
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- JSON 编辑器 -->
      <div class="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">JSON 配置</h3>
          <div class="flex items-center gap-2">
            <span
              v-if="configStore.hasUnsavedChanges"
              class="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600"
            >
              未保存
            </span>
            <span
              v-if="!isValidJson"
              class="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600"
            >
              格式错误
            </span>
            <span
              v-else-if="jsonText.trim()"
              class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-600"
            >
              格式正确
            </span>
            <button
              class="rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100"
              @click="formatJson"
            >
              格式化
            </button>
          </div>
        </div>
        <div class="flex-1 p-4">
          <textarea
            v-model="jsonText"
            class="h-full w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm outline-none transition-colors focus:border-indigo-300 focus:bg-white"
            :class="{ 'border-red-300 bg-red-50': !isValidJson }"
            placeholder="点击「生成配置」按钮生成 JSON，或在此输入/粘贴 JSON 配置..."
            spellcheck="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
