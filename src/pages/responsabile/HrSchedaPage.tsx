import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { AllegatiUploader } from '../../components/AllegatiUploader';
import { hrApi } from '../../api/client';
import type { AllegatoHr, SchedaHr, SchedaHrInput, StatoCivile } from '../../types';

type CampiScheda = Omit<SchedaHrInput, 'figli' | 'formazioni'>;
type CampoTesto = {
  [K in keyof CampiScheda]: CampiScheda[K] extends string | null ? K : never;
}[keyof CampiScheda];

interface FormazioneForm {
  // Chiave React stabile anche per le formazioni non ancora salvate
  uid: string;
  id?: number;
  nome: string;
  foto: AllegatoHr[];
}

interface FiglioForm {
  uid: string;
  cognomeNome: string;
  dataNascita: string;
}

const STATI_CIVILI: { value: StatoCivile; label: string }[] = [
  { value: 'CELIBE', label: 'Celibe' },
  { value: 'NUBILE', label: 'Nubile' },
  { value: 'CONIUGATO', label: 'Coniugato' },
  { value: 'SEPARATO', label: 'Separato' },
  { value: 'DIVORZIATO', label: 'Divorziato' },
];

const VUOTA: CampiScheda = {
  numeroPersonale: null,
  cognomeNome: '',
  indirizzo: null,
  luogo: null,
  dataNascita: null,
  luogoNascita: null,
  telefono: null,
  numeroAvs: null,
  impostaFonte: null,
  tipoPermesso: null,
  scadenzaPermesso: null,
  codiceFiscale: null,
  numeroSimic: null,
  cassaMalati: null,
  statoCivile: null,
  nazionalita: null,
  coniugatoDal: null,
  coniugeCognomeNome: null,
  coniugeDataNascita: null,
  assegnoFigli: null,
  padreCognomeNome: null,
  madreCognomeNome: null,
  dataAssunzione: null,
  tipoSalario: null,
  salario: null,
  gradoOccupazione: null,
  iban: null,
  email: null,
  emergenzaNome: null,
  emergenzaTelefono: null,
  dataCessazione: null,
};

const CAMPI_DATA: CampoTesto[] = [
  'dataNascita',
  'scadenzaPermesso',
  'coniugatoDal',
  'coniugeDataNascita',
  'dataAssunzione',
  'dataCessazione',
];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Il server rimanda le date come ISO completo: l'input date vuole YYYY-MM-DD. */
const soloData = (valore: string | null) => (valore ? valore.slice(0, 10) : null);

function daScheda(scheda: SchedaHr): CampiScheda {
  const campi = { ...VUOTA };
  for (const chiave of Object.keys(VUOTA) as (keyof CampiScheda)[]) {
    (campi as Record<string, unknown>)[chiave] = scheda[chiave];
  }
  for (const chiave of CAMPI_DATA) campi[chiave] = soloData(scheda[chiave]) as never;
  return campi;
}

/** Apre il file in una scheda nuova. La finestra si apre subito, prima
 * dell'attesa, altrimenti il blocco popup la fermerebbe. */
async function apriFoto(allegato: AllegatoHr) {
  const finestra = window.open('', '_blank');
  try {
    const { data } = await hrApi.getFotoBlob(allegato.id);
    const url = URL.createObjectURL(data);
    if (finestra) finestra.location.href = url;
    else window.location.href = url;
  } catch {
    finestra?.close();
    alert('Impossibile aprire il file');
  }
}

export function HrSchedaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const schedaId = id ? parseInt(id, 10) : null;

  const [campi, setCampi] = useState<CampiScheda>(VUOTA);
  const [figli, setFigli] = useState<FiglioForm[]>([]);
  const [formazioni, setFormazioni] = useState<FormazioneForm[]>([]);
  const [isLoading, setIsLoading] = useState(schedaId !== null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carica = (scheda: SchedaHr) => {
    setCampi(daScheda(scheda));
    setFigli(
      scheda.figli.map((f) => ({ uid: uid(), cognomeNome: f.cognomeNome, dataNascita: soloData(f.dataNascita) ?? '' }))
    );
    setFormazioni(scheda.formazioni.map((f) => ({ uid: uid(), id: f.id, nome: f.nome, foto: f.foto })));
  };

  useEffect(() => {
    if (schedaId === null) return;
    hrApi
      .getById(schedaId)
      .then(({ data }) => carica(data))
      .catch(() => setError('Scheda non trovata'))
      .finally(() => setIsLoading(false));
  }, [schedaId]);

  const set = <K extends keyof CampiScheda>(chiave: K, valore: CampiScheda[K]) =>
    setCampi((prev) => ({ ...prev, [chiave]: valore }));

  const testo = (chiave: CampoTesto, etichetta: string, tipo: 'text' | 'date' | 'email' | 'tel' = 'text') => (
    <div>
      <label htmlFor={chiave} className="label">{etichetta}</label>
      <input
        id={chiave}
        type={tipo}
        className="input"
        value={(campi[chiave] as string | null) ?? ''}
        onChange={(e) => set(chiave, (e.target.value || null) as never)}
      />
    </div>
  );

  const handleSalva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campi.cognomeNome.trim()) {
      setError('Cognome e nome obbligatori');
      return;
    }

    const input: SchedaHrInput = {
      ...campi,
      figli: figli
        .filter((f) => f.cognomeNome.trim())
        .map((f) => ({ cognomeNome: f.cognomeNome, dataNascita: f.dataNascita || null })),
      formazioni: formazioni
        .filter((f) => f.nome.trim())
        .map((f) => ({ id: f.id, nome: f.nome, allegatiIds: f.foto.map((a) => a.id) })),
    };

    setIsSaving(true);
    setError(null);
    try {
      if (schedaId === null) await hrApi.create(input);
      else await hrApi.update(schedaId, input);
      navigate('/responsabile/hr');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleElimina = async () => {
    if (schedaId === null) return;
    if (!confirm(`Eliminare definitivamente la scheda di ${campi.cognomeNome}?`)) return;
    try {
      await hrApi.delete(schedaId);
      navigate('/responsabile/hr');
    } catch {
      setError('Errore durante l\'eliminazione');
    }
  };

  const aggiornaFormazione = (u: string, modifica: Partial<FormazioneForm>) =>
    setFormazioni((prev) => prev.map((f) => (f.uid === u ? { ...f, ...modifica } : f)));

  if (isLoading) {
    return (
      <ResponsabileLayout>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </ResponsabileLayout>
    );
  }

  return (
    <ResponsabileLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link to="/responsabile/hr" className="text-sm text-primary-600 hover:text-primary-700">
            ← Torna all'elenco
          </Link>
          <h2 className="text-xl font-semibold text-gray-900 mt-1">
            {schedaId === null ? 'Nuova scheda dipendente' : campi.cognomeNome || 'Scheda dipendente'}
          </h2>
          {campi.dataCessazione && (
            <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
              Uscente
            </span>
          )}
        </div>
        {schedaId !== null && (
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => hrApi.stampaSchede([schedaId])}>
              Stampa scheda
            </button>
            <button type="button" className="btn-danger" onClick={handleElimina}>
              Elimina
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Chiudi</button>
        </div>
      )}

      <form onSubmit={handleSalva} className="space-y-6">
        <section className="card">
          <h3 className="font-medium text-gray-900 mb-4">Dati personali</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testo('numeroPersonale', 'Numero personale')}
            <div>
              <label htmlFor="cognomeNome" className="label">Cognome e nome *</label>
              <input
                id="cognomeNome"
                className="input"
                required
                value={campi.cognomeNome}
                onChange={(e) => set('cognomeNome', e.target.value)}
              />
            </div>
            {testo('indirizzo', 'Indirizzo')}
            {testo('luogo', 'Luogo')}
            {testo('dataNascita', 'Data di nascita', 'date')}
            {testo('luogoNascita', 'Luogo di nascita')}
            {testo('nazionalita', 'Nazionalità')}
            {testo('telefono', 'Numero di telefono', 'tel')}
            {testo('email', 'E-mail', 'email')}
          </div>
        </section>

        <section className="card">
          <h3 className="font-medium text-gray-900 mb-4">Documenti e assicurazioni</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testo('numeroAvs', 'Numero AVS')}
            <div>
              <label htmlFor="impostaFonte" className="label">Imposte alla fonte</label>
              <select
                id="impostaFonte"
                className="select"
                value={campi.impostaFonte === null ? '' : campi.impostaFonte ? 'SI' : 'NO'}
                onChange={(e) => set('impostaFonte', e.target.value === '' ? null : e.target.value === 'SI')}
              >
                <option value="">—</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </div>
            {testo('tipoPermesso', 'Tipo permesso')}
            {testo('scadenzaPermesso', 'Scadenza permesso', 'date')}
            {testo('codiceFiscale', 'Codice fiscale')}
            {testo('numeroSimic', 'Numero SIMIC')}
            {testo('cassaMalati', 'Cassa malati')}
          </div>
        </section>

        <section className="card">
          <h3 className="font-medium text-gray-900 mb-4">Famiglia</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="statoCivile" className="label">Stato civile</label>
              <select
                id="statoCivile"
                className="select"
                value={campi.statoCivile ?? ''}
                onChange={(e) => set('statoCivile', (e.target.value || null) as StatoCivile | null)}
              >
                <option value="">—</option>
                {STATI_CIVILI.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            {testo('coniugatoDal', 'Coniugato dal', 'date')}
            {testo('coniugeCognomeNome', 'Cognome e nome coniuge')}
            {testo('coniugeDataNascita', 'Data di nascita coniuge', 'date')}
            {testo('assegnoFigli', 'Assegno figli')}
          </div>

          <div className="mt-6">
            <span className="label">Figli</span>
            {figli.length === 0 && <p className="text-sm text-gray-500">Nessun figlio inserito</p>}
            <div className="space-y-3">
              {figli.map((figlio) => (
                <div key={figlio.uid} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1">
                    <label className="label text-xs">Cognome e nome figlio/a</label>
                    <input
                      className="input"
                      value={figlio.cognomeNome}
                      onChange={(e) =>
                        setFigli((prev) =>
                          prev.map((f) => (f.uid === figlio.uid ? { ...f, cognomeNome: e.target.value } : f))
                        )
                      }
                    />
                  </div>
                  <div className="sm:w-48">
                    <label className="label text-xs">Data di nascita</label>
                    <input
                      type="date"
                      className="input"
                      value={figlio.dataNascita}
                      onChange={(e) =>
                        setFigli((prev) =>
                          prev.map((f) => (f.uid === figlio.uid ? { ...f, dataNascita: e.target.value } : f))
                        )
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700 text-sm sm:pb-2"
                    onClick={() => setFigli((prev) => prev.filter((f) => f.uid !== figlio.uid))}
                  >
                    Rimuovi
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={() => setFigli((prev) => [...prev, { uid: uid(), cognomeNome: '', dataNascita: '' }])}
            >
              + Aggiungi figlio
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {testo('padreCognomeNome', 'Cognome e nome del padre')}
            {testo('madreCognomeNome', 'Cognome e nome (da nubile) della madre')}
          </div>
        </section>

        <section className="card">
          <h3 className="font-medium text-gray-900 mb-4">Impiego</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testo('dataAssunzione', 'Data di assunzione', 'date')}
            {testo('tipoSalario', 'Tipo di salario')}
            {testo('salario', 'Salario')}
            {testo('gradoOccupazione', 'Grado occupazione')}
            {testo('iban', 'Numero IBAN')}
            <div>
              {testo('dataCessazione', 'Data di cessazione', 'date')}
              <p className="mt-1 text-xs text-gray-500">
                Con la data di cessazione il dipendente passa fra gli uscenti.
              </p>
            </div>
          </div>
        </section>

        <section className="card">
          <h3 className="font-medium text-gray-900 mb-4">Formazioni</h3>
          {formazioni.length === 0 && <p className="text-sm text-gray-500">Nessuna formazione inserita</p>}
          <div className="space-y-4">
            {formazioni.map((formazione, i) => (
              <div key={formazione.uid} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="label">Formazione {i + 1}</label>
                    <input
                      className="input"
                      value={formazione.nome}
                      onChange={(e) => aggiornaFormazione(formazione.uid, { nome: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700 text-sm pb-2"
                    onClick={() => setFormazioni((prev) => prev.filter((f) => f.uid !== formazione.uid))}
                  >
                    Rimuovi
                  </button>
                </div>
                <AllegatiUploader
                  value={formazione.foto}
                  onChange={(foto) => aggiornaFormazione(formazione.uid, { foto })}
                  carica={hrApi.uploadFoto}
                  rimuovi={null}
                  apri={apriFoto}
                  etichetta="Foto del tesserino"
                  aiuto="Immagini o PDF, fino a 4 file. Si salvano insieme alla scheda."
                  maxFile={4}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() => setFormazioni((prev) => [...prev, { uid: uid(), nome: '', foto: [] }])}
          >
            + Aggiungi formazione
          </button>
        </section>

        <section className="card">
          <h3 className="font-medium text-gray-900 mb-4">Contatto di emergenza</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testo('emergenzaNome', 'Nome contatto emergenza')}
            {testo('emergenzaTelefono', 'Telefono contatto emergenza', 'tel')}
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link to="/responsabile/hr" className="btn-secondary">Annulla</Link>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Salvataggio...' : 'Salva scheda'}
          </button>
        </div>
      </form>
    </ResponsabileLayout>
  );
}
