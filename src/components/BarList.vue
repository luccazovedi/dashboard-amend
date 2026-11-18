<script setup>
// Barras horizontais de uma única série, com rótulo direto do valor.
import { computed } from 'vue';

import { openProduct } from '@/lib/drawer';
import { hideTip, moveTip, showTip } from '@/lib/tooltip';

const props = defineProps({
    items: Array, // { produto, label, value, display, metric?, color?, extra?: [{label,value}] }
    color: { type: String, default: 'var(--primary)' },
});
const max = computed(() => Math.max(1, ...props.items.map((i) => Math.abs(i.value ?? 0))));

function enter(e, it) {
    showTip(e, it.label, [{ label: it.metric ?? 'Valor', value: it.display }, ...(it.extra ?? [])]);
}
</script>

<template>
    <ul class="flex flex-col gap-2.5">
        <li
            v-for="it in items"
            :key="it.produto + it.label"
            class="group cursor-pointer"
            @click="it.produto && openProduct(it.produto)"
            @mouseenter="enter($event, it)"
            @mousemove="moveTip"
            @mouseleave="hideTip"
        >
            <div class="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span class="truncate font-semibold group-hover:text-primary">{{ it.label }}</span>
                <span class="shrink-0 font-bold tabular-nums">{{ it.display }}</span>
            </div>
            <div class="h-2.5 w-full rounded-r bg-secondary">
                <div
                    class="h-full rounded-r group-hover:brightness-90"
                    :style="{ width: `${(Math.abs(it.value ?? 0) / max) * 100}%`, background: it.color ?? color }"
                />
            </div>
        </li>
        <li v-if="!items.length" class="py-6 text-center text-sm text-muted-foreground">Nada para mostrar.</li>
    </ul>
</template>
