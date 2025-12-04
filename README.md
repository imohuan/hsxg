# Vue 3 + TS 项目初始化指南

> ⚠️ **命令执行要求：** 项目全程在 Windows PowerShell 环境中操作，所有示例命令均以 PowerShell 语法为准，禁止使用 bash/sh 指令。

## 1. 初始化项目

1. 创建基础工程：
   ```bash
   pnpm create vite [项目名称] --template vue-ts
   ```
2. 安装常用依赖：
   ```bash
   pnpm add axios mitt lodash-es @types/lodash-es pinia vue-router @vueuse/core
   ```
3. 安装 UI 与图标相关依赖：
   ```bash
   pnpm add naive-ui vfonts @vicons/material
   ```
4. 引入 Tailwind CSS：

   ```bash
   pnpm add tailwindcss @tailwindcss/vite
   ```

   - 在 `vite.config.ts` 中启用插件：

     ```typescript
     import { defineConfig } from "vite";
     import tailwindcss from "@tailwindcss/vite";

     export default defineConfig({
       plugins: [tailwindcss()],
     });
     ```

   - 在全局样式（如 `src/style.css`）中导入：
     ```css
     @import "tailwindcss";
     ```
   - 执行 `pnpm run dev` 验证 Tailwind 是否生效。

5. 封装运行时基础能力：
   - 在 `src/core/context.ts` 中提供全局 `context`，向外暴露 `notify`、弹窗控制以及 `message` 等接口，所有组件直接引入并调用。
   - 在 `main.ts` 对 Vue 实例注入统一错误处理（监听 `app.config.errorHandler` 和 `window.onerror`），确保日志归集。
   - 重构 `console.log` 等日志方法，二次封装后统一输出格式与上报逻辑，并在调试/生产自动区分开关。

## 2. 项目规范

- 初始化前必须先与需求方多轮沟通，梳理业务背景、交互范围与验收标准后再动手。
- 禁止编写额外长篇文档，所有约定以代码与注释自解释为准。
- 单个组件需保持职责单一，出现臃肿时必须拆分。
- 可抽离的 UI 结构或业务逻辑必须封装为独立组件与 hooks（如 `useXxx`）。
- 功能实现优先复用指定依赖，严禁重复造轮子：
  - 事件通信使用 `mitt`
  - 常用工具函数使用 `lodash-es`
  - 状态管理统一 `pinia`
  - 组合式能力优先 `@vueuse/core`
  - 图标统一来自 `@vicons/material`，按需 `import { IconName } from '@vicons/material'`
- 目录约定：`src/hooks` 存放组合式逻辑，`src/components` 存放通用组件，页面位于 `src/views`，全局接口统一在 `src/interface.ts`（如类型较多再扩展 `src/types`）。
- 通用工具函数集中在 `src/utils`，基础能力与上下文放置在 `src/core`，其中 `context` 必须提供 `notify`/弹窗/message 等入口并可被所有组件直接使用。
