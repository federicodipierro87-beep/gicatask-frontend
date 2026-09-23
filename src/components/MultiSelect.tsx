import { useEffect, useRef, useState } from 'react';

interface Option {
  id: number;
  label: string;
}

interface Props {
  options: Option[];
  value: number[];
  onChange: (ids: number[]) => void;
  /** Testo del pulsante a selezione vuota, es. "Tutti i dipendenti". */
  placeholder: string;
  disabled?: boolean;
}

// Oltre questa soglia compare la casella di ricerca: su elenchi lunghi come
// utenti o mezzi scorrere a mano da telefono e' scomodo
const SOGLIA_RICERCA = 8;

// `input` e non `select`: la classe `select` disegna già una freccia come
// immagine di sfondo, e qui la freccia è un elemento vero accanto al riassunto
const PULSANTE_CLASS = 'input bg-white text-left flex items-center justify-between gap-2';

/**
 * Selezione multipla a caselle di spunta.
 *
 * Un `<select multiple>` nativo sarebbe costato zero, ma su un elenco di una
 * ventina di voci obbliga al Ctrl+click e perde tutta la selezione al primo
 * click sbagliato: per una pagina il cui unico scopo è scegliere chi stampare
 * è il punto sbagliato dove risparmiare.
 */
export function MultiSelect({ options, value, onChange, placeholder, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [ricerca, setRicerca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Nel progetto non c'è un pattern di popover da riusare, quindi la chiusura
  // al click fuori e con Escape sta tutta qui
  useEffect(() => {
    if (!isOpen) {
      setRicerca('');
      return;
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggle = (id: number) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const tutti = options.length > 0 && value.length === options.length;

  const filtro = ricerca.trim().toLocaleLowerCase('it');
  const visibili = filtro
    ? options.filter((o) => o.label.toLocaleLowerCase('it').includes(filtro))
    : options;

  const riassunto =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((o) => o.id === value[0])?.label ?? `${value.length} selezionati`
        : `${value.length} selezionati`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={PULSANTE_CLASS}
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
      >
        <span className={`truncate ${value.length === 0 ? 'text-gray-500' : ''}`}>
          {riassunto}
        </span>
        <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {options.length > SOGLIA_RICERCA && (
            <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
              <input
                type="search"
                className="input py-1.5 text-sm"
                placeholder="Cerca..."
                aria-label="Cerca"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                autoFocus
              />
            </div>
          )}
          {!filtro && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm font-medium text-primary-600 hover:bg-gray-50 border-b border-gray-100"
              onClick={() => onChange(tutti ? [] : options.map((o) => o.id))}
            >
              {tutti ? 'Deseleziona' : 'Seleziona tutti'}
            </button>
          )}
          {visibili.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">Nessuna voce</p>
          ) : (
            visibili.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={value.includes(option.id)}
                  onChange={() => toggle(option.id)}
                />
                <span className="truncate">{option.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
