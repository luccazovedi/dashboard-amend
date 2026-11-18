import { normalize } from './columns';

export function matchSearch(r, q) {
    if (!q) return true;
    const n = normalize(q);
    return normalize(r.produto).includes(n) || normalize(r.descricao).includes(n) || normalize(r.codigo).includes(n);
}
