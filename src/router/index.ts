import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/icons",
  },
  {
    path: "/icons",
    name: "Icons",
    component: () => import("@/modules/icons/pages/IconsPage.vue"),
  },
  // 战斗界面路由
  {
    path: "/battle",
    name: "Battle",
    component: () => import("@/modules/battle/pages/BattlePage.vue"),
  },
  // 设计工坊路由
  {
    path: "/designer",
    name: "Designer",
    component: () => import("@/modules/designer/pages/DesignerPage.vue"),
    redirect: "/designer/character",
    children: [
      {
        path: "character",
        name: "DesignerCharacter",
        component: () => import("@/modules/designer/pages/CharacterTab.vue"),
      },
      {
        path: "effect",
        name: "DesignerEffect",
        component: () => import("@/modules/designer/pages/EffectTab.vue"),
      },
      {
        path: "skill",
        name: "DesignerSkill",
        component: () => import("@/modules/designer/pages/SkillTab.vue"),
      },
      {
        path: "json",
        name: "DesignerJson",
        component: () => import("@/modules/designer/pages/JsonTab.vue"),
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
