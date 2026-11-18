<script setup>
import { computed } from 'vue';

import { tip } from '@/lib/tooltip';

const style = computed(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const left = tip.x + 260 > w ? tip.x - 250 : tip.x + 14;
    return { left: `${left}px`, top: `${tip.y + 14}px` };
});
</script>

<template>
    <div
        v-if="tip.show"
        class="pointer-events-none fixed z-50 min-w-40 max-w-60 rounded-md border-2 border-foreground bg-card px-3 py-2 text-xs shadow-sm"
        :style="style"
    >
        <div class="mb-1 font-bold leading-tight">{{ tip.title }}</div>
        <div v-for="(l, i) in tip.lines" :key="i" class="flex items-center justify-between gap-3">
            <span class="flex items-center gap-1.5 text-foreground/70">
                <span v-if="l.color" class="inline-block size-2.5 rounded-sm" :style="{ background: l.color }" />
                {{ l.label }}
            </span>
            <span class="font-bold tabular-nums">{{ l.value }}</span>
        </div>
    </div>
</template>
