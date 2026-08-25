import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { DateTimeInput } from '../../components/DateTimeInput';
import { bollettiniApi, cantieriApi, clientiApi, utentiApi } from '../../api/client';
import {
  MonthNavigator,
  currentMonth,
  monthRange,
  monthOf,
  wholeMonthOf,
} from '../../components/MonthNavigator';
import type { MonthKey } from '../../components/MonthNavigator';
import type { Bollettino } from '../../types';

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
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function BollettiniArchivioPage() {
  const [bollettini, setBollettini] = useState<Bollettino[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultDates = monthRange(currentMonth());
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [cantiereId, setCantiereId] = useState<number | null>(null);
  const [utenteId, setUtenteId] = useState<number | null>(null);

  const [downloadId, setDownloadId] = useState<number | null>(null);
  const [isDownloadingCumulativo, setIsDownloadingCumulativo] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const wholeMonth = wholeMonthOf(startDate, endDate);
  const navMonth = wholeMonth ?? monthOf(startDate) ?? currentMonth();

  const handleMonthChange = (month: MonthKey) => {
    const range = monthRange(month);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  useEffect(() => {
    (async () => {
      try {
        const [clientiRes, utentiRes] = await Promise.all([
          clientiApi.getAll(),
          utentiApi.getAll(),
        ]);
        setClienti(Array.isArray(clientiRes.data) ? clientiRes.data : []);
        setUtenti(Array.isArray(utentiRes.data) ? utentiRes.data : []);
      } catch {
        setError('Errore nel caricamento dei filtri');
      }
    })();
  }, []);

  // Il cantiere dipende dal cliente: cambiando cliente il filtro va azzerato
  useEffect(() => {
    if (!clienteId) {
      setCantieri([]);
      setCantiereId(null);
      return;
    }

    (async () => {
      try {
        const response = await cantieriApi.getByCliente(clienteId);
        setCantieri(Array.isArray(response.data) ? response.data : []);
      } catch {
        setError('Errore nel caricamento dei cantieri');
      }
    })();

    setCantiereId(null);
  }, [clienteId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const response = await bollettiniApi.getAll({
          clienteId: clienteId ?? undefined,
          cantiereId: cantiereId ?? undefined,
          utenteId: utenteId ?? undefined,
          startDate,
          endDate,
        });
        if (cancelled) return;
        setBollettini(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch {
        if (!cancelled) setError('Errore nel caricamento dei bollettini');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clienteId, cantiereId, utenteId, startDate, endDate, refreshToken]);

  const totaleOreUomo = bollettini.reduce((sum, b) => sum + b.ore * b.numeroOperai, 0);

  const handleDownload = async (id: number) => {
    setDownloadId(id);
    try {
      await bollettiniApi.downloadPdf(id);
      setError(null);
    } catch {
      setError('Errore durante il download del PDF');
    } finally {
      setDownloadId(null);
    }
  };

  const handleDownloadCumulativo = async () => {
    if (!cantiereId) return;

    setIsDownloadingCumulativo(true);
    try {
      await bollettiniApi.downloadCumulativo(cantiereId, startDate, endDate);
      setError(null);
    } catch {
      setError('Errore durante il download del cumulativo');
    } finally {
      setIsDownloadingCumulativo(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    setIsDeleting(true);
    try {
      await bollettiniApi.delete(deleteId);
      setDeleteId(null);
      setRefreshToken((t) => t + 1);
    } catch {
      setError('Errore durante l\'eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ResponsabileLayout>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Archivio Bollettini</h2>
        <p className="text-sm text-gray-600 mt-1">
          {bollettini.length} bollettini — {totaleOreUomo.toLocaleString('it-IT')} ore-uomo totali
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Chiudi</button>
        </div>
      )}

      <div className="card mb-6">
        <MonthNavigator
          month={navMonth}
          onChange={handleMonthChange}
          label={wholeMonth ? undefined : `${formatDate(startDate)} — ${formatDate(endDate)}`}
          className="mb-4"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="startDate" className="label">Dal</label>
            <DateTimeInput
              type="date"
              id="startDate"
              className="input"
              value={startDate}
              onChange={setStartDate}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="label">Al</label>
            <DateTimeInput
              type="date"
              id="endDate"
              className="input"
              value={endDate}
              onChange={setEndDate}
            />
          </div>
          <div>
            <label htmlFor="cliente" className="label">Cliente</label>
            <select
              id="cliente"
              className="input"
              value={clienteId ?? ''}
              onChange={(e) => setClienteId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">Tutti</option>
              {clienti.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cantiere" className="label">Cantiere</label>
            <select
              id="cantiere"
              className="input"
              value={cantiereId ?? ''}
              onChange={(e) => setCantiereId(e.target.value ? parseInt(e.target.value, 10) : null)}
              disabled={!clienteId}
            >
              <option value="">{clienteId ? 'Tutti' : 'Scegli un cliente'}</option>
              {cantieri.map((cantiere) => (
                <option key={cantiere.id} value={cantiere.id}>{cantiere.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="utente" className="label">Dipendente</label>
            <select
              id="utente"
              className="input"
              value={utenteId ?? ''}
              onChange={(e) => setUtenteId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">Tutti</option>
              {utenti.map((utente) => (
                <option key={utente.id} value={utente.id}>
                  {utente.nome} {utente.cognome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-3">
          <button
            onClick={handleDownloadCumulativo}
            disabled={!cantiereId || isDownloadingCumulativo}
            className="btn-primary"
            title={cantiereId ? undefined : 'Seleziona un cantiere'}
          >
            {isDownloadingCumulativo ? 'Generazione...' : 'Scarica cumulativo cantiere'}
          </button>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : bollettini.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nessun bollettino trovato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Data</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Dipendente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cliente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cantiere</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Operai</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Ore</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {bollettini.map((bollettino) => (
                  <tr key={bollettino.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 whitespace-nowrap">
                      {formatDate(bollettino.dataRiferimento)}
                    </td>
                    <td className="py-3 px-2">
                      {bollettino.utente.nome} {bollettino.utente.cognome}
                    </td>
                    <td className="py-3 px-2">{bollettino.clienteNome}</td>
                    <td className="py-3 px-2">{bollettino.cantiereNome}</td>
                    <td className="py-3 px-2 text-right">{bollettino.numeroOperai}</td>
                    <td className="py-3 px-2 text-right">{bollettino.ore}</td>
                    <td className="py-3 px-2 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => handleDownload(bollettino.id)}
                        disabled={downloadId === bollettino.id}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        {downloadId === bollettino.id ? 'Download...' : 'PDF'}
                      </button>
                      <button
                        onClick={() => setDeleteId(bollettino.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Elimina bollettino"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Il bollettino e le sue righe verranno eliminati definitivamente. Le firme raccolte
            andranno perse.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setDeleteId(null)} className="btn-secondary" disabled={isDeleting}>
              Annulla
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn-primary bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina'}
            </button>
          </div>
        </div>
      </Modal>
    </ResponsabileLayout>
  );
}
