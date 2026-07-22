import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { clientiApi } from '../../api/client';

interface Cliente {
  id: number;
  nome: string;
  attivo: boolean;
}

export function ClientiPage() {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formNome, setFormNome] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchClienti = async () => {
    try {
      const response = await clientiApi.getAll(showInactive);
      setClienti(response.data);
    } catch (err) {
      setError('Errore nel caricamento dei clienti');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClienti();
  }, [showInactive]);

  const openCreateModal = () => {
    setEditingCliente(null);
    setFormNome('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormNome(cliente.nome);
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCliente(null);
    setFormNome('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      if (editingCliente) {
        await clientiApi.update(editingCliente.id, formNome.trim());
      } else {
        await clientiApi.create(formNome.trim());
      }
      closeModal();
      fetchClienti();
    } catch (err) {
      setError('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (cliente: Cliente) => {
    try {
      if (cliente.attivo) {
        await clientiApi.delete(cliente.id);
      } else {
        await clientiApi.activate(cliente.id);
      }
      fetchClienti();
    } catch (err) {
      setError('Errore durante l\'operazione');
    }
  };

  return (
    <ResponsabileLayout>
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Gestione Clienti</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Mostra inattivi
            </label>
            <button onClick={openCreateModal} className="btn-primary">
              + Nuovo Cliente
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : clienti.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nessun cliente trovato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Stato</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {clienti.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link
                        to={`/responsabile/clienti/${cliente.id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {cliente.nome}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          cliente.attivo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cliente.attivo ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(cliente)}
                          className="text-sm text-gray-600 hover:text-primary-600"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleToggleActive(cliente)}
                          className={`text-sm ${
                            cliente.attivo
                              ? 'text-red-600 hover:text-red-700'
                              : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {cliente.attivo ? 'Disattiva' : 'Riattiva'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCliente ? 'Modifica Cliente' : 'Nuovo Cliente'}
      >
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="nome" className="label">Nome cliente</label>
            <input
              type="text"
              id="nome"
              className="input"
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Es. Azienda SpA"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="btn-secondary">
              Annulla
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !formNome.trim()}
            >
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </Modal>
    </ResponsabileLayout>
  );
}
