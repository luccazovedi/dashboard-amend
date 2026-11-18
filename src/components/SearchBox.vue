<script setup>
import { IconSearch } from '@tabler/icons-vue';

const model = defineModel({ type: String, default: '' });
defineProps({ placeholder: { type: String, default: 'Buscar produto ou descrição…' } });
</script>

<template>
    <div class="relative w-full sm:w-72">
        <IconSearch class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input v-model="model" class="input pl-9" :placeholder="placeholder" type="search" />
    </div>
</template>
