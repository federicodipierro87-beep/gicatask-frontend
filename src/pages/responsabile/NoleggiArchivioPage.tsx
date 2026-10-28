import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { CampoData } from '../../components/CampoData';
import {
  InviaNoleggioModal,
  StatoMailNoleggio,
  formatGiorni,
  formatPeriodo,
} from '../../components/InvioNoleggio';
import { noleggiApi, utentiApi } from '../../api/client';
import {
  MonthNavigator,
  currentMonth,
  monthRange,
  monthOf,
  wholeMonthOf,
} from '../../components/MonthNavigator';
import type { MonthKey } from '../../components/MonthNavigator';
import type { Noleggio } from '../../types';
import { nomeUtente } from '../../utils/nomeUtente';

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

/** Foto del verbale divise per tipo, coi nomi cliccabili. */
function CellaFoto({
  noleggio,
  onApri,
}: {
  noleggio: Noleggio;
  onApri: (id: number, nomeFile: string) => void;
}) {
  if (noleggio.allegati.length === 0) return <span className="text-gray-400">—</span>;

  const gruppi = [
    { titolo: 'Scontrino', foto: noleggio.allegati.filter((a) => a.tipo === 'SCONTRINO') },
    { titolo: 'Danni prima', foto: noleggio.allegati.filter((a) => a.tipo === 'DANNI_PRECEDENTI') },
    { titolo: 'Danni', foto: noleggio.allegati.filter((a) => a.tipo === 'DANNI') },
  ];

  return (
    <div className="flex flex-col gap-0.5 max-w-[12rem]">
      {gruppi.map(({ titolo, foto }) =>
        foto.map((a, i) => (
          <button
            key={a.id}
            onClick={() => onApri(a.id, a.nomeFile)}
            className="text-primary-600 hover:text-primary-700 text-sm text-left truncate"
            title={a.nomeFile}
          >
            {titolo} {foto.length > 1 ? i + 1 : ''}
          </button>
        ))
      )}
    </div>
  );
}

/** Archivio di tutti i verbali di noleggio, col flag della sezione. */
export function NoleggiArchivioPage() {
  const [noleggi, setNoleggi] = useState<Noleggio[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultDates = monthRange(currentMonth());
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [utenteId, setUtenteId] = useState<number | null>(null);

  const [downloadId, setDownloadId] = useState<number | null>(null);
  const [fatturatoId, setFatturatoId] = useState<number | null>(null);
  const [daInviare, setDaInviare] = useState<Noleggio | null>(null);
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
        const response = await utentiApi.getAll();
        setUtenti(Array.isArray(response.data) ? response.data : []);
      } catch {
        setError('Errore nel caricamento dei dipendenti');
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const response = await noleggiApi.getAll({
          utenteId: utenteId ?? undefined,
          startDate,
          endDate,
        });
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
  }, [utenteId, startDate, endDate, refreshToken]);

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

  // Aggiornamento ottimistico: la riga cambia subito e torna com'era se il
  // server rifiuta
  const handleFatturato = async (noleggio: Noleggio) => {
    const nuovo = !noleggio.fatturato;
    const aggiorna = (fatturato: boolean) =>
      setNoleggi((prev) =>
        prev.map((n) =>
          n.id === noleggio.id
            ? { ...n, fatturato, fatturatoAt: fatturato ? new Date().toISOString() : null }
            : n
        )
      );

    setFatturatoId(noleggio.id);
    aggiorna(nuovo);
    try {
      await noleggiApi.setFatturato(noleggio.id, nuovo);
      setError(null);
    } catch {
      aggiorna(noleggio.fatturato);
      setError('Errore durante l\'aggiornamento dello stato');
    } finally {
      setFatturatoId(null);
    }
  };

  const handleApriFoto = async (id: number, nomeFile: string) => {
    try {
      await noleggiApi.downloadAllegato(id, nomeFile);
      setError(null);
    } catch {
      setError('Errore durante il download della foto');
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    setIsDeleting(true);
    try {
      await noleggiApi.delete(deleteId);
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
        <h2 className="text-xl font-semibold text-gray-900">Noleggi</h2>
        <p className="text-sm text-gray-600 mt-1">{noleggi.length} verbali di noleggio</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CampoData id="startDate" label="Dal" value={startDate} onChange={setStartDate} />
          <CampoData id="endDate" label="Al" value={endDate} onChange={setEndDate} />
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
                <option key={utente.id} value={utente.id}>{nomeUtente(utente)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : noleggi.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nessun noleggio trovato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Uscita – Ingresso</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Dipendente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cantiere</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cliente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Veicolo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Durata</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Pieno</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Danni</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Foto</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Fatturazione</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">Fatturato</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {noleggi.map((noleggio) => (
                  <tr key={noleggio.id} className="border-b hover:bg-gray-50 align-top">
                    <td className="py-3 px-2">{formatPeriodo(noleggio)}</td>
                    <td className="py-3 px-2">{nomeUtente(noleggio.utente)}</td>
                    <td className="py-3 px-2">{noleggio.cantiereNome ?? '—'}</td>
                    <td className="py-3 px-2">{noleggio.clienteNome}</td>
                    <td className="py-3 px-2">{noleggio.veicoloNome}</td>
                    <td className="py-3 px-2 whitespace-nowrap">{formatGiorni(noleggio.giorni)}</td>
                    <td className="py-3 px-2">
                      {noleggio.pieno ? (noleggio.carburante === 'BENZINA' ? 'Benzina' : 'Diesel') : 'No'}
                    </td>
                    <td
                      className="py-3 px-2"
                      title={
                        [
                          noleggio.danniPrecedentiNote && `Prima dell'uscita: ${noleggio.danniPrecedentiNote}`,
                          noleggio.danniNote,
                        ]
                          .filter(Boolean)
                          .join('\n') || undefined
                      }
                    >
                      {noleggio.danni ? <span className="text-red-600">Sì</span> : 'No'}
                      {noleggio.danniPrecedenti && (
                        <span className="block text-xs text-amber-700 whitespace-nowrap">
                          Già all'uscita
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <CellaFoto noleggio={noleggio} onApri={handleApriFoto} />
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <StatoMailNoleggio noleggio={noleggio} />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={noleggio.fatturato}
                        disabled={fatturatoId === noleggio.id}
                        onChange={() => handleFatturato(noleggio)}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        aria-label={`Fatturato, noleggio ${noleggio.id}`}
                        title={
                          noleggio.fatturato && noleggio.fatturatoAt
                            ? `Fatturato il ${formatDate(noleggio.fatturatoAt)}`
                            : 'Aperto'
                        }
                      />
                    </td>
                    <td className="py-3 px-2 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => handleDownload(noleggio)}
                        disabled={downloadId === noleggio.id}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        {downloadId === noleggio.id ? 'Download...' : 'PDF'}
                      </button>
                      <Link
                        to={`/responsabile/noleggi/${noleggio.id}/modifica`}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Modifica
                      </Link>
                      {/* Come nel form: si invia solo un noleggio fatturato */}
                      <button
                        onClick={() => setDaInviare(noleggio)}
                        disabled={!noleggio.fatturato}
                        className="text-primary-600 hover:text-primary-700 text-sm disabled:text-gray-300 disabled:cursor-not-allowed"
                        title={noleggio.fatturato ? undefined : 'Aperto: per inviarlo spunta Fatturato'}
                      >
                        {noleggio.emailStato === 'INVIATA' ? 'Reinvia' : 'Invia mail'}
                      </button>
                      <button
                        onClick={() => setDeleteId(noleggio.id)}
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

      <InviaNoleggioModal
        noleggio={daInviare}
        onClose={() => setDaInviare(null)}
        onInviato={() => setRefreshToken((t) => t + 1)}
      />

      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Elimina noleggio">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Il verbale e le sue foto verranno eliminati definitivamente. La firma raccolta andrà
            persa.
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
