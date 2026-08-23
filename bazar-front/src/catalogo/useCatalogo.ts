import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  TFiltrosSelecionados,
  TInvertedIndex,
  TProduto,
} from '../utils/types';
import { getCatalogoTodosProdutos } from '../rede/catalogo';
import { buscarIntersecao, construirIndice } from '../nucleo/indiceInvertido';
import { contadorDeFacetas } from '../nucleo/facetas';
import { sortProductsMultiKey } from '../nucleo/ordenacao';
import { paginateByCursor } from '../nucleo/paginacaoCursor';
import { useDebounce } from './useDebounce';
import { getInitialQueryFromURL } from './useSyncQueryParam';
type TProps = {
  pageCursor?: string;
};
export default function useCatalogo(urlParams: TProps) {
  // Estado imediato: atualiza a cada tecla para o usuário não sentir lag no teclado
  const [filter, setFilter] = useState(getInitialQueryFromURL);

  const [lista, setLista] = useState<TProduto[]>();
  const [filtros, setFiltros] = useState<TFiltrosSelecionados>({});

  // Estado atrasado: só atualiza 250ms depois que a pessoa parar de digitar
  const debouncedFilter = useDebounce(filter, 250);

  const getTodoCatalogo = useCallback(async (): Promise<TProduto[]> => {
    const auxData = await getCatalogoTodosProdutos();
    return auxData.data;
  }, []);

  useEffect(() => {
    getTodoCatalogo().then((response) => {
      setLista(response);
    });
  }, [getTodoCatalogo]);

  // Função auxiliar para alternar um filtro (clicar marca, clicar de novo desmarca)
  const toggleFiltro = useCallback(
    (tipo: keyof TFiltrosSelecionados, valor: string) => {
      setFiltros((prev) => {
        const atual = prev[tipo];
        if (atual === valor) {
          // Se já estava selecionado, desmarca
          const novo = { ...prev };
          delete novo[tipo];
          return novo;
        }
        // Caso contrário, define o novo valor
        return { ...prev, [tipo]: valor };
      });
    },
    [],
  );

  const listaIndexada = useMemo(() => {
    if (!lista) return;
    return construirIndice(lista);
  }, [lista]);

  const resultado = useMemo(() => {
    if (!lista) {
      return {
        items: [],
        facets: null,
        nextCursor: null,
        hasMore: false,
        totalCount: 0,
        status: 'loading',
      };
    }
    if (lista?.length === 0)
      return {
        items: [],
        facets: null,
        nextCursor: null,
        hasMore: false,
        totalCount: 0,
        status: 'empty_catalog',
      };

    // A. Reduzir a massa de dados primeiro (Fase 2: Busca por Interseção)
    const queryTrimmed = debouncedFilter?.trim() || '';

    let filtered = lista;
    // Só aciona o índice invertido se houver termo digitado
    if (queryTrimmed.length > 0) {
      const matchedIds = buscarIntersecao(
        queryTrimmed,
        listaIndexada as TInvertedIndex,
      );
      filtered = lista.filter((p) => matchedIds.has(p.id));
    }

    if (filtros.vendedor) {
      filtered = filtered.filter((p) => p.vendedor === filtros.vendedor);
    }

    if (filtros.pais) {
      filtered = filtered.filter((p) => p.pais === filtros.pais);
    }

    if (filtros.condicao) {
      filtered = filtered.filter((p) => p.condicao === filtros.condicao);
    }

    // Se filtered for vazio porque a busca não achou nada:
    if (filtered.length === 0) {
      return {
        items: [],
        facets: contadorDeFacetas([]),
        nextCursor: null,
        hasMore: false,
        totalCount: 0,
        status: 'no_results',
      };
    }

    // B. Contar as opções disponíveis sobre o que sobrou (Fase 2: Facetas)
    const facets = contadorDeFacetas(filtered);

    // C. Ordenar apenas os itens válidos (Fase 2: Ordenação Estável)
    // verificar os outros 2 funções e validar performance
    const sorted = sortProductsMultiKey(filtered);

    // D. Fatiar apenas os 10 itens da página atual (Fase 2: Paginação por Cursor)
    const paginated = paginateByCursor(sorted, 10, urlParams.pageCursor);

    return {
      items: paginated.items,
      facets,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
      totalCount: paginated.totalCount,
      status: 'success',
    };
  }, [lista, listaIndexada, urlParams, debouncedFilter, filtros]);

  return {
    resultado,
    filter,
    setFilter,
    debouncedFilter,
    filtros,
    toggleFiltro,
  };
}
