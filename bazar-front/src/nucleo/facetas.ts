import type { TChavesTexto, TProduto } from '../utils/types';

/**
 * Classifica o preço em buckets pré-determinados.
 * @param precoCentavos
 * @returns string
 */
function getPacotePrecos(precoCentavos: number): string {
  if (precoCentavos < 10000) return 'Até R$ 99';
  if (precoCentavos < 50000) return 'R$ 100 a R$ 499';
  if (precoCentavos < 100000) return 'R$ 500 a R$ 999';
  return 'R$ 1.000 ou mais';
}

/**
 * Conta ocorrências de um campo de texto em uma única passada O(N).
 * @param produtos
 * @param campo
 * @returns Map<string, number>
 */
export function contarPor<K extends TChavesTexto>(
  produtos: TProduto[],
  campo: K,
): Map<string, number> {
  const mapa = new Map<string, number>();

  for (const produto of produtos) {
    const valor = produto[campo];
    mapa.set(valor, (mapa.get(valor) || 0) + 1);
  }

  return mapa;
}

/**
 * Classifica e conta as faixas de preço em uma única passada O(N).
 * @param produtos
 * @returns Map<string, number>
 */
export function contarFaixasPreco(produtos: TProduto[]): Map<string, number> {
  const faixaPreco = new Map<string, number>();

  for (const produto of produtos) {
    const bucket = getPacotePrecos(produto.precoCentavos);
    faixaPreco.set(bucket, (faixaPreco.get(bucket) || 0) + 1);
  }

  return faixaPreco;
}
