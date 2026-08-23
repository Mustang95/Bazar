import { useEffect } from 'react';

export function getInitialQueryFromURL(): string {
  const url = new URL(window.location.href);
  return url.searchParams.get('q') || '';
}
export function useSyncQueryToURL(debouncedText: string) {
  useEffect(() => {
    const url = new URL(window.location.href);

    if (debouncedText.trim()) {
      // Se tem texto, coloca ?q=termo
      url.searchParams.set('q', debouncedText.trim());
    } else {
      // Se apagou tudo, remove o ?q da URL
      url.searchParams.delete('q');
    }

    // Atualiza a barra de endereço sem dar refresh na página
    window.history.replaceState(null, '', url.toString());
  }, [debouncedText]);
}
