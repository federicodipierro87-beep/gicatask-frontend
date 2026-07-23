import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { DateTimeInput } from '../../components/DateTimeInput';
import { clientiApi, cantieriApi, tipiAttivitaApi, attivitaApi } from '../../api/client';

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

export function AttivitaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [tipiAttivita, setTipiAttivita] = useState<TipoAttivita[]>([]);

  // Form data
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
  const [note, setNote] = useState('');

  // Load clienti on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await clientiApi.getAll();
        setClienti(response.data);

        // If editing, load the activity
        if (id) {
          const attivitaRes = await attivitaApi.getById(parseInt(id));
          const att = attivitaRes.data;

          setDataRiferimento(att.dataRiferimento.split('T')[0]);
          setOraInizioMattino(att.oraInizioMattino || '');
          setOraFineMattino(att.oraFineMattino || '');
          setOraInizioPomeriggio(att.oraInizioPomeriggio || '');
          setOraFinePomeriggio(att.oraFinePomeriggio || '');
          setClienteId(att.clienteId);
          setCantiereId(att.cantiereId);
          setTipoAttivitaId(att.tipoAttivitaId);
          setNote(att.note || '');

          // Load cantieri for the selected cliente
          const cantieriRes = await cantieriApi.getByCliente(att.clienteId);
          setCantieri(cantieriRes.data);

          // Load tipi for the selected cantiere
          const tipiRes = await tipiAttivitaApi.getByCantiere(att.cantiereId);
          setTipiAttivita(tipiRes.data);
        }
      } catch (err) {
        setError('Errore nel caricamento dei dati');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

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
        setCantieri(response.data);

        // Auto-select if only one cantiere
        if (response.data.length === 1) {
          setCantiereId(response.data[0].id);
        } else if (!isEditing) {
          setCantiereId(null);
        }
      } catch (err) {
        setError('Errore nel caricamento dei cantieri');
      }
    };

    loadCantieri();
  }, [clienteId, isEditing]);

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
        setTipiAttivita(response.data);

        // Auto-select if only one tipo
        if (response.data.length === 1) {
          setTipoAttivitaId(response.data[0].id);
        } else if (!isEditing) {
          setTipoAttivitaId(null);
        }
      } catch (err) {
        setError('Errore nel caricamento dei tipi attività');
      }
    };

    loadTipi();
  }, [cantiereId, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId || !cantiereId || !tipoAttivitaId) {
      setError('Compila tutti i campi obbligatori');
      return;
    }

    // Validate: at least one time slot
    const hasMattino = oraInizioMattino && oraFineMattino;
    const hasPomeriggio = oraInizioPomeriggio && oraFinePomeriggio;

    if (!hasMattino && !hasPomeriggio) {
      setError('Devi inserire almeno una fascia oraria (mattino o pomeriggio)');
      return;
    }

    // Validate mattino times
    if (hasMattino && oraFineMattino <= oraInizioMattino) {
      setError('L\'ora di fine mattino deve essere successiva all\'ora di inizio');
      return;
    }

    // Validate pomeriggio times
    if (hasPomeriggio && oraFinePomeriggio <= oraInizioPomeriggio) {
      setError('L\'ora di fine pomeriggio deve essere successiva all\'ora di inizio');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const data = {
        dataRiferimento,
        oraInizioMattino: oraInizioMattino || undefined,
        oraFineMattino: oraFineMattino || undefined,
        oraInizioPomeriggio: oraInizioPomeriggio || undefined,
        oraFinePomeriggio: oraFinePomeriggio || undefined,
        clienteId,
        cantiereId,
        tipoAttivitaId,
        note: note.trim() || undefined,
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
      <div className="mb-4">
        <button
          onClick={() => navigate('/dipendente')}
          className="text-base text-gray-600 hover:text-primary-600 flex items-center gap-1 py-2"
        >
          ← Torna alle attività
        </button>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {isEditing ? 'Modifica Attività' : 'Nuova Attività'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Data */}
          <div>
            <label htmlFor="data" className="label text-base">Data</label>
            <DateTimeInput
              type="date"
              id="data"
              className="input text-base py-3 text-center"
              value={dataRiferimento}
              onChange={setDataRiferimento}
              required
            />
          </div>

          {/* Fascia Mattino */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="label text-base mb-3">Mattino <span className="text-gray-400 font-normal">(opzionale)</span></label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="oraInizioMattino" className="label text-sm">Inizio</label>
                <DateTimeInput
                  type="time"
                  id="oraInizioMattino"
                  className="input text-base py-3 text-center"
                  value={oraInizioMattino}
                  onChange={setOraInizioMattino}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="oraFineMattino" className="label text-sm">Fine</label>
                <DateTimeInput
                  type="time"
                  id="oraFineMattino"
                  className="input text-base py-3 text-center"
                  value={oraFineMattino}
                  onChange={setOraFineMattino}
                />
              </div>
            </div>
          </div>

          {/* Fascia Pomeriggio */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="label text-base mb-3">Pomeriggio <span className="text-gray-400 font-normal">(opzionale)</span></label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="oraInizioPomeriggio" className="label text-sm">Inizio</label>
                <DateTimeInput
                  type="time"
                  id="oraInizioPomeriggio"
                  className="input text-base py-3 text-center"
                  value={oraInizioPomeriggio}
                  onChange={setOraInizioPomeriggio}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="oraFinePomeriggio" className="label text-sm">Fine</label>
                <DateTimeInput
                  type="time"
                  id="oraFinePomeriggio"
                  className="input text-base py-3 text-center"
                  value={oraFinePomeriggio}
                  onChange={setOraFinePomeriggio}
                />
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label htmlFor="cliente" className="label text-base">Cliente</label>
            <select
              id="cliente"
              className="select text-base py-3"
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
            <label htmlFor="cantiere" className="label text-base">Cantiere</label>
            <select
              id="cantiere"
              className="select text-base py-3"
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
            <label htmlFor="tipoAttivita" className="label text-base">Tipo Attività</label>
            <select
              id="tipoAttivita"
              className="select text-base py-3"
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
            <label htmlFor="note" className="label text-base">
              Note <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <textarea
              id="note"
              className="input text-base py-3"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Eventuali note sull'attività..."
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/dipendente')}
              className="btn-secondary text-base py-3 w-full sm:w-auto"
              disabled={isSaving}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn-primary text-base py-3 w-full sm:w-auto"
              disabled={isSaving || !clienteId || !cantiereId || !tipoAttivitaId || (!(oraInizioMattino && oraFineMattino) && !(oraInizioPomeriggio && oraFinePomeriggio))}
            >
              {isSaving ? 'Salvataggio...' : isEditing ? 'Salva modifiche' : 'Registra attività'}
            </button>
          </div>
        </form>
      </div>
    </DipendenteLayout>
  );
}
