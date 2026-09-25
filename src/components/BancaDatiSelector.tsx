import { useState } from 'react';
import { MultiSelect } from './MultiSelect';

export interface VoceBancaDati {
  id: number;
  nome: string;
}

export interface VoceScelta {
  id: number;
  nome: string;
  /** Ore per i mezzi, quantità per i materiali, viaggi per i trasporti. */
  quantita: number;
}

// Il limite del backend è maxItems: 50 per sezione.
const MAX_RIGHE = 50;

// Il PDF stampa la descrizione su una riga sola: oltre ~90 caratteri il testo
// esce troncato da un bollettino già firmato, che non si può correggere.
const MAX_CARATTERI = 100;

interface Props {
  titolo: string;
  labelQuantita: 'Ore' | 'Quantità' | 'Viaggi';
  voci: VoceBancaDati[];
  value: VoceScelta[];
  onChange: (value: VoceScelta[]) => void;
  /**
   * Aggiunge una voce alla banca dati e la restituisce. Se manca, la sezione
   * non mostra il campo per aggiungere (i mezzi si gestiscono solo dalla
   * Banca dati veicoli).
   */
  onCrea?: (nome: string) => Promise<VoceBancaDati>;
  disabled?: boolean;
}

/**
 * Sezione mezzi / materiali / trasporti del bollettino: scelta multipla dalla
 * banca dati e, per ogni voce scelta, la quantità. Niente testo libero: una
 * voce che manca si aggiunge alla banca dati da qui e resta per tutti.
 */
export function BancaDatiSelector({
  titolo,
  labelQuantita,
  voci,
  value,
  onChange,
  onCrea,
  disabled = false,
}: Props) {
  const [nuova, setNuova] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [isCreando, setIsCreando] = useState(false);

  const pieno = value.length >= MAX_RIGHE;

  const handleSelezione = (ids: number[]) => {
    // Le quantità già scritte sopravvivono a un cambio di selezione
    const esistenti = new Map(value.map((v) => [v.id, v]));
    const byId = new Map(voci.map((v) => [v.id, v]));

    onChange(
      ids
        .slice(0, MAX_RIGHE)
        .map((id) => {
          const voce = byId.get(id);
          return esistenti.get(id) ?? (voce ? { id, nome: voce.nome, quantita: 0 } : null);
        })
        .filter((v): v is VoceScelta => v !== null)
    );
  };

  const handleQuantita = (id: number, raw: string) => {
    const quantita = raw === '' ? 0 : Math.max(0, parseFloat(raw) || 0);
    onChange(value.map((v) => (v.id === id ? { ...v, quantita } : v)));
  };

  const handleCrea = async () => {
    if (!onCrea) return;

    const nome = nuova.trim();
    setErrore(null);
    if (!nome) return;

    setIsCreando(true);
    try {
      // Il server riusa una voce omonima (anche disattivata) invece di
      // crearne un doppione: il risultato va solo aggiunto alla selezione
      const voce = await onCrea(nome);
      if (!value.some((v) => v.id === voce.id)) {
        onChange([...value, { id: voce.id, nome: voce.nome, quantita: 0 }]);
      }
      setNuova('');
    } catch {
      setErrore('Errore nel salvataggio nella banca dati');
    } finally {
      setIsCreando(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h3 className="font-medium text-gray-900 mb-3">{titolo}</h3>

      {voci.length === 0 ? (
        <p className="text-sm text-gray-500">Nessuna voce nella banca dati.</p>
      ) : (
        <MultiSelect
          options={voci.map((v) => ({ id: v.id, label: v.nome }))}
          value={value.map((v) => v.id)}
          onChange={handleSelezione}
          placeholder={`Seleziona ${titolo.toLowerCase()}...`}
          disabled={disabled}
        />
      )}

      {value.length > 0 && (
        <div className="space-y-2 mt-3">
          {value.map((voce) => (
            <div key={voce.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="flex-1 text-sm text-gray-900">{voce.nome}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  className="input w-28"
                  aria-label={`${labelQuantita} ${voce.nome}`}
                  placeholder={labelQuantita}
                  value={voce.quantita === 0 ? '' : voce.quantita}
                  onChange={(e) => handleQuantita(voce.id, e.target.value)}
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v.id !== voce.id))}
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

      {onCrea && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              className="input flex-1"
              aria-label={`Nuova voce per ${titolo}`}
              placeholder="Non c'è? Scrivilo qui..."
              value={nuova}
              maxLength={MAX_CARATTERI}
              onChange={(e) => {
                setNuova(e.target.value);
                setErrore(null);
              }}
              onKeyDown={(e) => {
                // Invio nel campo non deve inviare il form del bollettino
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCrea();
                }
              }}
              disabled={disabled || isCreando}
            />
            <button
              type="button"
              onClick={handleCrea}
              disabled={disabled || isCreando || !nuova.trim() || pieno}
              className="btn-secondary"
            >
              {isCreando ? 'Salvataggio...' : 'Aggiungi alla banca dati'}
            </button>
          </div>
          {errore && <p className="mt-2 text-sm text-red-600">{errore}</p>}
          {pieno && (
            <p className="mt-2 text-sm text-gray-500">
              Hai raggiunto il massimo di {MAX_RIGHE} voci per questa sezione.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
