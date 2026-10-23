import { useEffect, useRef, useState } from 'react';

interface Props {
  id: string;
  value: string;
  onChange: (valore: string) => void;
  /** Voci proposte, per esempio i nomi dei clienti in anagrafica. */
  opzioni: string[];
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

const MAX_SUGGERIMENTI = 8;

const normalizza = (valore: string) => valore.replace(/\s+/g, ' ').trim().toLocaleLowerCase('it');

/**
 * Campo di testo libero con i suggerimenti sotto, filtrati da quello che si
 * scrive: prima le voci che iniziano col testo, poi quelle che lo contengono.
 *
 * Non un `<datalist>`: da telefono molti browser non lo mostrano affatto, o
 * solo dopo aver toccato una freccia che nessuno nota.
 */
export function CampoSuggerimenti({
  id,
  value,
  onChange,
  opzioni,
  placeholder,
  maxLength,
  disabled,
}: Props) {
  const [aperto, setAperto] = useState(false);
  const [evidenziato, setEvidenziato] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aperto) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setAperto(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [aperto]);

  const filtro = normalizza(value);
  const suggerimenti = filtro
    ? [
        ...opzioni.filter((o) => normalizza(o).startsWith(filtro)),
        ...opzioni.filter((o) => !normalizza(o).startsWith(filtro) && normalizza(o).includes(filtro)),
      ].slice(0, MAX_SUGGERIMENTI)
    : [];
  // Scritto per intero: il menu non ha piu' niente da proporre
  const giaScelto = suggerimenti.length === 1 && normalizza(suggerimenti[0]!) === filtro;
  const visibile = aperto && suggerimenti.length > 0 && !giaScelto;

  const scegli = (valore: string) => {
    onChange(valore);
    setAperto(false);
    setEvidenziato(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visibile) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setEvidenziato((i) => (i + 1) % suggerimenti.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setEvidenziato((i) => (i <= 0 ? suggerimenti.length - 1 : i - 1));
    } else if (e.key === 'Enter' && evidenziato >= 0) {
      // Senza, Invio sceglierebbe la voce e invierebbe anche il form
      e.preventDefault();
      scegli(suggerimenti[evidenziato]!);
    } else if (e.key === 'Escape') {
      setAperto(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        id={id}
        className="input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setAperto(true);
          setEvidenziato(-1);
        }}
        onFocus={() => setAperto(true)}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={visibile}
        aria-controls={`${id}-suggerimenti`}
        aria-autocomplete="list"
        disabled={disabled}
      />
      {visibile && (
        <ul
          id={`${id}-suggerimenti`}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {suggerimenti.map((s, i) => (
            <li
              key={`${i}-${s}`}
              role="option"
              aria-selected={i === evidenziato}
              // preventDefault sul mousedown: il campo non perde il fuoco
              onMouseDown={(e) => {
                e.preventDefault();
                scegli(s);
              }}
              className={`px-3 py-2 text-sm text-gray-700 cursor-pointer ${
                i === evidenziato ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
