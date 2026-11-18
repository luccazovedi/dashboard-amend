const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtInt = (v) => (v === null || v === undefined ? '—' : intFmt.format(v));
export const fmtCompact = (v) => (v === null || v === undefined ? '—' : compactFmt.format(v));
export const fmtPct = (v, d = 1) => (v === null || v === undefined ? '—' : `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`);
export const fmtCob = (v) => (v === null || v === undefined ? '—' : `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`);

export function fmtDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}

export function fmtDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtByType(v, fmt) {
    if (fmt === 'pct') return fmtPct(v);
    if (fmt === 'cob') return fmtCob(v);
    if (fmt === 'date') return fmtDate(v);
    if (fmt === 'text') return v ?? '—';
    return fmtInt(v);
}

export const sum = (arr, key) => arr.reduce((a, r) => a + (r[key] ?? 0), 0);

export const STATUS = {
    ruptura: { label: 'Ruptura', cls: 'bg-red-300', dot: '#b91c1c', hint: 'Sem estoque e ainda há volume a faturar' },
    critico: { label: 'Crítico', cls: 'bg-red-200', dot: 'var(--destructive)', hint: 'Cobertura abaixo de 1x' },
    atencao: { label: 'Atenção', cls: 'bg-amber-200', dot: 'var(--warning)', hint: 'Cobertura entre 1x e 2x' },
    ok: { label: 'Coberto', cls: 'bg-emerald-200', dot: 'var(--success)', hint: 'Cobertura de 2x ou mais' },
    concluido: { label: 'Faturado', cls: 'bg-violet-200', dot: 'var(--primary)', hint: 'Previsão já atingida (nada a faturar)' },
};
export const STATUS_ORDER = ['ruptura', 'critico', 'atencao', 'ok', 'concluido'];
