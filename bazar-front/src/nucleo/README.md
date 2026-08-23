Operação: Índice de Busca
Estrutura Escolhida: Map<string, Set<ID>>
Complexidade de Tempo: O(min(S1​,S2​)⋅K"
Complexidade de Espaço: O(N⋅T)
Alternativa Descartada e Por Quê: Array.includes dentro de loop (O(N2) e risco de IDs duplicados)

Operação: Autocompletar
Estrutura Escolhida: Trie (Prefix Tree)
Complexidade de Tempo: O(P) onde P é o prefixo
Complexidade de Espaço: O(Σ⋅L)
Alternativa Descartada e Por Quê: Array.filter(startsWith) por ser O(N) em cada tecla digitada.

Operação: Facetas
Estrutura Escolhida: Map em passada única
Complexidade de Tempo: O(N)
Complexidade de Espaço: O(F)
Alternativa Descartada e Por Quê: Múltiplos loops ou Object literal (risco de colisão/poluição de protótipo).

Operação: Ordenação Estável
Estrutura Escolhida: Multi-chave com localeCompare
Complexidade de Tempo: O(NlogN)
Complexidade de Espaço: O(N)
Alternativa Descartada e Por Quê: Array.sort com retorno 0 (instabilidade e "flicker" de ordem na UI).

Operação: Top-K (Mais Vistos)
Estrutura Escolhida: Min-Heap plano (tamanho K)
Complexidade de Tempo: O(NlogK)
Complexidade de Espaço: O(K)
Alternativa Descartada e Por Quê: Array.sort completo (O(NlogN)) por ordenar desnecessariamente 5.000 itens.

Operação: Cache de Resultados
Estrutura Escolhida: LRUCache com Map
Complexidade de Tempo: O(1) leitura e escrita
Complexidade de Espaço: O(C)
Alternativa Descartada e Por Quê: Objeto plano (não preserva ordem de inserção necessária para eviction O(1)).

Operação: Paginação
Estrutura Escolhida: Cursor pointer sobre slice
Complexidade de Tempo: O(N + L) onde L é o limit
Complexidade de Espaço: O(L)
Alternativa Descartada e Por Quê: Paginação por offset puro (risco de pular ou duplicar itens na transição de páginas).
