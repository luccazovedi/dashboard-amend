<script setup>
import { IconLayoutSidebar } from '@tabler/icons-vue';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import AppSidebar from '@/components/AppSidebar.vue';
import ChartTooltip from '@/components/ChartTooltip.vue';
import EmptyState from '@/components/EmptyState.vue';
import ProductDrawer from '@/components/ProductDrawer.vue';
import { closeProduct } from '@/lib/drawer';
import { active } from '@/lib/store';
import { hideTip } from '@/lib/tooltip';

const route = useRoute();
const sidebarOpen = ref(false);
watch(
    () => route.path,
    () => {
        closeProduct();
        hideTip();
    },
);
</script>

<template>
    <div class="flex min-h-full overflow-x-clip">
        <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
        <main class="flex min-w-0 flex-1 flex-col md:pl-64">
            <header class="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b-2 border-foreground bg-card px-4">
                <div class="flex min-w-0 items-center gap-2">
                    <button
                        class="inline-flex size-9 items-center justify-center rounded-md border-2 border-foreground bg-card shadow-2xs md:hidden"
                        aria-label="Abrir menu"
                        @click="sidebarOpen = true"
                    >
                        <IconLayoutSidebar class="size-4" />
                    </button>
                    <span class="truncate text-sm font-bold">{{ route.meta.title }}</span>
                </div>
                <div v-if="active" class="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                    <span class="badge bg-emerald-200 text-foreground">Base</span>
                    <span class="max-w-72 truncate">{{ active.meta.fileName }}</span>
                </div>
            </header>

            <div class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
                <RouterView v-if="active || route.meta.noData" />
                <EmptyState v-else />
            </div>
        </main>
        <ProductDrawer />
        <ChartTooltip />
    </div>
</template>
