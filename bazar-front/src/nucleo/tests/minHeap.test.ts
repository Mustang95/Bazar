import { describe, it, expect } from 'vitest';
import { getTopKMostViewed } from '../minHeap';
import { gerarProdutos, embaralhar } from '../__fixtures__/produtos';

describe('getTopKMostViewed', () => {
  it('o conjunto do top-K não depende da ordem de entrada', () => {
    const produtos = gerarProdutos(200); // com empates de views

    const ids1 = getTopKMostViewed(embaralhar(produtos), 10).map((p) => p.id);
    const ids2 = getTopKMostViewed(embaralhar(produtos), 10).map((p) => p.id);

    expect(ids1).toEqual(ids2);
  });
});
