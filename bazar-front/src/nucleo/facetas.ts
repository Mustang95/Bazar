import type { TProduto, TResultadoFacetas } from '../utils/types';

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

 */
/**
 * Calcula todas as contagens de facetas em uma única iteração.
 * Complexidade: O(N), onde N é o total de produtos filtrados.
 * @param filteredProducts
 * @returns
 */
export function contadorDeFacetas(
  filteredProducts: TProduto[],
): TResultadoFacetas {
  const vendedores = new Map<string, number>();
  const condicoes = new Map<string, number>();
  const paises = new Map<string, number>();
  const faixaPreco = new Map<string, number>();

  for (const product of filteredProducts) {
    // Vendedor
    vendedores.set(
      product.vendedor,
      (vendedores.get(product.vendedor) || 0) + 1,
    );

    // Condição
    condicoes.set(product.condicao, (condicoes.get(product.condicao) || 0) + 1);

    // País
    paises.set(product.pais, (paises.get(product.pais) || 0) + 1);

    // Faixa de Preço
    const bucket = getPacotePrecos(product.precoCentavos);
    faixaPreco.set(bucket, (faixaPreco.get(bucket) || 0) + 1);
  }

  return { vendedores, condicoes, paises, faixaPreco };
}
