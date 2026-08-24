import { medir } from './performance';
import type { TProduto } from '../utils/types';

// Função A: Campo pré-calculado em milissegundos (createdAtMs)
export function sortProductsMultiKey(products: TProduto[]): TProduto[] {
  return [...products].sort((a, b) => {
    if (a.precoCentavos !== b.precoCentavos)
      return a.precoCentavos - b.precoCentavos;
    if (a.createdAtMs !== b.createdAtMs) return b.createdAtMs - a.createdAtMs;
    return String(a.id).localeCompare(String(b.id));
  });
}

// Função B: Decorate-Sort-Undecorate (Schwartzian Transform)
export function sortProductsMultiKeyDecorado(products: TProduto[]): TProduto[] {
  return products
    .map((p) => ({ produto: p, dataMs: Date.parse(p.createdAt) }))
    .sort((a, b) => {
      if (a.produto.precoCentavos !== b.produto.precoCentavos) {
        return a.produto.precoCentavos - b.produto.precoCentavos;
      }
      if (a.dataMs !== b.dataMs) return b.dataMs - a.dataMs;
      return String(a.produto.id).localeCompare(String(b.produto.id));
    })
    .map((wrapper) => wrapper.produto);
}

// Função C: Date.parse chamado direto no comparador
export function sortProductsMultiKeyParseNoComparador(
  products: TProduto[],
): TProduto[] {
  return [...products].sort((a, b) => {
    if (a.precoCentavos !== b.precoCentavos)
      return a.precoCentavos - b.precoCentavos;
    const dataA = Date.parse(a.createdAt);
    const dataB = Date.parse(b.createdAt);
    if (dataA !== dataB) return dataB - dataA;
    return String(a.id).localeCompare(String(b.id));
  });
}

// Execução com 5.000 itens mockados
export function rodarBenchmarks(produtos: TProduto[]) {
  console.log(`\n=== BENCHMARK DE ORDENAÇÃO (5.000 itens) ===`);
  const tA = medir('A — createdAtMs (0 parses)', () =>
    sortProductsMultiKey(produtos),
  );
  const tB = medir('B — Decorado (5.000 parses)', () =>
    sortProductsMultiKeyDecorado(produtos),
  );
  const tC = medir('C — Parse no Comparador (~120.000 parses)', () =>
    sortProductsMultiKeyParseNoComparador(produtos),
  );

  return { tA, tB, tC };
}
