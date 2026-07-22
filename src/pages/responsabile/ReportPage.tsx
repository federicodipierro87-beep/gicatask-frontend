import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { attivitaApi, clientiApi, utentiApi } from '../../api/client';

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
  utente: { id: number; nome: string; cognome: string };
}

interface Cliente {
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

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function getDefaultDateRange() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: firstDayOfMonth.toISOString().split('T')[0],
    endDate: lastDayOfMonth.toISOString().split('T')[0],
  };
}

export function ReportPage() {
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const defaultDates = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [utenteId, setUtenteId] = useState<number | null>(null);

  // Export loading states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

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

  const fetchAttivita = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: {
        utenteId?: number;
        clienteId?: number;
        startDate?: string;
        endDate?: string;
      } = {};

      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (clienteId) filters.clienteId = clienteId;
      if (utenteId) filters.utenteId = utenteId;

      const response = await attivitaApi.getAll(filters);
      setAttivita(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Errore nel caricamento delle attività');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttivita();
  }, [startDate, endDate, clienteId, utenteId]);

  const buildExportUrl = (format: 'pdf' | 'excel') => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (clienteId) params.append('clienteId', clienteId.toString());
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
      a.download = `report-attivita-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
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

  // Calculate totals
  const totalMinutes = attivita.reduce((sum, a) => sum + a.durataMinuti, 0);

  // Group by client for summary
  const byClient = attivita.reduce((acc, att) => {
    const key = att.cliente.nome;
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
        <h3 className="font-medium text-gray-900 mb-4">Filtri</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="startDate" className="label">Dal</label>
            <input
              type="date"
              id="startDate"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="label">Al</label>
            <input
              type="date"
              id="endDate"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="cliente" className="label">Cliente</label>
            <select
              id="cliente"
              className="select"
              value={clienteId ?? ''}
              onChange={(e) => setClienteId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Tutti i clienti</option>
              {clienti.map((c) => (
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
            {Object.keys(byClient).length}
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
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({attivita.length} risultati)
          </span>
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
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Data</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Orario</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Durata</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Dipendente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cliente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cantiere</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Note</th>
                </tr>
              </thead>
              <tbody>
                {attivita.map((att) => (
                  <tr key={att.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">{formatDate(att.dataRiferimento)}</td>
                    <td className="py-3 px-2">{att.oraInizio} - {att.oraFine}</td>
                    <td className="py-3 px-2">{formatDuration(att.durataMinuti)}</td>
                    <td className="py-3 px-2">{att.utente.nome} {att.utente.cognome}</td>
                    <td className="py-3 px-2 font-medium">{att.cliente.nome}</td>
                    <td className="py-3 px-2">{att.cantiere.nome}</td>
                    <td className="py-3 px-2 text-primary-600">{att.tipoAttivita.nome}</td>
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
    </ResponsabileLayout>
  );
}
