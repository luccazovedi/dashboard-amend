<script setup>
import { IconX } from '@tabler/icons-vue';
import { computed, onBeforeUnmount, onMounted } from 'vue';

import LineChart from '@/components/LineChart.vue';
import StackBar from '@/components/StackBar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { COLUMNS, GROUPS, STOCK_LOCATIONS } from '@/lib/columns';
import { closeProduct, drawerProduct } from '@/lib/drawer';
import { fmtByType, fmtDate, fmtInt } from '@/lib/format';
import DiagBadge from '@/components/DiagBadge.vue';
import { pedidoItens, rows, state } from '@/lib/store';

const p = computed(() => rows.value.find((r) => r.produto === drawerProduct.value) ?? null);

// pedidos de clientes cortados neste produto
const pedidos = computed(() => (p.value ? pedidoItens.value.filter((i) => i.produto === p.value.produto) : []));

const sections = computed(() =>
    Object.entries(GROUPS).map(([g, title]) => ({ title, cols: COLUMNS.filter((c) => c.group === g) })),
);

// evolução do produto pelos uploads (mais antigo → mais recente)
const history = computed(() => {
    if (!p.value) return [];
    return [...state.snapshots]
        .reverse()
        .map((s) => {
            const r = s.rows.find((x) => x.produto === p.value.produto);
            return r ? { x: new Date(s.meta.importedAt).toLocaleDateString('pt-BR'), fat: r.qtdeFat, est: r.estAtual } : null;
        })
        .filter(Boolean);
});

const onKey = (e) => e.key === 'Escape' && closeProduct();
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
    <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition-opacity" leave-active-class="transition-opacity">
        <div v-if="p" class="fixed inset-0 z-40 bg-foreground/30" @click="closeProduct" />
    </Transition>
    <Transition enter-from-class="translate-x-full" leave-to-class="translate-x-full" enter-active-class="transition-transform duration-200" leave-active-class="transition-transform duration-200">
        <aside v-if="p" class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-x-hidden border-l-2 border-foreground bg-background">
            <div class="flex items-start justify-between gap-3 border-b-2 border-foreground bg-card p-4">
                <div class="min-w-0">
                    <div class="mb-1 flex items-center gap-2">
                        <span class="badge bg-card font-mono text-foreground">{{ p.produto }}</span>
                        <StatusBadge :status="p.status" />
                    </div>
                    <h2 class="text-lg leading-snug font-bold">{{ p.descricao }}</h2>
                </div>
                <button class="btn btn-outline btn-sm shrink-0 px-2" aria-label="Fechar" @click="closeProduct"><IconX /></button>
            </div>

            <div class="flex-1 space-y-5 overflow-y-auto p-4">
                <div v-if="pedidos.length" class="card overflow-hidden">
                    <div class="flex items-center justify-between border-b-2 border-foreground px-4 py-2.5">
                        <span class="eyebrow">Pedidos cortados ({{ pedidos.length }})</span>
                        <DiagBadge :diag="pedidos[0].diag" />
                    </div>
                    <ul class="divide-y divide-dashed divide-foreground/20">
                        <li v-for="i in pedidos" :key="i.cliente" class="px-4 py-2.5 text-sm">
                            <div class="flex items-center justify-between gap-2">
                                <span class="font-bold">{{ i.cliente }}</span>
                                <span class="text-xs text-muted-foreground">{{ i.statusLog }}</span>
                            </div>
                            <div class="text-xs text-muted-foreground">
                                Prev. logística {{ fmtDate(i.previsao) }} · prev. fábrica {{ fmtDate(i.previsaoFabrica) }}
                            </div>
                            <div v-for="a in i.alertas" :key="a" class="mt-1 text-xs font-semibold text-warning">⚠ {{ a }}</div>
                        </li>
                    </ul>
                </div>

                <div class="card p-4">
                    <div class="eyebrow mb-3">Onde está o estoque</div>
                    <StackBar :segments="STOCK_LOCATIONS.map((l) => ({ label: l.label, value: p[l.key] ?? 0, color: l.color }))" :title="p.produto" />
                </div>

                <div v-if="history.length > 1" class="card p-4">
                    <div class="eyebrow mb-2">Faturado ao longo dos uploads</div>
                    <LineChart :points="history.map((h) => ({ x: h.x, y: h.fat }))" label="Faturado" :format="fmtInt" :height="120" />
                </div>

                <div v-for="s in sections" :key="s.title" class="card overflow-hidden">
                    <div class="eyebrow border-b-2 border-foreground px-4 py-2.5">{{ s.title }}</div>
                    <dl class="grid grid-cols-2 sm:grid-cols-3">
                        <div v-for="c in s.cols" :key="c.key" class="border-b border-dashed border-foreground/20 px-4 py-2.5">
                            <dt class="text-xs text-muted-foreground">{{ c.label }}</dt>
                            <dd class="font-bold tabular-nums">{{ fmtByType(p[c.key], c.fmt) }}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </aside>
    </Transition>
</template>
