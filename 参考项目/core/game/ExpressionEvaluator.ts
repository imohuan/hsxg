/**
 * @file 表达式求值工具
 * @description 用于求值JavaScript表达式字符串，支持变量替换
 *
 * 使用场景：
 * - 技能伤害计算公式
 * - 目标选择数量表达式
 * - 技能参数中的动态值计算
 *
 * 示例：
 * - expression: "level * 12 + mastery * 4"
 * - context: { level: 10, mastery: 30 }
 * - 结果: 10 * 12 + 30 * 4 = 240
 */

/**
 * 表达式求值器类
 * @description 静态工具类，提供表达式求值功能
 */
export class ExpressionEvaluator {
  /**
   * 求值表达式
   * @param expression 表达式字符串或数字
   * @param context 变量上下文（变量名到数值的映射）
   * @returns 求值结果（数字）
   * @description
   * - 如果输入是数字，直接返回
   * - 如果输入是字符串，先替换变量，然后求值
   * - 如果求值失败，返回0并输出错误日志
   *
   * 变量替换规则：
   * - 使用单词边界（\b）匹配，确保只替换完整的变量名
   * - 例如：context中有"level"，不会替换"levelUp"中的"level"
   */
  static evaluate(
    expression: string | number,
    context: Record<string, number>
  ): number {
    // 如果已经是数字，直接返回
    if (typeof expression === "number") return expression;
    // 如果不是字符串，返回0
    if (typeof expression !== "string") return 0;

    let expr = expression.trim();

    // 替换所有上下文变量
    Object.entries(context).forEach(([key, value]) => {
      // 使用单词边界确保只匹配完整的变量名
      const regex = new RegExp(`\\b${key}\\b`, "g");
      expr = expr.replace(regex, String(value));
    });

    // 使用Function构造函数求值表达式
    try {
      // eslint-disable-next-line no-new-func
      return new Function(`return ${expr}`)();
    } catch (error) {
      console.error("Expression evaluate error:", expression, error);
      return 0;
    }
  }
}
