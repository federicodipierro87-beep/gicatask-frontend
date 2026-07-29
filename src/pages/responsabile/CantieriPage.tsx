import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { cantieriApi, clientiApi } from '../../api/client';

interface Cliente {
  id: number;
  nome: string;
}

interface Cantiere {
  id: number;
  nome: string;
  isGenerico: boolean;
  attivo: boolean;
  cliente: { id: number; nome: string };
}

export function CantieriPage() {
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCantiereNome, setNewCantiereNome] = useState('');
  const [newCantiereClienteId, setNewCantiereClienteId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit modal
  const [editingCantiere, setEditingCantiere] = useState<Cantiere | null>(null);
  const [editNome, setEditNome] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [clientiRes] = await Promise.all([
        clientiApi.getAll(),
      ]);
      setClienti(Array.isArray(clientiRes.data) ? clientiRes.data : []);

      // Fetch cantieri for all clients
      const allCantieri: Cantiere[] = [];
      const clientiData = Array.isArray(clientiRes.data) ? clientiRes.data : [];

      for (const cliente of clientiData) {
        const cantieriRes = await cantieriApi.getByCliente(cliente.id, showInactive);
        const cantieriData = Array.isArray(cantieriRes.data) ? cantieriRes.data : [];
        allCantieri.push(...cantieriData.map((c: any) => ({
          ...c,
          cliente: { id: cliente.id, nome: cliente.nome }
        })));
      }

      setCantieri(allCantieri);
      setError(null);
    } catch (err) {
      setError('Errore nel caricamento dei dati');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showInactive]);

  const handleCreate = async () => {
    if (!newCantiereNome.trim() || !newCantiereClienteId) return;

    setIsCreating(true);
    try {
      await cantieriApi.create(newCantiereClienteId, newCantiereNome.trim());
      setNewCantiereNome('');
      setNewCantiereClienteId(null);
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la creazione');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo cantiere?')) return;

    try {
      await cantieriApi.delete(id);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante l\'eliminazione');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await cantieriApi.activate(id);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la riattivazione');
    }
  };

  const handleEdit = (cantiere: Cantiere) => {
    setEditingCantiere(cantiere);
    setEditNome(cantiere.nome);
  };

  const handleUpdate = async () => {
    if (!editingCantiere || !editNome.trim()) return;

    setIsUpdating(true);
    try {
      await cantieriApi.update(editingCantiere.id, editNome.trim());
      setEditingCantiere(null);
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
          <h2 className="text-xl font-semibold text-gray-900">Gestione Cantieri</h2>
          <p className="text-sm text-gray-600 mt-1">
            {cantieri.length} cantieri totali
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          + Nuovo Cantiere
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
          <h3 className="font-medium text-gray-900">Elenco Cantieri</h3>
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
        ) : cantieri.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nessun cantiere trovato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cliente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cantiere</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Stato</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {cantieri.map((cantiere) => (
                  <tr key={cantiere.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{cantiere.cliente.nome}</td>
                    <td className="py-3 px-2">{cantiere.nome}</td>
                    <td className="py-3 px-2">
                      {cantiere.isGenerico ? (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Generico</span>
                      ) : (
                        <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded">Specifico</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {cantiere.attivo ? (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Attivo</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Inattivo</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right space-x-3">
                      {!cantiere.isGenerico && cantiere.attivo && (
                        <button
                          onClick={() => handleEdit(cantiere)}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          Modifica
                        </button>
                      )}
                      {!cantiere.isGenerico && (
                        <>
                          {cantiere.attivo ? (
                            <button
                              onClick={() => handleDelete(cantiere.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Elimina
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(cantiere.id)}
                              className="text-green-600 hover:text-green-700 text-sm"
                            >
                              Riattiva
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewCantiereNome('');
          setNewCantiereClienteId(null);
        }}
        title="Nuovo Cantiere"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="cliente" className="label">Cliente</label>
            <select
              id="cliente"
              className="select"
              value={newCantiereClienteId ?? ''}
              onChange={(e) => setNewCantiereClienteId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Seleziona cliente...</option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nome" className="label">Nome Cantiere</label>
            <input
              type="text"
              id="nome"
              className="input"
              value={newCantiereNome}
              onChange={(e) => setNewCantiereNome(e.target.value)}
              placeholder="Es. Magazzino Nord"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setNewCantiereNome('');
                setNewCantiereClienteId(null);
              }}
              className="btn-secondary"
            >
              Annulla
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !newCantiereNome.trim() || !newCantiereClienteId}
              className="btn-primary"
            >
              {isCreating ? 'Creazione...' : 'Crea'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editingCantiere !== null}
        onClose={() => {
          setEditingCantiere(null);
          setEditNome('');
        }}
        title="Modifica Cantiere"
      >
        <div className="space-y-4">
          {editingCantiere && (
            <p className="text-sm text-gray-600">
              Cliente: <strong>{editingCantiere.cliente.nome}</strong>
            </p>
          )}
          <div>
            <label htmlFor="editNome" className="label">Nome Cantiere</label>
            <input
              type="text"
              id="editNome"
              className="input"
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              placeholder="Es. Magazzino Nord"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setEditingCantiere(null);
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
