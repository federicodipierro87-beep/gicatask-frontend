import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { MonthNavigator, currentMonth, monthRange } from '../../components/MonthNavigator';
import {
  InviaNoleggioModal,
  StatoMailNoleggio,
  formatGiorni,
  formatPeriodo,
} from '../../components/InvioNoleggio';
import { useAuth } from '../../context/AuthContext';
import { noleggiApi } from '../../api/client';
import type { Noleggio } from '../../types';

export function NoleggiListPage() {
  const { user } = useAuth();
  const [noleggi, setNoleggi] = useState<Noleggio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mese, setMese] = useState(currentMonth);
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const [daInviare, setDaInviare] = useState<Noleggio | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const { startDate, endDate } = monthRange(mese);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        // Anche un responsabile, qui, vede solo i propri: l'archivio di tutti
        // sta nell'area responsabile
        const response = await noleggiApi.getAll({ utenteId: user.id, startDate, endDate });
        if (cancelled) return;
        setNoleggi(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch {
        if (!cancelled) setError('Errore nel caricamento dei noleggi');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, user?.id, refreshToken]);

  const handleDownload = async (noleggio: Noleggio) => {
    setDownloadId(noleggio.id);
    try {
      await noleggiApi.downloadPdf(noleggio.id);
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
          <h2 className="text-xl font-semibold text-gray-900">I Miei Noleggi</h2>
          <p className="text-sm text-gray-600 mt-1">{noleggi.length} noleggi nel mese</p>
        </div>
        <Link to="/dipendente/noleggi/nuovo" className="btn-primary text-center">
          + Nuovo noleggio
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
      ) : noleggi.length === 0 ? (
        <div className="card">
          <p className="text-center text-gray-500 py-8">Nessun noleggio in questo mese</p>
        </div>
      ) : (
        <div className="space-y-3">
          {noleggi.map((noleggio) => (
            <div key={noleggio.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  {noleggio.cantiereNome && (
                    <p className="text-xs font-medium text-primary-700 uppercase tracking-wide">
                      Cantiere: {noleggio.cantiereNome}
                    </p>
                  )}
                  <p className="font-medium text-gray-900">
                    {formatPeriodo(noleggio)} — {noleggio.veicoloNome}
                  </p>
                  <p className="text-sm text-gray-600">
                    {noleggio.clienteNome} · {formatGiorni(noleggio.giorni)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {noleggio.pieno ? `Pieno ${noleggio.carburante === 'BENZINA' ? 'benzina' : 'diesel'}` : 'Senza pieno'}
                    {' · '}
                    {noleggio.danni ? 'Con danni' : 'Senza danni'}
                    {noleggio.allegati.length > 0 && (
                      <span className="ml-2">📎 {noleggio.allegati.length}</span>
                    )}
                  </p>
                  <p className="text-sm mt-1">
                    Fatturazione: <StatoMailNoleggio noleggio={noleggio} />
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <button
                    onClick={() => handleDownload(noleggio)}
                    disabled={downloadId === noleggio.id}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {downloadId === noleggio.id ? 'Download...' : 'Scarica PDF'}
                  </button>
                  <button
                    onClick={() => setDaInviare(noleggio)}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {noleggio.emailStato === 'INVIATA' ? 'Reinvia' : 'Invia'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <InviaNoleggioModal
        noleggio={daInviare}
        onClose={() => setDaInviare(null)}
        onInviato={() => setRefreshToken((t) => t + 1)}
      />
    </DipendenteLayout>
  );
}
