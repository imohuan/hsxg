/**
 * @file 计数器状态管理
 * @description 提供基础示例以演示 Pinia 用法
 */
import { defineStore } from "pinia";

export const useCounterStore = defineStore("counter", {
  state: () => ({
    count: 0,
  }),
  getters: {
    doubleCount: (state) => state.count * 2,
  },
  actions: {
    increment(): void {
      this.count += 1;
    },
    reset(): void {
      this.count = 0;
    },
  },
});
