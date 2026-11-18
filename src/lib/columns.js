// Mapeamento das colunas da planilha "PAINEL_COBERTURA".
// As colunas são localizadas pelo NOME do cabeçalho (não pela posição),
// então a planilha continua funcionando se colunas mudarem de lugar.

export const GROUPS = {
    faturamento: 'Status Faturamento',
    corte: 'Corte',
    estoque: 'Posição do Estoque',
    fabrica: 'Desempenho Fábrica',
};

// fmt: int | pct | cob (cobertura em x) | date | text
export const COLUMNS = [
    { key: 'produto', header: 'Produto', label: 'Produto', fmt: 'text', required: true },
    { key: 'descricao', header: 'Descrição', label: 'Descrição', fmt: 'text', required: true },

    { key: 'estInicial', header: 'Est.Inicial', label: 'Est. inicial', fmt: 'int', group: 'faturamento' },
    { key: 'orcado', header: 'Orçado', label: 'Orçado', fmt: 'int', group: 'faturamento' },
    { key: 'pVenda', header: 'P.Venda', label: 'Prev. venda', fmt: 'int', group: 'faturamento' },
    { key: 'qtdeFat', header: 'Qtde.Fat', label: 'Faturado', fmt: 'int', group: 'faturamento' },
    { key: 'carteira', header: 'Carteira', label: 'Carteira', fmt: 'int', group: 'faturamento' },
    { key: 'fatB2C', header: 'Fat_B2C', label: 'Fat. B2C', fmt: 'int', group: 'faturamento' },
    { key: 'pctFat', header: '%Fat', label: '% Fat.', fmt: 'pct', group: 'faturamento' },
    { key: 'aFat', header: 'À Fat.', label: 'À faturar', fmt: 'int', group: 'faturamento' },
    { key: 'estAtual', header: 'Est.Atual', label: 'Est. atual', fmt: 'int', group: 'faturamento' },
    { key: 'pctCob', header: '%Cob', label: 'Cobertura', fmt: 'cob', group: 'faturamento' },
    { key: 'estTotal2', header: 'Est.Total2', label: 'Est. total', fmt: 'int', group: 'faturamento' },
    { key: 'pctCobTotal', header: '% Cob.Total', label: 'Cob. total', fmt: 'cob', group: 'faturamento' },

    { key: 'corte', header: 'Corte', label: 'Corte', fmt: 'int', group: 'corte' },

    { key: 'estSafira', header: 'Est.Safira', label: 'Safira', fmt: 'int', group: 'estoque' },
    { key: 'estReserva', header: 'Est.Reserva', label: 'Reserva', fmt: 'int', group: 'estoque' },
    { key: 'estAmazon', header: 'Est.Amazon', label: 'Amazon', fmt: 'int', group: 'estoque' },
    { key: 'transito', header: 'Trânsito', label: 'Trânsito', fmt: 'int', group: 'estoque' },
    { key: 'estBM', header: 'Est.BM', label: 'BM', fmt: 'int', group: 'estoque' },
    { key: 'estTotal', header: 'Est.Total', label: 'Est. total', fmt: 'int', group: 'estoque' },
    { key: 'estB2C', header: 'Est.B2C', label: 'B2C', fmt: 'int', group: 'estoque' },

    { key: 'estPrev', header: 'Est.Prev', label: 'Est. previsto', fmt: 'int', group: 'fabrica' },
    { key: 'pmp', header: 'PMP', label: 'PMP', fmt: 'int', group: 'fabrica' },
    { key: 'estPmp', header: 'Est+PMP', label: 'Est. + PMP', fmt: 'int', group: 'fabrica' },
    { key: 'produzido', header: 'Produzido', label: 'Produzido', fmt: 'int', group: 'fabrica' },
    { key: 'estProd', header: 'Est+Prod', label: 'Est. + prod.', fmt: 'int', group: 'fabrica' },
    { key: 'opAberta', header: 'OP.Aberta', label: 'OP aberta', fmt: 'int', group: 'fabrica' },
    { key: 'opProg', header: 'OP.Prog', label: 'OP programada', fmt: 'int', group: 'fabrica' },
    { key: 'emitirOp', header: 'Emitir (OP)', label: 'Emitir OP', fmt: 'int', group: 'fabrica' },
    { key: 'programado', header: 'Programado', label: 'Programado', fmt: 'date', group: 'fabrica' },
];

export const COL = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));

// Locais de estoque, na ordem fixa da paleta categórica (--s1..--s6)
export const STOCK_LOCATIONS = [
    { key: 'estSafira', label: 'Safira', color: 'var(--s1)' },
    { key: 'estReserva', label: 'Reserva', color: 'var(--s2)' },
    { key: 'estAmazon', label: 'Amazon', color: 'var(--s3)' },
    { key: 'transito', label: 'Trânsito', color: 'var(--s4)' },
    { key: 'estBM', label: 'BM', color: 'var(--s5)' },
    { key: 'estB2C', label: 'B2C', color: 'var(--s6)' },
];

export const normalize = (s) =>
    String(s ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9%+]/g, '');
