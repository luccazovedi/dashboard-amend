<script setup>
import { IconAlertTriangle, IconCircleCheck, IconCloudUpload, IconFileSpreadsheet, IconLoader2, IconTrash, IconTruckDelivery } from '@tabler/icons-vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import PageHeader from '@/components/PageHeader.vue';
import { fmtDateTime, fmtInt, fmtPct } from '@/lib/format';
import { importFile, removePedido, state } from '@/lib/store';

const router = useRouter();
const dragging = ref(false);
const busy = ref(false);
const errors = ref([]);
const results = ref([]);
const input = ref(null);
let depth = 0;

async function handle(fileList) {
    const files = [...(fileList ?? [])];
    if (!files.length) return;
    errors.value = [];
    results.value = [];
    busy.value = true;
    for (const file of files) {
        if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
            errors.value.push(`${file.name}: envie um arquivo Excel (.xlsx, .xlsm ou .xls).`);
            continue;
        }
        try {
            results.value.push(await importFile(file));
        } catch (e) {
            console.error(e);
            errors.value.push(`${file.name}: ${e.message || 'não foi possível ler a planilha.'}`);
        }
    }
    busy.value = false;
    if (input.value) input.value.value = '';
}

function onEnter() {
    depth++;
    dragging.value = true;
}
function onLeave() {
    depth = Math.max(0, depth - 1);
    if (!depth) dragging.value = false;
}
function onDrop(e) {
    depth = 0;
    dragging.value = false;
    handle(e.dataTransfer?.files);
}

const uploads = computed(() =>
    [
        ...state.snapshots.map((s) => ({ ...s, kind: 'painel' })),
        ...state.pedidos.map((s) => ({ ...s, kind: 'pedidos' })),
    ]
        .sort((a, b) => b.meta.importedAt.localeCompare(a.meta.importedAt))
        .slice(0, 8),
);
const activeIds = computed(() => [state.activeId ?? state.snapshots[0]?.id, state.pedidos[0]?.id]);

async function delPedido(s) {
    if (confirm(`Remover o corte de pedidos "${s.meta.fileName}"?`)) await removePedido(s.id);
}
</script>

<template>
    <PageHeader
        title="Atualizar"
        description="Arraste as planilhas do dia — o Painel de Cobertura e/ou o Corte de Pedidos. O tipo é reconhecido sozinho, e dá para soltar as duas de uma vez."
    />

    <label
        :class="[
            'card relative flex cursor-pointer flex-col items-center justify-center gap-4 border-dashed px-6 py-16 text-center transition-all',
            dragging ? 'scale-[1.01] bg-accent shadow-lg' : 'hover:bg-accent/40',
            busy ? 'pointer-events-none opacity-70' : '',
        ]"
        @dragenter.prevent="onEnter"
        @dragover.prevent
        @dragleave.prevent="onLeave"
        @drop.prevent="onDrop"
    >
        <input ref="input" type="file" accept=".xlsx,.xlsm,.xls" multiple class="sr-only" @change="handle($event.target.files)" />
        <div class="flex size-16 items-center justify-center rounded-2xl border-2 border-foreground bg-violet-100 shadow-sm">
            <IconLoader2 v-if="busy" class="size-8 animate-spin text-violet-700" />
            <IconCloudUpload v-else class="size-8 text-violet-700" />
        </div>
        <div>
            <div class="h-display text-2xl! sm:text-3xl!">{{ busy ? 'Lendo planilhas…' : dragging ? 'Solte para atualizar' : 'Arraste e solte as planilhas aqui' }}</div>
            <p class="mt-1 text-sm text-muted-foreground">ou <span class="font-bold text-primary underline underline-offset-4">clique para escolher</span> · .xlsx</p>
        </div>
        <div class="flex flex-wrap justify-center gap-2">
            <span class="badge bg-card text-foreground"><IconFileSpreadsheet /> Painel de Cobertura</span>
            <span class="badge bg-card text-foreground"><IconTruckDelivery /> Corte de Pedidos</span>
        </div>
        <p class="max-w-md text-xs text-muted-foreground">Os arquivos são lidos só no seu computador — nada é enviado para servidor.</p>
    </label>

    <div v-for="err in errors" :key="err" class="mt-4 flex items-start gap-3 rounded-xl border-2 border-foreground bg-red-100 p-4 shadow-xs">
        <IconAlertTriangle class="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
            <div class="font-bold">Não deu para importar</div>
            <div class="text-sm">{{ err }}</div>
        </div>
    </div>

    <div v-for="r in results" :key="r.id" class="mt-4 rounded-xl border-2 border-foreground bg-emerald-100 p-4 shadow-xs">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex items-start gap-3">
                <IconCircleCheck class="mt-0.5 size-5 shrink-0 text-success" />
                <div>
                    <template v-if="r.kind === 'painel'">
                        <div class="font-bold">Painel de Cobertura atualizado</div>
                        <div class="text-sm">
                            {{ r.meta.fileName }} · {{ r.meta.productCount }} produtos · faturado {{ fmtInt(r.totals.qtdeFat) }} ({{ fmtPct(r.totals.pctFat) }})
                        </div>
                    </template>
                    <template v-else>
                        <div class="font-bold">Corte de Pedidos atualizado</div>
                        <div class="text-sm">
                            {{ r.meta.fileName }} · {{ r.meta.clientCount }} clientes ({{ r.clientes.map((c) => c.nome).join(', ') }}) · {{ r.meta.itemCount }} SKUs
                        </div>
                    </template>
                    <ul v-if="r.warnings.length" class="mt-2 list-disc pl-4 text-xs text-foreground/70">
                        <li v-for="w in r.warnings" :key="w">{{ w }}</li>
                    </ul>
                </div>
            </div>
            <button class="btn btn-primary btn-sm" @click="router.push(r.kind === 'painel' ? '/' : '/pedidos')">
                {{ r.kind === 'painel' ? 'Ver visão geral' : 'Ver pedidos cortados' }}
            </button>
        </div>
    </div>

    <div class="mt-8">
        <div class="mb-3 flex items-center justify-between">
            <h2 class="eyebrow">Últimos uploads</h2>
            <RouterLink v-if="state.snapshots.length" to="/historico" class="text-xs font-bold text-primary underline-offset-4 hover:underline">Histórico do painel</RouterLink>
        </div>
        <div v-if="!uploads.length" class="text-sm text-muted-foreground">Nenhum upload ainda.</div>
        <ul v-else class="grid gap-2">
            <li v-for="s in uploads" :key="s.kind + s.id" class="card flex items-center gap-3 px-4 py-3 shadow-xs">
                <IconFileSpreadsheet v-if="s.kind === 'painel'" class="size-5 shrink-0 text-success" />
                <IconTruckDelivery v-else class="size-5 shrink-0 text-primary" />
                <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-semibold">{{ s.meta.fileName }}</div>
                    <div class="text-xs text-muted-foreground">
                        {{ s.kind === 'painel' ? 'Painel de Cobertura' : 'Corte de Pedidos' }} · {{ fmtDateTime(s.meta.importedAt) }} ·
                        {{ s.kind === 'painel' ? `${s.meta.productCount} produtos` : `${s.meta.clientCount} clientes, ${s.meta.itemCount} SKUs` }}
                    </div>
                </div>
                <span v-if="activeIds.includes(s.id)" class="badge bg-emerald-200 text-foreground">Ativa</span>
                <button v-if="s.kind === 'pedidos'" class="btn btn-outline btn-sm px-2" aria-label="Remover" @click.prevent="delPedido(s)"><IconTrash /></button>
            </li>
        </ul>
    </div>
</template>
