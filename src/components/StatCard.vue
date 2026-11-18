<script setup>
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-vue';
import { computed } from 'vue';

const props = defineProps({
    label: String,
    value: String,
    sub: String,
    delta: { type: Number, default: null }, // variação vs. upload anterior
    deltaFmt: { type: Function, default: (v) => v.toLocaleString('pt-BR') },
    goodWhen: { type: String, default: 'up' }, // up | down
    tone: { type: String, default: '' }, // classe de fundo opcional
});

const deltaGood = computed(() => (props.goodWhen === 'up' ? props.delta > 0 : props.delta < 0));
</script>

<template>
    <div :class="['card flex flex-col gap-1 p-4', tone]">
        <div class="eyebrow">{{ label }}</div>
        <div class="text-2xl font-extrabold tracking-tight tabular-nums sm:text-[28px]">{{ value }}</div>
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span
                v-if="delta !== null && delta !== 0"
                :class="['inline-flex items-center gap-0.5 font-bold', deltaGood ? 'text-success' : 'text-destructive']"
                title="Variação em relação à planilha anterior"
            >
                <IconArrowUpRight v-if="delta > 0" class="size-3.5" />
                <IconArrowDownRight v-else class="size-3.5" />
                {{ delta > 0 ? '+' : '' }}{{ deltaFmt(delta) }}
            </span>
            <span v-if="sub">{{ sub }}</span>
        </div>
    </div>
</template>
