interface Opzione<T> {
  valore: T;
  etichetta: string;
}

interface Props<T> {
  /** Domanda o titolo della scelta, es. "Ha fatto il pieno?". */
  label: string;
  /** Prefisso degli id dei radio, unico nella pagina. */
  name: string;
  opzioni: Opzione<T>[];
  /** null finché non si sceglie. */
  value: T | null;
  onChange: (valore: T) => void;
  disabled?: boolean;
}

/**
 * Scelta fra poche opzioni a pulsanti affiancati (Sì / No, Aperto /
 * Fatturato). Sotto ci sono dei radio veri: tastiera e lettori di schermo li
 * trattano come un gruppo, e da telefono il bersaglio è tutto il pulsante.
 */
export function SceltaOpzioni<T extends string | boolean>({
  label,
  name,
  opzioni,
  value,
  onChange,
  disabled,
}: Props<T>) {
  return (
    <fieldset disabled={disabled}>
      <legend className="font-medium text-gray-900 mb-2">{label}</legend>
      <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
        {opzioni.map((o, i) => {
          const scelto = value === o.valore;
          return (
            <label
              key={String(o.valore)}
              className={`px-5 py-2 text-sm font-medium cursor-pointer select-none focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 ${
                i > 0 ? 'border-l border-gray-300' : ''
              } ${scelto ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} ${
                disabled ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={scelto}
                onChange={() => onChange(o.valore)}
              />
              {o.etichetta}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// No a sinistra: Sì apre la parte da compilare
export const OPZIONI_NO_SI = [
  { valore: false, etichetta: 'No' },
  { valore: true, etichetta: 'Sì' },
];

export const OPZIONI_STATO = [
  { valore: false, etichetta: 'Aperto' },
  { valore: true, etichetta: 'Fatturato' },
];
