<!--
  @file 关于页面
  @description 提供简单示例并指向项目文档
-->
<template>
  <section
    class="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-slate-200"
  >
    <h2 class="text-2xl font-semibold text-white">关于此模版</h2>
    <p>
      该模版预装了
      <span class="text-emerald-300">Vue Router</span>、<span
        class="text-emerald-300"
        >Pinia</span
      >、 <span class="text-emerald-300">VueUse</span>、<span
        class="text-emerald-300"
        >lodash-es</span
      >
      与 <span class="text-emerald-300">Tailwind CSS v4</span>。
    </p>
    <p>
      你可以直接在
      <code class="text-emerald-300">src/views</code> 中添加页面，在
      <code class="text-emerald-300">src/router</code>
      中注册路由，并在需要的地方通过 Pinia 或 VueUse 组合式函数共享状态与逻辑。
    </p>
    <p>
      想了解更多？请阅读
      <a
        class="text-emerald-400 underline decoration-dotted"
        href="https://vuejs.org/guide/introduction.html"
        target="_blank"
      >
        Vue 官方文档
      </a>
      或
      <a
        class="text-emerald-400 underline decoration-dotted"
        href="https://tailwindcss.com/docs"
        target="_blank"
      >
        Tailwind 指南 </a
      >。
    </p>
  </section>
</template>
