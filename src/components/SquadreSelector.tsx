import { FasceOrarieInput } from './FasceOrarieInput';
import { fasceIncomplete, minutiFasce, type Fasce } from '../utils/oreBollettino';

export interface RigaSquadra extends Fasce {
  /** Identità locale della riga. */
  uid: string;
  /** Testo dell'input, '' finché non si scrive. */
  numeroOperai: string;
  /**
   * La prima riga segue gli orari dell'intestazione finché non la si tocca:
   * nel caso più comune (tutti con gli stessi orari) non si riscrive nulla.
   */
  segueIntestazione: boolean;
}

let contatoreUid = 0;
export const nuovaRigaSquadra = (fasce: Fasce, segueIntestazione = false): RigaSquadra => ({
  uid: `squadra-${++contatoreUid}`,
  numeroOperai: '1',
  ...fasce,
  segueIntestazione,
});

export const operaiRiga = (r: RigaSquadra): number => {
  const n = parseInt(r.numeroOperai, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Ore-uomo della riga: operai per durata delle fasce. */
export const oreRigaSquadra = (r: RigaSquadra): number =>
  Math.round(((operaiRiga(r) * minutiFasce(r)) / 60) * 100) / 100;

/** Motivo per cui la riga non si puo' salvare, oppure null. */
export function problemaRiga(r: RigaSquadra): string | null {
  if (operaiRiga(r) === 0) return 'Indica il numero di operai.';
  if (fasceIncomplete(r)) return 'Completa inizio e fine della fascia.';
  if (minutiFasce(r) === 0) return 'Indica almeno una fascia oraria.';
  return null;
}

const MAX_RIGHE = 50;

interface Props {
  value: RigaSquadra[];
  onChange: (value: RigaSquadra[]) => void;
  /** Orari dell'intestazione: punto di partenza delle righe nuove. */
  fasceIntestazione: Fasce;
  disabled?: boolean;
}

const formatOre = (ore: number) => ore.toLocaleString('it-IT', { maximumFractionDigits: 2 });

/**
 * Operai del bollettino a gruppi: ogni riga e' un numero di operai con i
 * propri orari. Il "+" aggiunge una riga con gli orari dell'intestazione;
 * sotto, il totale delle ore.
 */
export function SquadreSelector({ value, onChange, fasceIntestazione, disabled = false }: Props) {
  const aggiorna = (uid: string, modifica: Partial<RigaSquadra>) => {
    onChange(
      value.map((r) => (r.uid === uid ? { ...r, ...modifica, segueIntestazione: false } : r))
    );
  };

  const totaleOre = value.reduce((s, r) => s + oreRigaSquadra(r), 0);
  const totaleOperai = value.reduce((s, r) => s + operaiRiga(r), 0);

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h3 className="font-medium text-gray-900 mb-3">Operai</h3>

      <div className="space-y-3">
        {value.map((riga, index) => {
          const problema = problemaRiga(riga);
          return (
            <div key={riga.uid} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-end gap-2 mb-3">
                <div className="w-32">
                  <label htmlFor={`${riga.uid}-operai`} className="label text-sm">N. operai</label>
                  <input
                    type="number"
                    id={`${riga.uid}-operai`}
                    inputMode="numeric"
                    min="1"
                    max="999"
                    className="input"
                    value={riga.numeroOperai}
                    onChange={(e) => aggiorna(riga.uid, { numeroOperai: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <span className="flex-1 text-sm text-gray-600 pb-2 text-right">
                  {formatOre(oreRigaSquadra(riga))} ore
                </span>
                {/* Almeno una riga resta sempre */}
                {value.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((r) => r.uid !== riga.uid))}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700 text-lg leading-none px-2 pb-2"
                    aria-label={`Rimuovi riga ${index + 1}`}
                    title="Rimuovi"
                  >
                    ×
                  </button>
                )}
              </div>
              <FasceOrarieInput
                idPrefix={riga.uid}
                value={riga}
                onChange={(fasce) => aggiorna(riga.uid, fasce)}
                disabled={disabled}
                compatto
              />
              {problema && <p className="mt-2 text-xs text-red-600">{problema}</p>}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange([...value, nuovaRigaSquadra(fasceIntestazione)])}
        disabled={disabled || value.length >= MAX_RIGHE}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:text-gray-400"
      >
        <span className="text-lg leading-none">+</span> Aggiungi operai con altri orari
      </button>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
        <span className="text-gray-600">Numero operai: {totaleOperai}</span>
        <span className="font-semibold text-gray-900">Totale Ore: {formatOre(totaleOre)}</span>
      </div>
    </div>
  );
}
