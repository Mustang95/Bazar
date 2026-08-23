import type { TInvertedIndex, TProduto } from '../utils/types';
import { normalizarTexto } from './utils';

export function normalizar(texto: string): string[] {
  const auxTexto = normalizarTexto(texto);
  return auxTexto
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Cria um índice invertido a partir de uma lista de produtos.
 * Complexidade: O(N * T), onde N é o total de produtos e T a média de tokens por produto.
 *
 * @param produtos
 * @returns
 */
export function construirIndice(produtos: TProduto[]): TInvertedIndex {
  const index: TInvertedIndex = new Map();
  for (const produto of produtos) {
    // gerar um array de string com todas palavras chaves possíveis de um produto
    // atraves do seu titulo
    const tokens = normalizar(`${produto.titulo}`);

    for (const token of tokens) {
      // percorre o array de tokens gerado e adiciona no Map
      let idSet = index.get(token);
      if (!idSet) {
        idSet = new Set();
        index.set(token, idSet);
      }
      idSet.add(produto.id);
    }
  }
  return index;
}

/**
 * Executa busca por interseção estrita dos termos fornecidos.
 * Complexidade: O(T_count * log(T_count) + min(|S_i|) * K), iterando sempre pelo menor conjunto.
 *
 * @param consulta
 * @param indice
 * @returns
 */
export function buscarIntersecao(
  consulta: string,
  indice: TInvertedIndex,
): Set<string | number> {
  const queryTokens = normalizar(consulta);
  if (queryTokens.length === 0) return new Set();

  // Coleta os Sets de cada token
  const sets: Set<string | number>[] = [];
  for (const token of queryTokens) {
    const idSet = indice.get(token);
    if (!idSet || idSet.size === 0) {
      // Se qualquer uma das palavras não existir na base, a interseção é vazia
      return new Set();
    }
    sets.push(idSet);
  }

  // Ordena os sets pelo tamanho: do menor para o maior
  sets.sort((a, b) => a.size - b.size);

  // Inicializa o resultado com o menor conjunto
  const [smallestSet, ...otherSets] = sets;
  const result = new Set<string | number>();

  for (const id of smallestSet) {
    const existsInAll = otherSets.every((set) => set.has(id));
    if (existsInAll) {
      result.add(id);
    }
  }

  return result;
}
