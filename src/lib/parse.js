import * as XLSX from 'xlsx';

import { COLUMNS, normalize } from './columns';

const NUMERIC = COLUMNS.filter((c) => c.fmt !== 'text' && c.fmt !== 'date').map((c) => c.key);

function toNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const s = String(v).trim().replace(/\./g, '').replace(',', '.').replace('%', '');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

// Serial do Excel → 'AAAA-MM-DD' (sem fuso, para não "pular" um dia)
function toISODate(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') {
        const d = new Date(Math.round((v - 25569) * 86400000));
        return d.toISOString().slice(0, 10);
    }
    const m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
        const y = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    return null;
}

export function coverageStatus(r) {
    if (r.aFat === null || r.aFat <= 0) return 'concluido';
    if ((r.estAtual ?? 0) <= 0) return 'ruptura';
    if ((r.pctCob ?? 0) < 1) return 'critico';
    if ((r.pctCob ?? 0) < 2) return 'atencao';
    return 'ok';
}

/**
 * Lê o arquivo .xlsx e devolve { rows, totals, meta, warnings }.
 */
export function parseWorkbook(input, fileName = 'planilha.xlsx') {
    const wb = input?.SheetNames ? input : XLSX.read(input, { type: 'array', cellDates: false });
    const warnings = [];

    // Escolhe a aba que tem o cabeçalho "Produto" + "Descrição"
    let found = null;
    for (const name of wb.SheetNames) {
        const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, blankrows: true, raw: true });
        for (let i = 0; i < Math.min(grid.length, 40); i++) {
            const norm = (grid[i] || []).map(normalize);
            if (norm.includes('produto') && norm.some((h) => h.startsWith('descri'))) {
                found = { name, grid, headerRow: i };
                break;
            }
        }
        if (found) break;
    }
    if (!found) {
        throw new Error('Não encontrei o cabeçalho com "Produto" e "Descrição". Confira se é a planilha do Painel de Cobertura.');
    }

    const { grid, headerRow, name: sheetName } = found;
    const header = grid[headerRow].map(normalize);

    const index = {};
    for (const col of COLUMNS) {
        const target = normalize(col.header);
        // procura exata; Est.Total e Est.Total2 são distintos
        const i = header.findIndex((h) => h === target);
        if (i >= 0) index[col.key] = i;
        else if (col.required) throw new Error(`Coluna obrigatória "${col.header}" não encontrada.`);
        else warnings.push(`Coluna "${col.header}" não encontrada — os campos dela ficarão vazios.`);
    }
    // Coluna A (sem título) = código base do produto
    const codeIdx = index.produto > 0 ? index.produto - 1 : null;

    const rows = [];
    let totals = null;
    for (let r = headerRow + 1; r < grid.length; r++) {
        const line = grid[r] || [];
        const produto = line[index.produto];
        const first = line[0];
        const isTotal = [produto, first].some((v) => normalize(v) === 'totalgeral');
        if (!isTotal && (produto === null || produto === undefined || String(produto).trim() === '')) continue;

        const rec = {
            codigo: codeIdx !== null ? line[codeIdx] : null,
            produto: String(produto ?? '').trim(),
            descricao: String(line[index.descricao] ?? '').trim(),
        };
        for (const key of NUMERIC) rec[key] = index[key] !== undefined ? toNumber(line[index[key]]) : null;
        rec.programado = index.programado !== undefined ? toISODate(line[index.programado]) : null;

        if (isTotal) {
            totals = rec;
            continue;
        }
        rec.status = coverageStatus(rec);
        rows.push(rec);
    }

    if (!rows.length) throw new Error('A planilha não tem linhas de produto.');

    // Se não houver "Total Geral", soma as colunas
    if (!totals) {
        warnings.push('Linha "Total Geral" não encontrada — totais calculados pela soma dos produtos.');
        totals = { produto: 'Total Geral' };
        for (const key of NUMERIC) totals[key] = rows.reduce((a, r) => a + (r[key] ?? 0), 0);
        totals.pctFat = totals.pVenda ? (totals.qtdeFat + totals.carteira + (totals.fatB2C ?? 0)) / totals.pVenda : null;
        totals.pctCob = totals.aFat ? totals.estAtual / totals.aFat : null;
        totals.pctCobTotal = totals.aFat ? totals.estTotal2 / totals.aFat : null;
    }

    const modified = wb.Props?.ModifiedDate ? new Date(wb.Props.ModifiedDate).toISOString() : null;

    return {
        rows,
        totals,
        warnings,
        meta: {
            fileName,
            sheetName,
            fileModified: modified,
            importedAt: new Date().toISOString(),
            productCount: rows.length,
        },
    };
}
