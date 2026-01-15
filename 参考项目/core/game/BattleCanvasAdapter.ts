/**
 * @file 战斗画布适配器
 * @description 将 BattleCanvas 组件适配为 BattleController 接口
 */

import type { BattleJSONConfig } from "./config";
import type { SkillDesign, CharacterConfig } from "../designer/types";
import type { ComponentPublicInstance } from "vue";

/**
 * BattleCanvas 组件实例的方法接口
 */
export interface BattleCanvasInstance {
  applyConfig(config: BattleJSONConfig): void;
  executeSkillPreview(skill: SkillDesign): void;
  highlightUnit(unitId: string | null): void;
  resetView(): void;
  zoomIn(): void;
  zoomOut(): void;
  setZoom(scale: number): void;
  panTo(x: number, y: number): void;
}

/**
 * 战斗画布适配器
 * @description 提供 BattleController 接口，但内部使用 BattleCanvas 组件
 */
export class BattleCanvasAdapter {
  private canvasInstance: BattleCanvasInstance | null = null;
  private selectedUnitId: string | null = null;

  /**
   * 绑定 BattleCanvas 组件实例
   */
  bindCanvas(
    instance: BattleCanvasInstance | ComponentPublicInstance | null
  ): void {
    if (!instance) {
      this.canvasInstance = null;
      return;
    }

    // 如果已经是 BattleCanvasInstance，直接使用
    if (this.isBattleCanvasInstance(instance)) {
      this.canvasInstance = instance;
      return;
    }

    // 如果是 Vue 组件实例，提取方法（使用类型断言）
    const vueInstance = instance as any;
    const methods: BattleCanvasInstance = {
      applyConfig: vueInstance.applyConfig?.bind(instance) || (() => {}),
      executeSkillPreview:
        vueInstance.executeSkillPreview?.bind(instance) || (() => {}),
      highlightUnit: vueInstance.highlightUnit?.bind(instance) || (() => {}),
      resetView: vueInstance.resetView?.bind(instance) || (() => {}),
      zoomIn: vueInstance.zoomIn?.bind(instance) || (() => {}),
      zoomOut: vueInstance.zoomOut?.bind(instance) || (() => {}),
      setZoom: vueInstance.setZoom?.bind(instance) || (() => {}),
      panTo: vueInstance.panTo?.bind(instance) || (() => {}),
    };

    this.canvasInstance = methods;
  }

  /**
   * 检查是否是 BattleCanvasInstance
   */
  private isBattleCanvasInstance(
    instance: any
  ): instance is BattleCanvasInstance {
    return (
      typeof instance === "object" &&
      typeof instance.applyConfig === "function" &&
      typeof instance.executeSkillPreview === "function"
    );
  }

  /**
   * 应用战斗配置
   */
  applyConfig(config: BattleJSONConfig): void {
    this.canvasInstance?.applyConfig(config);
  }

  /**
   * 执行技能
   * @description 使用 executeSkillPreview 实现技能执行
   */
  executeSkill(skill: SkillDesign): void {
    this.canvasInstance?.executeSkillPreview(skill);
  }

  /**
   * 注入角色
   * @description 目前 BattleCanvas 不支持动态注入，需要应用新的配置
   */
  injectCharacter(_config: CharacterConfig): void {
    // TODO: 实现角色注入功能
    console.warn("角色注入功能尚未实现，需要应用包含新角色的完整配置");
  }

  /**
   * 获取选中单位名称
   */
  getSelectedUnitName(): string | null {
    // TODO: 从 BattleCanvas 获取选中单位名称
    // 目前返回 null，需要扩展 BattleCanvas 以支持单位选择
    return this.selectedUnitId;
  }

  /**
   * 设置选中单位
   */
  setSelectedUnit(unitId: string | null): void {
    this.selectedUnitId = unitId;
    this.canvasInstance?.highlightUnit(unitId);
  }

  /**
   * 重置视图
   */
  resetView(): void {
    this.canvasInstance?.resetView();
  }

  /**
   * 放大
   */
  zoomIn(): void {
    this.canvasInstance?.zoomIn();
  }

  /**
   * 缩小
   */
  zoomOut(): void {
    this.canvasInstance?.zoomOut();
  }

  /**
   * 挂载游戏到容器（兼容 BattleController 接口）
   * @description BattleCanvas 是通过 Vue 组件挂载的，此方法不会执行实际操作
   */
  mount(_container: HTMLElement): void {
    // BattleCanvas 是通过 Vue 组件自动挂载的，此方法仅用于兼容接口
    console.warn(
      "BattleCanvasAdapter.mount() 被调用，但 BattleCanvas 是通过 Vue 组件自动挂载的"
    );
  }

  /**
   * 销毁适配器
   * @description 清理资源，适配 BattleController 接口
   */
  destroy(): void {
    this.canvasInstance = null;
    this.selectedUnitId = null;
  }
}
