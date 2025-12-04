import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Dashboard",
    component: () => import("./views/Dashboard.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
