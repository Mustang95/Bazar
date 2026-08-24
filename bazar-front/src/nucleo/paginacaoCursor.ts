import type { TResultadoPaginado } from '../utils/types';

/**
 * Pagina uma lista em memória usando cursor baseado no ID do item.
 * Complexidade: O(L) com índice; O(N + L) sem índice (findIndex varre a lista).
 * @param items
 * @param limit
 * @param cursor
 * @param indice
 * @returns TResultadoPaginado
 */
export function paginateByCursor<T extends { id: string | number }>(
  items: T[],
  limit: number,
  cursor?: string | null,
  indice?: Map<string | number, number>,
): TResultadoPaginado<T> {
  let startIndex = 0;
  // dois comandos que geram o ganho de pesquisa quando invocar paginateByCursor
  // O desenho é: ordena uma vez, indexa uma vez, pagina barato N vezes.
  //   const ordenados = sortProductsMultiKey(resultado);
  //   const indice = new Map(ordenados.map((p, i) => [String(p.id), i]));

  // Se houver cursor, localiza o ponto de parada anterior
  if (cursor) {
    const foundIndex = indice
      ? (indice.get(cursor) ?? -1) // O(1) quando tem índice
      : items.findIndex((item) => String(item.id) === cursor); // O(N) sem índice
    if (foundIndex === -1) {
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
        totalCount: items.length,
        cursorInvalido: true,
      };
    }
    startIndex = foundIndex + 1;
  }

  const pageItems = items.slice(startIndex, startIndex + limit);
  const nextItem = items[startIndex + limit];
  const hasMore = nextItem !== undefined;
  const nextCursor =
    hasMore && pageItems.length > 0
      ? String(pageItems[pageItems.length - 1].id)
      : null;

  return {
    items: pageItems,
    nextCursor,
    hasMore,
    totalCount: items.length,
  };
}
