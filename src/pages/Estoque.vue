<script setup>
import { computed, ref } from 'vue';

import DataTable from '@/components/DataTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import SearchBox from '@/components/SearchBox.vue';
import StackBar from '@/components/StackBar.vue';
import { COL, STOCK_LOCATIONS } from '@/lib/columns';
import { matchSearch } from '@/lib/filter';
import { fmtCompact, fmtInt, fmtPct } from '@/lib/format';
import { rows, totals as t } from '@/lib/store';

const q = ref('');
const local = ref('todos');

const filtered = computed(() =>
    rows.value.filter((r) => (local.value === 'todos' || (r[local.value] ?? 0) > 0) && matchSearch(r, q.value)),
);

const maxTotal = computed(() => Math.max(1, ...filtered.value.map((r) => STOCK_LOCATIONS.reduce((a, l) => a + Math.max(0, r[l.key] ?? 0), 0))));

const zerados = computed(() => rows.value.filter((r) => (r.estTotal ?? 0) <= 0 && (r.aFat ?? 0) > 0).length);

const columns = [
    { ...COL.produto, class: 'font-mono text-xs' },
    { ...COL.descricao, class: 'max-w-64 truncate' },
    { key: 'mix', label: 'Distribuição', fmt: 'text', sortable: false, class: 'min-w-48' },
    ...STOCK_LOCATIONS.map((l) => COL[l.key]),
    { ...COL.estTotal, class: 'font-bold' },
    COL.aFat,
];
</script>

<template>
    <PageHeader title="Estoque" description="Posição do estoque por local: Safira, Reserva, Amazon, Trânsito, BM e B2C." />

    <div class="card p-5">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
                <div class="eyebrow">Estoque total</div>
                <div class="text-4xl font-extrabold tabular-nums">{{ fmtInt(t.estTotal) }}</div>
            </div>
            <div class="text-right text-xs text-muted-foreground">
                <div>{{ zerados }} produtos sem estoque com saldo à faturar</div>
            </div>
        </div>
        <StackBar :segments="STOCK_LOCATIONS.map((l) => ({ label: l.label, value: t[l.key] ?? 0, color: l.color }))" title="Estoque total" height="h-10" />
    </div>

    <div class="mt-6 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
        <button
            v-for="l in STOCK_LOCATIONS"
            :key="l.key"
            :class="['card cursor-pointer p-4 text-left transition-all hover:shadow-md', local === l.key ? 'ring-[3px] ring-primary/50' : '']"
            @click="local = local === l.key ? 'todos' : l.key"
        >
            <div class="flex items-center gap-2">
                <span class="inline-block size-3 rounded-sm" :style="{ background: l.color }" />
                <span class="eyebrow">{{ l.label }}</span>
            </div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums">{{ fmtCompact(t[l.key]) }}</div>
            <div class="text-xs text-muted-foreground">
                {{ fmtPct((t[l.key] ?? 0) / (t.estTotal || 1), 0) }} · {{ rows.filter((r) => (r[l.key] ?? 0) > 0).length }} produtos
            </div>
        </button>
    </div>

    <div class="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="seg flex-wrap">
            <button :class="{ on: local === 'todos' }" @click="local = 'todos'">Todos</button>
            <button v-for="l in STOCK_LOCATIONS" :key="l.key" :class="{ on: local === l.key }" @click="local = l.key">{{ l.label }}</button>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground">{{ filtered.length }} produtos</span>
            <SearchBox v-model="q" />
        </div>
    </div>

    <DataTable :columns="columns" :rows="filtered" :sort-key="local === 'todos' ? 'estTotal' : local">
        <template #cell-mix="{ row }">
            <StackBar
                :segments="STOCK_LOCATIONS.map((l) => ({ label: l.label, value: Math.max(0, row[l.key] ?? 0), color: l.color }))"
                :title="row.produto"
                :legend="false"
                :scale-max="maxTotal"
                height="h-3"
            />
        </template>
    </DataTable>
</template>
