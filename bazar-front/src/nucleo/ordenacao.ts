import type { TProduto } from '../utils/types';

/**
 * Ordenação estável determinística.
 * Critérios em cascata: Relevância (se houver) -> Preço -> Data -> ID (desempate estrito).
 * Complexidade: O(N log N).
 */
export function sortProductsMultiKey(
  products: TProduto[],
  relevanceMap?: Map<string | number, number>,
): TProduto[] {
  // Cria cópia rasa para manter a função pura sem mutar a entrada
  return [...products].sort((a, b) => {
    // 1. Relevância (maior para menor)
    if (relevanceMap) {
      const scoreA = relevanceMap.get(a.id) || 0;
      const scoreB = relevanceMap.get(b.id) || 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
    }

    // 2. Preço (menor para maior)
    if (a.precoCentavos !== b.precoCentavos) {
      return a.precoCentavos - b.precoCentavos;
    }

    // 3. Data de criação (mais recente primeiro)
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (dateA !== dateB) {
      return dateB - dateA;
    }

    // 4. Desempate Determinístico Estrito (Garante 100% de estabilidade)
    return String(a.id).localeCompare(String(b.id));
  });
}
