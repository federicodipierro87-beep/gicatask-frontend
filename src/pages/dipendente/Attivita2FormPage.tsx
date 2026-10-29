import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { DateTimeInput } from '../../components/DateTimeInput';
import { attivitaApi, clientiApi, cantieriApi } from '../../api/client';
import { NOMI_LUOGO } from '../../types';
import type { LuogoAttivita } from '../../types';

const LUOGHI: LuogoAttivita[] = ['MAGAZZINO', 'CANTIERE'];

interface Voce {
  id: number;
  nome: string;
}

const isOvernight = (start: string, end: string) => Boolean(start && end && end < start);

/**
 * Il cliente usato per il lavoro in magazzino: quello che si chiama "Gica" o,
 * in mancanza, il più corto che inizia con "Gica".
 */
function trovaClienteGica(clienti: Voce[]): Voce | null {
  const nome = (c: Voce) => c.nome.trim().toLowerCase();
  return clienti.find((c) => nome(c) === 'gica')
    ?? clienti
      .filter((c) => nome(c).startsWith('gica'))
      .sort((a, b) => a.nome.length - b.nome.length)[0]
    ?? null;
}

/**
 * "Nuova Attività 2": come Nuova Attività, ma senza tipo. Si sceglie se si è
 * lavorato in magazzino (cliente Gica, scelto da solo) o in cantiere (cliente
 * e, se il cliente ne ha, cantiere), poi l'orario di mattino e pomeriggio e
 * una descrizione libera, salvata nelle note.
 */
export function Attivita2FormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dataRiferimento, setDataRiferimento] = useState(
    new Date().toISOString().split('T')[0] || ''
  );
  const [luogo, setLuogo] = useState<LuogoAttivita | null>(null);
  const [clienti, setClienti] = useState<Voce[]>([]);
  const [cantieri, setCantieri] = useState<Voce[]>([]);
  // Il cliente scelto per il cantiere: in magazzino vale sempre Gica
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [cantiereId, setCantiereId] = useState<number | null>(null);
  const [oraInizioMattino, setOraInizioMattino] = useState('');
  const [oraFineMattino, setOraFineMattino] = useState('');
  const [oraInizioPomeriggio, setOraInizioPomeriggio] = useState('');
  const [oraFinePomeriggio, setOraFinePomeriggio] = useState('');
  const [descrizione, setDescrizione] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setClienti((await clientiApi.getAll()).data);
        if (!id) return;

        const att = (await attivitaApi.getById(parseInt(id))).data;

        // Assenze e attività col cliente hanno il loro form
        if (att.assenzaId) {
          navigate(`/dipendente/assenze/modifica/${id}`, { replace: true });
          return;
        }
        if (!att.luogo) {
          navigate(`/dipendente/modifica/${id}`, { replace: true });
          return;
        }

        setDataRiferimento(att.dataRiferimento.split('T')[0]);
        setLuogo(att.luogo);
        if (att.luogo === 'CANTIERE') {
          setClienteId(att.clienteId ?? null);
          setCantiereId(att.cantiereId ?? null);
        }
        setOraInizioMattino(att.oraInizioMattino || '');
        setOraFineMattino(att.oraFineMattino || '');
        setOraInizioPomeriggio(att.oraInizioPomeriggio || '');
        setOraFinePomeriggio(att.oraFinePomeriggio || '');
        setDescrizione(att.note || '');
      } catch (err) {
        setError('Errore nel caricamento dei dati');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  // I cantieri del cliente scelto, solo per il lavoro in cantiere
  useEffect(() => {
    if (luogo !== 'CANTIERE' || !clienteId) {
      setCantieri([]);
      setCantiereId(null);
      return;
    }

    const loadCantieri = async () => {
      setCantieri([]);
      try {
        const lista: Voce[] = (await cantieriApi.getByCliente(clienteId)).data;
        setCantieri(lista);
        // Con un solo cantiere lo sceglie da solo; un cantiere di un altro
        // cliente non resta selezionato
        setCantiereId((prev) =>
          lista.length === 1 ? lista[0]!.id : lista.some((c) => c.id === prev) ? prev : null
        );
      } catch (err) {
        setError('Errore nel caricamento dei cantieri');
      }
    };

    loadCantieri();
  }, [luogo, clienteId]);

  const clienteGica = trovaClienteGica(clienti);
  const clienteScelto = luogo === 'MAGAZZINO' ? clienteGica?.id ?? null : clienteId;
  const manca = luogo === 'CANTIERE' && (!clienteId || (cantieri.length > 0 && !cantiereId));

  const hasMattino = Boolean(oraInizioMattino && oraFineMattino);
  const hasPomeriggio = Boolean(oraInizioPomeriggio && oraFinePomeriggio);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!luogo) {
      setError('Scegli se hai lavorato in magazzino o in cantiere');
      return;
    }

    if (luogo === 'CANTIERE' && !clienteId) {
      setError('Seleziona il cliente');
      return;
    }

    if (luogo === 'CANTIERE' && cantieri.length > 0 && !cantiereId) {
      setError('Seleziona un cantiere');
      return;
    }

    if (!hasMattino && !hasPomeriggio) {
      setError('Devi inserire almeno una fascia oraria (mattino o pomeriggio)');
      return;
    }

    if (hasMattino && oraFineMattino === oraInizioMattino) {
      setError('L\'ora di fine mattino deve essere diversa dall\'ora di inizio');
      return;
    }

    if (hasPomeriggio && oraFinePomeriggio === oraInizioPomeriggio) {
      setError('L\'ora di fine pomeriggio deve essere diversa dall\'ora di inizio');
      return;
    }

    setIsSaving(true);
    setError(null);

    // In modifica un orario svuotato va mandato come stringa vuota: con
    // undefined il backend lo ignora e resta salvato il valore precedente
    const orario = (v: string) => v || (isEditing ? '' : undefined);

    try {
      const data = {
        dataRiferimento,
        oraInizioMattino: orario(oraInizioMattino),
        oraFineMattino: orario(oraFineMattino),
        oraInizioPomeriggio: orario(oraInizioPomeriggio),
        oraFinePomeriggio: orario(oraFinePomeriggio),
        luogo,
        clienteId: clienteScelto,
        cantiereId: luogo === 'CANTIERE' ? cantiereId : null,
        note: descrizione.trim() || (isEditing ? '' : undefined),
      };

      if (isEditing && id) {
        await attivitaApi.update(parseInt(id), data);
      } else {
        await attivitaApi.create(data);
      }

      navigate('/dipendente');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DipendenteLayout>
        <div className="card flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DipendenteLayout>
    );
  }

  return (
    <DipendenteLayout>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Modifica Attività 2' : 'Nuova Attività 2'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {isEditing
            ? 'Modifica i dettagli dell\'attività'
            : 'Registra un\'attività in magazzino o in cantiere'}
        </p>
      </div>

      <div className="card max-w-2xl">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data */}
          <div>
            <label htmlFor="data" className="label">Data</label>
            <DateTimeInput
              type="date"
              id="data"
              className="input"
              value={dataRiferimento}
              onChange={setDataRiferimento}
              required
            />
          </div>

          {/* Luogo */}
          <fieldset>
            <legend className="label">Dove hai lavorato?</legend>
            <div className="grid grid-cols-2 gap-3">
              {LUOGHI.map((l) => (
                <label
                  key={l}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium cursor-pointer transition-colors ${
                    luogo === l
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="luogo"
                    value={l}
                    checked={luogo === l}
                    onChange={() => setLuogo(l)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  {NOMI_LUOGO[l]}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Cliente: Gica in magazzino, da scegliere in cantiere */}
          {luogo === 'MAGAZZINO' && (
            <div>
              <label className="label">Cliente</label>
              {clienteGica ? (
                <p className="input bg-gray-50 text-gray-700">{clienteGica.nome}</p>
              ) : (
                <p className="text-sm text-amber-700">
                  Cliente Gica non trovato: l'attività sarà salvata senza cliente.
                </p>
              )}
            </div>
          )}

          {luogo === 'CANTIERE' && (
            <div>
              <label htmlFor="cliente" className="label">Cliente</label>
              <select
                id="cliente"
                className="select"
                value={clienteId ?? ''}
                onChange={(e) => setClienteId(e.target.value ? parseInt(e.target.value) : null)}
                required
              >
                <option value="">Seleziona cliente...</option>
                {clienti.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}

          {luogo === 'CANTIERE' && cantieri.length > 0 && (
            <div>
              <label htmlFor="cantiere" className="label">Cantiere</label>
              <select
                id="cantiere"
                className="select"
                value={cantiereId ?? ''}
                onChange={(e) => setCantiereId(e.target.value ? parseInt(e.target.value) : null)}
                required
              >
                <option value="">Seleziona cantiere...</option>
                {cantieri.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Fascia Mattino */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="label mb-3">Mattino <span className="text-gray-400 font-normal">(opzionale)</span></label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="oraInizioMattino" className="label text-sm">Inizio</label>
                <DateTimeInput
                  type="time"
                  id="oraInizioMattino"
                  className="input"
                  value={oraInizioMattino}
                  onChange={setOraInizioMattino}
                  defaultTime="06:00"
                />
              </div>
              <div>
                <label htmlFor="oraFineMattino" className="label text-sm">Fine</label>
                <DateTimeInput
                  type="time"
                  id="oraFineMattino"
                  className="input"
                  value={oraFineMattino}
                  onChange={setOraFineMattino}
                  defaultTime="06:00"
                />
              </div>
            </div>
            {isOvernight(oraInizioMattino, oraFineMattino) && (
              <p className="text-sm text-gray-500 mt-3">
                Il turno termina il giorno successivo. Le ore restano conteggiate su questa data.
              </p>
            )}
          </div>

          {/* Fascia Pomeriggio */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="label mb-3">Pomeriggio <span className="text-gray-400 font-normal">(opzionale)</span></label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="oraInizioPomeriggio" className="label text-sm">Inizio</label>
                <DateTimeInput
                  type="time"
                  id="oraInizioPomeriggio"
                  className="input"
                  value={oraInizioPomeriggio}
                  onChange={setOraInizioPomeriggio}
                  defaultTime="13:00"
                />
              </div>
              <div>
                <label htmlFor="oraFinePomeriggio" className="label text-sm">Fine</label>
                <DateTimeInput
                  type="time"
                  id="oraFinePomeriggio"
                  className="input"
                  value={oraFinePomeriggio}
                  onChange={setOraFinePomeriggio}
                  defaultTime="13:00"
                />
              </div>
            </div>
            {isOvernight(oraInizioPomeriggio, oraFinePomeriggio) && (
              <p className="text-sm text-gray-500 mt-3">
                Il turno termina il giorno successivo. Le ore restano conteggiate su questa data.
              </p>
            )}
          </div>

          {/* Descrizione */}
          <div>
            <label htmlFor="descrizione" className="label">
              Descrizione <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <textarea
              id="descrizione"
              className="input"
              rows={4}
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Cosa hai fatto..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/dipendente')}
              className="btn-secondary"
              disabled={isSaving}
            >
              Torna alle attività
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !luogo || manca || (!hasMattino && !hasPomeriggio)}
            >
              {isSaving ? 'Salvataggio...' : isEditing ? 'Salva modifiche' : 'Registra attività'}
            </button>
          </div>
        </form>
      </div>
    </DipendenteLayout>
  );
}
