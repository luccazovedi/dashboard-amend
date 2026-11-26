import './style.css';

import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';

import App from './App.vue';
import { loadStore } from './lib/store';

const routes = [
    { path: '/', component: () => import('./pages/Overview.vue'), meta: { title: 'Visão geral' } },
    { path: '/faturamento', component: () => import('./pages/Faturamento.vue'), meta: { title: 'Faturamento' } },
    { path: '/cobertura', component: () => import('./pages/Cobertura.vue'), meta: { title: 'Cobertura & corte' } },
    { path: '/estoque', component: () => import('./pages/Estoque.vue'), meta: { title: 'Estoque' } },
    { path: '/fabrica', component: () => import('./pages/Fabrica.vue'), meta: { title: 'Fábrica' } },
    { path: '/tracking', component: () => import('./pages/Tracking.vue'), meta: { title: 'Tracking de pedidos', noData: true } },
    { path: '/pedidos', component: () => import('./pages/Pedidos.vue'), meta: { title: 'Pedidos cortados', noData: true } },
    { path: '/produtos', component: () => import('./pages/Produtos.vue'), meta: { title: 'Produtos' } },
    { path: '/historico', component: () => import('./pages/Historico.vue'), meta: { title: 'Histórico' } },
    { path: '/atualizar', component: () => import('./pages/Atualizar.vue'), meta: { title: 'Atualizar', noData: true } },
    { path: '/:p(.*)*', redirect: '/' },
];

const router = createRouter({ history: createWebHashHistory(), routes, scrollBehavior: () => ({ top: 0 }) });
router.afterEach((to) => {
    document.title = `${to.meta.title} · Painel de Cobertura`;
});

loadStore().then(() => createApp(App).use(router).mount('#app'));
