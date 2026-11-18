<script setup>
import { IconArrowRight } from '@tabler/icons-vue';
import { computed } from 'vue';

import BarList from '@/components/BarList.vue';
import PageHeader from '@/components/PageHeader.vue';
import ProgressBar from '@/components/ProgressBar.vue';
import StackBar from '@/components/StackBar.vue';
import StatCard from '@/components/StatCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { STOCK_LOCATIONS } from '@/lib/columns';
import { fmtCob, fmtCompact, fmtDateTime, fmtInt, fmtPct, STATUS, STATUS_ORDER } from '@/lib/format';
import { active, previous, rows, totals } from '@/lib/store';

const t = totals;
const pt = computed(() => previous.value?.totals ?? null);
const d = (k) => (pt.value && t.value?.[k] !== null && pt.value[k] !== null ? t.value[k] - pt.value[k] : null);

const statusCounts = computed(() => STATUS_ORDER.map((s) => ({ s, n: rows.value.filter((r) => r.status === s).length })));

const topAFat = computed(() =>
    [...rows.value]
        .filter((r) => (r.aFat ?? 0) > 0)
        .sort((a, b) => b.aFat - a.aFat)
        .slice(0, 8)
        .map((r) => ({
            produto: r.produto,
            label: `${r.produto} · ${r.descricao}`,
            value: r.aFat,
            display: fmtInt(r.aFat),
            metric: 'À faturar',
            extra: [
                { label: 'Est. atual', value: fmtInt(r.estAtual) },
                { label: 'Cobertura', value: fmtCob(r.pctCob) },
            ],
        })),
);

const topCorte = computed(() =>
    [...rows.value]
        .filter((r) => (r.corte ?? 0) > 0)
        .sort((a, b) => b.corte - a.corte)
        .slice(0, 8)
        .map((r) => ({
            produto: r.produto,
            label: `${r.produto} · ${r.descricao}`,
            value: r.corte,
            display: fmtInt(r.corte),
            metric: 'Corte',
            color: 'var(--destructive)',
        })),
);

const criticos = computed(() =>
    rows.value
        .filter((r) => r.status === 'ruptura' || r.status === 'critico')
        .sort((a, b) => (a.status === b.status ? (b.aFat ?? 0) - (a.aFat ?? 0) : a.status === 'ruptura' ? -1 : 1))
        .slice(0, 6),
);

const faturadoTotal = computed(() => (t.value ? (t.value.qtdeFat ?? 0) + (t.value.carteira ?? 0) + (t.value.fatB2C ?? 0) : 0));
const pmpAting = computed(() => (t.value?.pmp ? (t.value.produzido ?? 0) / t.value.pmp : null));
</script>

<template>
    <PageHeader title="Visão geral" :description="`Base de ${fmtDateTime(active.meta.importedAt)} · ${active.meta.productCount} produtos${previous ? ' · variações comparadas ao upload anterior' : ''}`">
        <RouterLink to="/atualizar" class="btn btn-outline btn-sm">Atualizar planilha</RouterLink>
    </PageHeader>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
        <StatCard label="Previsão de venda" :value="fmtInt(t.pVenda)" :sub="`Orçado ${fmtInt(t.orcado)}`" :delta="d('pVenda')" :delta-fmt="fmtInt" />
        <StatCard label="Faturado" :value="fmtInt(t.qtdeFat)" :sub="`+ carteira ${fmtInt(t.carteira)}`" :delta="d('qtdeFat')" :delta-fmt="fmtInt" />
        <StatCard label="% Faturado" :value="fmtPct(t.pctFat)" sub="da previsão de venda" :delta="d('pctFat')" :delta-fmt="(v) => fmtPct(v)" tone="bg-violet-100" />
        <StatCard label="À faturar" :value="fmtInt(t.aFat)" sub="restante do mês" :delta="d('aFat')" :delta-fmt="fmtInt" good-when="down" />
        <StatCard label="Estoque atual" :value="fmtInt(t.estAtual)" :sub="`Total ${fmtInt(t.estTotal2)}`" :delta="d('estAtual')" :delta-fmt="fmtInt" />
        <StatCard label="Cobertura" :value="fmtCob(t.pctCob)" :sub="`Total ${fmtCob(t.pctCobTotal)}`" :delta="d('pctCob')" :delta-fmt="fmtCob" />
        <StatCard label="Corte" :value="fmtInt(t.corte)" :sub="`${rows.filter((r) => (r.corte ?? 0) > 0).length} produtos com corte`" :delta="d('corte')" :delta-fmt="fmtInt" good-when="down" tone="bg-red-50" />
        <StatCard label="Emitir OP" :value="fmtInt(t.emitirOp)" :sub="`${rows.filter((r) => (r.emitirOp ?? 0) > 0).length} produtos`" :delta="d('emitirOp')" :delta-fmt="fmtInt" good-when="down" />
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-5">
        <div class="card p-5 lg:col-span-3">
            <div class="mb-4 flex items-center justify-between">
                <h2 class="eyebrow">Progresso do faturamento</h2>
                <RouterLink to="/faturamento" class="inline-flex items-center gap-1 text-xs font-bold text-primary">Detalhes <IconArrowRight class="size-3.5" /></RouterLink>
            </div>
            <div class="mb-1 flex items-baseline justify-between text-sm">
                <span class="font-semibold">Faturado + carteira + B2C</span>
                <span class="font-bold tabular-nums">{{ fmtInt(faturadoTotal) }} / {{ fmtInt(t.pVenda) }}</span>
            </div>
            <div class="h-5 w-full overflow-hidden rounded-md border-2 border-foreground bg-secondary">
                <div class="h-full bg-primary" :style="{ width: `${Math.min(1, t.pctFat ?? 0) * 100}%` }" />
            </div>
            <div class="mt-1 text-xs text-muted-foreground">{{ fmtPct(t.pctFat) }} da previsão de venda · faltam {{ fmtInt(t.aFat) }}</div>

            <div class="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div><div class="text-xs text-muted-foreground">Faturado</div><div class="font-bold tabular-nums">{{ fmtInt(t.qtdeFat) }}</div></div>
                <div><div class="text-xs text-muted-foreground">Carteira</div><div class="font-bold tabular-nums">{{ fmtInt(t.carteira) }}</div></div>
                <div><div class="text-xs text-muted-foreground">Fat. B2C</div><div class="font-bold tabular-nums">{{ fmtInt(t.fatB2C) }}</div></div>
            </div>

            <div class="mt-6 border-t-2 border-dashed border-foreground/20 pt-5">
                <div class="mb-1 flex items-baseline justify-between text-sm">
                    <span class="font-semibold">Fábrica: produzido vs. PMP</span>
                    <span class="font-bold tabular-nums">{{ fmtPct(pmpAting) }}</span>
                </div>
                <ProgressBar :value="pmpAting" color="var(--s1)" />
                <div class="mt-1 text-xs text-muted-foreground">{{ fmtInt(t.produzido) }} produzidos de {{ fmtInt(t.pmp) }} planejados</div>
            </div>
        </div>

        <div class="card p-5 lg:col-span-2">
            <div class="mb-4 flex items-center justify-between">
                <h2 class="eyebrow">Saúde da cobertura</h2>
                <RouterLink to="/cobertura" class="inline-flex items-center gap-1 text-xs font-bold text-primary">Detalhes <IconArrowRight class="size-3.5" /></RouterLink>
            </div>
            <StackBar
                :segments="statusCounts.map((c) => ({ label: STATUS[c.s].label, value: c.n, color: STATUS[c.s].dot }))"
                title="Produtos por situação"
                :legend="false"
            />
            <ul class="mt-4 grid gap-2">
                <li v-for="c in statusCounts" :key="c.s" class="flex items-center justify-between gap-2 text-sm">
                    <span class="flex items-center gap-2">
                        <span class="inline-block size-2.5 rounded-sm" :style="{ background: STATUS[c.s].dot }" />
                        <StatusBadge :status="c.s" />
                        <span class="hidden text-xs text-muted-foreground xl:inline">{{ STATUS[c.s].hint }}</span>
                    </span>
                    <span class="font-bold tabular-nums">{{ c.n }}</span>
                </li>
            </ul>
        </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <div class="card p-5">
            <h2 class="eyebrow mb-4">Maiores volumes à faturar</h2>
            <BarList :items="topAFat" />
        </div>
        <div class="card p-5">
            <h2 class="eyebrow mb-4">Maiores cortes</h2>
            <BarList :items="topCorte" />
        </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-5">
        <div class="card p-5 lg:col-span-3">
            <div class="mb-4 flex items-center justify-between">
                <h2 class="eyebrow">Estoque por local</h2>
                <RouterLink to="/estoque" class="inline-flex items-center gap-1 text-xs font-bold text-primary">Detalhes <IconArrowRight class="size-3.5" /></RouterLink>
            </div>
            <div class="mb-3 text-2xl font-extrabold tabular-nums">{{ fmtCompact(t.estTotal) }} <span class="text-sm font-semibold text-muted-foreground">unidades no total</span></div>
            <StackBar :segments="STOCK_LOCATIONS.map((l) => ({ label: l.label, value: t[l.key] ?? 0, color: l.color }))" title="Estoque total" />
        </div>
        <div class="card p-5 lg:col-span-2">
            <div class="mb-3 flex items-center justify-between">
                <h2 class="eyebrow">Atenção agora</h2>
                <RouterLink to="/cobertura" class="inline-flex items-center gap-1 text-xs font-bold text-primary">Ver todos <IconArrowRight class="size-3.5" /></RouterLink>
            </div>
            <ul class="divide-y divide-dashed divide-foreground/20">
                <li v-for="r in criticos" :key="r.produto" class="py-2">
                    <div class="flex items-center justify-between gap-2">
                        <span class="truncate text-sm font-semibold">{{ r.descricao }}</span>
                        <StatusBadge :status="r.status" />
                    </div>
                    <div class="text-xs text-muted-foreground">
                        {{ r.produto }} · à faturar {{ fmtInt(r.aFat) }} · estoque {{ fmtInt(r.estAtual) }} · cob. {{ fmtCob(r.pctCob) }}
                    </div>
                </li>
                <li v-if="!criticos.length" class="py-4 text-sm text-muted-foreground">Nenhum produto em risco.</li>
            </ul>
        </div>
    </div>
</template>
