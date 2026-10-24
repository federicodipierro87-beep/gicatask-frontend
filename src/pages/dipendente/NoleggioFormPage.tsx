import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { SignaturePad } from '../../components/SignaturePad';
import { AllegatiUploader } from '../../components/AllegatiUploader';
import { CampoData } from '../../components/CampoData';
import { SceltaOpzioni, OPZIONI_NO_SI, OPZIONI_STATO } from '../../components/SceltaOpzioni';
import { noleggiApi } from '../../api/client';
import type { EsitoEmailBollettino } from '../../api/client';
import type { AllegatoNoleggio, AnagraficheNoleggio, Carburante } from '../../types';

// Stessa regola del backend (utils/email.ts)
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>.]+(\.[^\s@,;<>.]+)+$/;

const ELENCO = '/dipendente/noleggi';

/** Mezza giornata, poi da 1 a 90 giorni. */
const OPZIONI_GIORNI = [
  { valore: 0.5, etichetta: 'Mezza giornata' },
  ...Array.from({ length: 90 }, (_, i) => ({
    valore: i + 1,
    etichetta: i === 0 ? '1 giorno' : `${i + 1} giorni`,
  })),
];

/**
 * Giorni fra uscita e ingresso, contando entrambi: uscita e rientro lo stesso
 * giorno valgono 1. Null se le date mancano o sono invertite.
 */
function giorniTra(uscita: string, ingresso: string): number | null {
  if (!uscita || !ingresso) return null;
  const giorni = Math.round((Date.parse(ingresso) - Date.parse(uscita)) / 86_400_000) + 1;
  return Number.isNaN(giorni) || giorni < 1 ? null : giorni;
}

/** Confronto come lo fa il server: maiuscole e spazi doppi non contano. */
function chiave(valore: string): string {
  return valore.replace(/\s+/g, ' ').trim().toLowerCase();
}

function messaggioAvviso(esito: EsitoEmailBollettino): string {
  switch (esito.stato) {
    case 'NON_CONFIGURATA':
      return 'Noleggio salvato. L\'invio e-mail non è ancora attivo: potrai inviarlo dall\'elenco dei noleggi.';
    case 'NON_VALIDA':
      return `Noleggio salvato. L'indirizzo «${esito.destinatario ?? ''}» non sembra valido: la mail non è stata inviata.`;
    default:
      return 'Noleggio salvato, ma l\'invio non è riuscito. La firma è al sicuro: puoi reinviarlo dall\'elenco dei noleggi.';
  }
}

/** Casella "Salva in anagrafica" sotto un campo a testo libero. */
function SalvaInAnagrafica({
  id,
  checked,
  onChange,
  disabled,
  nota,
}: {
  id: string;
  checked: boolean;
  onChange: (valore: boolean) => void;
  disabled?: boolean;
  nota?: string;
}) {
  return (
    <div className="mt-1">
      <label htmlFor={id} className="inline-flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          id={id}
          checked={checked && !disabled}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        Nuovo: salva in anagrafica
      </label>
      {nota && <p className="text-xs text-gray-500">{nota}</p>}
    </div>
  );
}

export function NoleggioFormPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Il verbale e' firmato: salvato una volta, i pulsanti restano spenti
  const [salvato, setSalvato] = useState(false);
  const [avvisoMail, setAvvisoMail] = useState<string | null>(null);

  const [anagrafiche, setAnagrafiche] = useState<AnagraficheNoleggio>({ clienti: [], veicoli: [] });

  const oggi = new Date().toISOString().split('T')[0] || '';
  const [data, setData] = useState(oggi);
  const [dataIngresso, setDataIngresso] = useState(oggi);
  const [cantiere, setCantiere] = useState('');
  const [salvaCantiere, setSalvaCantiere] = useState(false);
  const [cliente, setCliente] = useState('');
  const [salvaCliente, setSalvaCliente] = useState(false);
  const [veicolo, setVeicolo] = useState('');
  const [salvaVeicolo, setSalvaVeicolo] = useState(false);
  const [giorni, setGiorni] = useState(1);

  // null finché non si risponde: Sì o No vanno scelti esplicitamente
  const [pieno, setPieno] = useState<boolean | null>(null);
  const [carburante, setCarburante] = useState<Carburante | null>(null);
  const [scontrini, setScontrini] = useState<AllegatoNoleggio[]>([]);

  const [danniPrecedenti, setDanniPrecedenti] = useState<boolean | null>(null);
  const [danniPrecedentiNote, setDanniPrecedentiNote] = useState('');
  const [fotoDanniPrecedenti, setFotoDanniPrecedenti] = useState<AllegatoNoleggio[]>([]);

  const [danni, setDanni] = useState<boolean | null>(null);
  const [danniNote, setDanniNote] = useState('');
  const [fotoDanni, setFotoDanni] = useState<AllegatoNoleggio[]>([]);

  const [email, setEmail] = useState('');
  const [aggiornaEmail, setAggiornaEmail] = useState(false);

  const [firmaNome, setFirmaNome] = useState('');
  const [firmaEmail, setFirmaEmail] = useState('');
  const [firmaImg, setFirmaImg] = useState<string | null>(null);
  const [fatturato, setFatturato] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: risposta } = await noleggiApi.getAnagrafiche();
        setAnagrafiche(risposta);
      } catch {
        setError('Errore nel caricamento delle anagrafiche');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const clienteTrovato = anagrafiche.clienti.find((c) => chiave(c.nome) === chiave(cliente)) ?? null;
  // Senza cliente scelto i suggerimenti sono tutti i cantieri, col cliente accanto
  const cantieriProposti = clienteTrovato
    ? clienteTrovato.cantieri.map((c) => ({ nome: c.nome, cliente: clienteTrovato.nome }))
    : anagrafiche.clienti.flatMap((c) => c.cantieri.map((k) => ({ nome: k.nome, cliente: c.nome })));
  const cantiereTrovato = clienteTrovato
    ? clienteTrovato.cantieri.some((c) => chiave(c.nome) === chiave(cantiere))
    : false;
  const veicoloTrovato = anagrafiche.veicoli.some((v) => chiave(v.nome) === chiave(veicolo));

  // Il cliente esiste o esistera' dopo il salvataggio: solo allora un cantiere
  // nuovo ha dove essere salvato
  const clienteInAnagrafica = Boolean(clienteTrovato) || (cliente.trim().length > 0 && salvaCliente);

  // Un cantiere scritto senza cliente, se il nome e' di un solo cliente,
  // compila il cliente da se'
  const handleCantiere = (valore: string) => {
    setCantiere(valore);
    if (cliente.trim()) return;
    const proprietari = anagrafiche.clienti.filter((c) =>
      c.cantieri.some((k) => chiave(k.nome) === chiave(valore))
    );
    const [unico] = proprietari;
    if (proprietari.length === 1 && unico) handleCliente(unico.nome);
  };

  // Il cliente in anagrafica propone il suo indirizzo, se il campo e' vuoto o
  // contiene ancora quello proposto per il cliente precedente
  const handleCliente = (valore: string) => {
    const precedente = anagrafiche.clienti.find((c) => chiave(c.nome) === chiave(cliente));
    const nuovo = anagrafiche.clienti.find((c) => chiave(c.nome) === chiave(valore));
    setCliente(valore);
    if (!email.trim() || (precedente?.emailFatturazione && email.trim() === precedente.emailFatturazione)) {
      setEmail(nuovo?.emailFatturazione ?? '');
    }
  };

  // Le date propongono i giorni di noleggio, che restano modificabili. Sullo
  // stesso giorno la mezza giornata scelta non viene toccata
  const aggiornaGiorni = (uscita: string, ingresso: string) => {
    const calcolati = giorniTra(uscita, ingresso);
    if (calcolati === null) return;
    setGiorni((attuali) => (calcolati === 1 && attuali === 0.5 ? 0.5 : Math.min(calcolati, 90)));
  };

  const handleDataUscita = (valore: string) => {
    setData(valore);
    aggiornaGiorni(valore, dataIngresso);
  };

  const handleDataIngresso = (valore: string) => {
    setDataIngresso(valore);
    aggiornaGiorni(data, valore);
  };

  const dateInvertite = Boolean(data && dataIngresso && dataIngresso < data);

  const emailPulita = email.trim();
  const emailValida = EMAIL_RE.test(emailPulita);
  const emailNonValida = emailPulita.length > 0 && !emailValida;
  // "Aggiorna anagrafica" ha senso solo se l'indirizzo e' nuovo per il cliente
  const firmaEmailNonValida = firmaEmail.trim().length > 0 && !EMAIL_RE.test(firmaEmail.trim());
  const emailDaAggiornare =
    emailValida &&
    clienteInAnagrafica &&
    chiave(emailPulita) !== chiave(clienteTrovato?.emailFatturazione ?? '');

  const puoSalvare =
    cliente.trim().length > 0 &&
    veicolo.trim().length > 0 &&
    Boolean(data) &&
    Boolean(dataIngresso) &&
    !dateInvertite &&
    pieno !== null &&
    danniPrecedenti !== null &&
    danni !== null &&
    (!pieno || carburante !== null) &&
    firmaNome.trim().length > 0 &&
    Boolean(firmaImg) &&
    !salvato;

  const salva = async (invia: boolean) => {
    if (!puoSalvare || !firmaImg) {
      setError('Compila i campi obbligatori e fai firmare chi ha effettuato il noleggio');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { data: risposta } = await noleggiApi.create({
        data,
        dataIngresso,
        cantiereNome: cantiere.trim() || undefined,
        salvaCantiere: salvaCantiere && !cantiereTrovato && clienteInAnagrafica,
        clienteNome: cliente.trim(),
        salvaCliente: salvaCliente && !clienteTrovato,
        veicoloNome: veicolo.trim(),
        salvaVeicolo: salvaVeicolo && !veicoloTrovato,
        giorni,
        pieno: Boolean(pieno),
        ...(pieno && carburante ? { carburante } : {}),
        danniPrecedenti: Boolean(danniPrecedenti),
        ...(danniPrecedenti && danniPrecedentiNote.trim()
          ? { danniPrecedentiNote: danniPrecedentiNote.trim() }
          : {}),
        danni: Boolean(danni),
        ...(danni && danniNote.trim() ? { danniNote: danniNote.trim() } : {}),
        ...(emailPulita ? { emailFatturazione: emailPulita } : {}),
        aggiornaEmailCliente: aggiornaEmail && emailDaAggiornare,
        firmaNome: firmaNome.trim(),
        ...(firmaEmail.trim() ? { firmaEmail: firmaEmail.trim() } : {}),
        firmaImg,
        fatturato,
        scontrinoIds: pieno ? scontrini.map((a) => a.id) : [],
        danniPrecedentiIds: danniPrecedenti ? fotoDanniPrecedenti.map((a) => a.id) : [],
        danniIds: danni ? fotoDanni.map((a) => a.id) : [],
        invia,
      });

      setSalvato(true);

      if (risposta.email && risposta.email.stato !== 'INVIATA') {
        setAvvisoMail(messaggioAvviso(risposta.email));
        return; // l'avviso va letto
      }

      navigate(ELENCO);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    salva(false);
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

  const bloccato = isSaving || salvato;

  return (
    <DipendenteLayout>
      <div className="card max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Nuovo Noleggio</h2>
        <p className="text-sm text-gray-600 mb-6">
          Una volta firmato il verbale non è più modificabile.
        </p>

        {/* Ambra e non rosso: il verbale e' salvato, non e' un errore */}
        {avvisoMail && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <p>{avvisoMail}</p>
            <button type="button" onClick={() => navigate(ELENCO)} className="btn-primary mt-3">
              Torna ai noleggi
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* noValidate: la validazione nativa del campo e-mail bloccherebbe il
            submit con un fumetto di sistema; i controlli sono qui sotto */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CampoData id="dataUscita" label="Data uscita" value={data} onChange={handleDataUscita} required />
              <CampoData
                id="dataIngresso"
                label="Data ingresso"
                value={dataIngresso}
                onChange={handleDataIngresso}
                required
              />
            </div>
            {dateInvertite && (
              <p className="text-sm text-red-600 mt-1">
                La data di ingresso non può essere prima della data di uscita.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cantiere" className="label">Cantiere</label>
            <input
              type="text"
              id="cantiere"
              className="input"
              list="noleggio-cantieri"
              value={cantiere}
              onChange={(e) => handleCantiere(e.target.value)}
              maxLength={200}
              placeholder="Scrivi o scegli il cantiere"
              autoComplete="off"
              disabled={bloccato}
            />
            <datalist id="noleggio-cantieri">
              {cantieriProposti.map((c, i) => (
                <option key={`${c.cliente}-${c.nome}-${i}`} value={c.nome}>
                  {clienteTrovato ? undefined : c.cliente}
                </option>
              ))}
            </datalist>
            {cantiere.trim() && !cantiereTrovato && (
              <SalvaInAnagrafica
                id="salvaCantiere"
                checked={salvaCantiere}
                onChange={setSalvaCantiere}
                disabled={bloccato || !clienteInAnagrafica}
                nota={
                  clienteInAnagrafica
                    ? undefined
                    : 'Per salvare il cantiere serve un cliente in anagrafica: scegli il cliente o salva anche lui.'
                }
              />
            )}
          </div>

          <div>
            <label htmlFor="cliente" className="label">Cliente</label>
            <input
              type="text"
              id="cliente"
              className="input"
              list="noleggio-clienti"
              value={cliente}
              onChange={(e) => handleCliente(e.target.value)}
              maxLength={200}
              placeholder="Scrivi o scegli il cliente"
              autoComplete="off"
              disabled={bloccato}
            />
            <datalist id="noleggio-clienti">
              {anagrafiche.clienti.map((c) => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
            {cliente.trim() && !clienteTrovato && (
              <SalvaInAnagrafica
                id="salvaCliente"
                checked={salvaCliente}
                onChange={setSalvaCliente}
                disabled={bloccato}
              />
            )}
          </div>

          <div>
            <label htmlFor="veicolo" className="label">Veicolo</label>
            <input
              type="text"
              id="veicolo"
              className="input"
              list="noleggio-veicoli"
              value={veicolo}
              onChange={(e) => setVeicolo(e.target.value)}
              maxLength={200}
              placeholder="Scrivi o scegli il veicolo"
              autoComplete="off"
              disabled={bloccato}
            />
            <datalist id="noleggio-veicoli">
              {anagrafiche.veicoli.map((v) => (
                <option key={v.id} value={v.nome} />
              ))}
            </datalist>
            {veicolo.trim() && !veicoloTrovato && (
              <SalvaInAnagrafica
                id="salvaVeicolo"
                checked={salvaVeicolo}
                onChange={setSalvaVeicolo}
                disabled={bloccato}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="giorni" className="label">Giorni di noleggio</label>
              <select
                id="giorni"
                className="input"
                value={giorni}
                onChange={(e) => setGiorni(parseFloat(e.target.value))}
                disabled={bloccato}
              >
                {OPZIONI_GIORNI.map((o) => (
                  <option key={o.valore} value={o.valore}>{o.etichetta}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <SceltaOpzioni
              label="Ha fatto il pieno?"
              name="pieno"
              opzioni={OPZIONI_NO_SI}
              value={pieno}
              onChange={setPieno}
              disabled={bloccato}
            />
            {pieno && (
              <>
                <div className="flex gap-6">
                  {(['DIESEL', 'BENZINA'] as const).map((tipo) => (
                    <label key={tipo} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="carburante"
                        checked={carburante === tipo}
                        onChange={() => setCarburante(tipo)}
                        disabled={bloccato}
                        className="border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      {tipo === 'DIESEL' ? 'Diesel' : 'Benzina'}
                    </label>
                  ))}
                </div>
                {carburante === null && (
                  <p className="text-xs text-amber-700">Indica se il pieno è di diesel o di benzina.</p>
                )}
                <AllegatiUploader
                  value={scontrini}
                  onChange={setScontrini}
                  carica={noleggiApi.uploadAllegato}
                  rimuovi={noleggiApi.deleteAllegato}
                  etichetta="Foto dello scontrino"
                  aiuto="Immagini o PDF, fino a 5 file. Finiscono nel PDF del verbale e nella mail."
                  maxFile={5}
                  disabled={bloccato}
                />
              </>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <SceltaOpzioni
              label="Il mezzo aveva già danni prima di uscire?"
              name="danniPrecedenti"
              opzioni={OPZIONI_NO_SI}
              value={danniPrecedenti}
              onChange={setDanniPrecedenti}
              disabled={bloccato}
            />
            {danniPrecedenti && (
              <>
                <div>
                  <label htmlFor="danniPrecedentiNote" className="label">
                    Descrizione <span className="text-gray-400 font-normal">(facoltativa)</span>
                  </label>
                  <textarea
                    id="danniPrecedentiNote"
                    className="input min-h-[5rem]"
                    value={danniPrecedentiNote}
                    onChange={(e) => setDanniPrecedentiNote(e.target.value)}
                    maxLength={5000}
                    placeholder="Descrivi i danni già presenti all'uscita"
                    disabled={bloccato}
                  />
                </div>
                <AllegatiUploader
                  value={fotoDanniPrecedenti}
                  onChange={setFotoDanniPrecedenti}
                  carica={noleggiApi.uploadAllegato}
                  rimuovi={noleggiApi.deleteAllegato}
                  etichetta="Foto dei danni già presenti"
                  aiuto="Immagini o PDF, fino a 10 file. Finiscono nel PDF del verbale e nella mail."
                  disabled={bloccato}
                />
              </>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <SceltaOpzioni
              label="Ha riportato danni?"
              name="danni"
              opzioni={OPZIONI_NO_SI}
              value={danni}
              onChange={setDanni}
              disabled={bloccato}
            />
            {danni && (
              <>
                <div>
                  <label htmlFor="danniNote" className="label">
                    Descrizione <span className="text-gray-400 font-normal">(facoltativa)</span>
                  </label>
                  <textarea
                    id="danniNote"
                    className="input min-h-[5rem]"
                    value={danniNote}
                    onChange={(e) => setDanniNote(e.target.value)}
                    maxLength={5000}
                    placeholder="Descrivi i danni riscontrati"
                    disabled={bloccato}
                  />
                </div>
                <AllegatiUploader
                  value={fotoDanni}
                  onChange={setFotoDanni}
                  carica={noleggiApi.uploadAllegato}
                  rimuovi={noleggiApi.deleteAllegato}
                  etichetta="Foto dei danni"
                  aiuto="Immagini o PDF, fino a 10 file. Finiscono nel PDF del verbale e nella mail."
                  disabled={bloccato}
                />
              </>
            )}
          </div>

          <div>
            <label htmlFor="email" className="label">Fatturazione</label>
            <input
              type="email"
              id="email"
              className="input"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={254}
              placeholder="fatture@cliente.ch"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={bloccato}
            />
            <p className="mt-1 text-xs text-gray-500">
              Con "Salva e invia" il verbale in PDF, con le foto, parte a questo indirizzo.
            </p>
            {emailNonValida && (
              <p className="mt-1 text-xs text-amber-700">L'indirizzo non sembra valido.</p>
            )}
            {emailDaAggiornare && (
              <label className="mt-1 inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={aggiornaEmail}
                  onChange={(e) => setAggiornaEmail(e.target.checked)}
                  disabled={bloccato}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Aggiorna l'anagrafica del cliente con questo indirizzo
              </label>
            )}
          </div>

          <div className="border-t pt-5">
            <label htmlFor="firmaNome" className="label">Nome di chi ha effettuato il noleggio</label>
            <input
              type="text"
              id="firmaNome"
              className="input"
              value={firmaNome}
              onChange={(e) => setFirmaNome(e.target.value)}
              maxLength={200}
              disabled={bloccato}
            />
            <label htmlFor="firmaEmail" className="label mt-4">
              E-mail di chi ha effettuato il noleggio{' '}
              <span className="text-gray-400 font-normal">(facoltativa)</span>
            </label>
            <input
              type="email"
              id="firmaEmail"
              className="input"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={254}
              value={firmaEmail}
              onChange={(e) => setFirmaEmail(e.target.value)}
              disabled={bloccato}
            />
            {firmaEmailNonValida && (
              <p className="mt-1 text-xs text-amber-700">L'indirizzo non sembra valido.</p>
            )}
            <div className="mt-4">
              <SignaturePad
                label="Firma"
                value={firmaImg}
                onChange={setFirmaImg}
                disabled={bloccato}
              />
            </div>
          </div>

          <div className="border-t pt-5">
            <SceltaOpzioni
              label="Stato"
              name="stato"
              opzioni={OPZIONI_STATO}
              value={fatturato}
              onChange={setFatturato}
              disabled={bloccato}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(ELENCO)}
              className="btn-secondary"
              disabled={isSaving}
            >
              Annulla
            </button>
            <button type="submit" className="btn-secondary" disabled={isSaving || !puoSalvare}>
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
            <button
              type="button"
              onClick={() => salva(true)}
              className="btn-primary"
              disabled={isSaving || !puoSalvare || !emailValida}
              title={emailValida ? undefined : 'Indica un indirizzo di fatturazione valido'}
            >
              {isSaving ? 'Invio...' : 'Salva e invia'}
            </button>
          </div>
        </form>
      </div>
    </DipendenteLayout>
  );
}
