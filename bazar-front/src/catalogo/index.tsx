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
    sugestoesAutocomplete,
    topMaisVistos,
    filtros,
    toggleFiltro,
    recarregar,
  } = useCatalogo({
    pageCursor: currentCursor || undefined,
  });

  useEffect(() => {
    resetPagination();
  }, [debouncedFilter, resetPagination]);

  const filterInput = () => (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '500px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          style={{
            border: '1px solid white',
            width: '100%',
            height: '40px',
            padding: '0 12px',
            background: '#111',
            color: '#fff',
            borderRadius: '4px',
          }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Digite para buscar..."
        />
        <button
          type="button"
          onClick={recarregar}
          style={{
            padding: '0 16px',
            cursor: 'pointer',
            background: '#333',
            color: '#fff',
            border: '1px solid #555',
          }}
        >
          Recarregar
        </button>
      </div>

      {/* Menu Suspenso Flutuante (Dropdown) */}
      {sugestoesAutocomplete && sugestoesAutocomplete.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '44px',
            left: 0,
            right: 0,
            background: '#222',
            border: '1px solid #444',
            borderRadius: '4px',
            listStyle: 'none',
            padding: '4px 0',
            margin: 0,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {sugestoesAutocomplete.map((sugestao) => (
            <li
              key={sugestao.termo}
              style={{
                borderBottom: '1px solid #333',
                listStyle: 'none',
              }}
            >
              <button
                type="button"
                onClick={() => setFilter(sugestao.termo)}
                style={{
                  all: 'unset',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 12px',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  color: '#eee',
                  textAlign: 'left',
                }}
              >
                <span>🔍 {sugestao.termo}</span>
                <small style={{ color: '#888' }}>
                  {sugestao.frequencia} views
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
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
        {/* 2. Destaques do Min-Heap (Top 5 Mais Vistos) */}
        <section
          style={{
            margin: '16px 0',
            borderBottom: '1px solid #444',
            paddingBottom: 16,
          }}
        >
          <h3>🔥 Mais Vistos do Catálogo</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {topMaisVistos.map((produto) => (
              <div
                key={produto.id}
                style={{ border: '1px solid #666', padding: 8, fontSize: 12 }}
              >
                {produto.titulo} — {produto.views} views
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
