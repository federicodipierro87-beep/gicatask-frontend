import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { vociBollettinoApi } from '../../api/client';
import type { TipoVoceSlug, VoceBollettino } from '../../types';

interface Props {
  tipo: TipoVoceSlug;
  titolo: string;
  singolare: string;
}

/**
 * Anagrafica delle voci selezionabili nei bollettini.
 *
 * Mezzi, materiali e trasporti condividono questa pagina: cambiano solo il
 * tipo passato all'API e le etichette.
 */
export function VociBollettinoPage({ tipo, titolo, singolare }: Props) {
  const [voci, setVoci] = useState<VoceBollettino[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingVoce, setEditingVoce] = useState<VoceBollettino | null>(null);
  const [editNome, setEditNome] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await vociBollettinoApi.getAll(tipo, showInactive);
      setVoci(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch {
      setError('Errore nel caricamento dei dati');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tipo, showInactive]);

  const handleCreate = async () => {
    if (!newNome.trim()) return;

    setIsCreating(true);
    try {
      await vociBollettinoApi.create(tipo, newNome.trim());
      setNewNome('');
      setShowCreateModal(false);
      setError(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la creazione');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingVoce || !editNome.trim()) return;

    setIsUpdating(true);
    try {
      await vociBollettinoApi.update(editingVoce.id, editNome.trim());
      setEditingVoce(null);
      setEditNome('');
      setError(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la modifica');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Disattivare questa voce? I bollettini già firmati non cambiano.`)) return;

    try {
      await vociBollettinoApi.delete(id);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la disattivazione');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await vociBollettinoApi.activate(id);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la riattivazione');
    }
  };

  return (
    <ResponsabileLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestione {titolo}</h2>
          <p className="text-sm text-gray-600 mt-1">{voci.length} voci totali</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + Nuovo {singolare}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Chiudi</button>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Elenco {titolo}</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Mostra inattivi
          </label>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : voci.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nessuna voce trovata</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Nome</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Stato</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {voci.map((voce) => (
                  <tr key={voce.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-primary-600">{voce.nome}</td>
                    <td className="py-3 px-2">
                      {voce.attivo ? (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Attivo</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Inattivo</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right space-x-3">
                      {voce.attivo && (
                        <button
                          onClick={() => {
                            setEditingVoce(voce);
                            setEditNome(voce.nome);
                          }}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          Modifica
                        </button>
                      )}
                      {voce.attivo ? (
                        <button
                          onClick={() => handleDelete(voce.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Disattiva
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(voce.id)}
                          className="text-green-600 hover:text-green-700 text-sm"
                        >
                          Riattiva
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

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewNome('');
        }}
        title={`Nuovo ${singolare}`}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="nome" className="label">Nome</label>
            <input
              type="text"
              id="nome"
              className="input"
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setNewNome('');
              }}
              className="btn-secondary"
            >
              Annulla
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !newNome.trim()}
              className="btn-primary"
            >
              {isCreating ? 'Creazione...' : 'Crea'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editingVoce !== null}
        onClose={() => {
          setEditingVoce(null);
          setEditNome('');
        }}
        title={`Modifica ${singolare}`}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="editNome" className="label">Nome</label>
            <input
              type="text"
              id="editNome"
              className="input"
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-500">
            I bollettini già firmati conservano il nome usato al momento della firma.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setEditingVoce(null);
                setEditNome('');
              }}
              className="btn-secondary"
              disabled={isUpdating}
            >
              Annulla
            </button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating || !editNome.trim()}
              className="btn-primary"
            >
              {isUpdating ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>
      </Modal>
    </ResponsabileLayout>
  );
}
