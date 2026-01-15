/**
 * @file 配置类型定义
 * @description 定义配置相关的类型接口
 */

/**
 * 站位计算配置接口
 * 定义站位计算所需的各种间距参数
 */
export interface PositionConfig {
  /** 左右阵营之间的中心间隔（像素） */
  centerGap: number;
  /** 阵营区域距离画布顶部/底部的垂直间隔（像素） */
  verticalGap: number;
  /** 同一行两个单位之间的水平间隔（像素） */
  horizontalGap: number;
  /** 不同行单位之间的垂直间隔（像素） */
  unitYGap: number;
  /** 单位容器的宽度（像素） */
  containerWidth: number;
  /** 单位容器的高度（像素） */
  containerHeight: number;
}

/**
 * 单位统计数据接口
 * 包含单位的基本战斗属性
 */
export interface UnitStats {
  /** 当前生命值 */
  hp: number;
  /** 最大生命值 */
  maxHp: number;
  /** 当前魔法值 */
  mp: number;
  /** 最大魔法值 */
  maxMp: number;
  /** 速度值（用于计算行动顺序） */
  speed: number;
}
