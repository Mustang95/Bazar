import type { TResultadoPaginado } from '../utils/types';

/**
 * Pagina uma lista em memória usando cursor baseado no ID do item.
 * Complexidade: O(L), onde L é o limite de itens por página.
 */
export function paginateByCursor<T extends { id: string | number }>(
  items: T[],
  limit: number,
  cursor?: string | null,
): TResultadoPaginado<T> {
  let startIndex = 0;

  // Se houver cursor, localiza o ponto de parada anterior
  if (cursor) {
    const foundIndex = items.findIndex((item) => String(item.id) === cursor);
    if (foundIndex !== -1) {
      startIndex = foundIndex + 1;
    }
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
