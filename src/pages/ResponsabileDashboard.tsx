import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ResponsabileLayout } from '../components/ResponsabileLayout';
import { attivitaApi } from '../api/client';

interface Attivita {
  id: number;
  dataRiferimento: string;
  oraInizioMattino?: string;
  oraFineMattino?: string;
  oraInizioPomeriggio?: string;
  oraFinePomeriggio?: string;
  durataMinuti: number;
  note?: string;
  cliente: { id: number; nome: string };
  cantiere: { id: number; nome: string };
  tipoAttivita: { id: number; nome: string };
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

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatTimeSlot(start?: string, end?: string): string {
  if (start && end) {
    return `${start}-${end}`;
  }
  return '-';
}

export function ResponsabileDashboard() {
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAttivita = async () => {
      try {
        const response = await attivitaApi.getAll();
        setAttivita(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error loading attivita:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAttivita();
  }, []);

  return (
    <ResponsabileLayout>
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard</h2>
        <p className="text-gray-600 mb-6">
          Benvenuto nell'area responsabile. Da qui puoi gestire clienti, utenti e visualizzare i report.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/responsabile/clienti"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Gestione Clienti</h3>
            <p className="text-sm text-gray-500 mt-1">
              Gestisci clienti, cantieri e tipi attività
            </p>
          </Link>

          <Link
            to="/responsabile/utenti"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Gestione Utenti</h3>
            <p className="text-sm text-gray-500 mt-1">
              Aggiungi, modifica e gestisci gli utenti
            </p>
          </Link>

          <Link
            to="/responsabile/report"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Report Attività</h3>
            <p className="text-sm text-gray-500 mt-1">
              Visualizza e esporta i report delle attività
            </p>
          </Link>

          <Link
            to="/responsabile/assegna"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Assegna Attività</h3>
            <p className="text-sm text-gray-500 mt-1">
              Inserisci attività per conto dei dipendenti
            </p>
          </Link>

          <Link
            to="/responsabile/backup"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Backup & Ripristino</h3>
            <p className="text-sm text-gray-500 mt-1">
              Gestisci i backup del database
            </p>
          </Link>
        </div>
      </div>

      {/* Dettaglio Attività */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            Dettaglio Attività
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({attivita.length} totali)
            </span>
          </h3>
          <Link to="/responsabile/report" className="text-sm text-primary-600 hover:text-primary-700">
            Vai ai Report →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : attivita.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nessuna attività registrata
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Data</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Dipendente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cliente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cantiere</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Mattino</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Pomeriggio</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Durata</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Note</th>
                </tr>
              </thead>
              <tbody>
                {attivita.map((att) => (
                  <tr key={att.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">{formatDate(att.dataRiferimento)}</td>
                    <td className="py-3 px-2">{att.utente.nome} {att.utente.cognome}</td>
                    <td className="py-3 px-2 font-medium">{att.cliente.nome}</td>
                    <td className="py-3 px-2">{att.cantiere.nome}</td>
                    <td className="py-3 px-2 text-primary-600">{att.tipoAttivita.nome}</td>
                    <td className="py-3 px-2">{formatTimeSlot(att.oraInizioMattino, att.oraFineMattino)}</td>
                    <td className="py-3 px-2">{formatTimeSlot(att.oraInizioPomeriggio, att.oraFinePomeriggio)}</td>
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
    </ResponsabileLayout>
  );
}
