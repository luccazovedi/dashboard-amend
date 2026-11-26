import * as XLSX from 'xlsx';

import { normalize } from './columns';

// ---------------------------------------------------------------------------
// Tracking de pedidos (TRACKPEDIDOS_dd-mm-aaaa_hh-mm-ss.csv / .xlsx)
// Uma linha por orçamento/pedido. Colunas reconhecidas pelo nome do cabeçalho.
// ---------------------------------------------------------------------------

// Prazos (SLA): expedição em até 5 dias da solicitação, entrega em até 5 dias da expedição.
export const SLA = { expedicao: 5, entrega: 5 };

const FIELDS = {
    status: 'status',
    orcamento: 'orcamento',
    pedido: 'pedido',
    emissaoPedido: 'emissaopedido',
    entradaPortal: 'entradaportal',
    codCliente: 'cliente',
    nome: 'nome',
    municipio: 'municipio',
    uf: 'uf',
    cnpj: 'cgc',
    prioridade: 'prioridade',
    nf: 'nfdistribuidora',
    faturamento: 'emissaodistribuidora',
    pedidoCliente: 'pedidocliente',
    vendedor: 'vendedor',
    transportadora: 'transportadora',
    qtdOrcamento: 'qtdeorcamento',
    valorOrcamento: 'valororcamento',
    qtdPedido: 'qtdepedido',
    valorPedido: 'valorpedido',
    qtdCorte: 'qtdedocorte',
    valorCorte: 'valordocorte',
    qtdFat: 'qtdefaturada',
    valorFat: 'valorfaturado',
    corteIntegral: 'corteintegral',
    corte: 'corte',
    expedicao: 'expedicao',
    previsao: 'previsao',
    entrega: 'entrega',
    ocorrencia: 'ocorrenciaslogisticas',
    temAgendamento: 'temagendamento',
    agendamento: 'agendamento',
    operacao: 'operacao',
    grupoCliente: 'grupocliente',
    qtdSku: 'qtdesku',
    diasAtrasoSistema: 'diasdeatraso',
};
const DATE_FIELDS = ['emissaoPedido', 'entradaPortal', 'faturamento', 'expedicao', 'previsao', 'entrega', 'agendamento'];
const NUM_FIELDS = ['qtdOrcamento', 'valorOrcamento', 'qtdPedido', 'valorPedido', 'qtdCorte', 'valorCorte', 'qtdFat', 'valorFat', 'qtdSku', 'diasAtrasoSistema'];

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

function toISODate(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
    const m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return null;
}

function toNum(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v).replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}

const yes = (v) => normalize(v) === 'sim';

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/** CSV separado por ; (ou ,) com aspas → matriz de células */
export function csvToGrid(text) {
    text = text.replace(/^﻿/, '');
    const first = text.slice(0, text.indexOf('\n') >>> 0);
    const sep = (first.match(/;/g) ?? []).length >= (first.match(/,/g) ?? []).length ? ';' : ',';
    const grid = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else quoted = false;
            } else cell += c;
        } else if (c === '"' && cell === '') quoted = true;
        else if (c === sep) {
            row.push(cell);
            cell = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cell);
            if (row.some((x) => x !== '')) grid.push(row);
            row = [];
            cell = '';
        } else cell += c;
    }
    row.push(cell);
    if (row.some((x) => x !== '')) grid.push(row);
    return grid;
}

/** Lê um arquivo .csv tentando UTF-8 e caindo para Windows-1252 (export do ERP). */
export async function readCsvFile(file) {
    const buf = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
    return csvToGrid(text);
}

const isTrackingHeader = (row) => {
    const h = (row || []).map(normalize);
    return h.includes('status') && h.includes('pedido') && h.includes('expedicao') && h.includes('entrega');
};

export function findTrackingHeader(grid) {
    for (let i = 0; i < Math.min(grid.length, 20); i++) if (isTrackingHeader(grid[i])) return i;
    return -1;
}

export function workbookTrackingGrid(wb) {
    for (const name of wb.SheetNames) {
        const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true, blankrows: false });
        if (findTrackingHeader(grid) >= 0) return grid;
    }
    return null;
}

/** Data/hora da posição: vem do nome do arquivo (TRACKPEDIDOS_26-11-2026_08-45-22) ou da data do arquivo. */
export function refFromFile(file) {
    const m = file.name.match(/(\d{2})-(\d{2})-(\d{4})[_ ](\d{2})-(\d{2})(?:-(\d{2}))?/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] ?? '00'}`;
    const d = new Date(file.lastModified || Date.now());
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function parseTracking(grid, fileName, refAt) {
    const hIdx = findTrackingHeader(grid);
    if (hIdx < 0) throw new Error('Não encontrei o cabeçalho do tracking (Status / Pedido / Expedição / Entrega).');
    const header = grid[hIdx].map(normalize);
    const idx = {};
    const warnings = [];
    for (const [key, h] of Object.entries(FIELDS)) {
        const i = header.indexOf(h);
        if (i >= 0) idx[key] = i;
        else warnings.push(`Coluna "${h}" não encontrada.`);
    }
    const orders = [];
    for (const r of grid.slice(hIdx + 1)) {
        const o = {};
        for (const key of Object.keys(FIELDS)) {
            const v = idx[key] !== undefined ? r[idx[key]] : null;
            if (DATE_FIELDS.includes(key)) o[key] = toISODate(v);
            else if (NUM_FIELDS.includes(key)) o[key] = toNum(v);
            else o[key] = clean(v);
        }
        if (!o.orcamento && !o.pedido) continue;
        o.id = o.orcamento || `P${o.pedido}`;
        o.corteIntegral = yes(o.corteIntegral);
        o.corte = yes(o.corte);
        o.temAgendamento = yes(o.temAgendamento);
        orders.push(o);
    }
    if (!orders.length) throw new Error('O tracking não tem nenhum pedido.');
    return {
        orders,
        warnings,
        meta: { fileName, refAt, importedAt: new Date().toISOString(), orderCount: orders.length },
    };
}

// ---------------------------------------------------------------------------
// Datas e prazos
// ---------------------------------------------------------------------------

const d0 = (iso) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const isBiz = (d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6;

/** Soma n dias (úteis = seg-sex, ou corridos). */
export function addDays(start, n, uteis) {
    const d = d0(start);
    if (!uteis) {
        d.setUTCDate(d.getUTCDate() + n);
        return iso(d);
    }
    let left = n;
    while (left > 0) {
        d.setUTCDate(d.getUTCDate() + 1);
        if (isBiz(d)) left--;
    }
    return iso(d);
}

/** Dias de a até b (positivo se b depois de a). */
export function diffDays(a, b, uteis) {
    if (!a || !b) return null;
    const x = d0(a);
    const y = d0(b);
    const sign = y >= x ? 1 : -1;
    if (!uteis) return Math.round((y - x) / 86400000);
    const [lo, hi] = sign > 0 ? [x, y] : [y, x];
    let n = 0;
    const d = new Date(lo);
    while (d < hi) {
        d.setUTCDate(d.getUTCDate() + 1);
        if (isBiz(d)) n++;
    }
    return n * sign;
}

// ---------------------------------------------------------------------------
// Classificação
// ---------------------------------------------------------------------------

export const ETAPA = {
    liberacao: { label: 'Em liberação', cls: 'bg-amber-100', color: '#eda100', hint: 'Crédito, customer service, vendedor ou integração' },
    separacao: { label: 'Em separação', cls: 'bg-orange-200', color: '#eb6834', hint: 'Liberado / faturado, aguardando expedição' },
    transito: { label: 'Em trânsito', cls: 'bg-sky-200', color: '#2a78d6', hint: 'Expedido, aguardando entrega' },
    entregue: { label: 'Entregue', cls: 'bg-emerald-200', color: '#16a34a', hint: 'Entrega confirmada' },
    cortado: { label: 'Cortado integral', cls: 'bg-red-300', color: '#b91c1c', hint: 'Pedido cortado integralmente (nada faturado)' },
    cancelado: { label: 'Cancelado', cls: 'bg-secondary', color: '#a1a1aa', hint: 'Excluído, rejeitado pelo vendedor ou devolvido' },
};
export const ETAPA_ORDER = ['liberacao', 'separacao', 'transito', 'entregue', 'cortado', 'cancelado'];
export const ABERTAS = ['liberacao', 'separacao', 'transito'];

export const SITUACAO = {
    atrasoExp: { label: 'Expedição atrasada', cls: 'bg-red-200', color: '#e54b4f' },
    atrasoEnt: { label: 'Entrega atrasada', cls: 'bg-red-200', color: '#e54b4f' },
    vence: { label: 'Vence em breve', cls: 'bg-amber-200', color: '#d97706' },
    noPrazo: { label: 'No prazo', cls: 'bg-emerald-100', color: '#16a34a' },
    entregueNoPrazo: { label: 'Entregue no prazo', cls: 'bg-emerald-200', color: '#16a34a' },
    entregueAtraso: { label: 'Entregue com atraso', cls: 'bg-orange-200', color: '#eb6834' },
    semData: { label: 'Sem data', cls: 'bg-secondary', color: '#a1a1aa' },
    encerrado: { label: '—', cls: 'bg-secondary', color: '#a1a1aa' },
};
export const ATRASADO = ['atrasoExp', 'atrasoEnt'];

export function etapaOf(o) {
    const s = normalize(o.status);
    if (s.startsWith('pedidoexcluido') || s.startsWith('rmoveit') || s.startsWith('devolvido') || s.includes('cancelad')) return 'cancelado';
    if (o.corteIntegral || s.includes('cortadointegral')) return 'cortado';
    if (s === 'entregue' || o.entrega) return 'entregue';
    if (s.includes('transito') || o.expedicao) return 'transito';
    if (s.includes('separacao') || o.faturamento || o.nf) return 'separacao';
    return 'liberacao';
}

/**
 * Enriquece o pedido com etapa, prazos e situação de SLA.
 * hoje: 'AAAA-MM-DD' da posição do arquivo.
 */
export function evaluate(o, hoje, uteis) {
    const etapa = etapaOf(o);
    const solicitacao = o.emissaoPedido || o.entradaPortal || null;
    const out = { ...o, etapa, solicitacao, prazoExp: null, prazoEnt: null, atrasoExp: 0, atrasoEnt: 0, diasAtraso: 0, diasRestantes: null, situacao: 'encerrado', alertas: [] };
    if (!ABERTAS.includes(etapa) && etapa !== 'entregue') return out;
    if (!solicitacao) {
        out.situacao = 'semData';
        return out;
    }
    out.prazoExp = addDays(solicitacao, SLA.expedicao, uteis);
    out.prazoEnt = addDays(o.expedicao || out.prazoExp, SLA.entrega, uteis);
    out.atrasoExp = Math.max(0, diffDays(out.prazoExp, o.expedicao || hoje, uteis));
    out.atrasoEnt = Math.max(0, diffDays(out.prazoEnt, o.entrega || hoje, uteis));
    out.idade = diffDays(solicitacao, o.entrega || hoje, uteis);

    if (etapa === 'entregue') {
        out.situacao = out.atrasoEnt > 0 || out.atrasoExp > 0 ? 'entregueAtraso' : 'entregueNoPrazo';
        return out;
    }
    if (!o.expedicao) {
        out.diasRestantes = diffDays(hoje, out.prazoExp, uteis);
        out.situacao = out.atrasoExp > 0 ? 'atrasoExp' : out.diasRestantes <= 1 ? 'vence' : 'noPrazo';
    } else {
        out.diasRestantes = diffDays(hoje, out.prazoEnt, uteis);
        out.situacao = out.atrasoEnt > 0 ? 'atrasoEnt' : out.diasRestantes <= 1 ? 'vence' : 'noPrazo';
        if (o.previsao && o.previsao > out.prazoEnt && out.situacao !== 'atrasoEnt') out.alertas.push('Previsão da transportadora passa do prazo de entrega');
    }
    out.diasAtraso = out.situacao === 'atrasoExp' ? out.atrasoExp : out.situacao === 'atrasoEnt' ? out.atrasoEnt : 0;
    if (normalize(o.status).includes('ocorrencia')) out.alertas.push('Trânsito com ocorrência');
    if (o.corte && !o.corteIntegral) out.alertas.push('Corte parcial');
    return out;
}

export function evaluateAll(snap, uteis) {
    const hoje = snap.meta.refAt.slice(0, 10);
    return snap.orders.map((o) => evaluate(o, hoje, uteis));
}

/** Diferenças entre duas posições do tracking (atual × anterior). */
export function diffSnapshots(cur, prev) {
    const out = { novos: [], mudancas: [], novosAtrasos: [], novosCortes: [], entregues: [], sairam: [] };
    if (!prev) return out;
    const before = new Map(prev.map((o) => [o.id, o]));
    const now = new Set(cur.map((o) => o.id));
    for (const o of cur) {
        const p = before.get(o.id);
        if (!p) {
            out.novos.push(o);
            continue;
        }
        if (p.etapa !== o.etapa || p.status !== o.status) out.mudancas.push({ o, de: p });
        if (ATRASADO.includes(o.situacao) && !ATRASADO.includes(p.situacao)) out.novosAtrasos.push(o);
        if (o.etapa === 'cortado' && p.etapa !== 'cortado') out.novosCortes.push(o);
        if (o.etapa === 'entregue' && p.etapa !== 'entregue') out.entregues.push(o);
    }
    out.sairam = prev.filter((p) => !now.has(p.id));
    return out;
}

export const shortVendedor = (v) => clean(String(v ?? '').replace(/^\S+\s+-\s+/, ''));
