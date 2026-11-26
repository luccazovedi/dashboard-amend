import { get, set } from 'idb-keyval';
import { computed, reactive } from 'vue';
import * as XLSX from 'xlsx';

import { parseWorkbook } from './parse';
import { buildIndex, crossItem, detectKind, parsePedidos } from './pedidos';
import { diffSnapshots, evaluateAll, parseTracking, readCsvFile, refFromFile, workbookTrackingGrid } from './tracking';

const KEY = 'painel-cobertura:snapshots';
const ACTIVE = 'painel-cobertura:active';
const PED_KEY = 'painel-cobertura:pedidos';
const MAX_SNAPSHOTS = 120;
const MAX_PEDIDOS = 60;
const TRK_KEY = 'painel-cobertura:tracking';
const TRK_UTEIS = 'painel-cobertura:tracking-uteis';
const MAX_TRACKING = 90; // 2 planilhas/dia ≈ 45 dias

export const state = reactive({
    ready: false,
    snapshots: [], // painéis de cobertura, mais recente primeiro
    activeId: null,
    pedidos: [], // planilhas de corte de pedidos, mais recente primeiro
    tracking: [], // posições do tracking de pedidos, mais recente (refAt) primeiro
    trackingId: null, // posição selecionada (null = mais recente)
    trackingUteis: true, // prazos em dias úteis (seg-sex) ou corridos
});

export const active = computed(() => state.snapshots.find((s) => s.id === state.activeId) ?? state.snapshots[0] ?? null);

// snapshot imediatamente anterior ao ativo (para comparar variação dia a dia)
export const previous = computed(() => {
    const i = state.snapshots.findIndex((s) => s.id === active.value?.id);
    return i >= 0 ? (state.snapshots[i + 1] ?? null) : null;
});

export const rows = computed(() => active.value?.rows ?? []);
export const totals = computed(() => active.value?.totals ?? null);

// Corte de pedidos ativo (último enviado), cruzado com o painel ativo
export const pedidoAtivo = computed(() => state.pedidos[0] ?? null);
export const pedidoItens = computed(() => {
    if (!pedidoAtivo.value) return [];
    const index = buildIndex(rows.value);
    return pedidoAtivo.value.clientes.flatMap((c) => c.itens.map((it) => crossItem(it, index)));
});

// Tracking de pedidos: posição selecionada × posição imediatamente anterior
export const trackingAtivo = computed(() => state.tracking.find((s) => s.id === state.trackingId) ?? state.tracking[0] ?? null);
export const trackingAnterior = computed(() => {
    const i = state.tracking.findIndex((s) => s.id === trackingAtivo.value?.id);
    return i >= 0 ? (state.tracking[i + 1] ?? null) : null;
});
export const trackingPedidos = computed(() => (trackingAtivo.value ? evaluateAll(trackingAtivo.value, state.trackingUteis) : []));
export const trackingPrev = computed(() => (trackingAnterior.value ? evaluateAll(trackingAnterior.value, state.trackingUteis) : null));
export const trackingDiff = computed(() => diffSnapshots(trackingPedidos.value, trackingPrev.value));

export async function loadStore() {
    try {
        state.snapshots = (await get(KEY)) ?? [];
        state.activeId = (await get(ACTIVE)) ?? state.snapshots[0]?.id ?? null;
        state.pedidos = (await get(PED_KEY)) ?? [];
        state.tracking = (await get(TRK_KEY)) ?? [];
        state.trackingUteis = (await get(TRK_UTEIS)) ?? true;
    } catch (e) {
        console.error('Falha ao ler IndexedDB', e);
    }
    state.ready = true;
}

const plain = (v) => JSON.parse(JSON.stringify(v));

async function persist() {
    await set(KEY, plain(state.snapshots));
    await set(ACTIVE, state.activeId);
    await set(PED_KEY, plain(state.pedidos));
    await set(TRK_KEY, plain(state.tracking));
}

async function addTracking(file, grid) {
    const refAt = refFromFile(file);
    const parsed = parseTracking(grid, file.name, refAt);
    const snap = { id: `${Date.now()}`, kind: 'tracking', ...parsed };
    // a mesma posição enviada de novo substitui a anterior
    const others = state.tracking.filter((s) => s.meta.refAt !== refAt);
    state.tracking = [snap, ...others].sort((a, b) => b.meta.refAt.localeCompare(a.meta.refAt)).slice(0, MAX_TRACKING);
    state.trackingId = null;
    await persist();
    return snap;
}

/** Importa qualquer uma das planilhas; o tipo é detectado pelo cabeçalho. */
export async function importFile(file) {
    if (/\.(csv|txt)$/i.test(file.name)) return addTracking(file, await readCsvFile(file));
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
    const trackingGrid = workbookTrackingGrid(wb);
    if (trackingGrid) return addTracking(file, trackingGrid);
    const kind = detectKind(wb);
    if (kind === 'pedidos') {
        const parsed = parsePedidos(wb, file.name);
        const snap = { id: `${Date.now()}`, kind, ...parsed };
        state.pedidos = [snap, ...state.pedidos].slice(0, MAX_PEDIDOS);
        await persist();
        return snap;
    }
    if (kind === 'painel') {
        const parsed = parseWorkbook(wb, file.name);
        const snap = { id: `${Date.now()}`, kind, ...parsed };
        state.snapshots = [snap, ...state.snapshots].slice(0, MAX_SNAPSHOTS);
        state.activeId = snap.id;
        await persist();
        return snap;
    }
    throw new Error('Não reconheci a planilha. Envie o Painel de Cobertura (Produto / Descrição / Est.Atual…), o Corte de Pedidos (Código SKU / Status atual…) ou o Tracking de Pedidos (Status / Pedido / Expedição / Entrega…).');
}

export async function setActive(id) {
    state.activeId = id;
    await persist();
}

export async function removeSnapshot(id) {
    state.snapshots = state.snapshots.filter((s) => s.id !== id);
    if (state.activeId === id) state.activeId = state.snapshots[0]?.id ?? null;
    await persist();
}

export async function removePedido(id) {
    state.pedidos = state.pedidos.filter((s) => s.id !== id);
    await persist();
}

export async function removeTracking(id) {
    state.tracking = state.tracking.filter((s) => s.id !== id);
    if (state.trackingId === id) state.trackingId = null;
    await persist();
}

export function selectTracking(id) {
    state.trackingId = id === state.tracking[0]?.id ? null : id;
}

export async function setTrackingUteis(v) {
    state.trackingUteis = v;
    await set(TRK_UTEIS, v);
}
