import { useEffect, useState } from 'react';

/**
 * Hook de debounce puro sem bibliotecas externas.
 * Complexidade: O(1).
 */
export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 1. Agenda a atualização do valor para daqui a 250ms
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 2. FUNÇÃO DE LIMPEZA (Cleanup):
    // Se 'value' mudar antes de 250ms OU se o componente for desmontado,
    // o timer anterior é cancelado imediatamente.
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
