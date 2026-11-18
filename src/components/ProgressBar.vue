<script setup>
import { computed } from 'vue';

const props = defineProps({ value: Number, color: { type: String, default: 'var(--primary)' }, max: { type: Number, default: 1 } });
const w = computed(() => `${Math.max(0, Math.min(1, (props.value ?? 0) / props.max)) * 100}%`);
</script>

<template>
    <div class="h-2 w-full min-w-16 overflow-hidden rounded-full border border-foreground/30 bg-secondary">
        <div class="h-full rounded-full" :style="{ width: w, background: color }" />
    </div>
</template>
