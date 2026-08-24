import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TFiltrosSelecionados, TProduto } from '../utils/types';
import { getCatalogoTodosProdutos } from '../rede/catalogo';
import {
  buscarIntersecao,
  construirIndice,
  normalizar,
} from '../nucleo/indiceInvertido';
import { contarFaixasPreco, contarPor } from '../nucleo/facetas';
import { sortProductsMultiKey } from '../nucleo/ordenacao';
import { paginateByCursor } from '../nucleo/paginacaoCursor';
import { useDebounce } from './useDebounce';
import { getInitialQueryFromURL } from './useSyncQueryParam';
import { createLRUCache } from '../nucleo/LRUCache';
import { autocompleteTrie, createTrieNode, insertTrie } from '../nucleo/trie';
import { getTopKMostViewed } from '../nucleo/minHeap';
type TProps = {
  pageCursor?: string;
};
export default function useCatalogo(urlParams: TProps) {
  const { pageCursor } = urlParams;

  // Estado imediato: atualiza a cada tecla para o usuário não sentir lag no teclado
  const [filter, setFilter] = useState(getInitialQueryFromURL);

  const [triggerRecarregar, setTriggerRecarregar] = useState(0);
  const [lista, setLista] = useState<TProduto[]>();
  const [filtros, setFiltros] = useState<TFiltrosSelecionados>({});
  const [statusRede, setStatusRede] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );

  // Estado atrasado: só atualiza 250ms depois que a pessoa parar de digitar
  const debouncedFilter = useDebounce(filter, 250);

  const recarregar = useCallback(() => {
    setStatusRede('loading');
    setTriggerRecarregar((prev) => prev + 1);
  }, []);

  const getTodoCatalogo = useCallback(async (): Promise<TProduto[]> => {
    const auxData = await getCatalogoTodosProdutos();
    return auxData.data;
  }, []);

  useEffect(() => {
    // A regra desencoraja setState em efeito por causa de cascata de render. Aqui o
    // setState está dentro do .then/.catch, não no corpo — é falso positivo da análise,
    // que sinaliza qualquer setState alcançável a partir do efeito.
    // A alternativa oficial do React seria framework (Next/Remix) ou lib de dados
    // (TanStack Query, SWR), ambos proibidos pelo enunciado da F01, cujo objetivo é
    // justamente construir essa camada à mão.

    getTodoCatalogo()
      .then((response) => {
        setStatusRede('idle');
        setLista(response);
      })
      .catch(() => {
        setStatusRede('error');
      });
  }, [getTodoCatalogo, triggerRecarregar]);

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

  // Cache LRU invalidado quando 'lista' muda
  const searchCache = useMemo(() => {
    return createLRUCache<string, Set<string | number>>(50);
  }, [lista]);

  // Trie populada por tokens com contagem de frequência no catálogo
  const trieRoot = useMemo(() => {
    if (!lista || lista.length === 0) return null;

    const contagemTokens = new Map<string, number>();

    for (const item of lista) {
      const tokens = normalizar(item.titulo);
      const tokensUnicos = new Set(tokens);
      for (const token of tokensUnicos) {
        contagemTokens.set(token, (contagemTokens.get(token) || 0) + 1);
      }
    }

    const root = createTrieNode();
    for (const [token, freq] of contagemTokens.entries()) {
      insertTrie(root, token, freq);
    }

    return root;
  }, [lista]);

  // Autocomplete instantâneo a cada tecla
  const sugestoesAutocomplete = useMemo(() => {
    const termo = filter.trim().toLowerCase();
    if (!trieRoot || termo.length === 0) return [];
    return autocompleteTrie(trieRoot, termo);
  }, [trieRoot, filter]);

  // Top 5 produtos mais vistos do catálogo geral
  const topMaisVistos = useMemo(() => {
    if (!lista || lista.length === 0) return [];
    return getTopKMostViewed(lista, 5);
  }, [lista]);

  const resultado = useMemo(() => {
    if (statusRede === 'error') {
      return {
        items: [],
        facets: null,
        nextCursor: null,
        hasMore: false,
        totalCount: 0,
        status: 'error' as const,
      };
    }

    if (statusRede === 'loading' || !lista) {
      return {
        items: [],
        facets: null,
        nextCursor: null,
        hasMore: false,
        totalCount: 0,
        status: 'loading' as const,
      };
    }

    if (lista.length === 0) {
      return {
        items: [],
        facets: null,
        nextCursor: null,
        hasMore: false,
        totalCount: 0,
        status: 'empty_catalog' as const,
      };
    }

    // A. Reduzir a massa de dados primeiro (Fase 2: Busca por Interseção)
    const queryTrimmed = debouncedFilter?.trim() || '';

    // Base apenas com o termo de busca textual
    let baseTextual = lista;
    if (queryTrimmed.length > 0 && listaIndexada) {
      let matchedIds = searchCache.get(queryTrimmed);

      if (!matchedIds) {
        // Cache miss: calcula no índice invertido e salva no cache
        matchedIds = buscarIntersecao(queryTrimmed, listaIndexada);
        searchCache.set(queryTrimmed, matchedIds);
      }
      baseTextual = lista.filter((p) => matchedIds.has(p.id));
    }

    // 1. Base para contar vendedores (aplica tudo, EXCETO o filtro de vendedor)
    const baseParaVendedores = baseTextual.filter((p) => {
      if (filtros.condicao && p.condicao !== filtros.condicao) return false;
      if (filtros.pais && p.pais !== filtros.pais) return false;
      return true;
    });

    // 2. Base para contar condições (aplica tudo, EXCETO o filtro de condição)
    const baseParaCondicoes = baseTextual.filter((p) => {
      if (filtros.vendedor && p.vendedor !== filtros.vendedor) return false;
      if (filtros.pais && p.pais !== filtros.pais) return false;
      return true;
    });

    const baseParaPaises = baseTextual.filter((p) => {
      if (filtros.vendedor && p.vendedor !== filtros.vendedor) return false;
      if (filtros.condicao && p.condicao !== filtros.condicao) return false;
      return true;
    });

    // 3. Base final para a listagem na tela (aplica TODOS os filtros)
    const filtered = baseTextual.filter((p) => {
      if (filtros.vendedor && p.vendedor !== filtros.vendedor) return false;
      if (filtros.condicao && p.condicao !== filtros.condicao) return false;
      if (filtros.pais && p.pais !== filtros.pais) return false;
      return true;
    });

    // Extrai as facetas das bases corretas
    const facets = {
      vendedores: contarPor(baseParaVendedores, 'vendedor'),
      condicoes: contarPor(baseParaCondicoes, 'condicao'),
      paises: contarPor(baseParaPaises, 'pais'),
      faixaPreco: contarFaixasPreco(filtered),
    };

    if (filtered.length === 0) {
      return {
        items: [],
        facets,
        nextCursor: null,
        hasMore: false,
        totalCount: 0,
        status: 'no_results' as const,
      };
    }
    // C. Ordenar apenas os itens válidos (Fase 2: Ordenação Estável)
    // verificar os outros 2 funções e validar performance
    const sorted = sortProductsMultiKey(filtered);

    // Mapa ID -> Posição para busca de cursor em O(1)
    const posIndex = new Map<string | number, number>();
    sorted.forEach((item, idx) => posIndex.set(item.id, idx));

    // D. Fatiar apenas os 10 itens da página atual (Fase 2: Paginação por Cursor)
    const paginated = paginateByCursor(sorted, 10, pageCursor, posIndex);

    return {
      items: paginated.items,
      facets,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
      totalCount: paginated.totalCount,
      status: 'success' as const,
    };
  }, [
    lista,
    listaIndexada,
    pageCursor,
    debouncedFilter,
    filtros,
    statusRede,
    searchCache,
  ]);

  return {
    resultado,
    filter,
    setFilter,
    debouncedFilter,
    sugestoesAutocomplete,
    topMaisVistos,
    filtros,
    toggleFiltro,
    recarregar,
  };
}
