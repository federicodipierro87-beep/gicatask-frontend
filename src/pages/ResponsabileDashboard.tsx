import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ResponsabileLayout } from '../components/ResponsabileLayout';
import { Modal } from '../components/Modal';
import { attivitaApi } from '../api/client';
import { MonthNavigator, currentMonth, monthRange } from '../components/MonthNavigator';

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
  utente: { id: number; nome: string; cognome: string };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
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

function formatTimeSlot(start?: string, end?: string): string {
  if (start && end) {
    return end < start ? `${start}-${end} (+1)` : `${start}-${end}`;
  }
  return '-';
}

export function ResponsabileDashboard() {
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttivita, setSelectedAttivita] = useState<Attivita | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mese, setMese] = useState(currentMonth);
  const [refreshToken, setRefreshToken] = useState(0);

  const { startDate, endDate } = monthRange(mese);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const response = await attivitaApi.getAll({ startDate, endDate });
        if (cancelled) return;
        setAttivita(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (cancelled) return;
        setAttivita([]);
        console.error('Error loading attivita:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, refreshToken]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await attivitaApi.delete(deleteId);
      setDeleteId(null);
      setRefreshToken((n) => n + 1);
    } catch (err) {
      console.error('Error deleting attivita:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ResponsabileLayout>
      {/* Dettaglio Attività */}
      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-medium text-gray-900">
            Dettaglio Attività
            {!isLoading && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({attivita.length} nel mese)
              </span>
            )}
          </h3>
          <Link to="/responsabile/report" className="flex-shrink-0 text-sm text-primary-600 hover:text-primary-700">
            Vai ai Report →
          </Link>
        </div>

        <MonthNavigator month={mese} onChange={setMese} className="mb-4" />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : attivita.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nessuna attività registrata in questo mese
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="w-20 py-3 px-2"></th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Data</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Dipendente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cliente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cantiere</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Assenza</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600 whitespace-nowrap">Mattino</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600 whitespace-nowrap">Pomeriggio</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Durata</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Note</th>
                </tr>
              </thead>
              <tbody>
                {attivita.map((att) => (
                  <tr
                    key={att.id}
                    className="border-b hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedAttivita(att)}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/responsabile/attivita/modifica/${att.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Modifica attività"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(att.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Elimina attività"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-2">{formatDate(att.dataRiferimento)}</td>
                    <td className="py-3 px-2">{att.utente.nome} {att.utente.cognome}</td>
                    <td className="py-3 px-2 font-medium">{att.cliente?.nome ?? ''}</td>
                    <td className="py-3 px-2">{att.cantiere?.nome ?? ''}</td>
                    <td className="py-3 px-2 text-primary-600">{att.tipoAttivita?.nome ?? ''}</td>
                    <td className="py-3 px-2 text-primary-600">{att.assenza?.nome ?? ''}</td>
                    <td className="py-3 px-2 whitespace-nowrap">{formatTimeSlot(att.oraInizioMattino, att.oraFineMattino)}</td>
                    <td className="py-3 px-2 whitespace-nowrap">{formatTimeSlot(att.oraInizioPomeriggio, att.oraFinePomeriggio)}</td>
                    <td className="py-3 px-2">{formatDuration(att.durataMinuti)}</td>
                    <td className="py-3 px-2 text-gray-500 max-w-[150px] truncate">
                      {att.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                <p className="font-medium text-gray-900 capitalize">{formatDateFull(selectedAttivita.dataRiferimento)}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dipendente</p>
                <p className="font-medium text-gray-900">{selectedAttivita.utente.nome} {selectedAttivita.utente.cognome}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Orario</p>
                <div className="font-medium text-gray-900">
                  {selectedAttivita.oraInizioMattino && selectedAttivita.oraFineMattino && (
                    <p>Mattino: {selectedAttivita.oraInizioMattino} - {selectedAttivita.oraFineMattino}</p>
                  )}
                  {selectedAttivita.oraInizioPomeriggio && selectedAttivita.oraFinePomeriggio && (
                    <p>Pomeriggio: {selectedAttivita.oraInizioPomeriggio} - {selectedAttivita.oraFinePomeriggio}</p>
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
              <Link
                to={`/responsabile/attivita/modifica/${selectedAttivita.id}`}
                className="btn-primary"
                onClick={() => setSelectedAttivita(null)}
              >
                Modifica
              </Link>
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
    </ResponsabileLayout>
  );
}
