import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { dreamVeicoliApi } from '../../api/client';
import type { DreamVeicolo } from '../../types';

export function DreamVeicoliPage() {
  const [veicoli, setVeicoli] = useState<DreamVeicolo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingVeicolo, setEditingVeicolo] = useState<DreamVeicolo | null>(null);
  const [editNome, setEditNome] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await dreamVeicoliApi.getAll(showInactive);
      setVeicoli(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch {
      setError('Errore nel caricamento dei veicoli');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showInactive]);

  const handleCreate = async () => {
    if (!newNome.trim()) return;

    setIsCreating(true);
    try {
      await dreamVeicoliApi.create(newNome.trim());
      setNewNome('');
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la creazione');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo veicolo?')) return;

    try {
      await dreamVeicoliApi.delete(id);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante l\'eliminazione');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await dreamVeicoliApi.activate(id);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la riattivazione');
    }
  };

  const handleEdit = (veicolo: DreamVeicolo) => {
    setEditingVeicolo(veicolo);
    setEditNome(veicolo.nome);
  };

  const handleUpdate = async () => {
    if (!editingVeicolo || !editNome.trim()) return;

    setIsUpdating(true);
    try {
      await dreamVeicoliApi.update(editingVeicolo.id, editNome.trim());
      setEditingVeicolo(null);
      setEditNome('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la modifica');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ResponsabileLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dream Veicoli</h2>
          <p className="text-sm text-gray-600 mt-1">
            {veicoli.length} veicoli totali
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + Nuovo Veicolo
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
          <h3 className="font-medium text-gray-900">Elenco Veicoli</h3>
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
        ) : veicoli.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nessun veicolo trovato</p>
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
                {veicoli.map((veicolo) => (
                  <tr key={veicolo.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{veicolo.nome}</td>
                    <td className="py-3 px-2">
                      {veicolo.attivo ? (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Attivo</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Inattivo</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right space-x-3">
                      {veicolo.attivo && (
                        <button
                          onClick={() => handleEdit(veicolo)}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          Modifica
                        </button>
                      )}
                      {veicolo.attivo ? (
                        <button
                          onClick={() => handleDelete(veicolo.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Elimina
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(veicolo.id)}
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
        title="Nuovo Veicolo"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="nome" className="label">Nome Veicolo</label>
            <input
              type="text"
              id="nome"
              className="input"
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              placeholder="Es. Fiat Ducato"
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
        isOpen={editingVeicolo !== null}
        onClose={() => {
          setEditingVeicolo(null);
          setEditNome('');
        }}
        title="Modifica Veicolo"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="editNome" className="label">Nome Veicolo</label>
            <input
              type="text"
              id="editNome"
              className="input"
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              placeholder="Es. Fiat Ducato"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setEditingVeicolo(null);
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
