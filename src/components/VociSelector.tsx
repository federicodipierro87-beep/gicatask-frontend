import { useState } from 'react';
import { vociBollettinoApi } from '../api/client';
import type { TipoVoceSlug, VoceBollettino } from '../types';

export interface VoceSelezionata {
  /** Identità locale della riga: le righe a testo libero non hanno un voceId. */
  uid: string;
  voceId: number | null;
  /** Nome copiato dall'anagrafica, oppure il testo scritto a mano. */
  descrizione: string;
  quantita: number;
}

// Contatore di modulo invece di una chiave derivata dal testo: quest'ultima
// cambierebbe a ogni battuta se un domani la riga diventasse editabile, e React
// smonterebbe l'input a ogni carattere.
let contatoreUid = 0;
const nuovoUid = () => `riga-${++contatoreUid}`;

// Il limite del backend è maxItems: 50 per sezione.
const MAX_RIGHE = 50;

// Il PDF stampa la descrizione con lineBreak: false ed ellipsis: true su 420pt:
// oltre ~90 caratteri il testo esce troncato da un bollettino già firmato, che
// non si può correggere. Il backend accetterebbe fino a 200.
const MAX_CARATTERI = 100;

// @@unique([tipo, nome]) su Postgres è case-sensitive: senza normalizzare
// maiuscole e spazi interni, "Ruspa" e "ruspa" convivrebbero in anagrafica.
const norm = (s: string) => s.trim().toLocaleLowerCase('it').replace(/\s+/g, ' ');

interface Props {
  titolo: string;
  labelQuantita: 'Ore' | 'Quantità' | 'Viaggi';
  tipo: TipoVoceSlug;
  voci: VoceBollettino[];
  value: VoceSelezionata[];
  onChange: (value: VoceSelezionata[]) => void;
  onVoceCreata: (voce: VoceBollettino) => void;
  disabled?: boolean;
}

/**
 * Sezione mezzi / materiali / trasporti del bollettino: le tre hanno la stessa
 * forma e cambiano solo titolo ed etichetta della quantità.
 *
 * Oltre alla tendina dell'anagrafica si può scrivere una voce a mano, con una
 * spunta che decide se salvarla anche in anagrafica o tenerla solo qui.
 */
export function VociSelector({
  titolo,
  labelQuantita,
  tipo,
  voci,
  value,
  onChange,
  onVoceCreata,
  disabled = false,
}: Props) {
  const [daAggiungere, setDaAggiungere] = useState('');
  const [testoLibero, setTestoLibero] = useState('');
  const [salvaInAnagrafica, setSalvaInAnagrafica] = useState(false);
  const [erroreVoce, setErroreVoce] = useState<string | null>(null);
  const [isSalvandoVoce, setIsSalvandoVoce] = useState(false);

  const giaScelte = new Set(
    value.map((v) => v.voceId).filter((id): id is number => id !== null)
  );
  const disponibili = voci.filter((v) => !giaScelte.has(v.id));
  const pieno = value.length >= MAX_RIGHE;

  const aggiungiRiga = (voceId: number | null, descrizione: string) => {
    onChange([...value, { uid: nuovoUid(), voceId, descrizione, quantita: 0 }]);
  };

  const handleAdd = () => {
    const voceId = parseInt(daAggiungere, 10);
    const voce = voci.find((v) => v.id === voceId);
    if (!voce || giaScelte.has(voce.id)) return;

    aggiungiRiga(voce.id, voce.nome);
    setDaAggiungere('');
  };

  const handleAddLibera = async () => {
    // .trim() qui e non solo all'invio: il maxLength di ajv è controllato
    // prima del trim lato server.
    const testo = testoLibero.trim();
    setErroreVoce(null);

    if (!testo) {
      setErroreVoce('Scrivi il nome della voce');
      return;
    }

    if (value.some((riga) => norm(riga.descrizione) === norm(testo))) {
      setErroreVoce('Questa voce è già stata inserita');
      return;
    }

    // Se il testo coincide con una voce dell'elenco si riusa quella: nessuna
    // POST e nessun duplicato in anagrafica.
    const esistente = voci.find((v) => norm(v.nome) === norm(testo));
    if (esistente) {
      aggiungiRiga(esistente.id, esistente.nome);
      setTestoLibero('');
      return;
    }

    if (!salvaInAnagrafica) {
      aggiungiRiga(null, testo);
      setTestoLibero('');
      return;
    }

    setIsSalvandoVoce(true);
    try {
      const response = await vociBollettinoApi.create(tipo, testo);
      aggiungiRiga(response.data.id, response.data.nome);
      onVoceCreata(response.data);
      setTestoLibero('');
    } catch (err: any) {
      // Discriminare sullo status e non sul corpo: su un 401 scaduto
      // err.response.data.error vale "Unauthorized" e finirebbe a schermo.
      if (err.response?.status === 400) {
        // L'elenco contiene solo le voci attive, quindi la collisione è quasi
        // sempre con una voce disattivata, che nella tendina non si vede.
        setErroreVoce(
          'Esiste già una voce con questo nome, probabilmente disattivata. ' +
            'Togli la spunta per usarla solo in questo bollettino, oppure ' +
            'chiedi al responsabile di riattivarla.'
        );
      } else {
        setErroreVoce('Errore nel salvataggio della voce in anagrafica');
      }
    } finally {
      setIsSalvandoVoce(false);
    }
  };

  const handleQuantita = (index: number, raw: string) => {
    const quantita = raw === '' ? 0 : parseFloat(raw);
    onChange(
      value.map((riga, i) =>
        i === index
          ? { ...riga, quantita: Number.isFinite(quantita) ? quantita : 0 }
          : riga
      )
    );
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h3 className="font-medium text-gray-900 mb-3">{titolo}</h3>

      {value.length > 0 && (
        <div className="space-y-2 mb-3">
          {value.map((riga, index) => (
            <div
              key={riga.uid}
              className="flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <span className="flex-1 text-sm text-gray-900">{riga.descrizione}</span>
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
                  onChange={(e) => handleQuantita(index, e.target.value)}
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
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
            disabled={disabled || !daAggiungere || pieno}
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

      {/* Il campo libero resta fuori dal ramo della tendina: serve soprattutto
          quando in anagrafica non c'è niente. */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            className="input flex-1"
            aria-label={`Scrivi una voce per ${titolo}`}
            placeholder="Oppure scrivi una voce..."
            value={testoLibero}
            maxLength={MAX_CARATTERI}
            onChange={(e) => {
              setTestoLibero(e.target.value);
              setErroreVoce(null);
            }}
            disabled={disabled || isSalvandoVoce}
          />
          <button
            type="button"
            onClick={handleAddLibera}
            disabled={disabled || isSalvandoVoce || !testoLibero.trim() || pieno}
            className="btn-secondary"
          >
            {isSalvandoVoce ? 'Salvataggio...' : 'Aggiungi'}
          </button>
        </div>

        <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={salvaInAnagrafica}
            onChange={(e) => {
              setSalvaInAnagrafica(e.target.checked);
              setErroreVoce(null);
            }}
            disabled={disabled || isSalvandoVoce}
          />
          Salva anche in anagrafica
        </label>

        {erroreVoce && <p className="mt-2 text-sm text-red-600">{erroreVoce}</p>}

        {pieno && (
          <p className="mt-2 text-sm text-gray-500">
            Hai raggiunto il massimo di {MAX_RIGHE} voci per questa sezione.
          </p>
        )}
      </div>
    </div>
  );
}
