import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { DateTimeInput } from '../../components/DateTimeInput';
import { tipiAssenzaApi, attivitaApi } from '../../api/client';

interface TipoAssenza {
  id: number;
  nome: string;
}

export function AssenzaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipiAssenza, setTipiAssenza] = useState<TipoAssenza[]>([]);

  const [dataRiferimento, setDataRiferimento] = useState(
    new Date().toISOString().split('T')[0] || ''
  );
  const [assenzaId, setAssenzaId] = useState<number | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const assenzeRes = await tipiAssenzaApi.getAll();
        setTipiAssenza(assenzeRes.data);

        if (id) {
          const attivitaRes = await attivitaApi.getById(parseInt(id));
          const att = attivitaRes.data;

          // Not an absence: this belongs to the activity form
          if (!att.assenzaId) {
            navigate(`/dipendente/modifica/${id}`, { replace: true });
            return;
          }

          setDataRiferimento(att.dataRiferimento.split('T')[0]);
          setAssenzaId(att.assenzaId);
          setNote(att.note || '');
        }
      } catch (err) {
        setError('Errore nel caricamento dei dati');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assenzaId) {
      setError('Seleziona un tipo di assenza');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isEditing && id) {
        // Omitting cliente, cantiere and orari keeps any historical value intact
        await attivitaApi.update(parseInt(id), {
          dataRiferimento,
          assenzaId,
          note: note.trim() || undefined,
        });
      } else {
        await attivitaApi.create({
          dataRiferimento,
          assenzaId,
          clienteId: null,
          cantiereId: null,
          tipoAttivitaId: null,
          note: note.trim() || undefined,
        });
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Modifica Assenza' : 'Registra Assenza'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {isEditing ? 'Modifica i dettagli dell\'assenza' : 'Registra una giornata di assenza'}
        </p>
      </div>

      <div className="card max-w-2xl">
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

          {/* Tipo di assenza */}
          <div>
            <label htmlFor="assenza" className="label">Tipo di assenza</label>
            <select
              id="assenza"
              className="select"
              value={assenzaId ?? ''}
              onChange={(e) => setAssenzaId(e.target.value ? parseInt(e.target.value) : null)}
              required
            >
              <option value="">Seleziona assenza...</option>
              {tipiAssenza.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              La giornata viene conteggiata come 8h 12m.
            </p>
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
              placeholder="Eventuali note sull'assenza..."
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
              Torna alle attività
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !assenzaId}
            >
              {isSaving ? 'Salvataggio...' : isEditing ? 'Salva modifiche' : 'Registra assenza'}
            </button>
          </div>
        </form>
      </div>
    </DipendenteLayout>
  );
}
