import { MultiSelect } from './MultiSelect';
import type { VeicoloBollettino } from '../types';

export interface MezzoSelezionato {
  veicoloId: number;
  nome: string;
  /** Ore di utilizzo del mezzo. */
  quantita: number;
}

interface Props {
  veicoli: VeicoloBollettino[];
  value: MezzoSelezionato[];
  onChange: (value: MezzoSelezionato[]) => void;
  disabled?: boolean;
}

/**
 * Sezione mezzi del bollettino: i mezzi si scelgono, anche piu' d'uno,
 * dall'anagrafica veicoli di Gica Noleggi, e per ognuno si indicano le ore.
 * Niente testo libero: il mezzo deve esistere in anagrafica.
 */
export function MezziSelector({ veicoli, value, onChange, disabled = false }: Props) {
  const handleSelezione = (ids: number[]) => {
    // Le ore gia' scritte sopravvivono a un cambio di selezione
    const esistenti = new Map(value.map((m) => [m.veicoloId, m]));
    const byId = new Map(veicoli.map((v) => [v.id, v]));

    onChange(
      ids
        .map((id) => esistenti.get(id) ?? (byId.has(id)
          ? { veicoloId: id, nome: byId.get(id)!.nome, quantita: 0 }
          : null))
        .filter((m): m is MezzoSelezionato => m !== null)
    );
  };

  const handleOre = (veicoloId: number, raw: string) => {
    const quantita = raw === '' ? 0 : Math.max(0, parseFloat(raw) || 0);
    onChange(value.map((m) => (m.veicoloId === veicoloId ? { ...m, quantita } : m)));
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h3 className="font-medium text-gray-900 mb-3">Mezzi</h3>

      {veicoli.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun mezzo in anagrafica.</p>
      ) : (
        <MultiSelect
          options={veicoli.map((v) => ({ id: v.id, label: v.nome }))}
          value={value.map((m) => m.veicoloId)}
          onChange={handleSelezione}
          placeholder="Seleziona i mezzi..."
          disabled={disabled}
        />
      )}

      {value.length > 0 && (
        <div className="space-y-2 mt-3">
          {value.map((mezzo) => (
            <div
              key={mezzo.veicoloId}
              className="flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <span className="flex-1 text-sm text-gray-900">{mezzo.nome}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  className="input w-28"
                  aria-label={`Ore ${mezzo.nome}`}
                  placeholder="Ore"
                  value={mezzo.quantita === 0 ? '' : mezzo.quantita}
                  onChange={(e) => handleOre(mezzo.veicoloId, e.target.value)}
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => onChange(value.filter((m) => m.veicoloId !== mezzo.veicoloId))}
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
    </div>
  );
}
