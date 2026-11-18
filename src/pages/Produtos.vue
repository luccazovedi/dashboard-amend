<script setup>
import { IconDownload } from '@tabler/icons-vue';
import { computed, ref } from 'vue';

import DataTable from '@/components/DataTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import SearchBox from '@/components/SearchBox.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { COL, COLUMNS, GROUPS } from '@/lib/columns';
import { matchSearch } from '@/lib/filter';
import { STATUS, STATUS_ORDER } from '@/lib/format';
import { active, rows } from '@/lib/store';

const q = ref('');
const status = ref('todos');
const groups = ref(Object.keys(GROUPS));

const filtered = computed(() => rows.value.filter((r) => (status.value === 'todos' || r.status === status.value) && matchSearch(r, q.value)));

const severity = { ruptura: 0, critico: 1, atencao: 2, ok: 3, concluido: 4 };
const columns = computed(() => [
    { key: 'codigo', label: 'Cód.', fmt: 'text', class: 'font-mono text-xs text-muted-foreground' },
    { ...COL.produto, class: 'font-mono text-xs' },
    { ...COL.descricao, class: 'max-w-72 truncate' },
    { key: 'status', label: 'Situação', fmt: 'text', sortValue: (r) => severity[r.status] },
    ...COLUMNS.filter((c) => c.group && groups.value.includes(c.group)),
]);

function toggle(g) {
    groups.value = groups.value.includes(g) ? groups.value.filter((x) => x !== g) : [...groups.value, g];
}

function exportCsv() {
    const cols = columns.value;
    const esc = (v) => {
        const s = v === null || v === undefined ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
        return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.map((c) => c.label).join(';')];
    for (const r of filtered.value) lines.push(cols.map((c) => esc(c.key === 'status' ? STATUS[r.status].label : r[c.key])).join(';'));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `produtos-${active.value.meta.importedAt.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}
</script>

<template>
    <PageHeader title="Produtos" description="Todas as colunas da planilha, produto a produto. Clique numa linha para ver a ficha completa.">
        <button class="btn btn-outline btn-sm" @click="exportCsv"><IconDownload /> Exportar CSV</button>
    </PageHeader>

    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <span class="eyebrow mr-1">Blocos</span>
            <button
                v-for="(label, g) in GROUPS"
                :key="g"
                :class="['badge cursor-pointer py-1 text-[11px]', groups.includes(g) ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground/60']"
                @click="toggle(g)"
            >
                {{ label }}
            </button>
        </div>
        <SearchBox v-model="q" />
    </div>
    <div class="mb-3 flex flex-wrap items-center gap-3">
        <div class="seg flex-wrap">
            <button :class="{ on: status === 'todos' }" @click="status = 'todos'">Todos</button>
            <button v-for="s in STATUS_ORDER" :key="s" :class="{ on: status === s }" @click="status = s">{{ STATUS[s].label }}</button>
        </div>
        <span class="text-xs text-muted-foreground">{{ filtered.length }} de {{ rows.length }} produtos</span>
    </div>

    <DataTable :columns="columns" :rows="filtered" sort-key="pVenda" :page-size="100" max-height="75vh">
        <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
    </DataTable>
</template>
