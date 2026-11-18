<script setup>
import { IconAlertTriangle, IconCircleCheck, IconCircleX, IconInfoCircle, IconRosetteDiscountCheck } from '@tabler/icons-vue';

import { STATUS } from '@/lib/format';

defineProps({ status: String });
const icons = { ruptura: IconCircleX, critico: IconAlertTriangle, atencao: IconInfoCircle, ok: IconCircleCheck, concluido: IconRosetteDiscountCheck };
</script>

<template>
    <span :class="['badge text-foreground', STATUS[status]?.cls]" :title="STATUS[status]?.hint">
        <component :is="icons[status]" />{{ STATUS[status]?.label }}
    </span>
</template>
