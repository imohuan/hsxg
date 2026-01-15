/**
 * @file 应用入口
 * @description 挂载 Vue、Pinia 并加载全局样式
 */
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

import "./styles/base.css";
import "./styles/components.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

// 禁用整个页面的右键菜单，避免触发系统默认菜单
window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

const app = createApp(App);

app.use(createPinia());
app.mount("#app");
