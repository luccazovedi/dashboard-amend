<script setup>
import {
    IconAlertTriangle,
    IconBuildingFactory2,
    IconCloudUpload,
    IconHistory,
    IconLayoutDashboard,
    IconPackages,
    IconReceipt2,
    IconRoute,
    IconShieldCheck,
    IconTable,
    IconTruckDelivery,
} from '@tabler/icons-vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { active, pedidoItens, rows, trackingPedidos } from '@/lib/store';
import { ATRASADO } from '@/lib/tracking';

defineProps({ open: Boolean });
const emit = defineEmits(['close']);

const route = useRoute();

const lateCount = computed(() => trackingPedidos.value.filter((o) => ATRASADO.includes(o.situacao)).length);
const alertCount = computed(() => rows.value.filter((r) => r.status === 'ruptura' || r.status === 'critico').length);

const groups = computed(() => [
    {
        items: [{ title: 'Visão geral', to: '/', icon: IconLayoutDashboard }],
    },
    {
        label: 'Painel',
        items: [
            { title: 'Faturamento', to: '/faturamento', icon: IconReceipt2 },
            { title: 'Cobertura & corte', to: '/cobertura', icon: IconShieldCheck, badge: alertCount.value || null },
            { title: 'Estoque', to: '/estoque', icon: IconPackages },
            { title: 'Fábrica', to: '/fabrica', icon: IconBuildingFactory2 },
        ],
    },
    {
        label: 'Pedidos',
        items: [
            { title: 'Tracking de pedidos', to: '/tracking', icon: IconRoute, badge: lateCount.value || null },
            { title: 'Pedidos cortados', to: '/pedidos', icon: IconTruckDelivery, count: pedidoItens.value.length || null },
        ],
    },
    {
        label: 'Dados',
        items: [
            { title: 'Produtos', to: '/produtos', icon: IconTable },
            { title: 'Histórico', to: '/historico', icon: IconHistory },
        ],
    },
]);

const isActive = (to) => (to === '/' ? route.path === '/' : route.path.startsWith(to));
</script>

<template>
    <!-- overlay mobile -->
    <div v-if="open" class="fixed inset-0 z-30 bg-foreground/30 md:hidden" @click="emit('close')" />

    <aside
        :class="[
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r-2 border-foreground bg-sidebar transition-transform duration-200 md:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
        ]"
    >
        <!-- workspace -->
        <div class="flex h-14 items-center gap-2 border-b-2 border-foreground px-3">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-violet-100 text-sm font-black text-violet-700">
                PC
            </div>
            <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">Painel de Cobertura</span>
                <span class="truncate text-xs text-muted-foreground">Faturamento · Estoque · Fábrica</span>
            </div>
        </div>

        <div class="px-3 pt-3 pb-1">
            <RouterLink to="/atualizar" class="btn btn-primary w-full" @click="emit('close')">
                <IconCloudUpload /> Atualizar planilha
            </RouterLink>
        </div>

        <nav class="flex-1 overflow-y-auto px-2 py-1">
            <div v-for="(g, gi) in groups" :key="gi" class="py-1">
                <div v-if="g.label" class="px-2 pt-2 pb-1 text-xs font-bold text-foreground/50">{{ g.label }}</div>
                <RouterLink
                    v-for="item in g.items"
                    :key="item.to"
                    :to="item.to"
                    :data-active="isActive(item.to)"
                    class="relative flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-bold data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0"
                    @click="emit('close')"
                >
                    <component :is="item.icon" />
                    <span class="truncate">{{ item.title }}</span>
                    <span v-if="item.badge" class="badge ml-auto bg-red-200 px-1.5 text-foreground">
                        <IconAlertTriangle />{{ item.badge }}
                    </span>
                    <span v-else-if="item.count" class="badge ml-auto bg-card px-1.5 text-foreground">{{ item.count }}</span>
                </RouterLink>
            </div>
        </nav>

        <div class="border-t-2 border-foreground p-3">
            <RouterLink
                to="/atualizar"
                :data-active="isActive('/atualizar')"
                class="mb-2 flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-4"
                @click="emit('close')"
            >
                <IconCloudUpload /> <span>Atualizar</span>
            </RouterLink>
            <div class="rounded-md border-2 border-foreground bg-background p-2.5 text-xs">
                <div class="eyebrow mb-1 text-[10px]">Base ativa</div>
                <template v-if="active">
                    <div class="truncate font-semibold" :title="active.meta.fileName">{{ active.meta.fileName }}</div>
                    <div class="text-muted-foreground">
                        {{ new Date(active.meta.importedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) }}
                        · {{ active.meta.productCount }} produtos
                    </div>
                </template>
                <div v-else class="text-muted-foreground">Nenhuma planilha carregada</div>
            </div>
        </div>
    </aside>
</template>
