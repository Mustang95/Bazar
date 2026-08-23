/**
 * Uso:
    medir('A createdAtMs   ', () => sortProductsMultiKey(produtos));
    medir('B decorado      ', () => sortProductsMultiKeyDecorado(produtos));
    medir('C parse no comp.', () => sortProductsMultiKeyParseNoComparador(produtos));

   O que anotar no README
    Não só os três tempos — anota também quantos parses cada versão faz, porque é isso que explica a diferença:

    Versão	Date.parse por ordenação	Mediana
    A — createdAtMs	0	?
    B — decorado	5.000	?
    C — parse no comparador	~120.000	?
 */

/**
 * exemplo de uso medir('função x', () => foo());
 *
 *
 * @param nome
 * @param fn
 * @param repeticoes
 * @returns
 */

export function medir(
  nome: string,
  fn: () => unknown,
  repeticoes = 30,
): number {
  // aquecimento
  for (let i = 0; i < 10; i++) fn();

  const amostras: number[] = [];
  let refem: unknown; // impede dead-code elimination

  for (let i = 0; i < repeticoes; i++) {
    const t0 = performance.now();
    refem = fn();
    const t1 = performance.now();
    amostras.push(t1 - t0);
  }

  if (refem === undefined) console.log(''); // usa o resultado, nunca imprime

  amostras.sort((x, y) => x - y);
  const mediana = amostras[Math.floor(amostras.length / 2)];
  console.log(`${nome}: ${mediana.toFixed(2)} ms (mediana de ${repeticoes})`);
  return mediana;
}
