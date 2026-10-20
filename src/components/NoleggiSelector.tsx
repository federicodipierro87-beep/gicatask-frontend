import type { DurataNoleggio, VeicoloBollettino } from '../types';

export interface RigaNoleggio {
  // Chiave stabile della riga: i veicoli si possono ripetere e cambiare
  chiave: number;
  veicoloId: number | null;
  durata: DurataNoleggio;
}

export const DURATE_NOLEGGIO: { value: DurataNoleggio; label: string }[] = [
  { value: 'MEZZA_GIORNATA', label: 'Mezza giornata' },
  { value: 'GIORNATA_INTERA', label: 'Giornata intera' },
];

// Il limite del backend è maxItems: 50
const MAX_RIGHE = 50;

let prossimaChiave = 1;

export function nuovaRigaNoleggio(): RigaNoleggio {
  return { chiave: prossimaChiave++, veicoloId: null, durata: 'GIORNATA_INTERA' };
}

interface Props {
  veicoli: VeicoloBollettino[];
  value: RigaNoleggio[];
  onChange: (value: RigaNoleggio[]) => void;
  disabled?: boolean;
}

/**
 * Sezione noleggi del bollettino modello 2: un veicolo della Banca dati
 * veicoli per riga, a mezza giornata o giornata intera. Facoltativa: senza
 * righe il PDF stampa la sezione vuota.
 */
export function NoleggiSelector({ veicoli, value, onChange, disabled = false }: Props) {
  const aggiorna = (chiave: number, modifica: Partial<RigaNoleggio>) =>
    onChange(value.map((r) => (r.chiave === chiave ? { ...r, ...modifica } : r)));

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h3 className="font-medium text-gray-900 mb-3">Noleggi</h3>

      {veicoli.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun veicolo nella banca dati.</p>
      ) : (
        <>
          {value.length > 0 && (
            <div className="space-y-2 mb-3">
              {value.map((riga) => (
                <div key={riga.chiave} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <select
                    className="input flex-1"
                    aria-label="Veicolo"
                    value={riga.veicoloId ?? ''}
                    onChange={(e) =>
                      aggiorna(riga.chiave, {
                        veicoloId: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    disabled={disabled}
                  >
                    <option value="">Seleziona veicolo...</option>
                    {veicoli.map((v) => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <select
                      className="input sm:w-44"
                      aria-label="Durata"
                      value={riga.durata}
                      onChange={(e) =>
                        aggiorna(riga.chiave, { durata: e.target.value as DurataNoleggio })
                      }
                      disabled={disabled}
                    >
                      {DURATE_NOLEGGIO.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((r) => r.chiave !== riga.chiave))}
                      disabled={disabled}
                      className="text-red-600 hover:text-red-700 text-sm px-2"
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {value.some((r) => r.veicoloId === null) && (
            <p className="text-xs text-amber-700 mb-2">
              Scegli il veicolo di ogni noleggio, oppure rimuovi la riga.
            </p>
          )}

          <button
            type="button"
            onClick={() => onChange([...value, nuovaRigaNoleggio()])}
            disabled={disabled || value.length >= MAX_RIGHE}
            className="btn-secondary text-sm"
          >
            + Aggiungi noleggio
          </button>
        </>
      )}
    </div>
  );
}
