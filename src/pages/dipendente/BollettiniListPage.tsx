import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { MonthNavigator, currentMonth, monthRange } from '../../components/MonthNavigator';
import { bollettiniApi } from '../../api/client';
import type { Bollettino } from '../../types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function BollettiniListPage() {
  const [bollettini, setBollettini] = useState<Bollettino[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mese, setMese] = useState(currentMonth);
  const [downloadId, setDownloadId] = useState<number | null>(null);

  const { startDate, endDate } = monthRange(mese);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const response = await bollettiniApi.getAll({ startDate, endDate });
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
  }, [startDate, endDate]);

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

  return (
    <DipendenteLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">I Miei Bollettini</h2>
          <p className="text-sm text-gray-600 mt-1">{bollettini.length} bollettini nel mese</p>
        </div>
        <Link to="/dipendente/bollettini/nuovo" className="btn-primary text-center">
          + Nuovo bollettino
        </Link>
      </div>

      <MonthNavigator month={mese} onChange={setMese} className="mb-4" />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Chiudi</button>
        </div>
      )}

      {isLoading ? (
        <div className="card flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : bollettini.length === 0 ? (
        <div className="card">
          <p className="text-center text-gray-500 py-8">Nessun bollettino in questo mese</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bollettini.map((bollettino) => (
            <div key={bollettino.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {formatDate(bollettino.dataRiferimento)} — {bollettino.cantiereNome}
                  </p>
                  <p className="text-sm text-gray-600">{bollettino.clienteNome}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {bollettino.numeroOperai} operai × {bollettino.ore} ore
                  </p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{bollettino.attivita}</p>
                </div>
                <button
                  onClick={() => handleDownload(bollettino.id)}
                  disabled={downloadId === bollettino.id}
                  className="btn-secondary whitespace-nowrap"
                >
                  {downloadId === bollettino.id ? 'Download...' : 'Scarica PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DipendenteLayout>
  );
}
