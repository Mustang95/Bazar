import type { TProduto } from '../utils/types';

/**
 * Troca dois elementos de posição no array do heap.
 */
function swap(heap: TProduto[], i: number, j: number): void {
  const temp = heap[i];
  heap[i] = heap[j];
  heap[j] = temp;
}

/**
 * Restaura a propriedade de Min-Heap subindo o elemento.
 * O elemento com MENOS views sobe para o topo (raiz).
 */
function bubbleUp(heap: TProduto[], index: number): void {
  while (index > 0) {
    const parentIndex = Math.floor((index - 1) / 2);
    if (heap[index].views < heap[parentIndex].views) {
      swap(heap, index, parentIndex);
      index = parentIndex;
    } else {
      break;
    }
  }
}

/**
 * Restaura a propriedade de Min-Heap descendo o elemento raiz.
 */
function bubbleDown(heap: TProduto[], index: number): void {
  const length = heap.length;
  while (true) {
    let smallest = index;
    const leftChild = 2 * index + 1;
    const rightChild = 2 * index + 2;

    if (leftChild < length && heap[leftChild].views < heap[smallest].views) {
      smallest = leftChild;
    }
    if (rightChild < length && heap[rightChild].views < heap[smallest].views) {
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
 */
export function getTopKMostViewed(products: TProduto[], k: number): TProduto[] {
  if (k <= 0 || products.length === 0) return [];

  const minHeap: TProduto[] = [];

  for (const product of products) {
    if (minHeap.length < k) {
      // Preenche a sala VIP até atingir K itens
      minHeap.push(product);
      bubbleUp(minHeap, minHeap.length - 1);
    } else if (product.views > minHeap[0].views) {
      // O item atual tem mais visualizações que o "pior" da sala VIP
      minHeap[0] = product; // Substitui o topo
      bubbleDown(minHeap, 0); // Reorganiza a sala
    }
  }

  // Retorna os K itens ordenados do mais visto para o menos visto
  return minHeap.sort((a, b) => {
    if (b.views === a.views) {
      return String(a.id).localeCompare(String(b.id));
    }
    return b.views - a.views;
  });
}
