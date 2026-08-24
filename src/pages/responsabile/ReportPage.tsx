import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { DateTimeInput } from '../../components/DateTimeInput';
import { attivitaApi, clientiApi, cantieriApi, utentiApi } from '../../api/client';
import {
  MonthNavigator,
  currentMonth,
  monthRange,
  monthOf,
  wholeMonthOf,
} from '../../components/MonthNavigator';
import type { MonthKey } from '../../components/MonthNavigator';

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

function formatTimeSlot(start?: string, end?: string): string {
  if (start && end) {
    return end < start ? `${start}-${end} (+1)` : `${start}-${end}`;
  }
  return '-';
}

interface Cliente {
  id: number;
  nome: string;
}

interface Cantiere {
  id: number;
  nome: string;
}

interface Utente {
  id: number;
  nome: string;
  cognome: string;
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

export function ReportPage() {
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const defaultDates = monthRange(currentMonth());
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [cantiereId, setCantiereId] = useState<number | null>(null);
  const [utenteId, setUtenteId] = useState<number | null>(null);

  // Export loading states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Detail modal
  const [selectedAttivita, setSelectedAttivita] = useState<Attivita | null>(null);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [refreshToken, setRefreshToken] = useState(0);

  // Il mese è derivato dalle date: startDate/endDate restano l'unica fonte di verità
  const wholeMonth = wholeMonthOf(startDate, endDate);
  const navMonth = wholeMonth ?? monthOf(startDate) ?? currentMonth();

  const handleMonthChange = (month: MonthKey) => {
    const range = monthRange(month);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [clientiRes, utentiRes] = await Promise.all([
          clientiApi.getAll(),
          utentiApi.getAll(),
        ]);
        setClienti(Array.isArray(clientiRes.data) ? clientiRes.data : []);
        setUtenti(Array.isArray(utentiRes.data) ? utentiRes.data : []);
      } catch (err) {
        console.error('Error loading filters data:', err);
      }
    };
    loadFiltersData();
  }, []);

  // Load cantieri when cliente changes
  useEffect(() => {
    if (clienteId) {
      const loadCantieri = async () => {
        try {
          const res = await cantieriApi.getByCliente(clienteId);
          setCantieri(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
          console.error('Error loading cantieri:', err);
          setCantieri([]);
        }
      };
      loadCantieri();
    } else {
      setCantieri([]);
      setCantiereId(null);
    }
  }, [clienteId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const filters: {
          utenteId?: number;
          clienteId?: number;
          cantiereId?: number;
          startDate?: string;
          endDate?: string;
        } = {};

        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (clienteId) filters.clienteId = clienteId;
        if (cantiereId) filters.cantiereId = cantiereId;
        if (utenteId) filters.utenteId = utenteId;

        const response = await attivitaApi.getAll(filters);
        if (cancelled) return;
        setAttivita(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (cancelled) return;
        setAttivita([]);
        setError('Errore nel caricamento delle attività');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, clienteId, cantiereId, utenteId, refreshToken]);

  const buildExportUrl = (format: 'pdf' | 'excel') => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (clienteId) params.append('clienteId', clienteId.toString());
    if (cantiereId) params.append('cantiereId', cantiereId.toString());
    if (utenteId) params.append('utenteId', utenteId.toString());

    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}/api/attivita/export/${format}?${params.toString()}`;
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    const setLoading = format === 'pdf' ? setIsExportingPdf : setIsExportingExcel;
    setLoading(true);

    try {
      const response = await fetch(buildExportUrl(format), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Il periodo sta nel nome del file: nel foglio Excel non e' piu' riportato
      const periodo = startDate && endDate ? `${startDate}_${endDate}` : 'tutto';
      a.download = `report-attivita-${periodo}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Errore durante l'esportazione ${format.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await attivitaApi.delete(deleteId);
      setDeleteId(null);
      // Refresh the list
      setRefreshToken((n) => n + 1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante l\'eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate totals
  const totalMinutes = attivita.reduce((sum, a) => sum + a.durataMinuti, 0);

  // Group by client for summary
  const byClient = attivita.reduce((acc, att) => {
    const key = att.cliente?.nome ?? 'Assenze';
    if (!acc[key]) acc[key] = { count: 0, minutes: 0 };
    acc[key].count++;
    acc[key].minutes += att.durataMinuti;
    return acc;
  }, {} as Record<string, { count: number; minutes: number }>);

  // Group by employee for summary
  const byEmployee = attivita.reduce((acc, att) => {
    const key = `${att.utente.nome} ${att.utente.cognome}`;
    if (!acc[key]) acc[key] = { count: 0, minutes: 0 };
    acc[key].count++;
    acc[key].minutes += att.durataMinuti;
    return acc;
  }, {} as Record<string, { count: number; minutes: number }>);

  return (
    <ResponsabileLayout>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Report Attività</h2>
        <p className="text-sm text-gray-600 mt-1">
          Visualizza, filtra ed esporta le attività registrate
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="font-medium text-gray-900">Filtri</h3>
          <MonthNavigator
            month={navMonth}
            onChange={handleMonthChange}
            label={wholeMonth ? undefined : 'Periodo personalizzato'}
            className="sm:w-64"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label htmlFor="startDate" className="label">Dal</label>
            <DateTimeInput
              type="date"
              id="startDate"
              className="input"
              value={startDate ?? ''}
              onChange={setStartDate}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="label">Al</label>
            <DateTimeInput
              type="date"
              id="endDate"
              className="input"
              value={endDate ?? ''}
              onChange={setEndDate}
            />
          </div>
          <div>
            <label htmlFor="cliente" className="label">Cliente</label>
            <select
              id="cliente"
              className="select"
              value={clienteId ?? ''}
              onChange={(e) => {
                setClienteId(e.target.value ? parseInt(e.target.value) : null);
                setCantiereId(null);
              }}
            >
              <option value="">Tutti i clienti</option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cantiere" className="label">Cantiere</label>
            <select
              id="cantiere"
              className="select"
              value={cantiereId ?? ''}
              onChange={(e) => setCantiereId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={!clienteId}
            >
              <option value="">Tutti i cantieri</option>
              {cantieri.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="utente" className="label">Dipendente</label>
            <select
              id="utente"
              className="select"
              value={utenteId ?? ''}
              onChange={(e) => setUtenteId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Tutti i dipendenti</option>
              {utenti.map((u) => (
                <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          <button
            onClick={() => handleExport('excel')}
            disabled={isExportingExcel || attivita.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            {isExportingExcel ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            Esporta Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExportingPdf || attivita.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            {isExportingPdf ? (
              <span className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            Esporta PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card bg-primary-50 border-primary-200">
          <h4 className="text-sm font-medium text-primary-900">Totale Attività</h4>
          <p className="text-2xl font-bold text-primary-700 mt-1">{attivita.length}</p>
        </div>
        <div className="card bg-green-50 border-green-200">
          <h4 className="text-sm font-medium text-green-900">Ore Totali</h4>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {(totalMinutes / 60).toFixed(1)}h
          </p>
        </div>
        <div className="card bg-blue-50 border-blue-200">
          <h4 className="text-sm font-medium text-blue-900">Clienti Attivi</h4>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {Object.keys(byClient).filter((k) => k !== 'Assenze').length}
          </p>
        </div>
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-3">Per Cliente</h3>
          {Object.keys(byClient).length === 0 ? (
            <p className="text-gray-500 text-sm">Nessun dato</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(byClient)
                .sort((a, b) => b[1].minutes - a[1].minutes)
                .map(([cliente, stats]) => (
                  <div key={cliente} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="font-medium text-gray-900">{cliente}</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-600">{stats.count} att.</span>
                      <span className="ml-3 text-sm font-medium text-primary-600">
                        {formatDuration(stats.minutes)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-medium text-gray-900 mb-3">Per Dipendente</h3>
          {Object.keys(byEmployee).length === 0 ? (
            <p className="text-gray-500 text-sm">Nessun dato</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(byEmployee)
                .sort((a, b) => b[1].minutes - a[1].minutes)
                .map(([dipendente, stats]) => (
                  <div key={dipendente} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="font-medium text-gray-900">{dipendente}</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-600">{stats.count} att.</span>
                      <span className="ml-3 text-sm font-medium text-primary-600">
                        {formatDuration(stats.minutes)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Activities Table */}
      <div className="card">
        <h3 className="font-medium text-gray-900 mb-4">
          Dettaglio Attività
          {!isLoading && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({attivita.length} risultati)
            </span>
          )}
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : attivita.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nessuna attività trovata per i filtri selezionati
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="w-10 py-3 px-2"></th>
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

            <div className="flex justify-end pt-4 border-t">
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
