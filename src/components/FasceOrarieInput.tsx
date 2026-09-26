import { DateTimeInput } from './DateTimeInput';
import type { Fasce } from '../utils/oreBollettino';

const isOvernight = (start: string, end: string) => Boolean(start && end && end < start);

interface Props {
  /** Prefisso degli id degli input: la pagina puo' avere piu' righe di fasce. */
  idPrefix: string;
  value: Fasce;
  onChange: (value: Fasce) => void;
  disabled?: boolean;
  /** Versione compatta per le righe degli operai: niente riquadri. */
  compatto?: boolean;
}

/**
 * Fasce Mattino e Pomeriggio con inizio e fine, come nel form delle attivita'
 * (stessi orari proposti al primo click: 06:00 e 13:00).
 */
export function FasceOrarieInput({ idPrefix, value, onChange, disabled, compatto = false }: Props) {
  const set = (campo: keyof Fasce) => (v: string) => onChange({ ...value, [campo]: v });

  const fascia = (
    titolo: string,
    inizio: keyof Fasce,
    fine: keyof Fasce,
    defaultTime: string
  ) => (
    <div className={compatto ? '' : 'border border-gray-200 rounded-lg p-4'}>
      <span className={compatto ? 'block text-sm font-medium text-gray-700 mb-1' : 'label mb-3'}>
        {titolo}
        {!compatto && <span className="text-gray-400 font-normal"> (opzionale)</span>}
      </span>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div>
          <label htmlFor={`${idPrefix}-${inizio}`} className="label text-sm">Inizio</label>
          <DateTimeInput
            type="time"
            id={`${idPrefix}-${inizio}`}
            className="input"
            value={value[inizio]}
            onChange={set(inizio)}
            defaultTime={defaultTime}
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-${fine}`} className="label text-sm">Fine</label>
          <DateTimeInput
            type="time"
            id={`${idPrefix}-${fine}`}
            className="input"
            value={value[fine]}
            onChange={set(fine)}
            defaultTime={defaultTime}
            disabled={disabled}
          />
        </div>
      </div>
      {isOvernight(value[inizio], value[fine]) && (
        <p className="text-sm text-gray-500 mt-2">
          Il turno termina il giorno successivo. Le ore restano conteggiate su questa data.
        </p>
      )}
    </div>
  );

  return (
    <div className={compatto ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-5'}>
      {fascia('Mattino', 'oraInizioMattino', 'oraFineMattino', '06:00')}
      {fascia('Pomeriggio', 'oraInizioPomeriggio', 'oraFinePomeriggio', '13:00')}
    </div>
  );
}
