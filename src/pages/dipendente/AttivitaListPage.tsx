import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { Modal } from '../../components/Modal';
import { attivitaApi } from '../../api/client';

interface Attivita {
  id: number;
  dataRiferimento: string;
  oraInizioMattino?: string;
  oraFineMattino?: string;
  oraInizioPomeriggio?: string;
  oraFinePomeriggio?: string;
  durataMinuti: number;
  note?: string;
  cliente: { id: number; nome: string } | null;
  cantiere: { id: number; nome: string } | null;
  tipoAttivita: { id: number; nome: string } | null;
  assenza: { id: number; nome: string } | null;
}

function formatTimeSlot(start?: string, end?: string): string | null {
  if (start && end) {
    return end < start ? `${start}-${end} (+1)` : `${start}-${end}`;
  }
  return null;
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

type DateStatus = 'past' | 'today' | 'future';

function getDateStatus(dateStr: string): DateStatus {
  const date = new Date(dateStr);
  const now = new Date();

  // Normalize to compare only dates (ignore time)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateOnly.getTime() < todayOnly.getTime()) {
    return 'past';
  } else if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'today';
  } else {
    return 'future';
  }
}

function getCardClasses(status: DateStatus): string {
  switch (status) {
    case 'past':
      return 'card bg-red-50/70 border-red-200';
    case 'today':
      return 'card bg-green-50 border-green-200';
    case 'future':
    default:
      return 'card';
  }
}

function getActivityRowClasses(status: DateStatus): string {
  switch (status) {
    case 'past':
      return 'p-3 bg-red-100/50 rounded-lg';
    case 'today':
      return 'p-3 bg-green-100/50 rounded-lg';
    case 'future':
    default:
      return 'p-3 bg-gray-50 rounded-lg';
  }
}

export function AttivitaListPage() {
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedAttivita, setSelectedAttivita] = useState<Attivita | null>(null);

  const fetchAttivita = async () => {
    try {
      const response = await attivitaApi.getMine();
      setAttivita(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err: any) {
      console.error('Errore caricamento attività:', err);

      let errorDetails = '';

      if (err.response) {
        // Errore dal server
        errorDetails = `Status: ${err.response.status} | ${err.response.data?.error || err.response.statusText || 'Errore server'}`;
      } else if (err.request) {
        // Nessuna risposta dal server
        errorDetails = 'Nessuna risposta dal server. Controlla la connessione.';
      } else {
        // Errore nella richiesta
        errorDetails = `Errore: ${err.message}`;
      }

      setError(errorDetails);
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
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
          <p className="text-red-800 font-bold text-lg mb-2">Errore</p>
          <p className="text-red-700 text-base break-all">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded"
          >
            Riprova
          </button>
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
          {sortedDates.map((date) => {
            const dateStatus = getDateStatus(date);
            return (
            <div key={date} className={getCardClasses(dateStatus)}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">
                  {formatDate(date)}
                  {dateStatus === 'today' && (
                    <span className="ml-2 text-xs text-green-600 font-semibold">
                      (oggi)
                    </span>
                  )}
                  {dateStatus !== 'today' && isWithinCurrentWeek(date) && (
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
                      onClick={() => setSelectedAttivita(att)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between ${getActivityRowClasses(dateStatus)} gap-2 cursor-pointer hover:opacity-80 transition-opacity`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {formatTimeSlot(att.oraInizioMattino, att.oraFineMattino) && (
                            <span className="font-medium text-gray-900">
                              M: {formatTimeSlot(att.oraInizioMattino, att.oraFineMattino)}
                            </span>
                          )}
                          {formatTimeSlot(att.oraInizioPomeriggio, att.oraFinePomeriggio) && (
                            <span className="font-medium text-gray-900">
                              P: {formatTimeSlot(att.oraInizioPomeriggio, att.oraFinePomeriggio)}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            ({formatDuration(att.durataMinuti)})
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1 truncate">
                          {att.assenza ? (
                            <span className="font-medium text-primary-600">{att.assenza.nome}</span>
                          ) : (
                            <>
                              {att.cliente && <span className="font-medium">{att.cliente.nome}</span>}
                              {att.cantiere && (
                                <>
                                  {att.cliente && ' → '}
                                  <span>{att.cantiere.nome}</span>
                                </>
                              )}
                              {att.tipoAttivita && (
                                <>
                                  {(att.cliente || att.cantiere) && ' → '}
                                  <span className="text-primary-600">{att.tipoAttivita.nome}</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                        {att.note && (
                          <p className="text-sm text-gray-500 mt-1 italic truncate">
                            "{att.note}"
                          </p>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex gap-2 sm:flex-shrink-0">
                          <Link
                            to={att.assenza ? `/dipendente/assenze/modifica/${att.id}` : `/dipendente/modifica/${att.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Modifica
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(att.id);
                            }}
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
            );
          })}
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

      {/* Activity detail modal */}
      <Modal
        isOpen={selectedAttivita !== null}
        onClose={() => setSelectedAttivita(null)}
        title="Dettaglio Attività"
      >
        {selectedAttivita && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Data</p>
                <p className="font-medium text-gray-900">{formatDate(selectedAttivita.dataRiferimento)}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Orario</p>
                <div className="font-medium text-gray-900">
                  {formatTimeSlot(selectedAttivita.oraInizioMattino, selectedAttivita.oraFineMattino) && (
                    <p>Mattino: {formatTimeSlot(selectedAttivita.oraInizioMattino, selectedAttivita.oraFineMattino)}</p>
                  )}
                  {formatTimeSlot(selectedAttivita.oraInizioPomeriggio, selectedAttivita.oraFinePomeriggio) && (
                    <p>Pomeriggio: {formatTimeSlot(selectedAttivita.oraInizioPomeriggio, selectedAttivita.oraFinePomeriggio)}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">Totale: {formatDuration(selectedAttivita.durataMinuti)}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cliente</p>
                <p className="font-medium text-gray-900">{selectedAttivita.cliente?.nome ?? ''}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cantiere</p>
                <p className="font-medium text-gray-900">{selectedAttivita.cantiere?.nome ?? ''}</p>
              </div>

              {selectedAttivita.tipoAttivita && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo Attività</p>
                  <p className="font-medium text-primary-600">{selectedAttivita.tipoAttivita.nome}</p>
                </div>
              )}

              {selectedAttivita.assenza && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Assenza</p>
                  <p className="font-medium text-primary-600">{selectedAttivita.assenza.nome}</p>
                </div>
              )}

              {selectedAttivita.note && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Note</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedAttivita.note}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              {isWithinCurrentWeek(selectedAttivita.dataRiferimento) && (
                <>
                  <Link
                    to={selectedAttivita.assenza ? `/dipendente/assenze/modifica/${selectedAttivita.id}` : `/dipendente/modifica/${selectedAttivita.id}`}
                    className="btn-primary"
                    onClick={() => setSelectedAttivita(null)}
                  >
                    Modifica
                  </Link>
                  <button
                    onClick={() => {
                      setDeleteId(selectedAttivita.id);
                      setSelectedAttivita(null);
                    }}
                    className="btn-danger"
                  >
                    Elimina
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedAttivita(null)}
                className="btn-secondary"
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DipendenteLayout>
  );
}
