<script setup>
import { computed, ref } from 'vue';

import BarList from '@/components/BarList.vue';
import DataTable from '@/components/DataTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import SearchBox from '@/components/SearchBox.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { COL } from '@/lib/columns';
import { matchSearch } from '@/lib/filter';
import { fmtCob, fmtInt, STATUS, STATUS_ORDER } from '@/lib/format';
import { rows, totals as t } from '@/lib/store';

const q = ref('');
const status = ref('risco');
const soCorte = ref(false);

const FILTERS = [
    { id: 'risco', label: 'Em risco', test: (r) => r.status === 'ruptura' || r.status === 'critico' },
    ...STATUS_ORDER.map((s) => ({ id: s, label: STATUS[s].label, test: (r) => r.status === s })),
    { id: 'todos', label: 'Todos', test: () => true },
];

const counts = computed(() => Object.fromEntries(FILTERS.map((f) => [f.id, rows.value.filter(f.test).length])));

const filtered = computed(() => {
    const f = FILTERS.find((x) => x.id === status.value);
    return rows.value.filter((r) => f.test(r) && (!soCorte.value || (r.corte ?? 0) > 0) && matchSearch(r, q.value));
});

const comCorte = computed(() => rows.value.filter((r) => (r.corte ?? 0) > 0));
const topCorte = computed(() =>
    [...comCorte.value]
        .sort((a, b) => b.corte - a.corte)
        .slice(0, 10)
        .map((r) => ({
            produto: r.produto,
            label: `${r.produto} · ${r.descricao}`,
            value: r.corte,
            display: fmtInt(r.corte),
            metric: 'Corte',
            color: 'var(--destructive)',
            extra: [{ label: 'Cobertura', value: fmtCob(r.pctCob) }],
        })),
);

const severity = { ruptura: 0, critico: 1, atencao: 2, ok: 3, concluido: 4 };
const columns = [
    { ...COL.produto, class: 'font-mono text-xs' },
    { ...COL.descricao, class: 'max-w-72 truncate' },
    { key: 'status', label: 'Situação', fmt: 'text', sortValue: (r) => severity[r.status] },
    COL.aFat,
    COL.estAtual,
    { ...COL.pctCob, label: 'Cob.' },
    COL.estTotal2,
    { ...COL.pctCobTotal, label: 'Cob. total' },
    { ...COL.corte, class: 'text-destructive font-bold' },
    COL.transito,
    COL.emitirOp,
    COL.programado,
];
</script>

<template>
    <PageHeader
        title="Cobertura & corte"
        description="Cobertura = estoque atual ÷ quantidade à faturar. Abaixo de 1x o estoque não cobre o que falta faturar. Corte = volume não atendido."
    />

    <div class="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
        <button
            v-for="s in STATUS_ORDER"
            :key="s"
            :class="['card cursor-pointer p-4 text-left transition-all hover:shadow-md', status === s ? 'ring-[3px] ring-primary/50' : '']"
            @click="status = s"
        >
            <StatusBadge :status="s" />
            <div class="mt-2 text-3xl font-extrabold tabular-nums">{{ counts[s] }}</div>
            <div class="text-xs text-muted-foreground">{{ STATUS[s].hint }}</div>
        </button>
        <div class="card bg-red-50 p-4">
            <span class="badge bg-red-200 text-foreground">Corte</span>
            <div class="mt-2 text-3xl font-extrabold tabular-nums">{{ fmtInt(t.corte) }}</div>
            <div class="text-xs text-muted-foreground">{{ comCorte.length }} produtos com corte</div>
        </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <div class="card p-5 lg:col-span-2">
            <h2 class="eyebrow mb-4">Top 10 cortes</h2>
            <BarList :items="topCorte" />
        </div>
        <div class="card flex flex-col gap-4 p-5">
            <h2 class="eyebrow">Cobertura geral</h2>
            <div>
                <div class="text-xs text-muted-foreground">Estoque atual ÷ à faturar</div>
                <div class="text-4xl font-extrabold tabular-nums">{{ fmtCob(t.pctCob) }}</div>
            </div>
            <div>
                <div class="text-xs text-muted-foreground">Estoque total (todos os locais) ÷ à faturar</div>
                <div class="text-4xl font-extrabold tabular-nums">{{ fmtCob(t.pctCobTotal) }}</div>
            </div>
            <div class="grid grid-cols-2 gap-3 border-t-2 border-dashed border-foreground/20 pt-4 text-sm">
                <div><div class="text-xs text-muted-foreground">À faturar</div><div class="font-bold tabular-nums">{{ fmtInt(t.aFat) }}</div></div>
                <div><div class="text-xs text-muted-foreground">Est. atual</div><div class="font-bold tabular-nums">{{ fmtInt(t.estAtual) }}</div></div>
            </div>
        </div>
    </div>

    <div class="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
            <div class="seg flex-wrap">
                <button v-for="f in FILTERS" :key="f.id" :class="{ on: status === f.id }" @click="status = f.id">
                    {{ f.label }} <span class="opacity-60">{{ counts[f.id] }}</span>
                </button>
            </div>
            <label class="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                <input v-model="soCorte" type="checkbox" class="size-4 accent-[var(--primary)]" /> Só com corte
            </label>
        </div>
        <SearchBox v-model="q" />
    </div>

    <DataTable :columns="columns" :rows="filtered" sort-key="aFat">
        <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #cell-pctCob="{ row, value }">
            <span :class="['font-bold', row.status === 'critico' || row.status === 'ruptura' ? 'text-destructive' : row.status === 'atencao' ? 'text-warning' : '']">
                {{ fmtCob(value) }}
            </span>
        </template>
    </DataTable>
</template>
