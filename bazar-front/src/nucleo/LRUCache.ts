import type { LRUCache } from '../utils/types';

/**
 * Cria um Cache LRU (Least Recently Used) funcional baseado em Map.
 * Complexidade: O(1) para leitura, escrita e despejo.
 */
export function createLRUCache<K, V>(capacity: number): LRUCache<K, V> {
  const store = new Map<K, V>();

  return {
    get(key: K): V | undefined {
      const value = store.get(key);
      if (value === undefined) return undefined;

      // Rejuvenesce a chave: remove e insere no final (mais recente)
      store.delete(key);
      store.set(key, value);
      return value;
    },

    set(key: K, value: V): void {
      if (store.has(key)) {
        store.delete(key);
      } else if (store.size >= capacity) {
        // Remove a chave mais antiga (primeira da iteração)
        const oldestKey = store.keys().next().value;
        if (oldestKey !== undefined) {
          store.delete(oldestKey);
        }
      }
      store.set(key, value);
    },

    has(key: K): boolean {
      return store.has(key);
    },

    size(): number {
      return store.size;
    },

    clear(): void {
      store.clear();
    },
  };
}
