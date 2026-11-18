<script setup>
// Linha de uma série ao longo dos uploads, com crosshair + tooltip.
import { computed, ref } from 'vue';

import { hideTip, moveTip, showTip } from '@/lib/tooltip';

const props = defineProps({
    points: Array, // { x: string (rótulo), y: number }
    format: { type: Function, default: (v) => v.toLocaleString('pt-BR') },
    label: { type: String, default: 'Valor' },
    color: { type: String, default: 'var(--primary)' },
    height: { type: Number, default: 160 },
    zeroBased: { type: Boolean, default: true },
});

const W = 600;
const pad = { l: 8, r: 8, t: 12, b: 22 };
const hover = ref(null);

const ys = computed(() => props.points.map((p) => p.y ?? 0));
const yMin = computed(() => (props.zeroBased ? Math.min(0, ...ys.value) : Math.min(...ys.value)));
const yMax = computed(() => {
    const m = Math.max(...ys.value);
    return m === yMin.value ? m + 1 : m;
});
const px = (i) => (props.points.length <= 1 ? W / 2 : pad.l + (i * (W - pad.l - pad.r)) / (props.points.length - 1));
const py = (v) => pad.t + (1 - ((v ?? 0) - yMin.value) / (yMax.value - yMin.value)) * (props.height - pad.t - pad.b);

const path = computed(() => props.points.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(p.y).toFixed(1)}`).join(' '));
const area = computed(() =>
    props.points.length ? `${path.value} L${px(props.points.length - 1)},${props.height - pad.b} L${px(0)},${props.height - pad.b} Z` : '',
);

function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    props.points.forEach((_, i) => {
        if (Math.abs(px(i) - x) < Math.abs(px(best) - x)) best = i;
    });
    hover.value = best;
    const p = props.points[best];
    showTip(e, p.x, [{ label: props.label, value: props.format(p.y), color: props.color }]);
    moveTip(e);
}
function onLeave() {
    hover.value = null;
    hideTip();
}
</script>

<template>
    <svg :viewBox="`0 0 ${W} ${height}`" class="h-auto w-full overflow-visible" @mousemove="onMove" @mouseleave="onLeave">
        <line :x1="pad.l" :x2="W - pad.r" :y1="height - pad.b" :y2="height - pad.b" stroke="#0a0a0a" stroke-opacity=".25" vector-effect="non-scaling-stroke" />
        <path :d="area" :fill="color" fill-opacity=".08" />
        <path :d="path" fill="none" :stroke="color" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
        <line
            v-if="hover !== null"
            :x1="px(hover)"
            :x2="px(hover)"
            :y1="pad.t"
            :y2="height - pad.b"
            stroke="#0a0a0a"
            stroke-opacity=".3"
            stroke-dasharray="3 3"
            vector-effect="non-scaling-stroke"
        />
        <template v-for="(p, i) in points" :key="i">
            <circle
                v-if="hover === i || points.length <= 12"
                :cx="px(i)"
                :cy="py(p.y)"
                :r="hover === i ? 5 : 3"
                :fill="color"
                stroke="#fff"
                stroke-width="2"
                vector-effect="non-scaling-stroke"
            />
        </template>
        <text :x="pad.l" :y="height - 6" font-size="11" fill="#52525b">{{ points[0]?.x }}</text>
        <text v-if="points.length > 1" :x="W - pad.r" :y="height - 6" font-size="11" fill="#52525b" text-anchor="end">{{ points.at(-1)?.x }}</text>
    </svg>
</template>
