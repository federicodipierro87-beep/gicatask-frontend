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

  // Load clienti and tipi attività on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientiRes, tipiRes] = await Promise.all([
          clientiApi.getAll(),
          tipiAttivitaApi.getAll(),
        ]);
        setClienti(clientiRes.data);
        setTipiAttivita(tipiRes.data);

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
                />
              </div>
            </div>
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
                />
              </div>
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
              required
            >
              <option value="">Seleziona tipo attività...</option>
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
              onClick={() => navigate('/dipendente')}
              className="btn-secondary"
              disabled={isSaving}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn-primary"
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
