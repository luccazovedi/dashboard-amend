<script setup>
import { IconFileSpreadsheet } from '@tabler/icons-vue';
</script>

<template>
    <div class="card mx-auto mt-10 flex max-w-lg flex-col items-center gap-4 px-6 py-12 text-center">
        <div class="flex size-14 items-center justify-center rounded-xl border-2 border-foreground bg-violet-100 shadow-xs">
            <IconFileSpreadsheet class="size-7 text-violet-700" />
        </div>
        <h2 class="h-display">Nenhuma planilha ainda</h2>
        <p class="text-sm text-muted-foreground">
            Suba o arquivo do Painel de Cobertura do dia para montar as telas de faturamento, cobertura, estoque e fábrica.
        </p>
        <RouterLink to="/atualizar" class="btn btn-primary">Ir para Atualizar</RouterLink>
    </div>
</template>
