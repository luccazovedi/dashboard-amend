<script setup>
import {
    IconBuildingFactory2,
    IconCalendarTime,
    IconCircleCheck,
    IconCircleX,
    IconFileAlert,
    IconHelpCircle,
    IconMapPin,
    IconProgress,
    IconTruck,
} from '@tabler/icons-vue';

import { DIAG } from '@/lib/pedidos';

defineProps({ diag: String });
const icons = {
    liberar: IconCircleCheck,
    parcial: IconProgress,
    transito: IconTruck,
    outroLocal: IconMapPin,
    producao: IconBuildingFactory2,
    programado: IconCalendarTime,
    emitir: IconFileAlert,
    semPrevisao: IconCircleX,
    naoEncontrado: IconHelpCircle,
};
</script>

<template>
    <span :class="['badge text-foreground', DIAG[diag]?.cls]" :title="DIAG[diag]?.hint">
        <component :is="icons[diag]" />{{ DIAG[diag]?.label }}
    </span>
</template>
