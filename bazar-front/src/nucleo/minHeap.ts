import type { TProduto } from '../utils/types';

//
/**
 * para criar um max heap basta alterar a ordem dos params de piorcenario
 * @param a
 * @param b
 * @returns
 */
function piorCenario(a: TProduto, b: TProduto): number {
  if (a.views !== b.views) return a.views - b.views;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/**
 * Troca dois elementos de posição no array do heap.
 * @param heap
 * @param i
 * @param j
 */
function swap(heap: TProduto[], i: number, j: number): void {
  const temp = heap[i];
  heap[i] = heap[j];
  heap[j] = temp;
}

/**
 * Restaura a propriedade de Min-Heap subindo o elemento.
 * O elemento com MENOS views sobe para o topo (raiz).
 * @param heap
 * @param index
 */
function bubbleUp(heap: TProduto[], index: number): void {
  while (index > 0) {
    const parentIndex = Math.floor((index - 1) / 2);
    if (piorCenario(heap[index], heap[parentIndex]) < 0) {
      swap(heap, index, parentIndex);
      index = parentIndex;
    } else {
      break;
    }
  }
}

/**
 * Restaura a propriedade de Min-Heap descendo o elemento raiz.
 * @param heap
 * @param index
 */
function bubbleDown(heap: TProduto[], index: number): void {
  const length = heap.length;
  while (true) {
    let smallest = index;
    const leftChild = 2 * index + 1;
    const rightChild = 2 * index + 2;

    if (
      leftChild < length &&
      piorCenario(heap[leftChild], heap[smallest]) < 0
    ) {
      smallest = leftChild;
    }
    if (
      rightChild < length &&
      piorCenario(heap[rightChild], heap[smallest]) < 0
    ) {
      smallest = rightChild;
    }

    if (smallest !== index) {
      swap(heap, index, smallest);
      index = smallest;
    } else {
      break;
    }
  }
}

/**
 * Retorna os K produtos mais vistos da lista inteira.
 * Complexidade: O(N log K), onde N é o total de itens e K é o limite desejado.
 *
 * @param products
 * @param k
 * @returns TProduto[]
 */
export function getTopKMostViewed(products: TProduto[], k: number): TProduto[] {
  if (k <= 0 || products.length === 0) return [];

  const minHeap: TProduto[] = [];

  for (const product of products) {
    if (minHeap.length < k) {
      // Preenche a sala VIP até atingir K itens
      minHeap.push(product);
      bubbleUp(minHeap, minHeap.length - 1);
    } else if (piorCenario(product, minHeap[0]) > 0) {
      // O item atual tem mais visualizações que o "pior" da sala VIP
      minHeap[0] = product; // Substitui o topo
      bubbleDown(minHeap, 0); // Reorganiza a sala
    }
  }

  // Retorna os K itens ordenados do mais visto para o menos visto
  return minHeap.sort((a, b) => piorCenario(b, a));
}
