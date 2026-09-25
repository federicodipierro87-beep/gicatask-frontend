import type { User } from '../types';
import { nomeUtente } from '../utils/nomeUtente';

export interface RigaCollaboratore {
  /** Identità locale della riga: una riga nuova non ha ancora un utente. */
  uid: string;
  utenteId: number | null;
  /** Testo dell'input: '' finché non si scrive, per non mostrare uno 0. */
  ore: string;
}

// Contatore di modulo, come per le righe degli altri selettori: una chiave
// derivata dall'utente cambierebbe al cambio di selezione e React smonterebbe
// la riga mentre la si modifica.
let contatoreUid = 0;
export const nuovaRigaCollaboratore = (utenteId: number | null = null): RigaCollaboratore => ({
  uid: `collab-${++contatoreUid}`,
  utenteId,
  ore: '',
});

export const oreRiga = (riga: RigaCollaboratore): number => {
  const valore = parseFloat(riga.ore.replace(',', '.'));
  return Number.isFinite(valore) && valore > 0 ? valore : 0;
};

/** Ore scritte in una riga senza collaboratore: non si possono salvare. */
export const rigaIncompleta = (riga: RigaCollaboratore): boolean =>
  riga.utenteId === null && oreRiga(riga) > 0;

// Il backend accetta al massimo 24 ore a testa e 200 collaboratori
const MAX_RIGHE = 200;

interface Props {
  utenti: User[];
  value: RigaCollaboratore[];
  onChange: (value: RigaCollaboratore[]) => void;
  disabled?: boolean;
}

/**
 * Collaboratori del bollettino: una riga per persona, ognuna con la sua
 * tendina e le sue ore. Il "+" aggiunge una riga uguale; sotto, il totale.
 */
export function CollaboratoriSelector({ utenti, value, onChange, disabled = false }: Props) {
  const aggiorna = (uid: string, modifica: Partial<RigaCollaboratore>) => {
    onChange(value.map((r) => (r.uid === uid ? { ...r, ...modifica } : r)));
  };

  const totale = value.reduce((s, r) => s + (r.utenteId !== null ? oreRiga(r) : 0), 0);
  const numeroOperai = value.filter((r) => r.utenteId !== null).length;

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h3 className="font-medium text-gray-900 mb-3">Collaboratori</h3>

      <div className="space-y-2">
        {value.map((riga) => {
          // Chi e' gia' in un'altra riga non si puo' scegliere due volte
          const altrove = new Set(
            value.filter((r) => r.uid !== riga.uid).map((r) => r.utenteId)
          );
          const opzioni = utenti.filter((u) => !altrove.has(u.id));

          return (
            <div key={riga.uid}>
              <div className="flex items-center gap-2">
                <select
                  className="input flex-1 min-w-0"
                  aria-label="Collaboratore"
                  value={riga.utenteId ?? ''}
                  onChange={(e) =>
                    aggiorna(riga.uid, {
                      utenteId: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  disabled={disabled}
                >
                  <option value="">Seleziona...</option>
                  {opzioni.map((u) => (
                    <option key={u.id} value={u.id}>{nomeUtente(u)}</option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="24"
                  step="0.5"
                  className="input w-24"
                  aria-label="Ore"
                  placeholder="Ore"
                  value={riga.ore}
                  onChange={(e) => aggiorna(riga.uid, { ore: e.target.value })}
                  disabled={disabled}
                />
                {/* Almeno una riga resta sempre: la prima si svuota, non si toglie */}
                <button
                  type="button"
                  onClick={() =>
                    value.length > 1
                      ? onChange(value.filter((r) => r.uid !== riga.uid))
                      : onChange([nuovaRigaCollaboratore()])
                  }
                  disabled={disabled}
                  className="text-red-600 hover:text-red-700 text-lg leading-none px-2"
                  aria-label="Rimuovi collaboratore"
                  title="Rimuovi"
                >
                  ×
                </button>
              </div>
              {rigaIncompleta(riga) && (
                <p className="mt-1 text-xs text-red-600">Scegli il collaboratore per queste ore.</p>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange([...value, nuovaRigaCollaboratore()])}
        disabled={disabled || value.length >= MAX_RIGHE || value.length >= utenti.length}
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:text-gray-400"
      >
        <span className="text-lg leading-none">+</span> Aggiungi collaboratore
      </button>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
        <span className="text-gray-600">Numero operai: {numeroOperai}</span>
        <span className="font-semibold text-gray-900">
          Totale Ore: {totale.toLocaleString('it-IT')}
        </span>
      </div>
    </div>
  );
}
