import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { backupApi } from '../../api/client';

interface Backup {
  id: number;
  filename: string;
  tipo: string;
  dimensione: number;
  dimensioneFormatted: string;
  stato: string;
  createdAt: string;
}

interface BackupStatus {
  configured: boolean;
  lastBackup: { date: string; stato: string } | null;
  totalBackups: number;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Action states
  const [isCreating, setIsCreating] = useState(false);
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [statusRes, backupsRes] = await Promise.all([
        backupApi.getStatus(),
        backupApi.getAll(),
      ]);
      setStatus(statusRes.data);
      setBackups(Array.isArray(backupsRes.data) ? backupsRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore nel caricamento dei dati');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await backupApi.create();
      setSuccess(`Backup creato: ${res.data.filename}`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la creazione del backup');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreId) return;

    setIsRestoring(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await backupApi.restore(restoreId);
      const stats = Object.entries(res.data.stats)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
      setSuccess(`Ripristino completato! ${stats}`);
      setRestoreId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il ripristino');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    setError(null);

    try {
      await backupApi.delete(deleteId);
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante l\'eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatoBadge = (stato: string) => {
    switch (stato) {
      case 'COMPLETATO':
        return 'bg-green-100 text-green-800';
      case 'IN_CORSO':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERRORE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'AUTOMATICO'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800';
  };

  if (isLoading) {
    return (
      <ResponsabileLayout>
        <div className="card flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </ResponsabileLayout>
    );
  }

  return (
    <ResponsabileLayout>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Backup & Ripristino</h2>
        <p className="text-sm text-gray-600 mt-1">
          Gestisci i backup del database
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Status Card */}
      <div className="card mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Stato Sistema</h3>

        {!status?.configured ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">Backup non configurato</p>
            <p className="text-yellow-700 text-sm mt-1">
              Per abilitare i backup, configura le credenziali Cloudflare R2 nelle variabili ambiente:
            </p>
            <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside">
              <li>R2_ACCOUNT_ID</li>
              <li>R2_ACCESS_KEY_ID</li>
              <li>R2_SECRET_ACCESS_KEY</li>
              <li>R2_BUCKET_NAME</li>
            </ul>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">Stato</p>
              <p className="text-lg font-semibold text-green-800">Configurato</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600">Ultimo backup</p>
              <p className="text-lg font-semibold text-blue-800">
                {status.lastBackup
                  ? formatDate(status.lastBackup.date)
                  : 'Nessuno'}
              </p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-600">Totale backup</p>
              <p className="text-lg font-semibold text-purple-800">{status.totalBackups}</p>
            </div>
          </div>
        )}

        {status?.configured && (
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="btn-primary flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Creazione in corso...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Crea backup manuale
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              I backup automatici vengono eseguiti ogni giorno alle 2:00
            </p>
          </div>
        )}
      </div>

      {/* Backups List */}
      <div className="card">
        <h3 className="font-medium text-gray-900 mb-4">
          Storico Backup
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({backups.length} backup)
          </span>
        </h3>

        {backups.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nessun backup disponibile
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Data</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Stato</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Dimensione</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">File</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">{formatDate(backup.createdAt)}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoBadge(backup.tipo)}`}>
                        {backup.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatoBadge(backup.stato)}`}>
                        {backup.stato}
                      </span>
                    </td>
                    <td className="py-3 px-2">{backup.dimensioneFormatted}</td>
                    <td className="py-3 px-2 text-gray-500 text-xs max-w-[200px] truncate">
                      {backup.filename}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {backup.stato === 'COMPLETATO' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setRestoreId(backup.id)}
                            className="text-primary-600 hover:text-primary-700 text-sm"
                          >
                            Ripristina
                          </button>
                          <button
                            onClick={() => setDeleteId(backup.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Elimina
                          </button>
                        </div>
                      )}
                      {backup.stato === 'ERRORE' && (
                        <button
                          onClick={() => setDeleteId(backup.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Elimina
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={restoreId !== null}
        onClose={() => setRestoreId(null)}
        title="Conferma ripristino"
      >
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <p className="text-yellow-800 font-medium">Attenzione!</p>
          <p className="text-yellow-700 text-sm mt-1">
            Il ripristino sovrascriverà tutti i dati attuali con quelli del backup selezionato.
            Questa operazione non può essere annullata.
          </p>
        </div>
        <p className="text-gray-600 mb-6">
          Sei sicuro di voler ripristinare questo backup?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setRestoreId(null)}
            className="btn-secondary"
            disabled={isRestoring}
          >
            Annulla
          </button>
          <button
            onClick={handleRestore}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            disabled={isRestoring}
          >
            {isRestoring ? 'Ripristino...' : 'Conferma ripristino'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Conferma eliminazione"
      >
        <p className="text-gray-600 mb-6">
          Sei sicuro di voler eliminare questo backup? L'operazione non può essere annullata.
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
