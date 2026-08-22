export type TProduto = {
  id: string;
  titulo: string;
  precoCentavos: number;
  vendedor: string;
  condicao: string;
  pais: string;
  categoria: string;
  estoque: number;
  createdAt: string;
  views: number;
};

export type TResponseProduto = {
  data: TProduto[];
  paging: {
    limit: number;
    next_cursor: string | null;
    has_more: boolean;
  };
};

export type TInvertedIndex = Map<string, Set<string | number>>;

export interface TSugestao {
  termo: string;
  frequencia: number;
}

export class TTrieNode {
  children: Map<string, TTrieNode> = new Map();
  isEndOfWord: boolean = false;
  topSuggestions: TSugestao[] = [];
}

export interface TResultadoFacetas {
  vendedores: Map<string, number>;
  condicoes: Map<string, number>;
  paises: Map<string, number>;
  faixaPreco: Map<string, number>;
}

export interface TCriterioOrdenacao {
  relevanceScoreMap?: Map<string | number, number>;
  order: 'asc' | 'desc';
}

export interface LRUCache<K, V> {
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => void;
  has: (key: K) => boolean;
  size: () => number;
  clear: () => void;
}

export interface TResultadoPaginado<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}
