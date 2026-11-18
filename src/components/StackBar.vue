<script setup>
// Barra empilhada horizontal com 2px de respiro entre segmentos + legenda.
import { computed } from 'vue';

import { fmtInt, fmtPct } from '@/lib/format';
import { hideTip, moveTip, showTip } from '@/lib/tooltip';

const props = defineProps({
    segments: Array, // { label, value, color }
    title: String,
    height: { type: String, default: 'h-8' },
    legend: { type: Boolean, default: true },
    scaleMax: { type: Number, default: null },
});
const total = computed(() => props.segments.reduce((a, s) => a + Math.max(0, s.value ?? 0), 0));
const base = computed(() => props.scaleMax ?? total.value);

function enter(e, s) {
    showTip(e, props.title ?? s.label, [
        { label: s.label, value: fmtInt(s.value), color: s.color },
        { label: '% do total', value: fmtPct(s.value / (total.value || 1)) },
    ]);
}
</script>

<template>
    <div>
        <div :class="['flex w-full gap-[2px] overflow-hidden rounded', height]">
            <template v-for="s in segments" :key="s.label">
                <div
                    v-if="(s.value ?? 0) > 0"
                    class="h-full first:rounded-l last:rounded-r hover:brightness-90"
                    :style="{ width: `${(s.value / (base || 1)) * 100}%`, background: s.color }"
                    @mouseenter="enter($event, s)"
                    @mousemove="moveTip"
                    @mouseleave="hideTip"
                />
            </template>
        </div>
        <div v-if="legend" class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <span v-for="s in segments" :key="s.label" class="inline-flex items-center gap-1.5">
                <span class="inline-block size-2.5 rounded-sm" :style="{ background: s.color }" />
                <span class="font-semibold">{{ s.label }}</span>
                <span class="tabular-nums text-muted-foreground">{{ fmtInt(s.value) }} · {{ fmtPct((s.value ?? 0) / (total || 1), 0) }}</span>
            </span>
        </div>
    </div>
</template>
