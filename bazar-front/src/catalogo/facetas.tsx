import type { TFiltrosSelecionados, TResultado } from '../utils/types';

type Props = {
  filtros: TFiltrosSelecionados;
  toggleFiltro: (tipo: keyof TFiltrosSelecionados, valor: string) => void;
  resultado: TResultado;
};

export default function Facetas({
  resultado,
  filtros,
  toggleFiltro,
}: Readonly<Props>) {
  if (!resultado.facets) return null;

  return (
    <aside style={{ width: '200px', marginRight: '24px' }}>
      <h4>Vendedores</h4>
      {Array.from(resultado.facets.vendedores.entries()).map(
        ([vendedor, count]) => {
          const isSelected = filtros.vendedor === vendedor;
          return (
            <button
              type="button"
              key={vendedor}
              onClick={() => toggleFiltro('vendedor', vendedor)}
              style={{
                display: 'block',
                margin: '4px 0',
                fontWeight: isSelected ? 'bold' : 'normal',
                background: isSelected ? '#333' : 'transparent',
                color: 'white',
                border: '1px solid #555',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                padding: '4px 8px',
              }}
            >
              {vendedor} ({count})
            </button>
          );
        },
      )}
      <h4>Países</h4>
      {Array.from(resultado.facets.paises.entries()).map(([pais, count]) => {
        const isSelected = filtros.pais === pais;
        return (
          <button
            type="button"
            key={pais}
            onClick={() => toggleFiltro('pais', pais)}
            style={{
              display: 'block',
              margin: '4px 0',
              fontWeight: isSelected ? 'bold' : 'normal',
              background: isSelected ? '#333' : 'transparent',
              color: 'white',
              border: '1px solid #555',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              padding: '4px 8px',
            }}
          >
            {pais} ({count})
          </button>
        );
      })}
      <h4>Condição</h4>
      {Array.from(resultado.facets.condicoes.entries()).map(
        ([condicao, count]) => {
          const isSelected = filtros.condicao === condicao;
          return (
            <button
              type="button"
              key={condicao}
              onClick={() => toggleFiltro('condicao', condicao)}
              style={{
                display: 'block',
                margin: '4px 0',
                fontWeight: isSelected ? 'bold' : 'normal',
                background: isSelected ? '#333' : 'transparent',
                color: 'white',
                border: '1px solid #555',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                padding: '4px 8px',
              }}
            >
              {condicao} ({count})
            </button>
          );
        },
      )}
      <h4>Faixa de Preço</h4>
      {Array.from(resultado.facets.faixaPreco.entries()).map(
        ([faixaPreco, count]) => {
          const isSelected = filtros.faixaPreco === faixaPreco;
          return (
            <button
              type="button"
              key={faixaPreco}
              onClick={() => toggleFiltro('faixaPreco', faixaPreco)}
              style={{
                display: 'block',
                margin: '4px 0',
                fontWeight: isSelected ? 'bold' : 'normal',
                background: isSelected ? '#333' : 'transparent',
                color: 'white',
                border: '1px solid #555',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                padding: '4px 8px',
              }}
            >
              {faixaPreco} ({count})
            </button>
          );
        },
      )}
    </aside>
  );
}
