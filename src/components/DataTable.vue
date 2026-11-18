<script setup>
import { IconArrowsSort, IconSortAscending, IconSortDescending } from '@tabler/icons-vue';
import { computed, ref, watch } from 'vue';

import { openProduct } from '@/lib/drawer';
import { fmtByType } from '@/lib/format';

const props = defineProps({
    columns: { type: Array, required: true }, // { key, label, fmt, align, get?, sortValue?, class? }
    rows: { type: Array, required: true },
    sortKey: { type: String, default: null },
    sortDir: { type: String, default: 'desc' },
    pageSize: { type: Number, default: 50 },
    maxHeight: { type: String, default: '70vh' },
    clickable: { type: Boolean, default: true },
});

const key = ref(props.sortKey);
const dir = ref(props.sortDir);
const limit = ref(props.pageSize);
watch(
    () => props.rows,
    () => (limit.value = props.pageSize),
);
watch(
    () => props.sortKey,
    (k) => {
        key.value = k;
        dir.value = props.sortDir;
    },
);

const valueOf = (col, row) => (col.get ? col.get(row) : row[col.key]);

const sorted = computed(() => {
    if (!key.value) return props.rows;
    const col = props.columns.find((c) => c.key === key.value);
    if (!col) return props.rows;
    const sv = (r) => (col.sortValue ? col.sortValue(r) : valueOf(col, r));
    const m = dir.value === 'asc' ? 1 : -1;
    return [...props.rows].sort((a, b) => {
        const x = sv(a);
        const y = sv(b);
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        if (typeof x === 'string') return x.localeCompare(y, 'pt-BR') * m;
        return (x - y) * m;
    });
});

const visible = computed(() => sorted.value.slice(0, limit.value));

function toggle(col) {
    if (col.sortable === false) return;
    if (key.value === col.key) dir.value = dir.value === 'desc' ? 'asc' : 'desc';
    else {
        key.value = col.key;
        dir.value = col.fmt === 'text' ? 'asc' : 'desc';
    }
}
const isNum = (col) => col.align === 'right' || (col.align === undefined && col.fmt && col.fmt !== 'text');
</script>

<template>
    <div class="tbl-wrap" :style="{ maxHeight }">
        <table class="tbl">
            <thead>
                <tr>
                    <th
                        v-for="col in columns"
                        :key="col.key"
                        :class="[isNum(col) ? 'text-right' : '', col.sortable === false ? '' : 'cursor-pointer select-none hover:text-foreground', col.thClass]"
                        @click="toggle(col)"
                    >
                        <span :class="['inline-flex items-center gap-1', isNum(col) ? 'flex-row-reverse' : '']">
                            {{ col.label }}
                            <template v-if="col.sortable !== false">
                                <IconSortDescending v-if="key === col.key && dir === 'desc'" class="size-3.5 text-primary" />
                                <IconSortAscending v-else-if="key === col.key" class="size-3.5 text-primary" />
                                <IconArrowsSort v-else class="size-3 opacity-30" />
                            </template>
                        </span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="(row, i) in visible"
                    :key="row.produto + i"
                    :class="clickable ? 'cursor-pointer' : ''"
                    @click="clickable && openProduct(row.produto)"
                >
                    <td v-for="col in columns" :key="col.key" :class="[isNum(col) ? 'num' : '', col.class]">
                        <slot :name="`cell-${col.key}`" :row="row" :value="valueOf(col, row)">
                            {{ fmtByType(valueOf(col, row), col.fmt) }}
                        </slot>
                    </td>
                </tr>
                <tr v-if="!rows.length">
                    <td :colspan="columns.length" class="py-10 text-center text-muted-foreground">Nenhum produto encontrado.</td>
                </tr>
            </tbody>
        </table>
        <div v-if="sorted.length > limit" class="flex flex-wrap items-center justify-center gap-3 border-t-2 border-foreground p-3 text-xs">
            <span class="text-muted-foreground">Mostrando {{ limit }} de {{ sorted.length }}</span>
            <button class="btn btn-outline btn-sm" @click="limit += 100">Mostrar mais</button>
            <button class="btn btn-outline btn-sm" @click="limit = sorted.length">Mostrar todos</button>
        </div>
    </div>
</template>
