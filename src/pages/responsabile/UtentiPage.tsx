import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { utentiApi } from '../../api/client';

interface Utente {
  id: number;
  nome: string;
  cognome: string;
  ruolo: 'DIPENDENTE' | 'RESPONSABILE';
  attivo: boolean;
}

export function UtentiPage() {
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUtente, setEditingUtente] = useState<Utente | null>(null);
  const [passwordUtente, setPasswordUtente] = useState<Utente | null>(null);

  const [formNome, setFormNome] = useState('');
  const [formCognome, setFormCognome] = useState('');
  const [formRuolo, setFormRuolo] = useState<'DIPENDENTE' | 'RESPONSABILE'>('DIPENDENTE');
  const [formPassword, setFormPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUtenti = async () => {
    try {
      const response = await utentiApi.getAll(showInactive);
      setUtenti(response.data);
    } catch (err) {
      setError('Errore nel caricamento degli utenti');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUtenti();
  }, [showInactive]);

  const openCreateModal = () => {
    setEditingUtente(null);
    setFormNome('');
    setFormCognome('');
    setFormRuolo('DIPENDENTE');
    setFormPassword('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (utente: Utente) => {
    setEditingUtente(utente);
    setFormNome(utente.nome);
    setFormCognome(utente.cognome);
    setFormRuolo(utente.ruolo);
    setFormPassword('');
    setError(null);
    setIsModalOpen(true);
  };

  const openPasswordModal = (utente: Utente) => {
    setPasswordUtente(utente);
    setNewPassword('');
    setError(null);
    setIsPasswordModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUtente(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formCognome.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      if (editingUtente) {
        await utentiApi.update(editingUtente.id, {
          nome: formNome.trim(),
          cognome: formCognome.trim(),
          ruolo: formRuolo,
        });
      } else {
        await utentiApi.create({
          nome: formNome.trim(),
          cognome: formCognome.trim(),
          ruolo: formRuolo,
          password: formPassword || undefined,
        });
      }
      closeModal();
      fetchUtenti();
    } catch (err) {
      setError('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUtente) return;

    setIsSaving(true);
    setError(null);

    try {
      await utentiApi.setPassword(passwordUtente.id, newPassword || null);
      setIsPasswordModalOpen(false);
      setPasswordUtente(null);
      setNewPassword('');
    } catch (err) {
      setError('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (utente: Utente) => {
    try {
      if (utente.attivo) {
        await utentiApi.delete(utente.id);
      } else {
        await utentiApi.activate(utente.id);
      }
      fetchUtenti();
    } catch (err) {
      setError('Errore durante l\'operazione');
    }
  };

  return (
    <ResponsabileLayout>
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Gestione Utenti</h2>
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
              + Nuovo Utente
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : utenti.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nessun utente trovato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Ruolo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Stato</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {utenti.map((utente) => (
                  <tr key={utente.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {utente.cognome} {utente.nome}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          utente.ruolo === 'RESPONSABILE'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {utente.ruolo === 'RESPONSABILE' ? 'Responsabile' : 'Dipendente'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          utente.attivo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {utente.attivo ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(utente)}
                          className="text-sm text-gray-600 hover:text-primary-600"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => openPasswordModal(utente)}
                          className="text-sm text-gray-600 hover:text-primary-600"
                        >
                          Password
                        </button>
                        <button
                          onClick={() => handleToggleActive(utente)}
                          className={`text-sm ${
                            utente.attivo
                              ? 'text-red-600 hover:text-red-700'
                              : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {utente.attivo ? 'Disattiva' : 'Riattiva'}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingUtente ? 'Modifica Utente' : 'Nuovo Utente'}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="nome" className="label">Nome</label>
              <input
                type="text"
                id="nome"
                className="input"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Mario"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="cognome" className="label">Cognome</label>
              <input
                type="text"
                id="cognome"
                className="input"
                value={formCognome}
                onChange={(e) => setFormCognome(e.target.value)}
                placeholder="Rossi"
              />
            </div>
            <div>
              <label htmlFor="ruolo" className="label">Ruolo</label>
              <select
                id="ruolo"
                className="select"
                value={formRuolo}
                onChange={(e) => setFormRuolo(e.target.value as 'DIPENDENTE' | 'RESPONSABILE')}
              >
                <option value="DIPENDENTE">Dipendente</option>
                <option value="RESPONSABILE">Responsabile</option>
              </select>
            </div>
            {!editingUtente && (
              <div>
                <label htmlFor="password" className="label">
                  Password <span className="text-gray-400">(opzionale)</span>
                </label>
                <input
                  type="password"
                  id="password"
                  className="input"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Lascia vuoto per nessuna password"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={closeModal} className="btn-secondary">
              Annulla
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !formNome.trim() || !formCognome.trim()}
            >
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Password - ${passwordUtente?.cognome} ${passwordUtente?.nome}`}
      >
        <form onSubmit={handleSetPassword}>
          <div className="mb-4">
            <label htmlFor="newPassword" className="label">Nuova password</label>
            <input
              type="password"
              id="newPassword"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Lascia vuoto per rimuovere la password"
            />
            <p className="text-sm text-gray-500 mt-1">
              Lascia vuoto per permettere l'accesso senza password
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="btn-secondary"
            >
              Annulla
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </Modal>
    </ResponsabileLayout>
  );
}
