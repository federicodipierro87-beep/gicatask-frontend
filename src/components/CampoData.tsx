import { useRef } from 'react';

interface CampoDataProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

/**
 * Campo data che si lascia sia digitare sia scegliere dal calendario.
 *
 * `index.css` nasconde l'icona nativa su tutti gli input date, quindi senza
 * un'icona propria il calendario non sarebbe raggiungibile col mouse. Il
 * picker si apre solo dal bottone e non da un onClick sull'input: aprirlo a
 * ogni click sul campo, come fa DateTimeInput, impedirebbe di posizionare il
 * cursore per scrivere la data a mano.
 */
export function CampoData({ id, label, value, onChange, required = false, className }: CampoDataProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const apriCalendario = () => {
    inputRef.current?.focus();
    // showPicker manca sui browser piu' vecchi: li' resta la digitazione
    inputRef.current?.showPicker?.();
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="date"
          className="input pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
        <button
          type="button"
          onClick={apriCalendario}
          // Fuori dal giro di TAB: si tabula fra i campi, non fra le icone
          tabIndex={-1}
          aria-label={`Apri il calendario: ${label}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
