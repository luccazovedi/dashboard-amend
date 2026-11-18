<script setup>
import { computed, ref } from 'vue';

import BarList from '@/components/BarList.vue';
import DataTable from '@/components/DataTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import ProgressBar from '@/components/ProgressBar.vue';
import SearchBox from '@/components/SearchBox.vue';
import StatCard from '@/components/StatCard.vue';
import { COL } from '@/lib/columns';
import { matchSearch } from '@/lib/filter';
import { fmtInt, fmtPct } from '@/lib/format';
import { rows, totals as t } from '@/lib/store';

const q = ref('');
const faixa = ref('todos');

const FAIXAS = [
    { id: 'todos', label: 'Todos', test: () => true },
    { id: 'baixo', label: '< 50%', test: (r) => r.pVenda > 0 && (r.pctFat ?? 0) < 0.5 },
    { id: 'meio', label: '50–99%', test: (r) => (r.pctFat ?? 0) >= 0.5 && (r.pctFat ?? 0) < 1 },
    { id: 'meta', label: '≥ 100%', test: (r) => (r.pctFat ?? 0) >= 1 },
    { id: 'sem', label: 'Sem previsão', test: (r) => !r.pVenda },
];

const filtered = computed(() => {
    const f = FAIXAS.find((x) => x.id === faixa.value);
    return rows.value.filter((r) => f.test(r) && matchSearch(r, q.value));
});

const buckets = computed(() =>
    FAIXAS.slice(1).map((f) => {
        const n = rows.value.filter(f.test).length;
        return { produto: '', label: f.label, value: n, display: `${n} produtos`, metric: 'Produtos' };
    }),
);

const vsOrcado = computed(() => (t.value?.orcado ? t.value.pVenda / t.value.orcado : null));

const columns = [
    { ...COL.produto, class: 'font-mono text-xs' },
    { ...COL.descricao, class: 'max-w-80 truncate' },
    COL.estInicial,
    COL.orcado,
    COL.pVenda,
    COL.qtdeFat,
    COL.carteira,
    COL.fatB2C,
    { ...COL.pctFat, class: 'min-w-36' },
    COL.aFat,
    COL.estAtual,
    COL.pctCob,
];
</script>

<template>
    <PageHeader title="Faturamento" description="Status do faturamento: previsão de venda, quanto já foi faturado (incluindo carteira e B2C) e o que ainda falta faturar." />

    <div class="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
        <StatCard label="Orçado" :value="fmtInt(t.orcado)" sub="meta do mês" />
        <StatCard label="Previsão de venda" :value="fmtInt(t.pVenda)" :sub="`${fmtPct(vsOrcado)} do orçado`" />
        <StatCard label="Faturado" :value="fmtInt(t.qtdeFat)" :sub="`carteira ${fmtInt(t.carteira)} · B2C ${fmtInt(t.fatB2C)}`" />
        <StatCard label="% Faturado" :value="fmtPct(t.pctFat)" sub="da previsão" tone="bg-violet-100" />
        <StatCard label="À faturar" :value="fmtInt(t.aFat)" sub="restante" />
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <div class="card p-5">
            <h2 class="eyebrow mb-4">Produtos por faixa de % faturado</h2>
            <BarList :items="buckets" />
        </div>
        <div class="card p-5 lg:col-span-2">
            <h2 class="eyebrow mb-4">Orçado × previsão × faturado</h2>
            <div class="space-y-4">
                <div v-for="b in [
                    { label: 'Orçado', v: t.orcado, c: 'var(--foreground)' },
                    { label: 'Previsão de venda', v: t.pVenda, c: 'var(--s1)' },
                    { label: 'Faturado + carteira + B2C', v: (t.qtdeFat ?? 0) + (t.carteira ?? 0) + (t.fatB2C ?? 0), c: 'var(--primary)' },
                    { label: 'Estoque atual', v: t.estAtual, c: 'var(--s3)' },
                ]" :key="b.label">
                    <div class="mb-1 flex justify-between text-xs"><span class="font-semibold">{{ b.label }}</span><span class="font-bold tabular-nums">{{ fmtInt(b.v) }}</span></div>
                    <div class="h-3 rounded-r bg-secondary">
                        <div class="h-full rounded-r" :style="{ width: `${(b.v / Math.max(t.orcado, t.pVenda, t.estAtual, 1)) * 100}%`, background: b.c }" />
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="seg">
            <button v-for="f in FAIXAS" :key="f.id" :class="{ on: faixa === f.id }" @click="faixa = f.id">{{ f.label }}</button>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground">{{ filtered.length }} produtos</span>
            <SearchBox v-model="q" />
        </div>
    </div>

    <DataTable :columns="columns" :rows="filtered" sort-key="aFat">
        <template #cell-pctFat="{ value }">
            <div class="flex items-center gap-2">
                <ProgressBar :value="value" :color="(value ?? 0) >= 1 ? 'var(--success)' : 'var(--primary)'" />
                <span class="w-14 text-right tabular-nums">{{ fmtPct(value) }}</span>
            </div>
        </template>
    </DataTable>
</template>
