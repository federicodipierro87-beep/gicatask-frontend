import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { DateTimeInput } from '../../components/DateTimeInput';
import { MultiSelect } from '../../components/MultiSelect';
import { Pagination } from '../../components/Pagination';
import { Modal } from '../../components/Modal';
import { logApi } from '../../api/client';
import { formatDuration } from '../../utils/durata';
import type { AzioneLog, LogOperazione } from '../../types';

const PER_PAGINA = 50;
const AGGIORNAMENTO_MS = 30_000;

const AZIONI: { valore: AzioneLog; etichetta: string; classe: string }[] = [
  { valore: 'ACCESSO', etichetta: 'Accesso', classe: 'bg-sky-100 text-sky-800' },
  { valore: 'USCITA', etichetta: 'Uscita', classe: 'bg-slate-100 text-slate-700' },
  { valore: 'CREAZIONE', etichetta: 'Creazione', classe: 'bg-green-100 text-green-800' },
  { valore: 'MODIFICA', etichetta: 'Modifica', classe: 'bg-amber-100 text-amber-800' },
  { valore: 'ELIMINAZIONE', etichetta: 'Eliminazione', classe: 'bg-red-100 text-red-800' },
  { valore: 'DISATTIVAZIONE', etichetta: 'Disattivazione', classe: 'bg-orange-100 text-orange-800' },
  { valore: 'RIATTIVAZIONE', etichetta: 'Riattivazione', classe: 'bg-teal-100 text-teal-800' },
  { valore: 'DOWNLOAD', etichetta: 'Download', classe: 'bg-indigo-100 text-indigo-800' },
  { valore: 'ALTRO', etichetta: 'Altro', classe: 'bg-gray-100 text-gray-700' },
];

const azione = (a: AzioneLog) => AZIONI.find((x) => x.valore === a) ?? AZIONI[AZIONI.length - 1]!;

/** Nomi leggibili dei campi più comuni; gli altri si ricavano dal camelCase. */
const CAMPI: Record<string, string> = {
  dataRiferimento: 'Data',
  oraInizioMattino: 'Inizio mattino',
  oraFineMattino: 'Fine mattino',
  oraInizioPomeriggio: 'Inizio pomeriggio',
  oraFinePomeriggio: 'Fine pomeriggio',
  durataMinuti: 'Durata',
  utenteId: 'Dipendente',
  clienteId: 'Cliente',
  cantiereId: 'Cantiere',
  tipoAttivitaId: 'Tipo attività',
  assenzaId: 'Assenza',
  veicoloId: 'Veicolo',
  cognomeNome: 'Cognome e nome',
  abilitatoBollettini: 'Abilitato bollettini',
  percentualeLavoro: 'Percentuale di lavoro',
};

function etichettaCampo(campo: string): string {
  if (CAMPI[campo]) return CAMPI[campo];
  const parole = campo.replace(/Id$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return parole.charAt(0).toUpperCase() + parole.slice(1);
}

function formatValore(campo: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sì' : 'No';
  if (campo === 'durataMinuti' && typeof v === 'number') return formatDuration(v);
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split('-').reverse().join('.');
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString('it-CH');
    return v;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const dataOra = (iso: string) =>
  new Date(iso).toLocaleString('it-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/** YYYY-MM-DD di oggi meno `giorni`, nel fuso del browser. */
function giornoLocale(giorni = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - giorni);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const gg = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${gg}`;
}

/** Mezzanotte locale del giorno indicato (più `piuGiorni`) come istante ISO. */
function istanteLocale(giorno: string, piuGiorni = 0): string | undefined {
  if (!giorno) return undefined;
  const [a, m, g] = giorno.split('-').map(Number);
  return new Date(a!, m! - 1, g! + piuGiorni).toISOString();
}

export function LogPage() {
  const [righe, setRighe] = useState<LogOperazione[]>([]);
  const [totale, setTotale] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selezionata, setSelezionata] = useState<LogOperazione | null>(null);

  const [dal, setDal] = useState(giornoLocale(6));
  const [al, setAl] = useState(giornoLocale());
  const [utentiIds, setUtentiIds] = useState<number[]>([]);
  const [aree, setAree] = useState<string[]>([]);
  const [azioni, setAzioni] = useState<AzioneLog[]>([]);
  const [esito, setEsito] = useState<'' | 'ok' | 'errore'>('');
  const [ricerca, setRicerca] = useState('');
  const [ricercaApplicata, setRicercaApplicata] = useState('');
  const [autoAggiorna, setAutoAggiorna] = useState(false);

  const [opzioniUtenti, setOpzioniUtenti] = useState<{ id: number; nome: string }[]>([]);
  const [opzioniAree, setOpzioniAree] = useState<string[]>([]);

  // La ricerca parte quando si smette di scrivere, non a ogni tasto
  useEffect(() => {
    const t = setTimeout(() => setRicercaApplicata(ricerca.trim()), 400);
    return () => clearTimeout(t);
  }, [ricerca]);

  const parametri = useMemo(
    () => ({
      dal: istanteLocale(dal),
      // `al` è compreso: il limite è la mezzanotte del giorno dopo
      al: istanteLocale(al, 1),
      utenti: utentiIds,
      aree,
      azioni,
      esito: esito || undefined,
      q: ricercaApplicata || undefined,
    }),
    [dal, al, utentiIds, aree, azioni, esito, ricercaApplicata]
  );

  useEffect(() => {
    setPagina(1);
  }, [parametri]);

  const carica = useCallback(async (silenzioso = false) => {
    if (!silenzioso) setIsLoading(true);
    try {
      const { data } = await logApi.getAll({ ...parametri, pagina, perPagina: PER_PAGINA });
      setRighe(data.righe);
      setTotale(data.totale);
      setError(null);
    } catch {
      setError('Errore nel caricamento del log');
    } finally {
      setIsLoading(false);
    }
  }, [parametri, pagina]);

  const caricaFiltri = useCallback(async () => {
    try {
      const { data } = await logApi.getFiltri();
      setOpzioniUtenti(data.utenti);
      setOpzioniAree(data.aree);
    } catch {
      // Le tendine restano quelle di prima: il log si legge comunque
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  useEffect(() => {
    caricaFiltri();
  }, [caricaFiltri]);

  useEffect(() => {
    if (!autoAggiorna) return;
    const t = setInterval(() => carica(true), AGGIORNAMENTO_MS);
    return () => clearInterval(t);
  }, [autoAggiorna, carica]);

  const aggiorna = () => {
    carica();
    caricaFiltri();
  };

  const azzeraFiltri = () => {
    setDal(giornoLocale(6));
    setAl(giornoLocale());
    setUtentiIds([]);
    setAree([]);
    setAzioni([]);
    setEsito('');
    setRicerca('');
  };

  // MultiSelect lavora con id numerici: aree e azioni passano per l'indice
  const opzioniAreeSelect = useMemo(() => opzioniAree.map((a, i) => ({ id: i, label: a })), [opzioniAree]);
  const opzioniAzioniSelect = AZIONI.map((a, i) => ({ id: i, label: a.etichetta }));

  const totalePagine = Math.max(1, Math.ceil(totale / PER_PAGINA));

  return (
    <ResponsabileLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Log</h2>
          <p className="text-sm text-gray-600 mt-1">
            Le operazioni fatte dagli utenti sull'app, amministratore compreso. Si conservano per un anno.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={autoAggiorna}
              onChange={(e) => setAutoAggiorna(e.target.checked)}
            />
            Aggiorna ogni 30 s
          </label>
          <button type="button" onClick={aggiorna} className="btn-secondary">
            Aggiorna
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Filtri</h3>
          <button type="button" onClick={azzeraFiltri} className="text-sm text-primary-600 hover:text-primary-700">
            Azzera filtri
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="logDal" className="label">Dal</label>
            <DateTimeInput type="date" id="logDal" className="input" value={dal} onChange={setDal} />
          </div>
          <div>
            <label htmlFor="logAl" className="label">Al</label>
            <DateTimeInput type="date" id="logAl" className="input" value={al} onChange={setAl} />
          </div>
          <div>
            <span className="label">Utente</span>
            <MultiSelect
              options={opzioniUtenti.map((u) => ({ id: u.id, label: u.nome }))}
              value={utentiIds}
              onChange={setUtentiIds}
              placeholder="Tutti gli utenti"
            />
          </div>
          <div>
            <span className="label">Area</span>
            <MultiSelect
              options={opzioniAreeSelect}
              value={aree.map((a) => opzioniAree.indexOf(a)).filter((i) => i >= 0)}
              onChange={(ids) => setAree(ids.map((i) => opzioniAree[i]!).filter(Boolean))}
              placeholder="Tutte le aree"
            />
          </div>
          <div>
            <span className="label">Operazione</span>
            <MultiSelect
              options={opzioniAzioniSelect}
              value={azioni.map((a) => AZIONI.findIndex((x) => x.valore === a))}
              onChange={(ids) => setAzioni(ids.map((i) => AZIONI[i]!.valore))}
              placeholder="Tutte le operazioni"
            />
          </div>
          <div>
            <label htmlFor="logEsito" className="label">Esito</label>
            <select
              id="logEsito"
              className="select"
              value={esito}
              onChange={(e) => setEsito(e.target.value as '' | 'ok' | 'errore')}
            >
              <option value="">Tutti</option>
              <option value="ok">Riuscite</option>
              <option value="errore">Non riuscite</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="logRicerca" className="label">Cerca</label>
            <input
              id="logRicerca"
              type="search"
              className="input"
              placeholder="Descrizione, utente, errore..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            Operazioni <span className="text-gray-500 font-normal">({totale})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : righe.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nessuna operazione nel periodo e con i filtri scelti</p>
        ) : (
          <>
            {/* Su telefono una scheda per riga: la tabella andrebbe scorsa di lato */}
            <ul className="sm:hidden divide-y">
              {righe.map((r) => {
                const a = azione(r.azione);
                return (
                  <li
                    key={r.id}
                    className={`py-3 px-2 -mx-2 cursor-pointer ${r.esito ? '' : 'bg-red-50'}`}
                    onClick={() => setSelezionata(r)}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                      <span className="tabular-nums">{dataOra(r.createdAt)}</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${a.classe}`}>{a.etichetta}</span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1 break-words">{r.descrizione}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.utenteNome ?? '—'} · {r.area}
                      {!r.esito && <span className="text-red-700"> · Errore {r.stato}{r.errore ? `: ${r.errore}` : ''}</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-2 font-medium text-gray-600 whitespace-nowrap">Data e ora</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Utente</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Area</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Operazione</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Descrizione</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Esito</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((r) => {
                    const a = azione(r.azione);
                    return (
                      <tr
                        key={r.id}
                        className={`border-b cursor-pointer transition-colors ${r.esito ? 'hover:bg-gray-100' : 'bg-red-50 hover:bg-red-100'}`}
                        onClick={() => setSelezionata(r)}
                      >
                        <td className="py-2 px-2 whitespace-nowrap text-gray-600 tabular-nums">{dataOra(r.createdAt)}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {r.utenteNome ?? '—'}
                          {r.ruolo === 'RESPONSABILE' && (
                            <span className="ml-1 text-xs text-gray-400">(admin)</span>
                          )}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap text-gray-600">{r.area}</td>
                        <td className="py-2 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${a.classe}`}>
                            {a.etichetta}
                          </span>
                        </td>
                        <td className="py-2 px-2 max-w-md">
                          <div className="truncate" title={r.descrizione}>{r.descrizione}</div>
                          {!r.esito && r.errore && (
                            <div className="text-xs text-red-700 truncate" title={r.errore}>{r.errore}</div>
                          )}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {r.esito ? (
                            <span className="text-green-700">OK</span>
                          ) : (
                            <span className="text-red-700">Errore {r.stato}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagina}
              totalPages={totalePagine}
              totalItems={totale}
              pageSize={PER_PAGINA}
              onChange={setPagina}
              className="mt-4"
            />
          </>
        )}
      </div>

      <Modal
        isOpen={selezionata !== null}
        onClose={() => setSelezionata(null)}
        title="Dettaglio operazione"
        maxWidth="max-w-3xl"
      >
        {selezionata && <DettaglioLog riga={selezionata} />}
      </Modal>
    </ResponsabileLayout>
  );
}

function DettaglioLog({ riga }: { riga: LogOperazione }) {
  const a = azione(riga.azione);
  const d = riga.dettaglio;

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
        <dt className="text-gray-500">Data e ora</dt>
        <dd>{dataOra(riga.createdAt)}</dd>
        <dt className="text-gray-500">Utente</dt>
        <dd>
          {riga.utenteNome ?? '—'}
          {riga.ruolo && <span className="text-gray-500"> ({riga.ruolo.toLowerCase()})</span>}
        </dd>
        <dt className="text-gray-500">Operazione</dt>
        <dd>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${a.classe}`}>{a.etichetta}</span>
          <span className="ml-2 text-gray-600">{riga.area}</span>
        </dd>
        <dt className="text-gray-500">Descrizione</dt>
        <dd className="break-words">{riga.descrizione}</dd>
        <dt className="text-gray-500">Esito</dt>
        <dd className={riga.esito ? 'text-green-700' : 'text-red-700'}>
          {riga.esito ? 'Riuscita' : `Non riuscita (${riga.stato})${riga.errore ? `: ${riga.errore}` : ''}`}
        </dd>
        <dt className="text-gray-500">Indirizzo IP</dt>
        <dd className="text-gray-600">{riga.ip ?? '—'}</dd>
        <dt className="text-gray-500">Richiesta</dt>
        <dd className="text-gray-600 font-mono text-xs break-all">
          {riga.metodo} {riga.percorso}
        </dd>
      </dl>

      {d?.modifiche && d.modifiche.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Campi modificati</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Campo</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Prima</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Dopo</th>
                </tr>
              </thead>
              <tbody>
                {d.modifiche.map((m) => (
                  <tr key={m.campo} className="border-b align-top">
                    <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{etichettaCampo(m.campo)}</td>
                    <td className="py-2 px-2 text-red-700 line-through decoration-red-300 break-words">
                      {formatValore(m.campo, m.prima)}
                    </td>
                    <td className="py-2 px-2 text-green-700 break-words">{formatValore(m.campo, m.dopo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {d?.valori && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">
            {riga.azione === 'CREAZIONE' ? 'Dati inseriti' : 'Dati al momento dell\'eliminazione'}
          </h4>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
            {Object.entries(d.valori).map(([campo, v]) => (
              <div key={campo} className="contents">
                <dt className="text-gray-500 whitespace-nowrap">{etichettaCampo(campo)}</dt>
                <dd className="break-words">{formatValore(campo, v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {d?.parametri && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Filtri dell'export</h4>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
            {Object.entries(d.parametri).map(([campo, v]) => (
              <div key={campo} className="contents">
                <dt className="text-gray-500 whitespace-nowrap">{etichettaCampo(campo)}</dt>
                <dd className="break-words">{formatValore(campo, v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {d?.dati !== undefined && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Dati inviati</h4>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(d.dati, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
