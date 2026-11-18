# Painel de Cobertura

Dashboard (visual do TryPost) para a planilha diária `PAINEL_COBERTURA_OFICIAL.xlsx`.

## Como usar
1. Dê dois cliques em **Abrir Painel.bat** (ou rode `npm install` e `npm run dev`).
2. Vá em **Atualizar** e arraste a planilha do dia.
3. Navegue pelas telas: Visão geral, Faturamento, Cobertura & corte, Estoque, Fábrica, Produtos e Histórico.

A planilha é lida só no navegador; cada upload fica guardado (IndexedDB) e alimenta o Histórico.
As colunas são reconhecidas pelo nome do cabeçalho (`Produto`, `Descrição`, `Est.Inicial` … `Programado`),
então mudar a ordem das colunas não quebra o painel.

## Regras de situação (cobertura = Est.Atual ÷ À Fat.)
- **Ruptura**: sem estoque e ainda há volume à faturar
- **Crítico**: cobertura < 1x
- **Atenção**: 1x a 2x
- **Coberto**: ≥ 2x
- **Faturado**: nada mais à faturar

## Pedidos cortados
Suba também a planilha **Corte de Pedidos** (uma aba por cliente, colunas `Código SKU`, `Descrição`, `Status atual`,
`Previsão de chegada`, `Quantidade prevista`, `Última atualização`, `Observações`). Pode soltar junto com o painel.

Cada SKU é ligado ao produto do painel (ex.: `1118` → `1118-1`) e recebe uma situação:
Liberar pedido → Estoque parcial → Em trânsito → Estoque em outro local → Em produção (OP aberta) →
Produção programada → OP a emitir → Sem previsão. Estoque abaixo de 10% do saldo à faturar é tratado como residual.
A tela também aponta divergências entre o status da logística e o que o painel mostra.
