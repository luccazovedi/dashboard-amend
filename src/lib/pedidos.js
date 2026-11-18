import * as XLSX from 'xlsx';

import { normalize } from './columns';

// ---------------------------------------------------------------------------
// Leitura da planilha "Corte de Pedidos" (uma aba por cliente)
// ---------------------------------------------------------------------------

const FIELDS = [
    { key: 'sku', match: (h) => h.includes('sku') || h === 'codigo' || h === 'produto' },
    { key: 'descricao', match: (h) => h.startsWith('descri') },
    { key: 'statusLog', match: (h) => h.startsWith('status') },
    { key: 'previsao', match: (h) => h.startsWith('previsao') },
    { key: 'qtdPrevista', match: (h) => h.includes('quantidadeprevista') || h.includes('qtdprevista') || h.includes('entrada') },
    { key: 'qtdPedido', match: (h) => (h.includes('qtd') || h.includes('quantidade')) && (h.includes('pedid') || h.includes('cortad') || h.includes('solicit')) },
    { key: 'atualizacao', match: (h) => h.includes('atualiza') },
    { key: 'obs', match: (h) => h.startsWith('observa') || h.includes('retorno') },
];

export const LOG_STATUS = [
    'Pendente de análise da logística',
    'Aguardando reposição',
    'Em trânsito',
    'Previsão de chegada informada',
    'Recebido no estoque',
    'Sem previsão de reposição',
];

const clean = (v) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim();

function toISODate(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
    const m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return null;
}
const toNum = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};

/** Descobre o tipo da planilha: 'painel' | 'pedidos' | null */
export function detectKind(wb) {
    for (const name of wb.SheetNames) {
        const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true });
        for (let i = 0; i < Math.min(grid.length, 40); i++) {
            const h = (grid[i] || []).map(normalize);
            if (h.includes('produto') && h.some((x) => x.startsWith('descri')) && h.some((x) => x.includes('estatual') || x === '%cob')) return 'painel';
            if (h.some((x) => x.includes('sku')) && h.some((x) => x.startsWith('status'))) return 'pedidos';
        }
    }
    return null;
}

export function parsePedidos(wb, fileName) {
    const clientes = [];
    const warnings = [];
    for (const name of wb.SheetNames) {
        const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true, blankrows: false });
        const hIdx = grid.findIndex((r) => {
            const h = (r || []).map(normalize);
            return h.some((x) => x.includes('sku')) && h.some((x) => x.startsWith('descri') || x.startsWith('status'));
        });
        if (hIdx < 0) {
            warnings.push(`Aba "${name}" ignorada: não tem a coluna "Código SKU".`);
            continue;
        }
        const header = grid[hIdx].map(normalize);
        const idx = {};
        for (const f of FIELDS) {
            const i = header.findIndex((h, j) => f.match(h) && !Object.values(idx).includes(j));
            if (i >= 0) idx[f.key] = i;
        }
        const titulo = clean(grid.slice(0, hIdx).flat().find((v) => v));
        const itens = [];
        for (const r of grid.slice(hIdx + 1)) {
            const sku = clean(r[idx.sku]);
            if (!sku) continue;
            itens.push({
                cliente: name.trim(),
                sku,
                descricao: clean(r[idx.descricao]),
                statusLog: clean(r[idx.statusLog]) || 'Pendente de análise da logística',
                previsao: idx.previsao !== undefined ? toISODate(r[idx.previsao]) : null,
                qtdPrevista: idx.qtdPrevista !== undefined ? toNum(r[idx.qtdPrevista]) : null,
                qtdPedido: idx.qtdPedido !== undefined ? toNum(r[idx.qtdPedido]) : null,
                atualizacao: idx.atualizacao !== undefined ? toISODate(r[idx.atualizacao]) : null,
                obs: idx.obs !== undefined ? clean(r[idx.obs]) : '',
            });
        }
        clientes.push({ nome: name.trim(), titulo, itens });
    }
    const total = clientes.reduce((a, c) => a + c.itens.length, 0);
    if (!total) throw new Error('Nenhum SKU encontrado na planilha de corte de pedidos.');
    return {
        clientes,
        warnings,
        meta: { fileName, importedAt: new Date().toISOString(), clientCount: clientes.length, itemCount: total },
    };
}

// ---------------------------------------------------------------------------
// Cruzamento pedido × painel (estoque, à faturar, corte, fábrica)
// ---------------------------------------------------------------------------

const base = (s) => normalize(String(s).split('-')[0]);

export function buildIndex(rows) {
    const exact = new Map();
    const byBase = new Map();
    for (const r of rows) {
        exact.set(normalize(r.produto), r);
        const b = base(r.produto);
        if (!byBase.has(b)) byBase.set(b, r);
    }
    return { exact, byBase };
}

export function findProduct(index, sku) {
    return index.exact.get(normalize(sku)) ?? index.byBase.get(base(sku)) ?? null;
}

// Diagnóstico de atendimento — ordem = prioridade de ação
export const DIAG = {
    liberar: { label: 'Liberar pedido', cls: 'bg-emerald-200', color: '#16a34a', hint: 'Há estoque atual que cobre o volume à faturar' },
    parcial: { label: 'Estoque parcial', cls: 'bg-amber-200', color: '#d97706', hint: 'Há estoque, mas não cobre tudo que falta faturar' },
    outroLocal: { label: 'Estoque em outro local', cls: 'bg-teal-200', color: '#1baf7a', hint: 'Sem estoque atual, mas há saldo em Reserva/Amazon/BM/B2C' },
    transito: { label: 'Em trânsito', cls: 'bg-sky-200', color: '#2a78d6', hint: 'Mercadoria em trânsito' },
    producao: { label: 'Em produção', cls: 'bg-violet-200', color: '#7c3aed', hint: 'OP aberta na fábrica' },
    programado: { label: 'Produção programada', cls: 'bg-violet-200', color: '#5b21b6', hint: 'OP programada (ver data)' },
    emitir: { label: 'OP a emitir', cls: 'bg-orange-200', color: '#eb6834', hint: 'Fábrica precisa emitir OP' },
    semPrevisao: { label: 'Sem previsão', cls: 'bg-red-200', color: '#e54b4f', hint: 'Sem estoque, trânsito ou OP' },
    naoEncontrado: { label: 'Fora do painel', cls: 'bg-secondary', color: '#a1a1aa', hint: 'SKU não encontrado no painel de cobertura' },
};
export const DIAG_ORDER = ['liberar', 'parcial', 'transito', 'outroLocal', 'producao', 'programado', 'emitir', 'semPrevisao', 'naoEncontrado'];

export const MIN_COB_PARCIAL = 0.1;

export function diagnose(p) {
    if (!p) return 'naoEncontrado';
    const est = p.estAtual ?? 0;
    const aFat = p.aFat ?? 0;
    // abaixo de 10% do saldo à faturar, o estoque é considerado residual
    const relevante = (q) => q > 0 && (aFat <= 0 || q / aFat >= MIN_COB_PARCIAL);
    if (est > 0 && (aFat <= 0 || (p.pctCob ?? 0) >= 1)) return 'liberar';
    if (relevante(est)) return 'parcial';
    if ((p.transito ?? 0) > 0) return 'transito';
    if (relevante((p.estTotal2 ?? 0) - est)) return 'outroLocal';
    if ((p.opAberta ?? 0) > 0) return 'producao';
    if ((p.opProg ?? 0) > 0) return 'programado';
    if ((p.emitirOp ?? 0) > 0) return 'emitir';
    return 'semPrevisao';
}

export function producaoStatus(p) {
    if (!p) return { label: '—', detail: '' };
    const parts = [];
    if ((p.opAberta ?? 0) > 0) parts.push({ label: 'OP aberta', qty: p.opAberta });
    if ((p.opProg ?? 0) > 0) parts.push({ label: 'OP programada', qty: p.opProg, date: p.programado });
    if ((p.emitirOp ?? 0) > 0) parts.push({ label: 'Emitir OP', qty: p.emitirOp });
    return parts;
}

/** Aponta divergências entre o que a logística informou e o que o painel mostra. */
export function divergencias(item, p, diag) {
    const out = [];
    if (!p) return out;
    const st = normalize(item.statusLog);
    if (diag === 'liberar' && !st.includes('recebido')) out.push('Painel já tem estoque cobrindo o saldo — dá para liberar o pedido.');
    if (st.includes('recebido') && (p.estAtual ?? 0) <= 0) out.push('Logística diz "recebido", mas o estoque atual está zerado.');
    if (st.includes('semprevisao') && ((p.opProg ?? 0) > 0 || (p.opAberta ?? 0) > 0)) out.push('Logística sem previsão, mas a fábrica tem OP em andamento.');
    if (st.includes('transito') && !(p.transito > 0)) out.push('Logística diz "em trânsito", mas o painel não mostra trânsito.');
    if (!item.previsao && p.programado) out.push('Sem previsão da logística — fábrica programou para essa data.');
    return out;
}

export function crossItem(item, index) {
    const p = findProduct(index, item.sku);
    const diag = diagnose(p);
    return {
        ...item,
        produto: p?.produto ?? null,
        painel: p,
        diag,
        producao: producaoStatus(p),
        previsaoFabrica: p?.programado ?? null,
        alertas: divergencias(item, p, diag),
    };
}
