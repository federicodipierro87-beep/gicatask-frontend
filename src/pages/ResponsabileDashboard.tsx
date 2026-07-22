import { Link } from 'react-router-dom';
import { ResponsabileLayout } from '../components/ResponsabileLayout';

export function ResponsabileDashboard() {
  return (
    <ResponsabileLayout>
      <div className="card">
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

          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-medium text-gray-900">Report Attività</h3>
            <p className="text-sm text-gray-500 mt-1">
              Visualizza e esporta i report delle attività
            </p>
            <span className="inline-block mt-2 text-xs text-gray-400">Prossimamente</span>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-medium text-gray-900">Assegna Attività</h3>
            <p className="text-sm text-gray-500 mt-1">
              Inserisci attività per conto dei dipendenti
            </p>
            <span className="inline-block mt-2 text-xs text-gray-400">Prossimamente</span>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-medium text-gray-900">Backup & Ripristino</h3>
            <p className="text-sm text-gray-500 mt-1">
              Gestisci i backup del database
            </p>
            <span className="inline-block mt-2 text-xs text-gray-400">Prossimamente</span>
          </div>
        </div>
      </div>
    </ResponsabileLayout>
  );
}
