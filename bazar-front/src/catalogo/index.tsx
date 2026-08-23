import { useEffect } from 'react';
import Paginacao from './paginacao';
import useCatalogo from './useCatalogo';
import { usePaginationCursor } from './usePaginacaoPorCursor';
import Facetas from './facetas';

export default function Catalogo() {
  const {
    currentCursor,
    pageNumber,
    hasPrev,
    nextPage,
    prevPage,
    resetPagination,
  } = usePaginationCursor();

  // Regra de integridade: se o usuário mudar a busca, reseta para a página 1

  const {
    resultado,
    filter,
    setFilter,
    debouncedFilter,
    filtros,
    toggleFiltro,
  } = useCatalogo({
    pageCursor: currentCursor || undefined,
  });

  useEffect(() => {
    resetPagination();
  }, [debouncedFilter, resetPagination]);

  const filterInput = () => (
    <div>
      <input
        type="text"
        style={{
          border: '1px solid white',
          width: '70%',
          height: '48px',
        }}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Digite para buscar..."
      />
      {/* Aqui você vê a diferença acontecendo ao vivo */}
      <p>Texto instantâneo: {filter}</p>
      <p>Texto com atraso (debounced): {debouncedFilter}</p>
    </div>
  );
  const listagem = () => {
    return resultado.items?.map((produto) => (
      <div
        key={produto.id}
        style={{
          margin: '0.5rem',
          padding: '0.5rem',
          width: 120,
          height: 180,
          color: 'red',
          border: '1px solid white',
        }}
      >
        <div>{produto.titulo}</div>
        <div>{produto.precoCentavos}</div>
      </div>
    ));
  };

  return (
    <div
      style={{
        display: 'flex',
        margin: 'auto',
      }}
    >
      <div>
        <Facetas
          filtros={filtros}
          resultado={resultado}
          toggleFiltro={toggleFiltro}
        />
      </div>
      <div>
        <div
          style={{
            position: 'static',
            top: 0,
          }}
        >
          {filterInput()}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {/* Estados da UI */}
          {resultado.status === 'loading' && <p>Carregando produtos...</p>}
          {resultado.status === 'empty_catalog' && (
            <p>Nenhum produto cadastrado.</p>
          )}
          {resultado.status === 'no_results' && (
            <p>Nenhum resultado para "{filter}". Tente outro termo.</p>
          )}
          {resultado.status === 'success' && listagem()}
        </div>
        <Paginacao
          currentCursor={currentCursor}
          pageNumber={pageNumber}
          hasPrev={hasPrev}
          nextPage={nextPage}
          prevPage={prevPage}
          resultado={resultado}
        />
      </div>
    </div>
  );
}
