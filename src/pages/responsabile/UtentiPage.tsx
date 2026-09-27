import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { utentiApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { nomeUtente } from '../../utils/nomeUtente';
import { MonthNavigator, currentMonth, formatMonth } from '../../components/MonthNavigator';
import type { MonthKey } from '../../components/MonthNavigator';

interface VariazionePercentuale {
  id: number;
  /** Primo del mese, come arriva dal server: "2026-03-01T00:00:00.000Z". */
  decorrenza: string;
  percentuale: number;
}

interface Utente {
  id: number;
  nome: string;
  cognome: string;
  ruolo: 'DIPENDENTE' | 'RESPONSABILE';
  attivo: boolean;
  abilitatoBollettini: boolean;
  /** Percentuale base: vale nei mesi prima della prima variazione. */
  percentualeLavoro: number;
  percentualiLavoro: VariazionePercentuale[];
}

// Stessa regola del backend (utils/percentualeLavoro.ts): vince la variazione
// con la decorrenza piu' recente fra quelle gia' iniziate nel mese
function percentualeNelMese(utente: Utente, mese: MonthKey): number {
  let inVigore: VariazionePercentuale | null = null;
  for (const v of utente.percentualiLavoro ?? []) {
    const decorrenza = v.decorrenza.slice(0, 7);
    if (decorrenza <= mese && (!inVigore || decorrenza > inVigore.decorrenza.slice(0, 7))) {
      inVigore = v;
    }
  }
  return inVigore?.percentuale ?? utente.percentualeLavoro;
}

function percentualeValida(testo: string): boolean {
  const n = Number(testo);
  return testo.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= 100;
}

export function UtentiPage() {
  const { user, refreshUser } = useAuth();
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
  const [formAbilitatoBollettini, setFormAbilitatoBollettini] = useState(false);
  const [formPercentuale, setFormPercentuale] = useState('100');
  const [newPassword, setNewPassword] = useState('');

  // Nuova variazione della percentuale, nel modale di modifica
  const [nuovaDecorrenza, setNuovaDecorrenza] = useState<MonthKey>(currentMonth());
  const [nuovaPercentuale, setNuovaPercentuale] = useState('');
  const [isSavingVariazione, setIsSavingVariazione] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUtenti = async () => {
    try {
      const response = await utentiApi.getAll(showInactive);
      setUtenti(response.data);
      return response.data as Utente[];
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
    setFormAbilitatoBollettini(false);
    setFormPercentuale('100');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (utente: Utente) => {
    setEditingUtente(utente);
    setFormNome(utente.nome);
    setFormCognome(utente.cognome);
    setFormRuolo(utente.ruolo);
    setFormPassword('');
    setFormAbilitatoBollettini(utente.abilitatoBollettini);
    setFormPercentuale(String(utente.percentualeLavoro));
    setNuovaDecorrenza(currentMonth());
    setNuovaPercentuale('');
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

  const percentuale = Number(formPercentuale);
  const formPercentualeValida = percentualeValida(formPercentuale);

  // Le variazioni si salvano subito, senza passare dal pulsante Salva del
  // modale: il modale resta aperto e mostra lo storico aggiornato
  const aggiornaVariazioni = async (azione: () => Promise<unknown>) => {
    if (!editingUtente) return;
    setIsSavingVariazione(true);
    setError(null);
    try {
      await azione();
      const aggiornati = await fetchUtenti();
      const aggiornato = aggiornati?.find((u) => u.id === editingUtente.id);
      if (aggiornato) setEditingUtente(aggiornato);
      setNuovaPercentuale('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio della variazione');
    } finally {
      setIsSavingVariazione(false);
    }
  };

  const handleAddVariazione = () => {
    if (!editingUtente || !percentualeValida(nuovaPercentuale)) return;
    aggiornaVariazioni(() =>
      utentiApi.setPercentuale(editingUtente.id, nuovaDecorrenza, Number(nuovaPercentuale))
    );
  };

  const handleDeleteVariazione = (variazioneId: number) => {
    if (!editingUtente) return;
    aggiornaVariazioni(() => utentiApi.deletePercentuale(editingUtente.id, variazioneId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Il solo cognome basta: l'account amministratore non è una persona e non
    // ha un nome di battesimo
    if (!formCognome.trim() || !formPercentualeValida) return;

    setIsSaving(true);
    setError(null);

    try {
      if (editingUtente) {
        await utentiApi.update(editingUtente.id, {
          nome: formNome.trim(),
          cognome: formCognome.trim(),
          ruolo: formRuolo,
          abilitatoBollettini: formAbilitatoBollettini,
          percentualeLavoro: percentuale,
        });

        // Chi modifica i permessi di se stesso vedrebbe altrimenti il menu
        // aggiornarsi solo al ricaricamento della pagina
        if (editingUtente.id === user?.id) {
          await refreshUser();
        }
      } else {
        await utentiApi.create({
          nome: formNome.trim(),
          cognome: formCognome.trim(),
          ruolo: formRuolo,
          password: formPassword || undefined,
          percentualeLavoro: percentuale,
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
                  <th className="text-right py-3 px-4 font-medium text-gray-600 whitespace-nowrap">% lavoro</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Stato</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {utenti.map((utente) => (
                  <tr key={utente.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {nomeUtente(utente)}
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
                    <td className="py-3 px-4 text-right text-gray-700">
                      {percentualeNelMese(utente, currentMonth())}%
                      {(utente.percentualiLavoro?.length ?? 0) > 0 && (
                        <span
                          className="block text-xs text-gray-400"
                          title="La percentuale ha delle variazioni nel tempo"
                        >
                          con storico
                        </span>
                      )}
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
              <label htmlFor="nome" className="label">
                Nome <span className="text-gray-400">(opzionale)</span>
              </label>
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
            <div>
              <label htmlFor="percentualeLavoro" className="label">
                {editingUtente ? 'Percentuale di lavoro base (%)' : 'Percentuale di lavoro (%)'}
              </label>
              <input
                type="number"
                id="percentualeLavoro"
                className="input"
                min={0}
                max={100}
                step={1}
                value={formPercentuale}
                onChange={(e) => setFormPercentuale(e.target.value)}
              />
              <p className={`text-sm mt-1 ${formPercentualeValida ? 'text-gray-500' : 'text-red-600'}`}>
                {!formPercentualeValida
                  ? 'Inserisci un numero intero da 0 a 100.'
                  : editingUtente && editingUtente.percentualiLavoro.length > 0
                    ? 'Vale nei mesi prima della prima variazione qui sotto.'
                    : '100 = tempo pieno. Scala le ore dovute nel Report Saldi Ore.'}
              </p>
            </div>
            {editingUtente && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-sm font-medium text-gray-900">Variazioni della percentuale</p>
                <p className="text-xs text-gray-500 mb-3">
                  Ogni variazione vale dal mese indicato fino alla successiva. Si salva subito.
                </p>

                {editingUtente.percentualiLavoro.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-3">
                    Nessuna variazione: vale sempre la percentuale base.
                  </p>
                ) : (
                  <ul className="mb-3 divide-y divide-gray-200 bg-white rounded border">
                    {editingUtente.percentualiLavoro.map((v) => (
                      <li key={v.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>
                          Da <strong>{formatMonth(v.decorrenza.slice(0, 7))}</strong>: {v.percentuale}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariazione(v.id)}
                          disabled={isSavingVariazione}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Elimina
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm text-gray-700">Dal mese</span>
                  <MonthNavigator
                    month={nuovaDecorrenza}
                    onChange={setNuovaDecorrenza}
                    className="sm:flex-1 bg-white rounded-lg border"
                  />
                  <input
                    type="number"
                    aria-label="Nuova percentuale"
                    className="input sm:w-20"
                    min={0}
                    max={100}
                    step={1}
                    placeholder="%"
                    value={nuovaPercentuale}
                    onChange={(e) => setNuovaPercentuale(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddVariazione}
                    disabled={isSavingVariazione || !percentualeValida(nuovaPercentuale)}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {isSavingVariazione ? '...' : 'Aggiungi'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Una variazione con lo stesso mese di una esistente la sostituisce.
                </p>
              </div>
            )}
            {editingUtente && (
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formAbilitatoBollettini}
                    onChange={(e) => setFormAbilitatoBollettini(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Abilita Bollettini
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Mostra la sezione Bollettini. Vale anche per i responsabili.
                </p>
              </div>
            )}
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
              disabled={isSaving || !formCognome.trim() || !formPercentualeValida}
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
        title={`Password - ${passwordUtente ? nomeUtente(passwordUtente) : ''}`}
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
