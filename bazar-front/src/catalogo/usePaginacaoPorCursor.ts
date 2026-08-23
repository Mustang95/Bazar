import { useCallback, useState } from 'react';

export function usePaginationCursor() {
  // Pilha de cursores passados: [null, "id_10", "id_20"]
  // null representa a primeira página
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);

  const currentCursor = cursorHistory[pageIndex] ?? null;

  const nextPage = useCallback(
    (nextCursor: string | null | undefined) => {
      if (!nextCursor) return;

      setCursorHistory((prev) => {
        // Garante que não mantém histórico futuro se o usuário voltou e avançou
        const updated = prev.slice(0, pageIndex + 1);
        return [...updated, nextCursor];
      });
      setPageIndex((prev) => prev + 1);
    },
    [pageIndex],
  );

  const prevPage = useCallback(() => {
    if (pageIndex > 0) {
      setPageIndex((prev) => prev - 1);
    }
  }, [pageIndex]);

  const resetPagination = useCallback(() => {
    setCursorHistory([null]);
    setPageIndex(0);
  }, []);

  return {
    currentCursor,
    pageNumber: pageIndex + 1,
    hasPrev: pageIndex > 0,
    nextPage,
    prevPage,
    resetPagination,
  };
}
