import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { clientiApi, cantieriApi, tipiAttivitaApi } from '../../api/client';

interface Cliente {
  id: number;
  nome: string;
  attivo: boolean;
  cantieri: Cantiere[];
}

interface Cantiere {
  id: number;
  nome: string;
  isGenerico: boolean;
  attivo: boolean;
  tipiAttivita: TipoAttivita[];
}

interface TipoAttivita {
  id: number;
  nome: string;
  attivo: boolean;
}

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cantiere modal
  const [isCantiereModalOpen, setIsCantiereModalOpen] = useState(false);
  const [editingCantiere, setEditingCantiere] = useState<Cantiere | null>(null);
  const [cantiereNome, setCantiereNome] = useState('');

  // Tipo attività modal
  const [isTipoModalOpen, setIsTipoModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoAttivita | null>(null);
  const [tipoNome, setTipoNome] = useState('');
  const [selectedCantiereId, setSelectedCantiereId] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [clienteRes, cantieriRes] = await Promise.all([
        clientiApi.getById(parseInt(id)),
        cantieriApi.getByCliente(parseInt(id), showInactive),
      ]);
      setCliente(clienteRes.data);
      setCantieri(cantieriRes.data);
    } catch (err) {
      setError('Errore nel caricamento');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, showInactive]);

  // Cantiere handlers
  const openCantiereModal = (cantiere?: Cantiere) => {
    setEditingCantiere(cantiere || null);
    setCantiereNome(cantiere?.nome || '');
    setError(null);
    setIsCantiereModalOpen(true);
  };

  const handleSaveCantiere = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cantiereNome.trim() || !id) return;

    setIsSaving(true);
    setError(null);

    try {
      if (editingCantiere) {
        await cantieriApi.update(editingCantiere.id, cantiereNome.trim());
      } else {
        await cantieriApi.create(parseInt(id), cantiereNome.trim());
      }
      setIsCantiereModalOpen(false);
      setCantiereNome('');
      setEditingCantiere(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCantiere = async (cantiere: Cantiere) => {
    try {
      if (cantiere.attivo) {
        await cantieriApi.delete(cantiere.id);
      } else {
        await cantieriApi.activate(cantiere.id);
      }
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante l\'operazione');
    }
  };

  // Tipo attività handlers
  const openTipoModal = (cantiereId: number, tipo?: TipoAttivita) => {
    setSelectedCantiereId(cantiereId);
    setEditingTipo(tipo || null);
    setTipoNome(tipo?.nome || '');
    setError(null);
    setIsTipoModalOpen(true);
  };

  const handleSaveTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoNome.trim() || !selectedCantiereId) return;

    setIsSaving(true);
    setError(null);

    try {
      if (editingTipo) {
        await tipiAttivitaApi.update(editingTipo.id, tipoNome.trim());
      } else {
        await tipiAttivitaApi.create(selectedCantiereId, tipoNome.trim());
      }
      setIsTipoModalOpen(false);
      setTipoNome('');
      setEditingTipo(null);
      setSelectedCantiereId(null);
      fetchData();
    } catch (err) {
      setError('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTipo = async (tipo: TipoAttivita) => {
    try {
      if (tipo.attivo) {
        await tipiAttivitaApi.delete(tipo.id);
      } else {
        await tipiAttivitaApi.activate(tipo.id);
      }
      fetchData();
    } catch (err) {
      setError('Errore durante l\'operazione');
    }
  };

  if (isLoading) {
    return (
      <ResponsabileLayout>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </ResponsabileLayout>
    );
  }

  if (!cliente) {
    return (
      <ResponsabileLayout>
        <div className="card text-center py-8">
          <p className="text-gray-500">Cliente non trovato</p>
          <button onClick={() => navigate('/responsabile/clienti')} className="btn-primary mt-4">
            Torna ai clienti
          </button>
        </div>
      </ResponsabileLayout>
    );
  }

  return (
    <ResponsabileLayout>
      <div className="mb-4">
        <button
          onClick={() => navigate('/responsabile/clienti')}
          className="text-sm text-gray-600 hover:text-primary-600 flex items-center gap-1"
        >
          ← Torna ai clienti
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{cliente.nome}</h2>
            <span
              className={`inline-flex mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                cliente.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {cliente.attivo ? 'Attivo' : 'Inattivo'}
            </span>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Mostra inattivi
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cantieri</h3>
          <button onClick={() => openCantiereModal()} className="btn-primary text-sm">
            + Nuovo Cantiere
          </button>
        </div>

        {cantieri.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nessun cantiere</p>
        ) : (
          <div className="space-y-4">
            {cantieri.map((cantiere) => (
              <div
                key={cantiere.id}
                className={`border rounded-lg p-4 ${
                  cantiere.attivo ? 'border-gray-200' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">
                      {cantiere.nome}
                      {cantiere.isGenerico && (
                        <span className="ml-2 text-xs text-gray-500">(generico)</span>
                      )}
                    </h4>
                    {!cantiere.attivo && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                        Inattivo
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!cantiere.isGenerico && (
                      <>
                        <button
                          onClick={() => openCantiereModal(cantiere)}
                          className="text-sm text-gray-600 hover:text-primary-600"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleToggleCantiere(cantiere)}
                          className={`text-sm ${
                            cantiere.attivo
                              ? 'text-red-600 hover:text-red-700'
                              : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {cantiere.attivo ? 'Disattiva' : 'Riattiva'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="pl-4 border-l-2 border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Tipi Attività</span>
                    <button
                      onClick={() => openTipoModal(cantiere.id)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      + Aggiungi
                    </button>
                  </div>
                  {cantiere.tipiAttivita.length === 0 ? (
                    <p className="text-sm text-gray-400">Nessun tipo attività</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {cantiere.tipiAttivita.map((tipo) => (
                        <div
                          key={tipo.id}
                          className={`group flex items-center gap-1 px-2 py-1 rounded text-sm ${
                            tipo.attivo
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-gray-50 text-gray-400'
                          }`}
                        >
                          <span>{tipo.nome}</span>
                          <button
                            onClick={() => openTipoModal(cantiere.id, tipo)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary-600"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleToggleTipo(tipo)}
                            className={`opacity-0 group-hover:opacity-100 ${
                              tipo.attivo
                                ? 'text-gray-400 hover:text-red-600'
                                : 'text-gray-400 hover:text-green-600'
                            }`}
                          >
                            {tipo.attivo ? '×' : '↺'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cantiere Modal */}
      <Modal
        isOpen={isCantiereModalOpen}
        onClose={() => setIsCantiereModalOpen(false)}
        title={editingCantiere ? 'Modifica Cantiere' : 'Nuovo Cantiere'}
      >
        <form onSubmit={handleSaveCantiere}>
          <div className="mb-4">
            <label htmlFor="cantiereNome" className="label">Nome cantiere</label>
            <input
              type="text"
              id="cantiereNome"
              className="input"
              value={cantiereNome}
              onChange={(e) => setCantiereNome(e.target.value)}
              placeholder="Es. Magazzino Milano"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCantiereModalOpen(false)}
              className="btn-secondary"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !cantiereNome.trim()}
            >
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Tipo Attività Modal */}
      <Modal
        isOpen={isTipoModalOpen}
        onClose={() => setIsTipoModalOpen(false)}
        title={editingTipo ? 'Modifica Tipo Attività' : 'Nuovo Tipo Attività'}
      >
        <form onSubmit={handleSaveTipo}>
          <div className="mb-4">
            <label htmlFor="tipoNome" className="label">Nome tipo attività</label>
            <input
              type="text"
              id="tipoNome"
              className="input"
              value={tipoNome}
              onChange={(e) => setTipoNome(e.target.value)}
              placeholder="Es. Carico/Scarico"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsTipoModalOpen(false)}
              className="btn-secondary"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !tipoNome.trim()}
            >
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </Modal>
    </ResponsabileLayout>
  );
}
