import { useAuth } from '../context/AuthContext';

export function ResponsabileDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-700 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">GicaTask</h1>
            <p className="text-sm text-primary-200">Area Responsabile</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-primary-100">
              {user?.nome} {user?.cognome}
            </span>
            <button
              onClick={logout}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm transition-colors"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Benvenuto, {user?.nome}!
          </h2>
          <p className="text-gray-600">
            Questa è l'area dedicata ai responsabili. Qui potrai gestire le
            anagrafiche, visualizzare i report e gestire i backup.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900">Gestione Utenti</h3>
              <p className="text-sm text-gray-500 mt-1">
                Aggiungi, modifica e gestisci gli utenti
              </p>
              <button className="btn-primary mt-4 w-full" disabled>
                Prossimamente
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900">Gestione Clienti</h3>
              <p className="text-sm text-gray-500 mt-1">
                Gestisci clienti, cantieri e tipi attività
              </p>
              <button className="btn-primary mt-4 w-full" disabled>
                Prossimamente
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900">Report Attività</h3>
              <p className="text-sm text-gray-500 mt-1">
                Visualizza e esporta i report delle attività
              </p>
              <button className="btn-secondary mt-4 w-full" disabled>
                Prossimamente
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900">Assegna Attività</h3>
              <p className="text-sm text-gray-500 mt-1">
                Inserisci attività per conto dei dipendenti
              </p>
              <button className="btn-secondary mt-4 w-full" disabled>
                Prossimamente
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900">Backup & Ripristino</h3>
              <p className="text-sm text-gray-500 mt-1">
                Gestisci i backup del database
              </p>
              <button className="btn-secondary mt-4 w-full" disabled>
                Prossimamente
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-medium text-gray-900">Statistiche</h3>
              <p className="text-sm text-gray-500 mt-1">
                Dashboard con statistiche generali
              </p>
              <button className="btn-secondary mt-4 w-full" disabled>
                Prossimamente
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
