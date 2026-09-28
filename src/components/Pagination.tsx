import { useEffect, useState } from 'react';

/**
 * Divide una lista già caricata in pagine lato client.
 * La pagina torna alla prima quando cambia `resetKey` (filtri, mese); se la
 * lista si accorcia (es. dopo un'eliminazione) resta sull'ultima pagina valida.
 */
export function usePagination<T>(items: T[], pageSize: number, resetKey?: unknown) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    page: currentPage,
    setPage,
    totalPages,
    pageItems: items.slice(start, start + pageSize),
    start,
  };
}

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, totalItems, pageSize, onChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 ${className}`}>
      <p className="text-sm text-gray-600">
        {from}–{to} di {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(1)}
          disabled={page === 1}
          className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Prima pagina"
        >
          «
        </button>
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ‹ Prec.
        </button>
        <span className="px-3 py-1 text-sm text-gray-700 whitespace-nowrap">
          Pagina {page} di {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Succ. ›
        </button>
        <button
          type="button"
          onClick={() => onChange(totalPages)}
          disabled={page === totalPages}
          className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Ultima pagina"
        >
          »
        </button>
      </div>
    </div>
  );
}
