import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { Modal } from '../../components/Modal';
import { attivitaApi } from '../../api/client';

interface Attivita {
  id: number;
  dataRiferimento: string;
  oraInizio: string;
  oraFine: string;
  durataMinuti: number;
  note?: string;
  cliente: { id: number; nome: string };
  cantiere: { id: number; nome: string };
  tipoAttivita: { id: number; nome: string };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function isWithinCurrentWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();

  const getMonday = (d: Date): Date => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getSunday = (d: Date): Date => {
    const monday = getMonday(d);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  };

  const weekStart = getMonday(now);
  const weekEnd = getSunday(now);

  return date >= weekStart && date <= weekEnd;
}

export function AttivitaListPage() {
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAttivita = async () => {
    try {
      const response = await attivitaApi.getMine();
      setAttivita(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Errore caricamento attività:', err);
      const status = err.response?.status || 'network';
      const message = err.response?.data?.error || err.message || 'Errore sconosciuto';

      if (status === 401) {
        setError('Sessione scaduta. Effettua nuovamente il login.');
      } else {
        setError(`Errore (${status}): ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttivita();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await attivitaApi.delete(deleteId);
      setDeleteId(null);
      fetchAttivita();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante l\'eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  // Group activities by date
  const groupedAttivita = attivita.reduce((acc, att) => {
    const date = att.dataRiferimento.split('T')[0] || att.dataRiferimento;
    if (!acc[date]) acc[date] = [];
    acc[date].push(att);
    return acc;
  }, {} as Record<string, Attivita[]>);

  const sortedDates = Object.keys(groupedAttivita).sort((a, b) => b.localeCompare(a));

  // Calculate totals
  const totalMinutes = attivita.reduce((sum, a) => sum + a.durataMinuti, 0);

  return (
    <DipendenteLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Le Mie Attività</h2>
          <p className="text-sm text-gray-600 mt-1">
            Totale: {formatDuration(totalMinutes)} ({attivita.length} attività)
          </p>
        </div>
        <Link to="/dipendente/nuova" className="btn-primary">
          + Nuova Attività
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="card flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : attivita.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500 mb-4">Nessuna attività registrata</p>
          <Link to="/dipendente/nuova" className="btn-primary">
            Registra la tua prima attività
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date} className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">
                  {formatDate(date)}
                  {isWithinCurrentWeek(date) && (
                    <span className="ml-2 text-xs text-primary-600 font-normal">
                      (questa settimana)
                    </span>
                  )}
                </h3>
                <span className="text-sm text-gray-500">
                  {formatDuration(
                    groupedAttivita[date]?.reduce((sum, a) => sum + a.durataMinuti, 0) ?? 0
                  )}
                </span>
              </div>

              <div className="space-y-3">
                {groupedAttivita[date]?.map((att) => {
                  const canEdit = isWithinCurrentWeek(att.dataRiferimento);

                  return (
                    <div
                      key={att.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">
                            {att.oraInizio} - {att.oraFine}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({formatDuration(att.durataMinuti)})
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">{att.cliente.nome}</span>
                          {' → '}
                          <span>{att.cantiere.nome}</span>
                          {' → '}
                          <span className="text-primary-600">{att.tipoAttivita.nome}</span>
                        </div>
                        {att.note && (
                          <p className="text-sm text-gray-500 mt-1 italic">
                            "{att.note}"
                          </p>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex gap-2 sm:flex-shrink-0">
                          <Link
                            to={`/dipendente/modifica/${att.id}`}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Modifica
                          </Link>
                          <button
                            onClick={() => setDeleteId(att.id)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Elimina
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Conferma eliminazione"
      >
        <p className="text-gray-600 mb-6">
          Sei sicuro di voler eliminare questa attività? L'operazione non può essere annullata.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteId(null)}
            className="btn-secondary"
            disabled={isDeleting}
          >
            Annulla
          </button>
          <button
            onClick={handleDelete}
            className="btn-danger"
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina'}
          </button>
        </div>
      </Modal>
    </DipendenteLayout>
  );
}
