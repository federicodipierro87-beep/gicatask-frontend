import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { SignaturePad } from '../../components/SignaturePad';
import { AllegatiUploader } from '../../components/AllegatiUploader';
import { BancaDatiSelector, type VoceScelta } from '../../components/BancaDatiSelector';
import { MultiSelect } from '../../components/MultiSelect';
import { CampoSuggerimenti } from '../../components/CampoSuggerimenti';
import { SceltaOpzioni, OPZIONI_STATO } from '../../components/SceltaOpzioni';
import { DateTimeInput } from '../../components/DateTimeInput';
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
import { fascePerApi } from '../../utils/oreBollettino';

// Stessa regola del backend: piu' severa di RFC 5322 perche' l'indirizzo
// finisce nel campo `to` dell'API, dove una virgola varrebbe piu' destinatari.
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>.]+(\.[^\s@,;<>.]+)+$/;

/** Confronto come lo fa il server: maiuscole e spazi doppi non contano. */
function chiave(valore: string): string {
  return valore.replace(/\s+/g, ' ').trim().toLowerCase();
}

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

interface Props {
  // 2 = sezione "Bollettini Nuovi": riferimento del cantiere in testa, cliente
  // scritto o scelto, operai con la categoria, mezzi e trasporti a testo
  // libero dentro le attivita'
  modello?: 1 | 2;
}

export function BollettinoFormPage({ modello = 1 }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const modello2 = modello === 2;
  const elenco = modello2 ? '/dipendente/bollettini-2' : '/dipendente/bollettini';

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
  // Solo modello 2: il cliente si scrive; se e' in anagrafica `clienteId` lo
  // segue, altrimenti il server lo aggiunge al salvataggio
  const [clienteTesto, setClienteTesto] = useState('');
  const [cantieriIds, setCantieriIds] = useState<number[]>([]);
  const [squadre, setSquadre] = useState<RigaSquadra[]>(() => [nuovaRigaSquadra()]);
  const [attivita, setAttivita] = useState('');
  const [mezzi, setMezzi] = useState<VoceScelta[]>([]);
  const [materiali, setMateriali] = useState('');
  const [trasporti, setTrasporti] = useState<VoceScelta[]>([]);
  // Solo modello 2
  const [riferimentoCantiere, setRiferimentoCantiere] = useState('');
  const [mezziTesto, setMezziTesto] = useState('');
  const [trasportiTesto, setTrasportiTesto] = useState('');
  const [fatturato, setFatturato] = useState(false);

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
        // Il modello 2 non usa la banca dati trasporti, che e' riservata al
        // flag dei bollettini classici: chiederla darebbe un 403
        const [clientiRes, veicoliRes, trasportiRes] = await Promise.all([
          clientiApi.getAll(),
          // I veicoli servono ai soli mezzi del modello 1
          modello2 ? null : bollettiniApi.getVeicoli(),
          modello2 ? null : vociBollettinoApi.getAll('trasporti'),
        ]);
        setClienti(clientiRes.data);
        setVeicoli(veicoliRes?.data ?? []);
        setTrasportiDisponibili(trasportiRes?.data ?? []);
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

  const handleClienteTesto = (valore: string) => {
    setClienteTesto(valore);
    const trovato = clienti.find((c) => chiave(c.nome) === chiave(valore));
    setClienteId(trovato?.id ?? null);
  };

  const clienteNuovo = modello2 && clienteTesto.trim().length > 0 && clienteId === null;

  const toRighe = (righe: VoceScelta[]) =>
    righe.map(({ id, nome, quantita }) => ({ voceId: id, descrizione: nome, quantita }));

  const emailNonValida = email.trim().length > 0 && !EMAIL_RE.test(email.trim());

  // `emailNonValida` **non** entra in puoSalvare: spegnere il pulsante per un
  // campo facoltativo sarebbe peggio del problema che risolve.
  const puoSalvare =
    (Boolean(clienteId) || clienteNuovo) &&
    // Il cantiere e' obbligatorio solo quando il cliente ne ha
    (cantieri.length === 0 || cantieriIds.length > 0) &&
    attivita.trim().length > 0 &&
    squadre.every((r) => problemaRiga(r, modello2) === null) &&
    firmaOperatoreNome.trim().length > 0 &&
    firmaCommittenteNome.trim().length > 0 &&
    Boolean(firmaOperatoreImg) &&
    Boolean(firmaCommittenteImg);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!clienteId && !clienteNuovo) || !firmaOperatoreImg || !firmaCommittenteImg) {
      setError('Compila tutti i campi obbligatori e apponi entrambe le firme');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { data } = await bollettiniApi.create({
        ...(clienteId ? { clienteId } : { clienteNome: clienteTesto.trim() }),
        cantieriIds,
        // Le ore le calcola il server dagli orari, se indicati
        squadre: squadre.map((r) => ({
          numeroOperai: operaiRiga(r),
          ...(modello2 && r.categoria ? { categoria: r.categoria } : {}),
          ...fascePerApi(r),
        })),
        dataRiferimento,
        attivita: attivita.trim(),
        mezzi: modello2 ? [] : mezzi.map(({ id, quantita }) => ({ veicoloId: id, quantita })),
        materialiTesto: materiali.trim(),
        trasporti: modello2 ? [] : toRighe(trasporti),
        ...(modello2
          ? {
              modello: 2 as const,
              riferimentoCantiere: riferimentoCantiere.trim(),
              mezziTesto: mezziTesto.trim(),
              trasportiTesto: trasportiTesto.trim(),
              fatturato,
            }
          : {}),
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

      navigate(elenco);
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
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {modello2 ? 'Nuovo Bollettino (Bollettini Nuovi)' : 'Nuovo Bollettino'}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Una volta firmato il bollettino non è più modificabile.
        </p>

        {/* Ambra e non rosso: il bollettino e' salvato, non e' un errore */}
        {avvisoMail && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <p>{avvisoMail}</p>
            <button
              type="button"
              onClick={() => navigate(elenco)}
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
          {/* Modello 2: in testa a tutto, come nel PDF */}
          {modello2 && (
            <div>
              <label htmlFor="riferimentoCantiere" className="label">Riferimento cantiere</label>
              <input
                type="text"
                id="riferimentoCantiere"
                className="input"
                value={riferimentoCantiere}
                onChange={(e) => setRiferimentoCantiere(e.target.value)}
                maxLength={200}
                placeholder="Es. commessa, indirizzo o nome del cantiere"
                disabled={isSaving}
              />
            </div>
          )}

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

          {modello2 ? (
            <div>
              <label htmlFor="cliente" className="label">Cliente</label>
              <CampoSuggerimenti
                id="cliente"
                value={clienteTesto}
                onChange={handleClienteTesto}
                opzioni={clienti.map((c) => c.nome)}
                maxLength={200}
                placeholder="Scrivi o scegli il cliente"
                disabled={isSaving}
              />
              {clienteNuovo && (
                <p className="mt-1 text-xs text-gray-500">
                  Nuovo cliente: verrà aggiunto all'anagrafica quando salvi il bollettino.
                </p>
              )}
            </div>
          ) : (
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
          )}

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

          {modello2 ? (
            // Mezzi e trasporti a testo libero, dentro le attivita' svolte
            <div className="border border-gray-200 rounded-lg p-3 space-y-3">
              <h3 className="font-medium text-gray-900">Attività svolte</h3>
              <div>
                <label htmlFor="attivita" className="label">Lavori eseguiti</label>
                <textarea
                  id="attivita"
                  className="input min-h-[8rem]"
                  value={attivita}
                  onChange={(e) => setAttivita(e.target.value)}
                  maxLength={5000}
                  placeholder="Descrivi i lavori eseguiti nella giornata"
                />
              </div>
              <div>
                <label htmlFor="mezziTesto" className="label">Mezzi</label>
                <textarea
                  id="mezziTesto"
                  className="input min-h-[5rem]"
                  value={mezziTesto}
                  onChange={(e) => setMezziTesto(e.target.value)}
                  maxLength={5000}
                  placeholder="Descrivi i mezzi utilizzati"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label htmlFor="trasportiTesto" className="label">Trasporti</label>
                <textarea
                  id="trasportiTesto"
                  className="input min-h-[5rem]"
                  value={trasportiTesto}
                  onChange={(e) => setTrasportiTesto(e.target.value)}
                  maxLength={5000}
                  placeholder="Descrivi i trasporti effettuati"
                  disabled={isSaving}
                />
              </div>
            </div>
          ) : (
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
          )}

          <SquadreSelector
            value={squadre}
            onChange={setSquadre}
            disabled={isSaving}
            conCategoria={modello2}
          />

          {/* I mezzi si aggiungono solo dalla Banca dati veicoli, condivisa
              con i noleggi Gica e Dream: niente onCrea */}
          {!modello2 && (
            <BancaDatiSelector
              titolo="Mezzi"
              labelQuantita="Valore"
              voci={veicoli}
              value={mezzi}
              onChange={setMezzi}
              disabled={isSaving}
            />
          )}

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

          {!modello2 && (
            <BancaDatiSelector
              titolo="Trasporti"
              labelQuantita="Viaggi"
              voci={trasportiDisponibili}
              value={trasporti}
              onChange={setTrasporti}
              onCrea={creaVoce('trasporti', setTrasportiDisponibili)}
              disabled={isSaving}
            />
          )}

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

          {modello2 && (
            <div className="border-t pt-5">
              <SceltaOpzioni
                label="Stato"
                name="stato"
                opzioni={OPZIONI_STATO}
                value={fatturato}
                onChange={setFatturato}
                disabled={isSaving || salvato}
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(elenco)}
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
