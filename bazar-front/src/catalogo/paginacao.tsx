import type { TResultado } from '../utils/types';

type Props = {
  currentCursor: string | null;
  pageNumber: number;
  hasPrev: boolean;
  nextPage: (nextCursor: string | null | undefined) => void;
  prevPage: () => void;
  resultado: TResultado;
};

export default function Paginacao({
  resultado,
  pageNumber,
  hasPrev,
  nextPage,
  prevPage,
}: Readonly<Props>) {
  return (
    <footer
      style={{
        display: 'flex',
        gap: '12px',
        marginTop: '3rem',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button type="button" onClick={prevPage} disabled={!hasPrev}>
        Anterior
      </button>

      <span>Página {pageNumber}</span>

      <button
        type="button"
        onClick={() => nextPage(resultado.nextCursor)}
        disabled={!resultado.hasMore}
      >
        Próxima
      </button>
    </footer>
  );
}
