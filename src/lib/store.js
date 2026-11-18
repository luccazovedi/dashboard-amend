import { get, set } from 'idb-keyval';
import { computed, reactive } from 'vue';
import * as XLSX from 'xlsx';

import { parseWorkbook } from './parse';
import { buildIndex, crossItem, detectKind, parsePedidos } from './pedidos';

const KEY = 'painel-cobertura:snapshots';
const ACTIVE = 'painel-cobertura:active';
const PED_KEY = 'painel-cobertura:pedidos';
const MAX_SNAPSHOTS = 120;
const MAX_PEDIDOS = 60;

export const state = reactive({
    ready: false,
    snapshots: [], // painéis de cobertura, mais recente primeiro
    activeId: null,
    pedidos: [], // planilhas de corte de pedidos, mais recente primeiro
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

export async function loadStore() {
    try {
        state.snapshots = (await get(KEY)) ?? [];
        state.activeId = (await get(ACTIVE)) ?? state.snapshots[0]?.id ?? null;
        state.pedidos = (await get(PED_KEY)) ?? [];
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
}

/** Importa qualquer uma das planilhas; o tipo é detectado pelo cabeçalho. */
export async function importFile(file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
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
    throw new Error('Não reconheci a planilha. Envie o Painel de Cobertura (Produto / Descrição / Est.Atual…) ou o Corte de Pedidos (Código SKU / Status atual…).');
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
