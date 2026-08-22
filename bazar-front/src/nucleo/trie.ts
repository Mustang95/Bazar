import type { TSugestao, TTrieNode } from '../utils/types';
import { normalizarTexto } from './utils';

export function createTrieNode(): TTrieNode {
  return {
    children: new Map(),
    isEndOfWord: false,
    topSuggestions: [],
  };
}

/**
 * Atualiza a lista dos 10 mais frequentes em um nó específico.
 * Mantém o array limitado a 10 elementos em ordem decrescente de frequência.
 */
function updateTopSuggestions(node: TTrieNode, item: TSugestao): void {
  const existingIndex = node.topSuggestions.findIndex(
    (s) => s.termo === item.termo,
  );

  if (existingIndex !== -1) {
    // se não encontrado colocamos o numero mais alto possível.
    node.topSuggestions[existingIndex].frequencia = Math.max(
      node.topSuggestions[existingIndex].frequencia,
      item.frequencia,
    );
  } else {
    // se está dentro do top só puxa para o item node
    node.topSuggestions.push(item);
  }

  // ordena o top
  node.topSuggestions.sort((a, b) => b.frequencia - a.frequencia);
  // se for maior q 10 o top, removemos o último.
  if (node.topSuggestions.length > 10) {
    node.topSuggestions.pop();
  }
}

/**
 * Insere um termo e sua frequência na Trie.
 * Complexidade: O(L), onde L é o comprimento do termo.
 */
export function insertTrie(
  raiz: TTrieNode,
  termo: string,
  frequencia: number,
): void {
  const normalizado = normalizarTexto(termo);

  let current = raiz;
  updateTopSuggestions(current, { termo: normalizado, frequencia });

  for (const char of normalizado) {
    let child = current.children.get(char);
    if (!child) {
      child = createTrieNode();
      current.children.set(char, child);
    }
    current = child;
    updateTopSuggestions(current, { termo: normalizado, frequencia });
  }

  current.isEndOfWord = true;
}

/**
 * Busca as top 10 sugestões para um prefixo.
 * Complexidade: O(P), onde P é o comprimento do prefixo digitado.
 */
export function autocompleteTrie(
  raiz: TTrieNode,
  prefixo: string,
): TSugestao[] {
  const normalized = normalizarTexto(prefixo);

  let current = raiz;

  for (const char of normalized) {
    const child = current.children.get(char);
    if (!child) return [];
    current = child;
  }

  return current.topSuggestions;
}
