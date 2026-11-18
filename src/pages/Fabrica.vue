<script setup>
import { computed, ref } from 'vue';

import BarList from '@/components/BarList.vue';
import DataTable from '@/components/DataTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import ProgressBar from '@/components/ProgressBar.vue';
import SearchBox from '@/components/SearchBox.vue';
import StatCard from '@/components/StatCard.vue';
import { COL } from '@/lib/columns';
import { openProduct } from '@/lib/drawer';
import { matchSearch } from '@/lib/filter';
import { fmtDate, fmtInt, fmtPct } from '@/lib/format';
import { rows, totals as t } from '@/lib/store';

const q = ref('');
const filtro = ref('todos');

const FILTERS = [
    { id: 'todos', label: 'Todos', test: () => true },
    { id: 'emitir', label: 'Emitir OP', test: (r) => (r.emitirOp ?? 0) > 0 },
    { id: 'aberta', label: 'OP aberta', test: (r) => (r.opAberta ?? 0) > 0 },
    { id: 'prog', label: 'OP programada', test: (r) => (r.opProg ?? 0) > 0 },
    { id: 'abaixo', label: 'Produzido < PMP', test: (r) => (r.pmp ?? 0) > 0 && (r.produzido ?? 0) < r.pmp },
];

const filtered = computed(() => {
    const f = FILTERS.find((x) => x.id === filtro.value);
    return rows.value.filter((r) => f.test(r) && matchSearch(r, q.value));
});

const ating = computed(() => (t.value?.pmp ? (t.value.produzido ?? 0) / t.value.pmp : null));

const topEmitir = computed(() =>
    rows.value
        .filter((r) => (r.emitirOp ?? 0) > 0)
        .sort((a, b) => b.emitirOp - a.emitirOp)
        .slice(0, 10)
        .map((r) => ({
            produto: r.produto,
            label: `${r.produto} · ${r.descricao}`,
            value: r.emitirOp,
            display: fmtInt(r.emitirOp),
            metric: 'Emitir OP',
            color: 'var(--s1)',
        })),
);

// Programação agrupada por data
const agenda = computed(() => {
    const map = new Map();
    for (const r of rows.value) {
        if (!r.programado) continue;
        if (!map.has(r.programado)) map.set(r.programado, []);
        map.get(r.programado).push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date, items }));
});
const now = new Date();
const hoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const weekday = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' });

const columns = [
    { ...COL.produto, class: 'font-mono text-xs' },
    { ...COL.descricao, class: 'max-w-64 truncate' },
    COL.pmp,
    COL.produzido,
    { key: 'ating', label: '% PMP', fmt: 'pct', get: (r) => (r.pmp ? (r.produzido ?? 0) / r.pmp : null), class: 'min-w-36' },
    COL.estPrev,
    COL.estPmp,
    COL.estProd,
    COL.opAberta,
    COL.opProg,
    { ...COL.emitirOp, class: 'font-bold' },
    COL.programado,
];
</script>

<template>
    <PageHeader title="Fábrica" description="Desempenho da fábrica: plano mestre (PMP), produzido, ordens de produção abertas/programadas e o que precisa ser emitido." />

    <div class="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
        <StatCard label="PMP" :value="fmtInt(t.pmp)" sub="planejado" />
        <StatCard label="Produzido" :value="fmtInt(t.produzido)" :sub="`${fmtPct(ating)} do PMP`" tone="bg-violet-100" />
        <StatCard label="Est. previsto" :value="fmtInt(t.estPrev)" />
        <StatCard label="OP aberta" :value="fmtInt(t.opAberta)" :sub="`${rows.filter((r) => (r.opAberta ?? 0) > 0).length} produtos`" />
        <StatCard label="OP programada" :value="fmtInt(t.opProg)" :sub="`${rows.filter((r) => (r.opProg ?? 0) > 0).length} produtos`" />
        <StatCard label="Emitir OP" :value="fmtInt(t.emitirOp)" :sub="`${rows.filter((r) => (r.emitirOp ?? 0) > 0).length} produtos`" tone="bg-amber-50" />
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-5">
        <div class="card p-5 lg:col-span-3">
            <h2 class="eyebrow mb-4">Maiores OPs a emitir</h2>
            <BarList :items="topEmitir" />
        </div>
        <div class="card flex flex-col p-5 lg:col-span-2">
            <h2 class="eyebrow mb-4">Programação por data</h2>
            <div v-if="!agenda.length" class="text-sm text-muted-foreground">Nenhuma data programada.</div>
            <ul class="-mr-2 max-h-[420px] space-y-3 overflow-y-auto pr-2">
                <li v-for="d in agenda" :key="d.date" :class="['rounded-lg border-2 border-foreground p-3', d.date === hoje ? 'bg-accent' : 'bg-background']">
                    <div class="mb-1.5 flex items-center justify-between">
                        <span class="font-bold">
                            {{ fmtDate(d.date) }} <span class="text-xs font-semibold text-muted-foreground uppercase">{{ weekday(d.date) }}</span>
                        </span>
                        <span class="badge bg-card text-foreground">{{ d.items.length }} produtos</span>
                    </div>
                    <ul class="space-y-0.5 text-xs">
                        <li v-for="r in d.items" :key="r.produto" class="flex cursor-pointer justify-between gap-2 hover:text-primary" @click="openProduct(r.produto)">
                            <span class="truncate">{{ r.produto }} · {{ r.descricao }}</span>
                            <span class="shrink-0 font-bold tabular-nums">{{ fmtInt(r.opProg ?? r.opAberta) }}</span>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
    </div>

    <div class="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="seg flex-wrap">
            <button v-for="f in FILTERS" :key="f.id" :class="{ on: filtro === f.id }" @click="filtro = f.id">{{ f.label }}</button>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground">{{ filtered.length }} produtos</span>
            <SearchBox v-model="q" />
        </div>
    </div>

    <DataTable :columns="columns" :rows="filtered" sort-key="emitirOp">
        <template #cell-ating="{ value }">
            <div v-if="value !== null" class="flex items-center gap-2">
                <ProgressBar :value="value" :color="value >= 1 ? 'var(--success)' : 'var(--s1)'" />
                <span class="w-12 text-right tabular-nums">{{ fmtPct(value, 0) }}</span>
            </div>
            <span v-else>—</span>
        </template>
    </DataTable>
</template>
