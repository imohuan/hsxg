import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("@/components/layout/AppLayout.vue"),
    redirect: "/battle",
    children: [
      // 战斗界面路由
      {
        path: "battle",
        name: "Battle",
        component: () => import("@/modules/battle/pages/BattlePage.vue"),
      },
      // 设计工坊路由
      {
        path: "designer",
        name: "Designer",
        component: () => import("@/modules/designer/pages/DesignerPage.vue"),
        redirect: "/designer/character",
        children: [
          {
            path: "character",
            name: "DesignerCharacter",
            component: () => import("@/modules/character/pages/CharacterPage.vue"),
          },
          {
            path: "effect",
            name: "DesignerEffect",
            component: () => import("@/modules/effect/pages/EffectPage.vue"),
          },
          {
            path: "skill",
            name: "DesignerSkill",
            component: () => import("@/modules/skill/pages/SkillPage.vue"),
          },
          {
            path: "json",
            name: "DesignerJson",
            component: () => import("@/modules/json-config/pages/JsonConfigPage.vue"),
          }
        ],
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
