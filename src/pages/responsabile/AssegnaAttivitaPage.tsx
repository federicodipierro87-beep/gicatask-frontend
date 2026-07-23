import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { DateTimeInput } from '../../components/DateTimeInput';
import { clientiApi, cantieriApi, tipiAttivitaApi, attivitaApi, utentiApi } from '../../api/client';

interface Cliente {
  id: number;
  nome: string;
}

interface Cantiere {
  id: number;
  nome: string;
  isGenerico: boolean;
}

interface TipoAttivita {
  id: number;
  nome: string;
}

interface Utente {
  id: number;
  nome: string;
  cognome: string;
}

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

  // Form data
  const [utenteId, setUtenteId] = useState<number | null>(null);
  const [dataRiferimento, setDataRiferimento] = useState(
    new Date().toISOString().split('T')[0] || ''
  );
  const [oraInizio, setOraInizio] = useState('08:00');
  const [oraFine, setOraFine] = useState('17:00');
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [cantiereId, setCantiereId] = useState<number | null>(null);
  const [tipoAttivitaId, setTipoAttivitaId] = useState<number | null>(null);
  const [note, setNote] = useState('');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [utentiRes, clientiRes] = await Promise.all([
          utentiApi.getAll(),
          clientiApi.getAll(),
        ]);
        setUtenti(Array.isArray(utentiRes.data) ? utentiRes.data : []);
        setClienti(Array.isArray(clientiRes.data) ? clientiRes.data : []);
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

  // Load tipi when cantiere changes
  useEffect(() => {
    if (!cantiereId) {
      setTipiAttivita([]);
      setTipoAttivitaId(null);
      return;
    }

    const loadTipi = async () => {
      try {
        const response = await tipiAttivitaApi.getByCantiere(cantiereId);
        setTipiAttivita(Array.isArray(response.data) ? response.data : []);

        if (response.data.length === 1) {
          setTipoAttivitaId(response.data[0].id);
        } else {
          setTipoAttivitaId(null);
        }
      } catch (err) {
        setError('Errore nel caricamento dei tipi attività');
      }
    };

    loadTipi();
  }, [cantiereId]);

  const resetForm = () => {
    setUtenteId(null);
    setDataRiferimento(new Date().toISOString().split('T')[0] || '');
    setOraInizio('08:00');
    setOraFine('17:00');
    setClienteId(null);
    setCantiereId(null);
    setTipoAttivitaId(null);
    setNote('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!utenteId || !clienteId || !cantiereId || !tipoAttivitaId) {
      setError('Compila tutti i campi obbligatori');
      return;
    }

    if (oraFine <= oraInizio) {
      setError('L\'ora di fine deve essere successiva all\'ora di inizio');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await attivitaApi.create({
        utenteId,
        dataRiferimento,
        oraInizio,
        oraFine,
        clienteId,
        cantiereId,
        tipoAttivitaId,
        note: note.trim() || undefined,
      });

      const selectedUtente = utenti.find(u => u.id === utenteId);
      setSuccess(`Attività assegnata a ${selectedUtente?.nome} ${selectedUtente?.cognome}`);
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
        <h2 className="text-xl font-semibold text-gray-900">Assegna Attività</h2>
        <p className="text-sm text-gray-600 mt-1">
          Inserisci attività per conto dei dipendenti
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

          {/* Data e orari */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div>
              <label htmlFor="oraInizio" className="label">Ora inizio</label>
              <DateTimeInput
                type="time"
                id="oraInizio"
                className="input"
                value={oraInizio}
                onChange={setOraInizio}
                required
              />
            </div>
            <div>
              <label htmlFor="oraFine" className="label">Ora fine</label>
              <DateTimeInput
                type="time"
                id="oraFine"
                className="input"
                value={oraFine}
                onChange={setOraFine}
                required
              />
            </div>
          </div>

          {/* Cliente */}
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

          {/* Cantiere */}
          <div>
            <label htmlFor="cantiere" className="label">Cantiere</label>
            <select
              id="cantiere"
              className="select"
              value={cantiereId ?? ''}
              onChange={(e) => setCantiereId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={!clienteId}
              required
            >
              <option value="">
                {clienteId ? 'Seleziona cantiere...' : 'Prima seleziona un cliente'}
              </option>
              {cantieri.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}{c.isGenerico ? ' (generico)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo Attività */}
          <div>
            <label htmlFor="tipoAttivita" className="label">Tipo Attività</label>
            <select
              id="tipoAttivita"
              className="select"
              value={tipoAttivitaId ?? ''}
              onChange={(e) => setTipoAttivitaId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={!cantiereId}
              required
            >
              <option value="">
                {cantiereId ? 'Seleziona tipo attività...' : 'Prima seleziona un cantiere'}
              </option>
              {tipiAttivita.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
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
              placeholder="Eventuali note sull'attività..."
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
              disabled={isSaving || !utenteId || !clienteId || !cantiereId || !tipoAttivitaId}
            >
              {isSaving ? 'Salvataggio...' : 'Assegna attività'}
            </button>
          </div>
        </form>
      </div>
    </ResponsabileLayout>
  );
}
