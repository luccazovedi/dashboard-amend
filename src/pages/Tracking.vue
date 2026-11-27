<script setup>
import { IconAlertTriangle, IconArrowRight, IconClockExclamation, IconDownload, IconRoute, IconScissors, IconUser } from '@tabler/icons-vue';
import { computed, ref, watch } from 'vue';

import DataTable from '@/components/DataTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import SearchBox from '@/components/SearchBox.vue';
import StackBar from '@/components/StackBar.vue';
import StatCard from '@/components/StatCard.vue';
import { normalize } from '@/lib/columns';
import { fmtDate, fmtInt, fmtPct } from '@/lib/format';
import { selectTracking, setTrackingUteis, state, trackingAnterior, trackingAtivo, trackingDiff, trackingPedidos, trackingPrev } from '@/lib/store';
import { ABERTAS, ATRASADO, ETAPA, ETAPA_ORDER, shortVendedor, SITUACAO, SLA } from '@/lib/tracking';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtBRL = (v) => brl.format(v ?? 0);
const fmtRef = (s) => (s ? `${fmtDate(s.meta.refAt)} ${s.meta.refAt.slice(11, 16)}` : '—');
const dias = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}${state.trackingUteis ? (n === 1 ? ' útil' : ' úteis') : ''}`;

const q = ref('');
const filtro = ref('atrasados');
const vendedor = ref('todos');

const all = trackingPedidos;
const vendedores = computed(() => [...new Set(all.value.map((o) => shortVendedor(o.vendedor)).filter(Boolean))].sort());
const resumoVendedor = (v) => {
    const xs = v === 'todos' ? all.value : all.value.filter((o) => shortVendedor(o.vendedor) === v);
    return {
        abertos: xs.filter((o) => ABERTAS.includes(o.etapa)).length,
        atrasados: xs.filter((o) => ATRASADO.includes(o.situacao)).length,
        cortados: xs.filter((o) => o.etapa === 'cortado').length,
    };
};
const opcoesVendedor = computed(() => ['todos', ...vendedores.value].map((v) => ({ v, label: v === 'todos' ? 'Todos' : v, ...resumoVendedor(v) })));
// o vendedor escolhido some da planilha nova → volta para todos
watch(vendedores, (vs) => {
    if (vendedor.value !== 'todos' && !vs.includes(vendedor.value)) vendedor.value = 'todos';
});
const base = computed(() => all.value.filter((o) => vendedor.value === 'todos' || shortVendedor(o.vendedor) === vendedor.value));

const abertos = computed(() => base.value.filter((o) => ABERTAS.includes(o.etapa)));
const atrasados = computed(() => base.value.filter((o) => ATRASADO.includes(o.situacao)).sort((a, b) => b.diasAtraso - a.diasAtraso));
const cortados = computed(() => base.value.filter((o) => o.etapa === 'cortado').sort((a, b) => (b.solicitacao ?? '').localeCompare(a.solicitacao ?? '')));
const entregues = computed(() => base.value.filter((o) => o.etapa === 'entregue'));
const pctNoPrazo = computed(() => (entregues.value.length ? entregues.value.filter((o) => o.situacao === 'entregueNoPrazo').length / entregues.value.length : null));

const prevCount = (fn) => (trackingPrev.value ? trackingPrev.value.filter((o) => vendedor.value === 'todos' || shortVendedor(o.vendedor) === vendedor.value).filter(fn).length : null);
const delta = (fn, cur) => {
    const p = prevCount(fn);
    return p === null ? null : cur - p;
};

const FILTROS = computed(() => [
    { k: 'atrasados', label: 'Atrasados', n: atrasados.value.length, fn: (o) => ATRASADO.includes(o.situacao) },
    { k: 'atrasoExp', label: 'Expedição atrasada', n: base.value.filter((o) => o.situacao === 'atrasoExp').length, fn: (o) => o.situacao === 'atrasoExp' },
    { k: 'atrasoEnt', label: 'Entrega atrasada', n: base.value.filter((o) => o.situacao === 'atrasoEnt').length, fn: (o) => o.situacao === 'atrasoEnt' },
    { k: 'vence', label: 'Vence em breve', n: base.value.filter((o) => o.situacao === 'vence').length, fn: (o) => o.situacao === 'vence' },
    { k: 'abertos', label: 'Em andamento', n: abertos.value.length, fn: (o) => ABERTAS.includes(o.etapa) },
    { k: 'cortado', label: 'Cortado integral', n: cortados.value.length, fn: (o) => o.etapa === 'cortado' },
    { k: 'parcial', label: 'Corte parcial', n: base.value.filter((o) => o.corte && !o.corteIntegral && o.etapa !== 'cancelado').length, fn: (o) => o.corte && !o.corteIntegral && o.etapa !== 'cancelado' },
    { k: 'entregue', label: 'Entregues', n: entregues.value.length, fn: (o) => o.etapa === 'entregue' },
    { k: 'cancelado', label: 'Cancelados', n: base.value.filter((o) => o.etapa === 'cancelado').length, fn: (o) => o.etapa === 'cancelado' },
    { k: 'todos', label: 'Todos', n: base.value.length, fn: () => true },
]);

const filtered = computed(() => {
    const f = FILTROS.value.find((x) => x.k === filtro.value) ?? FILTROS.value.at(-1);
    const n = normalize(q.value);
    return base.value.filter(
        (o) => f.fn(o) && (!n || [o.pedido, o.orcamento, o.nome, o.pedidoCliente, o.nf, o.codCliente, o.municipio].some((v) => normalize(v).includes(n))),
    );
});

const etapaSegs = computed(() =>
    ETAPA_ORDER.map((e) => ({ label: ETAPA[e].label, value: base.value.filter((o) => o.etapa === e).length, color: ETAPA[e].color })).filter((s) => s.value),
);

const diff = trackingDiff;
const diffBlocks = computed(() => [
    { k: 'novosAtrasos', label: 'Entraram em atraso', tone: 'bg-red-100', items: diff.value.novosAtrasos },
    { k: 'novosCortes', label: 'Cortados integralmente', tone: 'bg-red-100', items: diff.value.novosCortes },
    { k: 'entregues', label: 'Entregues', tone: 'bg-emerald-100', items: diff.value.entregues },
    { k: 'mudancas', label: 'Mudaram de status', tone: 'bg-sky-100', items: diff.value.mudancas.map((m) => ({ ...m.o, de: m.de })) },
    { k: 'novos', label: 'Pedidos novos', tone: 'bg-violet-100', items: diff.value.novos },
    { k: 'sairam', label: 'Saíram da planilha', tone: 'bg-secondary', items: diff.value.sairam },
]);
const diffOpen = ref(null);

const ped = (o) => o.pedido || `orç. ${o.orcamento}`;
const prazoAtual = (o) => (o.expedicao ? o.prazoEnt : o.prazoExp);

const tableCols = [
    { key: 'pedido', label: 'Pedido', fmt: 'text', class: 'font-mono text-xs', get: (o) => o.pedido || '—' },
    { key: 'nome', label: 'Cliente', fmt: 'text', class: 'max-w-56 truncate' },
    { key: 'etapa', label: 'Etapa', fmt: 'text', sortValue: (o) => ETAPA_ORDER.indexOf(o.etapa) },
    { key: 'situacao', label: 'Prazo', fmt: 'text', sortValue: (o) => (ATRASADO.includes(o.situacao) ? 1000 + o.diasAtraso : o.situacao === 'vence' ? 500 : 0) },
    { key: 'solicitacao', label: 'Solicitação', fmt: 'date' },
    { key: 'prazoExp', label: 'Prazo exped.', fmt: 'date' },
    { key: 'expedicao', label: 'Expedição', fmt: 'date' },
    { key: 'prazoEnt', label: 'Prazo entrega', fmt: 'date' },
    { key: 'previsao', label: 'Prev. transp.', fmt: 'date' },
    { key: 'entrega', label: 'Entrega', fmt: 'date' },
    { key: 'qtdPedido', label: 'Qtd. pedida', fmt: 'int' },
    { key: 'qtdCorte', label: 'Qtd. cortada', fmt: 'int', class: 'text-destructive font-bold' },
    { key: 'valorPedido', label: 'Valor', fmt: 'int', get: (o) => o.valorPedido || o.valorOrcamento, class: 'tabular-nums' },
    { key: 'status', label: 'Status no sistema', fmt: 'text', class: 'max-w-64 truncate text-xs' },
    { key: 'vendedor', label: 'Vendedor', fmt: 'text', get: (o) => shortVendedor(o.vendedor), class: 'text-xs' },
    { key: 'pedidoCliente', label: 'Ped. cliente', fmt: 'text', class: 'font-mono text-xs' },
    { key: 'nf', label: 'NF', fmt: 'text', class: 'font-mono text-xs' },
];

function exportCsv() {
    const head = ['Pedido', 'Orçamento', 'Cliente', 'Nome', 'UF', 'Vendedor', 'Etapa', 'Situação do prazo', 'Dias de atraso', 'Solicitação', 'Prazo expedição', 'Expedição', 'Prazo entrega', 'Previsão transportadora', 'Entrega', 'Qtd. pedida', 'Qtd. cortada', 'Qtd. faturada', 'Valor pedido', 'Valor cortado', 'Corte integral', 'Corte', 'Status no sistema', 'Pedido cliente', 'NF', 'Alertas'];
    const esc = (v) => {
        const s = v === null || v === undefined ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
        return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [head.join(';')];
    for (const o of filtered.value) {
        lines.push(
            [o.pedido, o.orcamento, o.codCliente, o.nome, o.uf, shortVendedor(o.vendedor), ETAPA[o.etapa].label, SITUACAO[o.situacao].label, o.diasAtraso || '', fmtDate(o.solicitacao), fmtDate(o.prazoExp), fmtDate(o.expedicao), fmtDate(o.prazoEnt), fmtDate(o.previsao), fmtDate(o.entrega), o.qtdPedido, o.qtdCorte, o.qtdFat, o.valorPedido, o.valorCorte, o.corteIntegral ? 'SIM' : 'NÃO', o.corte ? 'SIM' : 'NÃO', o.status, o.pedidoCliente, o.nf, o.alertas.join(' | ')]
                .map(esc)
                .join(';'),
        );
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tracking-${vendedor.value === 'todos' ? '' : `${normalize(vendedor.value)}-`}${filtro.value}-${trackingAtivo.value.meta.refAt.slice(0, 16).replace(/[T:]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}
</script>

<template>
    <PageHeader
        title="Tracking de pedidos"
        :description="`Status de cada pedido, cortes e atrasos. Prazo: expedição em até ${SLA.expedicao} dias da solicitação e entrega em até ${SLA.entrega} dias da expedição.`"
    >
        <div v-if="trackingAtivo" class="seg" title="Como contar os prazos">
            <button :class="{ on: state.trackingUteis }" @click="setTrackingUteis(true)">Dias úteis</button>
            <button :class="{ on: !state.trackingUteis }" @click="setTrackingUteis(false)">Dias corridos</button>
        </div>
        <button v-if="trackingAtivo" class="btn btn-outline btn-sm" @click="exportCsv"><IconDownload /> Exportar CSV</button>
    </PageHeader>

    <!-- vazio -->
    <div v-if="!trackingAtivo" class="card mx-auto mt-6 flex max-w-lg flex-col items-center gap-4 px-6 py-12 text-center">
        <div class="flex size-14 items-center justify-center rounded-xl border-2 border-foreground bg-violet-100 shadow-xs">
            <IconRoute class="size-7 text-violet-700" />
        </div>
        <h2 class="h-display">Nenhum tracking ainda</h2>
        <p class="text-sm text-muted-foreground">Suba o arquivo TRACKPEDIDOS (.csv) na tela Atualizar. Cada envio fica guardado para comparar com o anterior.</p>
        <RouterLink to="/atualizar" class="btn btn-primary">Ir para Atualizar</RouterLink>
    </div>

    <template v-else>
        <!-- posição -->
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div class="flex flex-wrap items-center gap-2">
                <span>Posição</span>
                <select
                    class="input h-9 w-auto py-0 font-semibold text-foreground"
                    :value="trackingAtivo.id"
                    @change="selectTracking($event.target.value)"
                >
                    <option v-for="s in state.tracking" :key="s.id" :value="s.id">{{ fmtRef(s) }} · {{ s.meta.orderCount }} pedidos</option>
                </select>
                <span v-if="trackingAnterior">comparada com <span class="font-semibold text-foreground">{{ fmtRef(trackingAnterior) }}</span></span>
                <span v-else>— suba a próxima planilha para ver o que mudou</span>
            </div>
        </div>

        <!-- filtro por vendedor -->
        <div class="card mb-6 p-4">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 class="eyebrow flex items-center gap-1.5"><IconUser class="size-3.5" /> Vendedor</h2>
                <span v-if="vendedor !== 'todos'" class="text-xs text-muted-foreground">
                    Mostrando só <span class="font-bold text-foreground">{{ vendedor }}</span> —
                    <button class="font-bold text-primary underline-offset-4 hover:underline" @click="vendedor = 'todos'">limpar filtro</button>
                </span>
            </div>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="o in opcoesVendedor"
                    :key="o.v"
                    :class="[
                        'flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-lg border-2 border-foreground px-3 py-2 text-left shadow-xs transition-all hover:shadow-sm',
                        vendedor === o.v ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                    ]"
                    :aria-pressed="vendedor === o.v"
                    @click="vendedor = o.v"
                >
                    <span class="max-w-80 truncate text-sm font-bold">{{ o.label }}</span>
                    <span class="flex flex-wrap gap-x-2 text-[11px] font-semibold opacity-80">
                        <span>{{ o.abertos }} em andamento</span>
                        <span :class="o.atrasados && vendedor !== o.v ? 'text-destructive' : ''">{{ o.atrasados }} atrasados</span>
                        <span>{{ o.cortados }} cortados</span>
                    </span>
                </button>
            </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            <StatCard
                label="Em andamento"
                :value="String(abertos.length)"
                :sub="`${fmtBRL(abertos.reduce((a, o) => a + (o.valorPedido || o.valorOrcamento), 0))}`"
                :delta="delta((o) => ABERTAS.includes(o.etapa), abertos.length)"
                good-when="down"
            />
            <StatCard
                label="Em atraso"
                :value="String(atrasados.length)"
                :sub="`${base.filter((o) => o.situacao === 'atrasoExp').length} na expedição · ${base.filter((o) => o.situacao === 'atrasoEnt').length} na entrega`"
                :delta="delta((o) => ATRASADO.includes(o.situacao), atrasados.length)"
                good-when="down"
                tone="bg-red-50"
            />
            <StatCard label="Vencem hoje/amanhã" :value="String(base.filter((o) => o.situacao === 'vence').length)" sub="ainda no prazo" tone="bg-amber-50" />
            <StatCard
                label="Cortados integralmente"
                :value="String(cortados.length)"
                :sub="`${fmtBRL(cortados.reduce((a, o) => a + o.valorCorte, 0))} · ${fmtInt(cortados.reduce((a, o) => a + o.qtdCorte, 0))} un.`"
                :delta="delta((o) => o.etapa === 'cortado', cortados.length)"
                good-when="down"
                tone="bg-red-50"
            />
            <StatCard
                label="Corte parcial"
                :value="String(base.filter((o) => o.corte && !o.corteIntegral && o.etapa !== 'cancelado').length)"
                :sub="`${fmtInt(base.filter((o) => o.corte && !o.corteIntegral && o.etapa !== 'cancelado').reduce((a, o) => a + o.qtdCorte, 0))} un. cortadas`"
            />
            <StatCard label="Entregues no prazo" :value="fmtPct(pctNoPrazo, 0)" :sub="`${entregues.length} entregues`" tone="bg-emerald-50" />
        </div>

        <!-- etapas -->
        <div class="card mt-6 p-5">
            <h2 class="eyebrow mb-3">Pedidos por etapa</h2>
            <StackBar :segments="etapaSegs" title="Pedidos por etapa" height="h-6" />
        </div>

        <!-- o que mudou -->
        <div v-if="trackingAnterior" class="card mt-6 p-5">
            <h2 class="eyebrow mb-3">Desde a planilha de {{ fmtRef(trackingAnterior) }}</h2>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="b in diffBlocks"
                    :key="b.k"
                    :class="['btn btn-sm', b.tone, diffOpen === b.k ? 'shadow-md ring-2 ring-primary' : '', b.items.length ? '' : 'opacity-50']"
                    :disabled="!b.items.length"
                    @click="diffOpen = diffOpen === b.k ? null : b.k"
                >
                    <span class="font-black tabular-nums">{{ b.items.length }}</span> {{ b.label }}
                </button>
            </div>
            <ul v-if="diffOpen" class="mt-4 grid gap-1.5 text-sm">
                <li
                    v-for="o in diffBlocks.find((b) => b.k === diffOpen).items"
                    :key="o.id"
                    class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-dashed border-foreground/20 pb-1.5"
                >
                    <span class="font-mono text-xs font-bold">{{ ped(o) }}</span>
                    <span class="min-w-0 flex-1 truncate">{{ o.nome }}</span>
                    <template v-if="o.de">
                        <span class="text-xs text-muted-foreground">{{ o.de.status || ETAPA[o.de.etapa].label }}</span>
                        <IconArrowRight class="size-3.5" />
                    </template>
                    <span :class="['badge text-foreground', ETAPA[o.etapa].cls]">{{ ETAPA[o.etapa].label }}</span>
                    <span v-if="ATRASADO.includes(o.situacao)" class="badge bg-red-200 text-foreground">{{ dias(o.diasAtraso) }}</span>
                </li>
            </ul>
        </div>

        <!-- atrasados + cortados -->
        <div class="mt-6 grid gap-6 lg:grid-cols-2">
            <section class="card overflow-hidden">
                <header class="flex items-center justify-between gap-2 border-b-2 border-foreground bg-red-50 px-4 py-3">
                    <h2 class="flex items-center gap-2 font-bold"><IconClockExclamation class="size-5 text-destructive" /> Em atraso</h2>
                    <span class="badge bg-red-200 text-foreground">{{ atrasados.length }}</span>
                </header>
                <ul class="max-h-[420px] divide-y divide-dashed divide-foreground/20 overflow-y-auto">
                    <li v-for="o in atrasados" :key="o.id" class="flex items-start gap-3 px-4 py-2.5">
                        <div class="w-16 shrink-0 text-center">
                            <div class="text-xl leading-none font-black text-destructive tabular-nums">{{ o.diasAtraso }}</div>
                            <div class="text-[10px] font-bold text-muted-foreground uppercase">{{ state.trackingUteis ? 'dias úteis' : 'dias' }}</div>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-mono text-xs font-bold">{{ ped(o) }}</span>
                                <span :class="['badge text-foreground', SITUACAO[o.situacao].cls]">{{ SITUACAO[o.situacao].label }}</span>
                            </div>
                            <div class="truncate text-sm font-semibold">{{ o.nome }}</div>
                            <div class="text-xs text-muted-foreground">
                                {{ o.status || ETAPA[o.etapa].label }} · solicitado {{ fmtDate(o.solicitacao) }} ·
                                <template v-if="o.situacao === 'atrasoExp'">devia expedir até {{ fmtDate(o.prazoExp) }}</template>
                                <template v-else>expedido {{ fmtDate(o.expedicao) }}, devia entregar até {{ fmtDate(o.prazoEnt) }}<template v-if="o.previsao"> · transp. prevê {{ fmtDate(o.previsao) }}</template></template>
                            </div>
                        </div>
                    </li>
                    <li v-if="!atrasados.length" class="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum pedido em atraso. 🎉</li>
                </ul>
            </section>

            <section class="card overflow-hidden">
                <header class="flex items-center justify-between gap-2 border-b-2 border-foreground bg-red-50 px-4 py-3">
                    <h2 class="flex items-center gap-2 font-bold"><IconScissors class="size-5 text-destructive" /> Cortados integralmente</h2>
                    <span class="badge bg-red-300 text-foreground">{{ cortados.length }}</span>
                </header>
                <ul class="max-h-[420px] divide-y divide-dashed divide-foreground/20 overflow-y-auto">
                    <li v-for="o in cortados" :key="o.id" class="flex items-start justify-between gap-3 px-4 py-2.5">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-mono text-xs font-bold">{{ ped(o) }}</span>
                                <span v-if="diff.novosCortes.some((x) => x.id === o.id)" class="badge bg-violet-200 text-foreground">novo</span>
                            </div>
                            <div class="truncate text-sm font-semibold">{{ o.nome }}</div>
                            <div class="text-xs text-muted-foreground">
                                solicitado {{ fmtDate(o.solicitacao) }} · {{ shortVendedor(o.vendedor) }}<template v-if="o.pedidoCliente"> · ped. cliente {{ o.pedidoCliente }}</template>
                            </div>
                        </div>
                        <div class="shrink-0 text-right">
                            <div class="font-bold tabular-nums">{{ fmtInt(o.qtdCorte) }} un.</div>
                            <div class="text-xs text-muted-foreground tabular-nums">{{ fmtBRL(o.valorCorte) }}</div>
                        </div>
                    </li>
                    <li v-if="!cortados.length" class="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum pedido cortado integralmente.</li>
                </ul>
            </section>
        </div>

        <!-- todos os pedidos -->
        <div class="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
            <div class="seg flex-wrap">
                <button v-for="f in FILTROS" :key="f.k" :class="{ on: filtro === f.k }" @click="filtro = f.k">
                    {{ f.label }} <span class="opacity-60">{{ f.n }}</span>
                </button>
            </div>
            <SearchBox v-model="q" placeholder="Pedido, orçamento, cliente, NF…" />
        </div>

        <DataTable
            :columns="tableCols"
            :rows="filtered.map((o) => ({ ...o, produto: o.id }))"
            :clickable="false"
            sort-key="situacao"
            empty-text="Nenhum pedido com esse filtro."
        >
            <template #cell-etapa="{ row }">
                <span :class="['badge text-foreground', ETAPA[row.etapa].cls]" :title="ETAPA[row.etapa].hint">{{ ETAPA[row.etapa].label }}</span>
            </template>
            <template #cell-situacao="{ row }">
                <span v-if="row.situacao !== 'encerrado'" :class="['badge text-foreground', SITUACAO[row.situacao].cls]">
                    <IconAlertTriangle v-if="row.alertas.length" :title="row.alertas.join(' · ')" />
                    {{ ATRASADO.includes(row.situacao) ? `${SITUACAO[row.situacao].label} · ${row.diasAtraso}d` : row.situacao === 'vence' ? `Vence ${fmtDate(prazoAtual(row)).slice(0, 5)}` : SITUACAO[row.situacao].label }}
                </span>
                <span v-else class="text-muted-foreground">—</span>
            </template>
            <template #cell-prazoExp="{ row }">
                <span :class="row.atrasoExp > 0 ? 'font-bold text-destructive' : ''">{{ fmtDate(row.prazoExp) }}</span>
            </template>
            <template #cell-prazoEnt="{ row }">
                <span :class="row.atrasoEnt > 0 ? 'font-bold text-destructive' : ''">{{ fmtDate(row.prazoEnt) }}</span>
            </template>
            <template #cell-previsao="{ row }">
                <span :class="row.previsao && row.prazoEnt && row.previsao > row.prazoEnt ? 'font-bold text-warning' : ''">{{ fmtDate(row.previsao) }}</span>
            </template>
            <template #cell-valorPedido="{ value }">{{ fmtBRL(value) }}</template>
            <template #cell-qtdCorte="{ value }">{{ value ? fmtInt(value) : '—' }}</template>
        </DataTable>
        <p class="mt-3 text-xs text-muted-foreground">
            Solicitação = emissão do pedido (ou entrada no portal). Prazo de entrega conta a partir da expedição real; se ainda não expediu, a partir do prazo de expedição.
            “Vence em breve” = falta 1 dia ou menos. {{ state.trackingUteis ? 'Dias úteis = segunda a sexta (feriados não descontados).' : '' }}
        </p>
    </template>
</template>
