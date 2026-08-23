import type { TProduto } from '../../utils/types';

const BASE_MS = Date.UTC(2026, 7, 8);
const UM_DIA = 86_400_000;

const VENDEDORES = ['Sebo do Zé', 'Antiquário Lima', 'Garagem 47'];
const CONDICOES = ['Novo', 'Usado', 'Restaurado'];
const PAISES = ['BR', 'PT', 'AR'];
const CATEGORIAS = ['Livros', 'Moveis', 'Eletronicos', 'Roupas', 'Decoracao'];

/**
 * Gera produtos determinísticos para teste — sem PRNG, só aritmética modular.
 * Duas execuções produzem exatamente a mesma lista.
 *
 * Os EMPATES são de propósito, e é neles que moram os bugs:
 *   - views: 3 valores altos únicos + um grupo grande empatado em 6000.
 *     Com k=10, o top-K precisa escolher 10 entre ~28 itens empatados —
 *     sem desempate por id, o resultado depende da ordem de entrada.
 *   - precoCentavos e createdAtMs também repetem, para exercitar a cascata
 *     de critérios da ordenação multi-chave.
 */
export function gerarProdutos(qtd: number): TProduto[] {
  return Array.from({ length: qtd }, (_, i) => {
    // 3 valores altos e únicos, o resto em grupos empatados de 0 a 6000
    const views = i < 3 ? 100_000 + i * 1_000 : (i % 7) * 1_000;
    const criadoEm = BASE_MS - (i % 11) * UM_DIA;

    return {
      id: `prd_${String(i).padStart(5, '0')}`,
      titulo: `Produto ${i}`,
      precoCentavos: 1_000 + (i % 5) * 1_000,
      vendedor: VENDEDORES[i % VENDEDORES.length],
      condicao: CONDICOES[i % CONDICOES.length],
      pais: PAISES[i % PAISES.length],
      categoria: CATEGORIAS[i % CATEGORIAS.length],
      estoque: i % 4,
      createdAt: new Date(criadoEm).toISOString(),
      createdAtMs: criadoEm,
      views,
    };
  });
}

/**
 * Embaralha com Mulberry32 — o mesmo PRNG do bazar-mock-server.
 *
 * Por que semeado e não Math.random: o teste precisa de duas ordens DIFERENTES
 * (senão não prova nada) mas REPRODUTÍVEIS (senão falha de forma intermitente e
 * você não consegue depurar). Seeds diferentes dão ordens diferentes; a mesma
 * seed dá sempre a mesma ordem.
 *
 * Não muta a entrada.
 */
export function embaralhar(produtos: TProduto[], seed = 1): TProduto[] {
  let estado = seed;
  const proximo = () => {
    let t = (estado += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Fisher-Yates: percorre de trás para frente trocando com uma posição
  // sorteada entre 0 e i. Distribuição uniforme, O(n).
  const copia = [...produtos];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(proximo() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
