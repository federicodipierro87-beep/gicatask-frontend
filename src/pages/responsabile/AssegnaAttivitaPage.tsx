import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { DateTimeInput } from '../../components/DateTimeInput';
import { Modal } from '../../components/Modal';
import { clientiApi, cantieriApi, tipiAttivitaApi, tipiAssenzaApi, attivitaApi, utentiApi } from '../../api/client';

interface Cliente {
  id: number;
  nome: string;
}

interface Cantiere {
  id: number;
  nome: string;
}

interface TipoAttivita {
  id: number;
  nome: string;
}

interface TipoAssenza {
  id: number;
  nome: string;
}

interface Utente {
  id: number;
  nome: string;
  cognome: string;
}

const NEW_ITEM_VALUE = '__new__';

const isOvernight = (start: string, end: string) => Boolean(start && end && end < start);

export function AssegnaAttivitaPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dropdown data
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [tipiAttivita, setTipiAttivita] = useState<TipoAttivita[]>([]);
  const [tipiAssenza, setTipiAssenza] = useState<TipoAssenza[]>([]);

  // Form data
  const [utenteId, setUtenteId] = useState<number | null>(null);
  const [dataRiferimento, setDataRiferimento] = useState(
    new Date().toISOString().split('T')[0] || ''
  );
  const [oraInizioMattino, setOraInizioMattino] = useState('');
  const [oraFineMattino, setOraFineMattino] = useState('');
  const [oraInizioPomeriggio, setOraInizioPomeriggio] = useState('');
  const [oraFinePomeriggio, setOraFinePomeriggio] = useState('');
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [cantiereId, setCantiereId] = useState<number | null>(null);
  const [tipoAttivitaId, setTipoAttivitaId] = useState<number | null>(null);
  const [assenzaId, setAssenzaId] = useState<number | null>(null);
  const [note, setNote] = useState('');

  // With an absence selected, cliente, cantiere and time slots are optional
  const isAssenza = assenzaId !== null;

  // Modal states for creating new items
  const [showNewClienteModal, setShowNewClienteModal] = useState(false);
  const [showNewCantiereModal, setShowNewCantiereModal] = useState(false);
  const [showNewTipoModal, setShowNewTipoModal] = useState(false);
  const [showNewAssenzaModal, setShowNewAssenzaModal] = useState(false);
  const [newItemNome, setNewItemNome] = useState('');
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [utentiRes, clientiRes, tipiRes, assenzeRes] = await Promise.all([
          utentiApi.getAll(),
          clientiApi.getAll(),
          tipiAttivitaApi.getAll(),
          tipiAssenzaApi.getAll(),
        ]);
        setUtenti(Array.isArray(utentiRes.data) ? utentiRes.data : []);
        setClienti(Array.isArray(clientiRes.data) ? clientiRes.data : []);
        setTipiAttivita(Array.isArray(tipiRes.data) ? tipiRes.data : []);
        setTipiAssenza(Array.isArray(assenzeRes.data) ? assenzeRes.data : []);
      } catch (err) {
        setError('Errore nel caricamento dei dati');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Load cantieri when cliente changes
  useEffect(() => {
    if (!clienteId) {
      setCantieri([]);
      setCantiereId(null);
      return;
    }

    const loadCantieri = async () => {
      setCantieri([]);
      try {
        const response = await cantieriApi.getByCliente(clienteId);
        setCantieri(Array.isArray(response.data) ? response.data : []);

        if (response.data.length === 1) {
          setCantiereId(response.data[0].id);
        } else {
          setCantiereId(null);
        }
      } catch (err) {
        setError('Errore nel caricamento dei cantieri');
      }
    };

    loadCantieri();
  }, [clienteId]);

  const handleClienteChange = (value: string) => {
    if (value === NEW_ITEM_VALUE) {
      setShowNewClienteModal(true);
    } else {
      setClienteId(value ? parseInt(value) : null);
    }
  };

  const handleCantiereChange = (value: string) => {
    if (value === NEW_ITEM_VALUE) {
      setShowNewCantiereModal(true);
    } else {
      setCantiereId(value ? parseInt(value) : null);
    }
  };

  const handleTipoChange = (value: string) => {
    if (value === NEW_ITEM_VALUE) {
      setShowNewTipoModal(true);
    } else {
      setTipoAttivitaId(value ? parseInt(value) : null);
    }
  };

  const handleAssenzaChange = (value: string) => {
    if (value === NEW_ITEM_VALUE) {
      setShowNewAssenzaModal(true);
    } else {
      setAssenzaId(value ? parseInt(value) : null);
    }
  };

  const handleCreateCliente = async () => {
    if (!newItemNome.trim()) return;

    setIsCreatingItem(true);
    try {
      const response = await clientiApi.create(newItemNome.trim());
      const newCliente = response.data;

      // Reload clienti list
      const clientiRes = await clientiApi.getAll();
      setClienti(Array.isArray(clientiRes.data) ? clientiRes.data : []);

      // Select the new cliente
      setClienteId(newCliente.id);

      setShowNewClienteModal(false);
      setNewItemNome('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la creazione del cliente');
    } finally {
      setIsCreatingItem(false);
    }
  };

  const handleCreateCantiere = async () => {
    if (!newItemNome.trim() || !clienteId) return;

    setIsCreatingItem(true);
    try {
      const response = await cantieriApi.create(clienteId, newItemNome.trim());
      const newCantiere = response.data;

      // Reload cantieri list for this cliente
      const cantieriRes = await cantieriApi.getByCliente(clienteId);
      setCantieri(Array.isArray(cantieriRes.data) ? cantieriRes.data : []);

      // Select the new cantiere
      setCantiereId(newCantiere.id);

      setShowNewCantiereModal(false);
      setNewItemNome('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la creazione del cantiere');
    } finally {
      setIsCreatingItem(false);
    }
  };

  const handleCreateTipo = async () => {
    if (!newItemNome.trim()) return;

    setIsCreatingItem(true);
    try {
      const response = await tipiAttivitaApi.create(newItemNome.trim());
      const newTipo = response.data;

      // Reload tipi list
      const tipiRes = await tipiAttivitaApi.getAll();
      setTipiAttivita(Array.isArray(tipiRes.data) ? tipiRes.data : []);

      // Select the new tipo
      setTipoAttivitaId(newTipo.id);

      setShowNewTipoModal(false);
      setNewItemNome('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la creazione del tipo attivita');
    } finally {
      setIsCreatingItem(false);
    }
  };

  const handleCreateAssenza = async () => {
    if (!newItemNome.trim()) return;

    setIsCreatingItem(true);
    try {
      const response = await tipiAssenzaApi.create(newItemNome.trim());
      const newAssenza = response.data;

      // Reload assenze list
      const assenzeRes = await tipiAssenzaApi.getAll();
      setTipiAssenza(Array.isArray(assenzeRes.data) ? assenzeRes.data : []);

      // Select the new assenza
      setAssenzaId(newAssenza.id);

      setShowNewAssenzaModal(false);
      setNewItemNome('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la creazione dell\'assenza');
    } finally {
      setIsCreatingItem(false);
    }
  };

  const resetForm = () => {
    setUtenteId(null);
    setDataRiferimento(new Date().toISOString().split('T')[0] || '');
    setOraInizioMattino('');
    setOraFineMattino('');
    setOraInizioPomeriggio('');
    setOraFinePomeriggio('');
    setClienteId(null);
    setCantiereId(null);
    setTipoAttivitaId(null);
    setAssenzaId(null);
    setNote('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!utenteId) {
      setError('Compila tutti i campi obbligatori');
      return;
    }

    const hasMattino = oraInizioMattino && oraFineMattino;
    const hasPomeriggio = oraInizioPomeriggio && oraFinePomeriggio;

    if (!isAssenza) {
      if (!clienteId) {
        setError('Compila tutti i campi obbligatori');
        return;
      }

      if (cantieri.length > 0 && !cantiereId) {
        setError('Seleziona un cantiere');
        return;
      }

      // Validate: at least one time slot
      if (!hasMattino && !hasPomeriggio) {
        setError('Devi inserire almeno una fascia oraria (mattino o pomeriggio)');
        return;
      }
    }

    // Validate mattino times
    if (hasMattino && oraFineMattino === oraInizioMattino) {
      setError('L\'ora di fine mattino deve essere diversa dall\'ora di inizio');
      return;
    }

    // Validate pomeriggio times
    if (hasPomeriggio && oraFinePomeriggio === oraInizioPomeriggio) {
      setError('L\'ora di fine pomeriggio deve essere diversa dall\'ora di inizio');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await attivitaApi.create({
        utenteId,
        dataRiferimento,
        oraInizioMattino: oraInizioMattino || undefined,
        oraFineMattino: oraFineMattino || undefined,
        oraInizioPomeriggio: oraInizioPomeriggio || undefined,
        oraFinePomeriggio: oraFinePomeriggio || undefined,
        clienteId: clienteId ?? null,
        cantiereId: cantiereId ?? null,
        tipoAttivitaId: tipoAttivitaId ?? null,
        assenzaId: assenzaId ?? null,
        note: note.trim() || undefined,
      });

      const selectedUtente = utenti.find(u => u.id === utenteId);
      setSuccess(`Attivita assegnata a ${selectedUtente?.nome} ${selectedUtente?.cognome}`);
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ResponsabileLayout>
        <div className="card flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </ResponsabileLayout>
    );
  }

  return (
    <ResponsabileLayout>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Assegna Attivita</h2>
        <p className="text-sm text-gray-600 mt-1">
          Inserisci attivita per conto dei dipendenti
        </p>
      </div>

      <div className="card max-w-2xl">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dipendente */}
          <div>
            <label htmlFor="utente" className="label">Dipendente</label>
            <select
              id="utente"
              className="select"
              value={utenteId ?? ''}
              onChange={(e) => setUtenteId(e.target.value ? parseInt(e.target.value) : null)}
              required
            >
              <option value="">Seleziona dipendente...</option>
              {utenti.map((u) => (
                <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>
              ))}
            </select>
          </div>

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

          {/* Cliente */}
          <div>
            <label htmlFor="cliente" className="label">Cliente</label>
            <select
              id="cliente"
              className="select"
              value={clienteId ?? ''}
              onChange={(e) => handleClienteChange(e.target.value)}
              required={!isAssenza}
            >
              <option value="">Seleziona cliente...</option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
              <option value={NEW_ITEM_VALUE} className="text-primary-600 font-medium">
                + Aggiungi nuovo cliente...
              </option>
            </select>
          </div>

          {/* Cantiere */}
          {cantieri.length > 0 && (
            <div>
              <label htmlFor="cantiere" className="label">Cantiere</label>
              <select
                id="cantiere"
                className="select"
                value={cantiereId ?? ''}
                onChange={(e) => handleCantiereChange(e.target.value)}
                required={!isAssenza}
              >
                <option value="">Seleziona cantiere...</option>
                {cantieri.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
                <option value={NEW_ITEM_VALUE} className="text-primary-600 font-medium">
                  + Aggiungi nuovo cantiere...
                </option>
              </select>
            </div>
          )}

          {/* Tipo Attivita */}
          <div>
            <label htmlFor="tipoAttivita" className="label">
              Tipo Attivita <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <select
              id="tipoAttivita"
              className="select"
              value={tipoAttivitaId ?? ''}
              onChange={(e) => handleTipoChange(e.target.value)}
            >
              <option value="">Seleziona tipo attivita...</option>
              {tipiAttivita.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
              <option value={NEW_ITEM_VALUE} className="text-primary-600 font-medium">
                + Aggiungi nuovo tipo...
              </option>
            </select>
          </div>

          {/* Assenza */}
          <div>
            <label htmlFor="assenza" className="label">
              Assenza <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <select
              id="assenza"
              className="select"
              value={assenzaId ?? ''}
              onChange={(e) => handleAssenzaChange(e.target.value)}
            >
              <option value="">Nessuna assenza</option>
              {tipiAssenza.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
              <option value={NEW_ITEM_VALUE} className="text-primary-600 font-medium">
                + Aggiungi nuova assenza...
              </option>
            </select>
            {isAssenza && (
              <p className="text-sm text-gray-500 mt-1">
                Con un'assenza selezionata, cliente, cantiere e fasce orarie sono facoltativi.
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label htmlFor="note" className="label">
              Note <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <textarea
              id="note"
              className="input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Eventuali note sull'attivita..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/responsabile')}
              className="btn-secondary"
              disabled={isSaving}
            >
              Torna alla dashboard
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !utenteId || (!isAssenza && (!clienteId || (cantieri.length > 0 && !cantiereId) || (!(oraInizioMattino && oraFineMattino) && !(oraInizioPomeriggio && oraFinePomeriggio))))}
            >
              {isSaving ? 'Salvataggio...' : 'Assegna attivita'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Nuovo Cliente */}
      <Modal
        isOpen={showNewClienteModal}
        onClose={() => {
          setShowNewClienteModal(false);
          setNewItemNome('');
        }}
        title="Nuovo Cliente"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="newClienteNome" className="label">Nome Cliente</label>
            <input
              type="text"
              id="newClienteNome"
              className="input"
              value={newItemNome}
              onChange={(e) => setNewItemNome(e.target.value)}
              placeholder="Es. Azienda XYZ"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowNewClienteModal(false);
                setNewItemNome('');
              }}
              className="btn-secondary"
              disabled={isCreatingItem}
            >
              Annulla
            </button>
            <button
              onClick={handleCreateCliente}
              disabled={isCreatingItem || !newItemNome.trim()}
              className="btn-primary"
            >
              {isCreatingItem ? 'Creazione...' : 'Crea Cliente'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Nuovo Cantiere */}
      <Modal
        isOpen={showNewCantiereModal}
        onClose={() => {
          setShowNewCantiereModal(false);
          setNewItemNome('');
        }}
        title="Nuovo Cantiere"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Il cantiere sara creato per: <strong>{clienti.find(c => c.id === clienteId)?.nome}</strong>
          </p>
          <div>
            <label htmlFor="newCantiereNome" className="label">Nome Cantiere</label>
            <input
              type="text"
              id="newCantiereNome"
              className="input"
              value={newItemNome}
              onChange={(e) => setNewItemNome(e.target.value)}
              placeholder="Es. Magazzino Nord"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowNewCantiereModal(false);
                setNewItemNome('');
              }}
              className="btn-secondary"
              disabled={isCreatingItem}
            >
              Annulla
            </button>
            <button
              onClick={handleCreateCantiere}
              disabled={isCreatingItem || !newItemNome.trim()}
              className="btn-primary"
            >
              {isCreatingItem ? 'Creazione...' : 'Crea Cantiere'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Nuovo Tipo Attivita */}
      <Modal
        isOpen={showNewTipoModal}
        onClose={() => {
          setShowNewTipoModal(false);
          setNewItemNome('');
        }}
        title="Nuovo Tipo Attivita"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="newTipoNome" className="label">Nome Tipo Attivita</label>
            <input
              type="text"
              id="newTipoNome"
              className="input"
              value={newItemNome}
              onChange={(e) => setNewItemNome(e.target.value)}
              placeholder="Es. Carico/Scarico"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowNewTipoModal(false);
                setNewItemNome('');
              }}
              className="btn-secondary"
              disabled={isCreatingItem}
            >
              Annulla
            </button>
            <button
              onClick={handleCreateTipo}
              disabled={isCreatingItem || !newItemNome.trim()}
              className="btn-primary"
            >
              {isCreatingItem ? 'Creazione...' : 'Crea Tipo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Nuova Assenza */}
      <Modal
        isOpen={showNewAssenzaModal}
        onClose={() => {
          setShowNewAssenzaModal(false);
          setNewItemNome('');
        }}
        title="Nuova Assenza"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="newAssenzaNome" className="label">Nome Assenza</label>
            <input
              type="text"
              id="newAssenzaNome"
              className="input"
              value={newItemNome}
              onChange={(e) => setNewItemNome(e.target.value)}
              placeholder="Es. Vacanza"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowNewAssenzaModal(false);
                setNewItemNome('');
              }}
              className="btn-secondary"
              disabled={isCreatingItem}
            >
              Annulla
            </button>
            <button
              onClick={handleCreateAssenza}
              disabled={isCreatingItem || !newItemNome.trim()}
              className="btn-primary"
            >
              {isCreatingItem ? 'Creazione...' : 'Crea Assenza'}
            </button>
          </div>
        </div>
      </Modal>
    </ResponsabileLayout>
  );
}
