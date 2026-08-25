import { useState } from 'react';
import type { VoceBollettino } from '../types';

export interface VoceSelezionata {
  voceId: number;
  quantita: number;
}

interface Props {
  titolo: string;
  labelQuantita: 'Ore' | 'Quantità' | 'Viaggi';
  voci: VoceBollettino[];
  value: VoceSelezionata[];
  onChange: (value: VoceSelezionata[]) => void;
  disabled?: boolean;
}

/**
 * Sezione mezzi / materiali / trasporti del bollettino: le tre hanno la stessa
 * forma e cambiano solo titolo ed etichetta della quantità.
 */
export function VociSelector({
  titolo,
  labelQuantita,
  voci,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [daAggiungere, setDaAggiungere] = useState('');

  const vociById = new Map(voci.map((v) => [v.id, v]));
  const giaScelte = new Set(value.map((v) => v.voceId));
  const disponibili = voci.filter((v) => !giaScelte.has(v.id));

  const handleAdd = () => {
    const voceId = parseInt(daAggiungere, 10);
    if (!voceId || giaScelte.has(voceId)) return;

    onChange([...value, { voceId, quantita: 0 }]);
    setDaAggiungere('');
  };

  const handleQuantita = (voceId: number, raw: string) => {
    const quantita = raw === '' ? 0 : parseFloat(raw);
    onChange(
      value.map((riga) =>
        riga.voceId === voceId
          ? { ...riga, quantita: Number.isFinite(quantita) ? quantita : 0 }
          : riga
      )
    );
  };

  const handleRemove = (voceId: number) => {
    onChange(value.filter((riga) => riga.voceId !== voceId));
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h3 className="font-medium text-gray-900 mb-3">{titolo}</h3>

      {value.length > 0 && (
        <div className="space-y-2 mb-3">
          {value.map((riga) => (
            <div
              key={riga.voceId}
              className="flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <span className="flex-1 text-sm text-gray-900">
                {vociById.get(riga.voceId)?.nome ?? 'Voce non disponibile'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  className="input w-28"
                  aria-label={labelQuantita}
                  placeholder={labelQuantita}
                  value={riga.quantita === 0 ? '' : riga.quantita}
                  onChange={(e) => handleQuantita(riga.voceId, e.target.value)}
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => handleRemove(riga.voceId)}
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

      {disponibili.length > 0 ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="input flex-1"
            aria-label={`Aggiungi a ${titolo}`}
            value={daAggiungere}
            onChange={(e) => setDaAggiungere(e.target.value)}
            disabled={disabled}
          >
            <option value="">Seleziona...</option>
            {disponibili.map((voce) => (
              <option key={voce.id} value={voce.id}>
                {voce.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled || !daAggiungere}
            className="btn-secondary"
          >
            Aggiungi
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {voci.length === 0 ? 'Nessuna voce in anagrafica' : 'Tutte le voci sono già inserite'}
        </p>
      )}
    </div>
  );
}
