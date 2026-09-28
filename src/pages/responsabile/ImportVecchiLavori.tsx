import { useRef, useState } from 'react';
import { apiClient } from '../../api/client';

// Import dei lavori registrati nel vecchio foglio Excel, prima di GicaTask.
// Passo 1: il server legge il file e propone gli abbinamenti; passo 2: il
// responsabile li rivede e il file torna al server insieme alla mappatura.

type Scelta =
  | { azione: 'esistente'; id: number }
  | { azione: 'nuovo'; nome: string }
  | { azione: 'nessuno' }
  | { azione: 'salta' };

interface Voce {
  chiave: string;
  nome: string;
  varianti: string[];
  righe: number;
  suggerimento: Scelta | null;
}

interface Analisi {
  fogli: string[];
  righeValide: number;
  periodo: { da: string; a: string } | null;
  giaImportate: number;
  errori: string[];
  avvisi: string[];
  dipendenti: Voce[];
  clienti: Voce[];
  tipi: Voce[];
  anagrafiche: {
    utenti: { id: number; nome: string; cognome: string; attivo: boolean }[];
    clienti: { id: number; nome: string; attivo: boolean }[];
    tipi: { id: number; nome: string; attivo: boolean }[];
  };
}

interface Esito {
  attivitaCreate: number;
  duplicatiSaltati: number;
  righeSaltate: number;
  righeScartate: number;
  clientiCreati: number;
  tipiAttivitaCreati: number;
  errori: string[];
  avvisi: string[];
}

type Categoria = 'dipendenti' | 'clienti' | 'tipi';
type Mappatura = Record<Categoria, Record<string, Scelta | null>>;

function formattaData(iso: string): string {
  const [a, m, g] = iso.split('-');
  return `${g}.${m}.${a}`;
}

// Il <select> lavora con stringhe: "e:<id>", "nuovo", "nessuno", "salta"
function valoreSelect(s: Scelta | null): string {
  if (!s) return '';
  return s.azione === 'esistente' ? `e:${s.id}` : s.azione;
}

function daSelect(valore: string, nomeNuovo: string): Scelta | null {
  if (valore.startsWith('e:')) return { azione: 'esistente', id: Number(valore.slice(2)) };
  if (valore === 'nuovo') return { azione: 'nuovo', nome: nomeNuovo };
  if (valore === 'nessuno') return { azione: 'nessuno' };
  if (valore === 'salta') return { azione: 'salta' };
  return null;
}

const TITOLI: Record<Categoria, { titolo: string; colonna: string; descrizione: string }> = {
  dipendenti: {
    titolo: 'Dipendenti',
    colonna: 'EFFETTUATO DA',
    descrizione:
      'Ogni nome va abbinato a un utente esistente. Se un dipendente non c\'è, crealo prima in Utenti (anche disattivato) e ricarica il file; altrimenti scegli di saltare le sue righe.',
  },
  clienti: {
    titolo: 'Clienti',
    colonna: 'CLIENTE',
    descrizione:
      'Le varianti con maiuscole o spazi diversi sono già raggruppate. Più voci possono puntare allo stesso cliente. Le righe senza cliente sono proposte su GiCa. Con «Nessun cliente», il nome del foglio resta nelle note.',
  },
  tipi: {
    titolo: 'Tipi attività',
    colonna: "ATTIVITA' SVOLTA",
    descrizione: 'Abbina ogni attività del foglio a un tipo esistente o creane uno nuovo.',
  },
};

export function ImportVecchiLavori() {
  const [file, setFile] = useState<File | null>(null);
  const [analisi, setAnalisi] = useState<Analisi | null>(null);
  const [mappatura, setMappatura] = useState<Mappatura>({ dipendenti: {}, clienti: {}, tipi: {} });
  const [inCorso, setInCorso] = useState<'analisi' | 'import' | null>(null);
  const [esito, setEsito] = useState<Esito | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const scelto = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!scelto) return;

    setInCorso('analisi');
    setAnalisi(null);
    setEsito(null);
    setErrore(null);

    const formData = new FormData();
    formData.append('file', scelto);

    try {
      const response = await apiClient.post<Analisi>('/import/vecchi-lavori/analisi', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const a = response.data;
      const iniziale = (voci: Voce[]) =>
        Object.fromEntries(voci.map((v) => [v.chiave, v.suggerimento]));
      setFile(scelto);
      setAnalisi(a);
      setMappatura({
        dipendenti: iniziale(a.dipendenti),
        clienti: iniziale(a.clienti),
        tipi: iniziale(a.tipi),
      });
    } catch (err: any) {
      setErrore(err.response?.data?.error || 'Errore durante la lettura del file');
    } finally {
      setInCorso(null);
    }
  };

  const imposta = (categoria: Categoria, chiave: string, scelta: Scelta | null) => {
    setMappatura((m) => ({ ...m, [categoria]: { ...m[categoria], [chiave]: scelta } }));
  };

  const mancanti = analisi
    ? (['dipendenti', 'clienti', 'tipi'] as Categoria[]).flatMap((c) =>
        analisi[c].filter((v) => {
          const s = mappatura[c][v.chiave];
          return !s || (s.azione === 'nuovo' && !s.nome.trim());
        })
      ).length
    : 0;

  const handleImporta = async () => {
    if (!file || !analisi || mancanti > 0) return;

    setInCorso('import');
    setErrore(null);

    const formData = new FormData();
    formData.append('mappatura', JSON.stringify(mappatura));
    formData.append('file', file);

    try {
      const response = await apiClient.post<Esito>('/import/vecchi-lavori/importa', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEsito(response.data);
      setAnalisi(null);
      setFile(null);
    } catch (err: any) {
      setErrore(err.response?.data?.error || "Errore durante l'importazione");
    } finally {
      setInCorso(null);
    }
  };

  const opzioniEsistenti = (categoria: Categoria) => {
    if (!analisi) return [];
    if (categoria === 'dipendenti') {
      return analisi.anagrafiche.utenti.map((u) => ({
        id: u.id,
        nome: `${u.nome} ${u.cognome}`.trim() + (u.attivo ? '' : ' (disattivato)'),
      }));
    }
    const elenco = categoria === 'clienti' ? analisi.anagrafiche.clienti : analisi.anagrafiche.tipi;
    return elenco.map((e) => ({ id: e.id, nome: e.nome + (e.attivo ? '' : ' (disattivato)') }));
  };

  const tabella = (categoria: Categoria) => {
    if (!analisi) return null;
    const voci = analisi[categoria];
    const esistenti = opzioniEsistenti(categoria);
    const { titolo, colonna, descrizione } = TITOLI[categoria];

    return (
      <div className="card mb-6" key={categoria}>
        <h3 className="font-medium text-gray-900">
          {titolo} <span className="text-sm font-normal text-gray-500">(colonna {colonna})</span>
        </h3>
        <p className="text-sm text-gray-600 mt-1 mb-4">{descrizione}</p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4 font-medium">Nel foglio</th>
                <th className="py-2 pr-4 font-medium text-right">Righe</th>
                <th className="py-2 font-medium">Diventa</th>
              </tr>
            </thead>
            <tbody>
              {voci.map((v) => {
                const s = mappatura[categoria][v.chiave] ?? null;
                const nomeNuovo = s?.azione === 'nuovo' ? s.nome : v.nome;
                return (
                  <tr key={v.chiave} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-4">
                      {v.chiave ? (
                        <>
                          <span className="font-medium text-gray-900">{v.nome}</span>
                          {v.varianti.length > 1 && (
                            <span className="block text-xs text-gray-500">
                              anche: {v.varianti.slice(1).join(', ')}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="italic text-gray-500">(vuoto)</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-600">{v.righe}</td>
                    <td className="py-2 min-w-[16rem]">
                      <select
                        className={`select ${!s ? 'border-yellow-400 bg-yellow-50' : ''}`}
                        value={valoreSelect(s)}
                        onChange={(e) => imposta(categoria, v.chiave, daSelect(e.target.value, nomeNuovo))}
                      >
                        {!s && <option value="">— Scegli —</option>}
                        {categoria !== 'dipendenti' && (
                          <option value="nuovo">+ Crea nuovo</option>
                        )}
                        {categoria !== 'dipendenti' && (
                          <option value="nessuno">
                            {categoria === 'clienti' ? 'Nessun cliente' : 'Nessun tipo'}
                          </option>
                        )}
                        <option value="salta">Non importare queste righe</option>
                        <optgroup label={categoria === 'dipendenti' ? 'Utenti' : 'Esistenti'}>
                          {esistenti.map((e) => (
                            <option key={e.id} value={`e:${e.id}`}>
                              {e.nome}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      {s?.azione === 'nuovo' && (
                        <input
                          className="input mt-2"
                          value={s.nome}
                          onChange={(e) => imposta(categoria, v.chiave, { azione: 'nuovo', nome: e.target.value })}
                          placeholder="Nome della nuova voce"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mb-6 mt-10 pt-6 border-t">
        <h2 className="text-xl font-semibold text-gray-900">Importa vecchi lavori</h2>
        <p className="text-sm text-gray-600 mt-1">
          Importa le attività registrate nel vecchio foglio Excel, prima di GicaTask
        </p>
      </div>

      <div className="card mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Come funziona</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>1.</strong> Carica il vecchio foglio (es. <em>import_vecchi_lavori.xlsx</em>). Servono
            le colonne <strong>DATA</strong>, <strong>EFFETTUATO DA</strong> e le fasce{' '}
            <strong>Mattina/Pomeriggio inizio e fine</strong>; si usano anche{' '}
            <strong>ATTIVITA' SVOLTA</strong>, <strong>CLIENTE</strong>, <strong>DESCRIZIONE</strong>,{' '}
            <strong>Trasporto</strong> e <strong>Luogo montaggio</strong>.
          </p>
          <p>
            <strong>2.</strong> Controlla gli abbinamenti proposti per dipendenti, clienti e tipi attività.
          </p>
          <p>
            <strong>3.</strong> Conferma l'importazione.
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1 text-gray-500">
            <li>La durata si ricalcola dalle fasce orarie; la colonna Tot ore non serve.</li>
            <li>Con solo l'inizio del mattino e la fine del pomeriggio, la giornata diventa una fascia unica.</li>
            <li>Descrizione, trasporto e luogo di montaggio finiscono nelle note dell'attività.</li>
            <li>
              Se un dipendente ha già attività nel portale in un giorno, i suoi vecchi lavori di quel giorno
              non vengono caricati (e quelle esistenti non vengono toccate): ricaricare lo stesso file non
              crea doppioni.
            </li>
          </ul>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".xlsx"
          className="hidden"
        />
        <div className="mt-6 pt-4 border-t">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={inCorso !== null}
            className="btn-secondary"
          >
            {inCorso === 'analisi' ? 'Lettura in corso...' : analisi ? 'Carica un altro file' : 'Carica vecchio foglio'}
          </button>
          {file && analisi && <span className="ml-3 text-sm text-gray-600">{file.name}</span>}
        </div>
      </div>

      {errore && (
        <div className="card mb-6 bg-red-50 border-red-200">
          <h4 className="font-medium text-red-800">Errore</h4>
          <p className="text-red-700 text-sm">{errore}</p>
        </div>
      )}

      {analisi && (
        <>
          <div className="card mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Contenuto del file</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{analisi.righeValide}</p>
                <p className="text-xs text-gray-500">Attività lette</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-gray-900">
                  {analisi.periodo
                    ? `${formattaData(analisi.periodo.da)} – ${formattaData(analisi.periodo.a)}`
                    : '—'}
                </p>
                <p className="text-xs text-gray-500">Periodo</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{analisi.errori.length}</p>
                <p className="text-xs text-gray-500">Righe scartate</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${analisi.giaImportate > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {analisi.giaImportate}
                </p>
                <p className="text-xs text-gray-500">In giorni già presenti</p>
              </div>
            </div>

            {analisi.giaImportate > 0 && (
              <p className="text-sm text-yellow-700 mt-4">
                {analisi.giaImportate} righe cadono in giorni in cui il dipendente ha già attività nel
                portale (con gli abbinamenti proposti): non verranno caricate.
              </p>
            )}

            {[...analisi.errori, ...analisi.avvisi].length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Righe scartate e avvisi:</p>
                <ul className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                  {[...analisi.errori, ...analisi.avvisi].map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {analisi.righeValide > 0 && (
            <>
              {tabella('dipendenti')}
              {tabella('clienti')}
              {tabella('tipi')}

              <div className="card mb-6 flex flex-wrap items-center gap-4">
                <button
                  onClick={handleImporta}
                  disabled={mancanti > 0 || inCorso !== null}
                  className="btn-primary"
                >
                  {inCorso === 'import' ? 'Importazione in corso...' : 'Importa attività'}
                </button>
                {mancanti > 0 && (
                  <span className="text-sm text-yellow-700">
                    {mancanti === 1 ? 'Manca 1 abbinamento' : `Mancano ${mancanti} abbinamenti`}
                  </span>
                )}
              </div>
            </>
          )}
        </>
      )}

      {esito && (
        <div className="card mb-6 bg-green-50 border-green-200">
          <h4 className="font-medium text-green-800">Importazione completata</h4>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              [esito.attivitaCreate, 'Attività create'],
              [esito.duplicatiSaltati, 'Saltate (giorni già presenti o doppioni)'],
              [esito.righeSaltate, 'Non importate'],
              [esito.righeScartate, 'Scartate'],
              [esito.clientiCreati, 'Clienti creati'],
              [esito.tipiAttivitaCreati, 'Tipi creati'],
            ].map(([n, etichetta]) => (
              <div key={etichetta} className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{n}</p>
                <p className="text-xs text-gray-500">{etichetta}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
