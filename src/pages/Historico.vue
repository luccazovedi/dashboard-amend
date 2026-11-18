<script setup>
import { IconFileSpreadsheet, IconTrash } from '@tabler/icons-vue';
import { computed } from 'vue';

import LineChart from '@/components/LineChart.vue';
import PageHeader from '@/components/PageHeader.vue';
import { fmtCob, fmtDateTime, fmtInt, fmtPct } from '@/lib/format';
import { active, removeSnapshot, setActive, state } from '@/lib/store';

const series = computed(() =>
    [...state.snapshots].reverse().map((s) => ({
        x: new Date(s.meta.importedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        t: s.totals,
    })),
);

const charts = [
    { key: 'pctFat', label: '% faturado', fmt: (v) => fmtPct(v) },
    { key: 'qtdeFat', label: 'Faturado', fmt: fmtInt },
    { key: 'corte', label: 'Corte', fmt: fmtInt, color: 'var(--destructive)' },
    { key: 'pctCob', label: 'Cobertura', fmt: fmtCob, color: 'var(--s1)' },
];

async function remove(s) {
    if (confirm(`Remover o upload "${s.meta.fileName}" de ${fmtDateTime(s.meta.importedAt)} do histórico?`)) await removeSnapshot(s.id);
}
</script>

<template>
    <PageHeader title="Histórico" description="Cada planilha enviada fica guardada neste navegador. Escolha qual usar como base ou acompanhe a evolução dos indicadores." />

    <div v-if="series.length > 1" class="mb-6 grid gap-6 md:grid-cols-2">
        <div v-for="c in charts" :key="c.key" class="card p-5">
            <div class="mb-2 flex items-baseline justify-between">
                <h2 class="eyebrow">{{ c.label }}</h2>
                <span class="text-lg font-extrabold tabular-nums">{{ c.fmt(series.at(-1).t[c.key]) }}</span>
            </div>
            <LineChart :points="series.map((s) => ({ x: s.x, y: s.t[c.key] }))" :label="c.label" :format="c.fmt" :color="c.color" />
        </div>
    </div>
    <div v-else class="card mb-6 p-5 text-sm text-muted-foreground">
        Os gráficos de evolução aparecem a partir do segundo upload.
    </div>

    <div class="tbl-wrap">
        <table class="tbl">
            <thead>
                <tr>
                    <th>Arquivo</th>
                    <th>Importado em</th>
                    <th class="text-right">Produtos</th>
                    <th class="text-right">Faturado</th>
                    <th class="text-right">% Fat.</th>
                    <th class="text-right">Corte</th>
                    <th class="text-right">Cobertura</th>
                    <th />
                </tr>
            </thead>
            <tbody>
                <tr v-for="s in state.snapshots" :key="s.id">
                    <td>
                        <span class="flex items-center gap-2">
                            <IconFileSpreadsheet class="size-4 text-success" />
                            <span class="max-w-64 truncate">{{ s.meta.fileName }}</span>
                            <span v-if="s.id === active?.id" class="badge bg-emerald-200 text-foreground">Ativa</span>
                        </span>
                    </td>
                    <td>{{ fmtDateTime(s.meta.importedAt) }}</td>
                    <td class="num">{{ s.meta.productCount }}</td>
                    <td class="num">{{ fmtInt(s.totals.qtdeFat) }}</td>
                    <td class="num">{{ fmtPct(s.totals.pctFat) }}</td>
                    <td class="num">{{ fmtInt(s.totals.corte) }}</td>
                    <td class="num">{{ fmtCob(s.totals.pctCob) }}</td>
                    <td class="text-right">
                        <span class="inline-flex gap-2">
                            <button v-if="s.id !== active?.id" class="btn btn-outline btn-sm" @click="setActive(s.id)">Usar como base</button>
                            <button class="btn btn-outline btn-sm px-2" aria-label="Remover" @click="remove(s)"><IconTrash /></button>
                        </span>
                    </td>
                </tr>
                <tr v-if="!state.snapshots.length">
                    <td colspan="8" class="py-8 text-center text-muted-foreground">Nenhum upload ainda.</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
