<script setup>
import { IconAlertTriangle, IconDownload, IconLayoutList, IconTable, IconTruckDelivery } from '@tabler/icons-vue';
import { computed, ref } from 'vue';

import DataTable from '@/components/DataTable.vue';
import DiagBadge from '@/components/DiagBadge.vue';
import PageHeader from '@/components/PageHeader.vue';
import SearchBox from '@/components/SearchBox.vue';
import StackBar from '@/components/StackBar.vue';
import StatCard from '@/components/StatCard.vue';
import { normalize, STOCK_LOCATIONS } from '@/lib/columns';
import { openProduct } from '@/lib/drawer';
import { fmtCob, fmtDate, fmtDateTime, fmtInt } from '@/lib/format';
import { DIAG, DIAG_ORDER } from '@/lib/pedidos';
import { active, pedidoAtivo, pedidoItens } from '@/lib/store';

const q = ref('');
const cliente = ref('todos');
const diag = ref('todos');
const view = ref('cards');

const clientes = computed(() => pedidoAtivo.value?.clientes.map((c) => c.nome) ?? []);

const doCliente = computed(() => pedidoItens.value.filter((i) => cliente.value === 'todos' || i.cliente === cliente.value));

const filtered = computed(() => {
    const n = normalize(q.value);
    return doCliente.value.filter(
        (i) =>
            (diag.value === 'todos' || (diag.value === 'alertas' ? i.alertas.length : i.diag === diag.value)) &&
            (!n || normalize(i.sku).includes(n) || normalize(i.descricao).includes(n) || normalize(i.produto).includes(n)),
    );
});

const ordered = computed(() => [...filtered.value].sort((a, b) => DIAG_ORDER.indexOf(a.diag) - DIAG_ORDER.indexOf(b.diag)));

const count = (fn) => doCliente.value.filter(fn).length;
const diagCounts = computed(() => DIAG_ORDER.map((d) => ({ d, n: count((i) => i.diag === d) })).filter((x) => x.n));
const somaPainel = (k) => doCliente.value.reduce((a, i) => a + (i.painel?.[k] ?? 0), 0);

const LOG_TONE = {
    pendente: 'bg-amber-100',
    aguardando: 'bg-amber-200',
    transito: 'bg-sky-200',
    previsao: 'bg-violet-200',
    recebido: 'bg-emerald-200',
    semprevisao: 'bg-red-200',
};
const logTone = (s) => {
    const n = normalize(s);
    const k = Object.keys(LOG_TONE).find((key) => n.includes(key));
    return LOG_TONE[k] ?? 'bg-card';
};

const tableCols = [
    { key: 'cliente', label: 'Cliente', fmt: 'text' },
    { key: 'sku', label: 'SKU', fmt: 'text', class: 'font-mono text-xs' },
    { key: 'descricao', label: 'Descrição', fmt: 'text', class: 'max-w-64 truncate' },
    { key: 'statusLog', label: 'Status logística', fmt: 'text' },
    { key: 'diag', label: 'Situação no painel', fmt: 'text', sortValue: (i) => DIAG_ORDER.indexOf(i.diag) },
    { key: 'aFat', label: 'À faturar', fmt: 'int', get: (i) => i.painel?.aFat ?? null },
    { key: 'corte', label: 'Corte', fmt: 'int', get: (i) => i.painel?.corte ?? null, class: 'text-destructive font-bold' },
    { key: 'estAtual', label: 'Est. atual', fmt: 'int', get: (i) => i.painel?.estAtual ?? null },
    { key: 'estTotal2', label: 'Est. total', fmt: 'int', get: (i) => i.painel?.estTotal2 ?? null },
    { key: 'pctCob', label: 'Cob.', fmt: 'cob', get: (i) => i.painel?.pctCob ?? null },
    { key: 'opAberta', label: 'OP aberta', fmt: 'int', get: (i) => i.painel?.opAberta ?? null },
    { key: 'opProg', label: 'OP prog.', fmt: 'int', get: (i) => i.painel?.opProg ?? null },
    { key: 'emitirOp', label: 'Emitir OP', fmt: 'int', get: (i) => i.painel?.emitirOp ?? null },
    { key: 'previsaoFabrica', label: 'Prev. fábrica', fmt: 'date' },
    { key: 'previsao', label: 'Prev. logística', fmt: 'date' },
    { key: 'qtdPrevista', label: 'Qtd. prevista', fmt: 'int' },
];

function exportCsv() {
    const head = ['Cliente', 'SKU', 'Produto painel', 'Descrição', 'Status logística', 'Situação no painel', 'À faturar', 'Corte', 'Carteira', 'Est. atual', 'Est. total', 'Trânsito', 'Cobertura', 'OP aberta', 'OP programada', 'Emitir OP', 'Previsão fábrica', 'Previsão logística', 'Qtd. prevista', 'Observações', 'Alertas'];
    const esc = (v) => {
        const s = v === null || v === undefined ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
        return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [head.join(';')];
    for (const i of ordered.value) {
        const p = i.painel ?? {};
        lines.push(
            [i.cliente, i.sku, i.produto, i.descricao, i.statusLog, DIAG[i.diag].label, p.aFat, p.corte, p.carteira, p.estAtual, p.estTotal2, p.transito, p.pctCob, p.opAberta, p.opProg, p.emitirOp, fmtDate(i.previsaoFabrica), fmtDate(i.previsao), i.qtdPrevista, i.obs, i.alertas.join(' | ')]
                .map(esc)
                .join(';'),
        );
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `corte-pedidos-cruzado-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}
</script>

<template>
    <PageHeader
        title="Pedidos cortados"
        description="Cada SKU cortado dos clientes cruzado com o painel: quanto falta faturar, quanto foi cortado, onde está o estoque e em que pé está a produção."
    >
        <button v-if="pedidoItens.length" class="btn btn-outline btn-sm" @click="exportCsv"><IconDownload /> Exportar CSV</button>
    </PageHeader>

    <!-- vazio -->
    <div v-if="!pedidoAtivo" class="card mx-auto mt-6 flex max-w-lg flex-col items-center gap-4 px-6 py-12 text-center">
        <div class="flex size-14 items-center justify-center rounded-xl border-2 border-foreground bg-violet-100 shadow-xs">
            <IconTruckDelivery class="size-7 text-violet-700" />
        </div>
        <h2 class="h-display">Nenhum corte de pedidos ainda</h2>
        <p class="text-sm text-muted-foreground">Suba a planilha de Corte de Pedidos (uma aba por cliente) na tela Atualizar.</p>
        <RouterLink to="/atualizar" class="btn btn-primary">Ir para Atualizar</RouterLink>
    </div>

    <template v-else>
        <div v-if="!active" class="mb-5 flex items-start gap-3 rounded-xl border-2 border-foreground bg-amber-100 p-4 shadow-xs">
            <IconAlertTriangle class="mt-0.5 size-5 shrink-0 text-warning" />
            <div class="text-sm">
                <span class="font-bold">Falta o Painel de Cobertura.</span> Sem ele não dá para cruzar estoque, quantitativo e produção.
                <RouterLink to="/atualizar" class="font-bold text-primary underline">Subir agora</RouterLink>
            </div>
        </div>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
                Corte: <span class="font-semibold text-foreground">{{ pedidoAtivo.meta.fileName }}</span> ({{ fmtDateTime(pedidoAtivo.meta.importedAt) }})
                <template v-if="active"> · Painel: <span class="font-semibold text-foreground">{{ active.meta.fileName }}</span></template>
            </span>
            <div class="seg flex-wrap">
                <button :class="{ on: cliente === 'todos' }" @click="cliente = 'todos'">Todos os clientes</button>
                <button v-for="c in clientes" :key="c" :class="{ on: cliente === c }" @click="cliente = c">{{ c }}</button>
            </div>
        </div>

        <div class="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            <StatCard label="SKUs cortados" :value="String(doCliente.length)" :sub="`${cliente === 'todos' ? clientes.length + ' clientes' : cliente}`" />
            <StatCard label="Liberar pedido" :value="String(count((i) => i.diag === 'liberar'))" sub="estoque já cobre o saldo" tone="bg-emerald-50" />
            <StatCard label="Na fábrica" :value="String(count((i) => ['producao', 'programado', 'emitir'].includes(i.diag)))" sub="OP aberta, programada ou a emitir" tone="bg-violet-50" />
            <StatCard label="Sem previsão" :value="String(count((i) => i.diag === 'semPrevisao' || i.diag === 'naoEncontrado'))" sub="sem estoque nem OP" tone="bg-red-50" />
            <StatCard label="À faturar (SKUs)" :value="fmtInt(somaPainel('aFat'))" :sub="`corte ${fmtInt(somaPainel('corte'))}`" />
            <StatCard label="Divergências" :value="String(count((i) => i.alertas.length))" sub="logística × painel" tone="bg-amber-50" />
        </div>

        <div v-if="diagCounts.length" class="card mt-6 p-5">
            <h2 class="eyebrow mb-3">Situação dos SKUs cortados</h2>
            <StackBar :segments="diagCounts.map((x) => ({ label: DIAG[x.d].label, value: x.n, color: DIAG[x.d].color }))" title="SKUs por situação" height="h-6" />
        </div>

        <div class="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
            <div class="seg flex-wrap">
                <button :class="{ on: diag === 'todos' }" @click="diag = 'todos'">Todos</button>
                <button v-for="x in diagCounts" :key="x.d" :class="{ on: diag === x.d }" @click="diag = x.d">
                    {{ DIAG[x.d].label }} <span class="opacity-60">{{ x.n }}</span>
                </button>
                <button :class="{ on: diag === 'alertas' }" @click="diag = 'alertas'">Com divergência</button>
            </div>
            <div class="flex items-center gap-2">
                <SearchBox v-model="q" placeholder="Buscar SKU ou descrição…" />
                <div class="seg">
                    <button :class="{ on: view === 'cards' }" aria-label="Cartões" @click="view = 'cards'"><IconLayoutList class="size-4" /></button>
                    <button :class="{ on: view === 'table' }" aria-label="Tabela" @click="view = 'table'"><IconTable class="size-4" /></button>
                </div>
            </div>
        </div>

        <!-- CARTÕES: pedido × quantitativo × estoque × produção -->
        <div v-if="view === 'cards'" class="grid gap-4">
            <article
                v-for="i in ordered"
                :key="i.cliente + i.sku"
                :class="['card overflow-hidden', i.produto ? 'cursor-pointer transition-shadow hover:shadow-md' : '']"
                @click="i.produto && openProduct(i.produto)"
            >
                <header class="flex flex-wrap items-start justify-between gap-3 border-b-2 border-foreground px-4 py-3">
                    <div class="min-w-0">
                        <div class="mb-1 flex flex-wrap items-center gap-2">
                            <span class="badge bg-foreground text-background">{{ i.cliente }}</span>
                            <span class="badge bg-card font-mono text-foreground">{{ i.sku }}</span>
                            <span v-if="i.produto && i.produto !== i.sku" class="text-xs text-muted-foreground">→ painel {{ i.produto }}</span>
                        </div>
                        <h3 class="font-bold leading-snug">{{ i.descricao || i.painel?.descricao }}</h3>
                    </div>
                    <DiagBadge :diag="i.diag" />
                </header>

                <div class="grid divide-y-2 divide-dashed divide-foreground/15 md:grid-cols-4 md:divide-x-2 md:divide-y-0">
                    <!-- Pedido / logística -->
                    <section class="p-4">
                        <div class="eyebrow mb-2">Pedido · logística</div>
                        <span :class="['badge mb-2 text-foreground normal-case tracking-normal', logTone(i.statusLog)]">{{ i.statusLog }}</span>
                        <dl class="space-y-1 text-xs">
                            <div class="flex justify-between gap-2"><dt class="text-muted-foreground">Previsão logística</dt><dd class="font-bold">{{ fmtDate(i.previsao) }}</dd></div>
                            <div class="flex justify-between gap-2"><dt class="text-muted-foreground">Qtd. prevista</dt><dd class="font-bold tabular-nums">{{ fmtInt(i.qtdPrevista) }}</dd></div>
                            <div v-if="i.qtdPedido !== null" class="flex justify-between gap-2"><dt class="text-muted-foreground">Qtd. pedida</dt><dd class="font-bold tabular-nums">{{ fmtInt(i.qtdPedido) }}</dd></div>
                            <div class="flex justify-between gap-2"><dt class="text-muted-foreground">Últ. atualização</dt><dd class="font-bold">{{ fmtDate(i.atualizacao) }}</dd></div>
                        </dl>
                        <p v-if="i.obs" class="mt-2 text-xs italic text-foreground/70">“{{ i.obs }}”</p>
                    </section>

                    <!-- Quantitativo -->
                    <section class="p-4">
                        <div class="eyebrow mb-2">Quantitativo</div>
                        <template v-if="i.painel">
                            <div class="text-2xl font-extrabold tabular-nums">{{ fmtInt(i.painel.aFat) }}</div>
                            <div class="mb-2 text-xs text-muted-foreground">à faturar no mês</div>
                            <dl class="space-y-1 text-xs">
                                <div class="flex justify-between gap-2"><dt class="text-muted-foreground">Corte</dt><dd class="font-bold text-destructive tabular-nums">{{ fmtInt(i.painel.corte) }}</dd></div>
                                <div class="flex justify-between gap-2"><dt class="text-muted-foreground">Carteira</dt><dd class="font-bold tabular-nums">{{ fmtInt(i.painel.carteira) }}</dd></div>
                                <div class="flex justify-between gap-2"><dt class="text-muted-foreground">Prev. venda</dt><dd class="font-bold tabular-nums">{{ fmtInt(i.painel.pVenda) }}</dd></div>
                            </dl>
                        </template>
                        <p v-else class="text-xs text-muted-foreground">SKU não encontrado no painel.</p>
                    </section>

                    <!-- Estoque -->
                    <section class="p-4">
                        <div class="eyebrow mb-2">Estoque</div>
                        <template v-if="i.painel">
                            <div :class="['text-2xl font-extrabold tabular-nums', (i.painel.estAtual ?? 0) <= 0 ? 'text-destructive' : '']">{{ fmtInt(i.painel.estAtual) }}</div>
                            <div class="mb-2 text-xs text-muted-foreground">atual · cobertura {{ fmtCob(i.painel.pctCob) }}</div>
                            <dl class="space-y-1 text-xs">
                                <div class="flex justify-between gap-2"><dt class="text-muted-foreground">Total (todos locais)</dt><dd class="font-bold tabular-nums">{{ fmtInt(i.painel.estTotal2) }}</dd></div>
                                <div v-for="l in STOCK_LOCATIONS.filter((x) => (i.painel[x.key] ?? 0) > 0)" :key="l.key" class="flex justify-between gap-2">
                                    <dt class="flex items-center gap-1.5 text-muted-foreground"><span class="inline-block size-2 rounded-sm" :style="{ background: l.color }" />{{ l.label }}</dt>
                                    <dd class="font-bold tabular-nums">{{ fmtInt(i.painel[l.key]) }}</dd>
                                </div>
                            </dl>
                        </template>
                        <p v-else class="text-xs text-muted-foreground">—</p>
                    </section>

                    <!-- Produção -->
                    <section class="p-4">
                        <div class="eyebrow mb-2">Produção</div>
                        <template v-if="i.painel">
                            <ul v-if="i.producao.length" class="space-y-1.5">
                                <li v-for="op in i.producao" :key="op.label" class="flex items-center justify-between gap-2 text-xs">
                                    <span class="font-semibold">{{ op.label }}</span>
                                    <span class="text-right font-bold tabular-nums">
                                        {{ fmtInt(op.qty) }}
                                        <span v-if="op.date" class="block font-semibold text-primary">{{ fmtDate(op.date) }}</span>
                                    </span>
                                </li>
                            </ul>
                            <p v-else class="text-xs font-semibold text-destructive">Nenhuma OP aberta, programada ou a emitir.</p>
                            <div class="mt-2 text-xs text-muted-foreground">PMP {{ fmtInt(i.painel.pmp) }} · produzido {{ fmtInt(i.painel.produzido) }}</div>
                        </template>
                        <p v-else class="text-xs text-muted-foreground">—</p>
                    </section>
                </div>

                <footer v-if="i.alertas.length" class="flex flex-col gap-1 border-t-2 border-foreground bg-amber-50 px-4 py-2.5">
                    <div v-for="a in i.alertas" :key="a" class="flex items-start gap-2 text-xs font-semibold">
                        <IconAlertTriangle class="mt-px size-3.5 shrink-0 text-warning" />
                        <span>{{ a }}<template v-if="a.includes('essa data')"> ({{ fmtDate(i.previsaoFabrica) }})</template></span>
                    </div>
                </footer>
            </article>
            <div v-if="!ordered.length" class="card p-8 text-center text-sm text-muted-foreground">Nenhum SKU com esse filtro.</div>
        </div>

        <!-- TABELA -->
        <DataTable v-else :columns="tableCols" :rows="ordered.map((i) => ({ ...i, produto: i.produto ?? i.sku }))" :clickable="true">
            <template #cell-statusLog="{ value }">
                <span :class="['badge text-foreground normal-case tracking-normal', logTone(value)]">{{ value }}</span>
            </template>
            <template #cell-diag="{ value }"><DiagBadge :diag="value" /></template>
        </DataTable>
    </template>
</template>
