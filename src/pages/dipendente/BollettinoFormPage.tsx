import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { SignaturePad } from '../../components/SignaturePad';
import { AllegatiUploader } from '../../components/AllegatiUploader';
import { BancaDatiSelector, type VoceScelta } from '../../components/BancaDatiSelector';
import { MultiSelect } from '../../components/MultiSelect';
import { DateTimeInput } from '../../components/DateTimeInput';
import { FasceOrarieInput } from '../../components/FasceOrarieInput';
import {
  SquadreSelector,
  nuovaRigaSquadra,
  operaiRiga,
  problemaRiga,
  type RigaSquadra,
} from '../../components/SquadreSelector';
import { useAuth } from '../../context/AuthContext';
import {
  bollettiniApi,
  cantieriApi,
  clientiApi,
  vociBollettinoApi,
} from '../../api/client';
import type { EsitoEmailBollettino } from '../../api/client';
import type {
  AllegatoBollettino,
  Cliente,
  Cantiere,
  TipoVoceSlug,
  VeicoloBollettino,
  VoceBollettino,
} from '../../types';
import {
  FASCE_VUOTE,
  fasceIncomplete,
  fascePerApi,
  minutiFasce,
  type Fasce,
} from '../../utils/oreBollettino';

// Stessa regola del backend: piu' severa di RFC 5322 perche' l'indirizzo
// finisce nel campo `to` dell'API, dove una virgola varrebbe piu' destinatari.
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>.]+(\.[^\s@,;<>.]+)+$/;

/**
 * Testo dell'avviso quando il bollettino e' salvato ma la mail non e' partita.
 * Il tono non e' quello di un errore: il documento c'e' e le firme sono al
 * sicuro, e' solo la consegna che va rimediata dall'archivio.
 */
function messaggioAvviso(esito: EsitoEmailBollettino): string {
  switch (esito.stato) {
    case 'NON_CONFIGURATA':
      return 'Bollettino salvato. L\'invio e-mail non è ancora attivo: il responsabile potrà inviarlo dall\'archivio.';
    case 'NON_VALIDA':
      return `Bollettino salvato. L'indirizzo «${esito.destinatario ?? ''}» non sembra valido: la mail non è stata inviata.`;
    default:
      return 'Bollettino salvato, ma l\'invio non è riuscito. Le firme sono al sicuro: il responsabile può reinviarla dall\'archivio.';
  }
}

export function BollettinoFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Il bollettino e' firmato: una volta salvato il pulsante resta spento per
  // sempre, altrimenti chi legge l'avviso e ritocca crea un doppione identico
  const [salvato, setSalvato] = useState(false);
  const [avvisoMail, setAvvisoMail] = useState<string | null>(null);

  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [veicoli, setVeicoli] = useState<VeicoloBollettino[]>([]);
  const [trasportiDisponibili, setTrasportiDisponibili] = useState<VoceBollettino[]>([]);

  const [dataRiferimento, setDataRiferimento] = useState(
    new Date().toISOString().split('T')[0] || ''
  );
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [cantieriIds, setCantieriIds] = useState<number[]>([]);
  const [fasce, setFasce] = useState<Fasce>(FASCE_VUOTE);
  const [squadre, setSquadre] = useState<RigaSquadra[]>(() => [
    nuovaRigaSquadra(FASCE_VUOTE, true),
  ]);
  const [attivita, setAttivita] = useState('');
  const [mezzi, setMezzi] = useState<VoceScelta[]>([]);
  const [materiali, setMateriali] = useState('');
  const [trasporti, setTrasporti] = useState<VoceScelta[]>([]);

  const [email, setEmail] = useState('');
  // Gia' caricati sul server: qui restano i soli metadati, e nella POST solo
  // gli id. Non entrano in `puoSalvare`: sono facoltativi come l'e-mail.
  const [allegati, setAllegati] = useState<AllegatoBollettino[]>([]);

  const [firmaOperatoreNome, setFirmaOperatoreNome] = useState('');
  const [firmaOperatoreImg, setFirmaOperatoreImg] = useState<string | null>(null);
  const [firmaCommittenteNome, setFirmaCommittenteNome] = useState('');
  const [firmaCommittenteImg, setFirmaCommittenteImg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientiRes, veicoliRes, trasportiRes] = await Promise.all([
          clientiApi.getAll(),
          bollettiniApi.getVeicoli(),
          vociBollettinoApi.getAll('trasporti'),
        ]);
        setClienti(clientiRes.data);
        setVeicoli(veicoliRes.data);
        setTrasportiDisponibili(trasportiRes.data);
      } catch {
        setError('Errore nel caricamento dei dati');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Il nome dell'operatore è quasi sempre il proprio: precompilarlo evita di
  // farlo scrivere in cantiere, resta comunque modificabile
  useEffect(() => {
    if (user && !firmaOperatoreNome) {
      setFirmaOperatoreNome(`${user.nome} ${user.cognome}`);
    }
  }, [user]);

  // Le righe degli operai non ancora toccate seguono gli orari dell'intestazione
  useEffect(() => {
    setSquadre((prev) =>
      prev.map((r) => (r.segueIntestazione ? { ...r, ...fasce } : r))
    );
  }, [fasce]);

  useEffect(() => {
    if (!clienteId) {
      setCantieri([]);
      setCantieriIds([]);
      return;
    }

    const loadCantieri = async () => {
      setCantieri([]);
      try {
        const response = await cantieriApi.getByCliente(clienteId);
        setCantieri(response.data);

        // Con un solo cantiere la scelta è obbligata: selezionarlo da soli
        if (response.data.length === 1) {
          setCantieriIds([response.data[0].id]);
        } else {
          setCantieriIds([]);
        }
      } catch {
        setError('Errore nel caricamento dei cantieri');
      }
    };

    loadCantieri();
  }, [clienteId]);

  // Aggiunge la voce alla banca dati e all'elenco della tendina. L'elenco
  // arriva ordinato dal server: un append metterebbe la voce appena creata in
  // fondo fino al ricaricamento della pagina. `riusa`: se esiste gia' una voce
  // con quel nome, anche disattivata, il server restituisce quella.
  const creaVoce = (
    tipo: TipoVoceSlug,
    setter: React.Dispatch<React.SetStateAction<VoceBollettino[]>>
  ) => async (nome: string): Promise<VoceBollettino> => {
    const { data: voce } = await vociBollettinoApi.create(tipo, nome, true);
    setter((prev) =>
      prev.some((v) => v.id === voce.id)
        ? prev
        : [...prev, voce].sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
    );
    return voce;
  };

  const toRighe = (righe: VoceScelta[]) =>
    righe.map(({ id, nome, quantita }) => ({ voceId: id, descrizione: nome, quantita }));

  const emailNonValida = email.trim().length > 0 && !EMAIL_RE.test(email.trim());

  // `emailNonValida` **non** entra in puoSalvare: spegnere il pulsante per un
  // campo facoltativo sarebbe peggio del problema che risolve.
  const puoSalvare =
    Boolean(clienteId) &&
    // Il cantiere e' obbligatorio solo quando il cliente ne ha
    (cantieri.length === 0 || cantieriIds.length > 0) &&
    // Come nelle attivita': almeno una fascia, e nessuna lasciata a meta'
    minutiFasce(fasce) > 0 &&
    !fasceIncomplete(fasce) &&
    attivita.trim().length > 0 &&
    squadre.every((r) => problemaRiga(r) === null) &&
    firmaOperatoreNome.trim().length > 0 &&
    firmaCommittenteNome.trim().length > 0 &&
    Boolean(firmaOperatoreImg) &&
    Boolean(firmaCommittenteImg);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId || !firmaOperatoreImg || !firmaCommittenteImg) {
      setError('Compila tutti i campi obbligatori e apponi entrambe le firme');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { data } = await bollettiniApi.create({
        clienteId,
        cantieriIds,
        fasce: fascePerApi(fasce),
        // Le ore le calcola il server dagli orari
        squadre: squadre.map((r) => ({ numeroOperai: operaiRiga(r), ...fascePerApi(r) })),
        dataRiferimento,
        attivita: attivita.trim(),
        mezzi: mezzi.map(({ id, quantita }) => ({ veicoloId: id, quantita })),
        materialiTesto: materiali.trim(),
        trasporti: toRighe(trasporti),
        firmaOperatoreNome: firmaOperatoreNome.trim(),
        firmaOperatoreImg,
        firmaCommittenteNome: firmaCommittenteNome.trim(),
        firmaCommittenteImg,
        ...(email.trim() ? { email: email.trim() } : {}),
        allegatiIds: allegati.map((a) => a.id),
      });

      // Il bollettino c'e': da qui il pulsante non deve piu' poter ripartire
      setSalvato(true);

      if (data.email && data.email.stato !== 'INVIATA') {
        setAvvisoMail(messaggioAvviso(data.email));
        return; // niente navigate: l'avviso va letto
      }

      navigate('/dipendente/bollettini');
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
      <div className="card max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Nuovo Bollettino</h2>
        <p className="text-sm text-gray-600 mb-6">
          Una volta firmato il bollettino non è più modificabile.
        </p>

        {/* Ambra e non rosso: il bollettino e' salvato, non e' un errore */}
        {avvisoMail && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <p>{avvisoMail}</p>
            <button
              type="button"
              onClick={() => navigate('/dipendente/bollettini')}
              className="btn-primary mt-3"
            >
              Torna ai bollettini
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <FasceOrarieInput
            idPrefix="bollettino"
            value={fasce}
            onChange={setFasce}
            disabled={isSaving}
          />
          {fasceIncomplete(fasce) && (
            <p className="-mt-3 text-xs text-red-600">
              Completa inizio e fine della fascia (con orari diversi).
            </p>
          )}

          <div>
            <label htmlFor="cliente" className="label">Cliente</label>
            <select
              id="cliente"
              className="input"
              value={clienteId ?? ''}
              onChange={(e) => setClienteId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">Seleziona...</option>
              {clienti.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
              ))}
            </select>
          </div>

          {/* Il box compare solo se il cliente ha cantieri: per la maggior
              parte dei clienti sarebbe una tendina vuota e obbligatoria */}
          {cantieri.length > 0 && (
            <div>
              <span className="label">Cantieri</span>
              <MultiSelect
                options={cantieri.map((c) => ({ id: c.id, label: c.nome }))}
                value={cantieriIds}
                onChange={setCantieriIds}
                placeholder="Seleziona uno o più cantieri..."
                disabled={isSaving}
              />
            </div>
          )}

          <div>
            <label htmlFor="attivita" className="label">Attività svolte</label>
            <textarea
              id="attivita"
              className="input min-h-[8rem]"
              value={attivita}
              onChange={(e) => setAttivita(e.target.value)}
              maxLength={5000}
              placeholder="Descrivi i lavori eseguiti nella giornata"
            />
          </div>

          {/* I mezzi si aggiungono solo dalla Banca dati veicoli, condivisa
              con i noleggi Gica e Dream: niente onCrea */}
          <BancaDatiSelector
            titolo="Mezzi"
            labelQuantita="Valore"
            voci={veicoli}
            value={mezzi}
            onChange={setMezzi}
            disabled={isSaving}
          />

          <div>
            <label htmlFor="materiali" className="label">Materiali</label>
            <textarea
              id="materiali"
              className="input min-h-[6rem]"
              value={materiali}
              onChange={(e) => setMateriali(e.target.value)}
              maxLength={5000}
              placeholder="Descrivi i materiali utilizzati"
              disabled={isSaving}
            />
          </div>

          <BancaDatiSelector
            titolo="Trasporti"
            labelQuantita="Viaggi"
            voci={trasportiDisponibili}
            value={trasporti}
            onChange={setTrasporti}
            onCrea={creaVoce('trasporti', setTrasportiDisponibili)}
            disabled={isSaving}
          />

          <SquadreSelector
            value={squadre}
            onChange={setSquadre}
            fasceIntestazione={fasce}
            disabled={isSaving}
          />

          <div>
            <label htmlFor="email" className="label">
              E-mail per l'invio <span className="text-gray-400 font-normal">(facoltativa)</span>
            </label>
            <input
              type="email"
              id="email"
              className="input"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={254}
              placeholder="committente@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSaving || salvato}
            />
            <p className="mt-1 text-xs text-gray-500">
              Il PDF del bollettino verrà inviato a questo indirizzo dopo la firma.
            </p>
            {/* type="email" in un <form> attiva la validazione nativa: con un
                indirizzo malformato il submit non parte e appare solo un
                fumetto di sistema, che da telefono sembra un pulsante rotto */}
            {emailNonValida && (
              <p className="mt-1 text-xs text-amber-700">
                L'indirizzo non sembra valido: correggilo oppure svuota il campo per salvare
                senza inviare la mail.
              </p>
            )}
          </div>

          <AllegatiUploader
            value={allegati}
            onChange={setAllegati}
            disabled={isSaving || salvato}
          />

          <div className="border-t pt-5 space-y-5">
            <div>
              <label htmlFor="nomeOperatore" className="label">Nome operatore</label>
              <input
                type="text"
                id="nomeOperatore"
                className="input"
                value={firmaOperatoreNome}
                onChange={(e) => setFirmaOperatoreNome(e.target.value)}
              />
              <div className="mt-2">
                <SignaturePad
                  label="Firma operatore"
                  value={firmaOperatoreImg}
                  onChange={setFirmaOperatoreImg}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div>
              <label htmlFor="nomeCommittente" className="label">Nome committente</label>
              <input
                type="text"
                id="nomeCommittente"
                className="input"
                value={firmaCommittenteNome}
                onChange={(e) => setFirmaCommittenteNome(e.target.value)}
              />
              <div className="mt-2">
                <SignaturePad
                  label="Firma committente"
                  value={firmaCommittenteImg}
                  onChange={setFirmaCommittenteImg}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/dipendente/bollettini')}
              className="btn-secondary"
              disabled={isSaving}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !puoSalvare || salvato}
            >
              {isSaving ? 'Invio...' : 'Firma e Invia'}
            </button>
          </div>
        </form>
      </div>
    </DipendenteLayout>
  );
}
