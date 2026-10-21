import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { noleggiApi } from '../api/client';
import type { Noleggio } from '../types';

export function formatGiorni(giorni: number): string {
  if (giorni === 0.5) return 'Mezza giornata';
  return giorni === 1 ? '1 giorno' : `${giorni} giorni`;
}

/** Stato della mail di fatturazione: "Da inviare" quando non e' mai partita. */
export function StatoMailNoleggio({ noleggio }: { noleggio: Noleggio }) {
  const { emailStato, emailFatturazione, emailInviataAt, emailErrore } = noleggio;

  if (!emailStato) return <span className="text-gray-500">Da inviare</span>;

  if (emailStato === 'INVIATA') {
    const quando = emailInviataAt ? ` il ${new Date(emailInviataAt).toLocaleDateString('it-IT')}` : '';
    return (
      <span className="text-green-700" title={`${emailFatturazione ?? ''}${quando}`}>
        Inviata
      </span>
    );
  }

  if (emailStato === 'IN_CORSO') {
    return <span className="text-amber-700" title={emailFatturazione ?? undefined}>In corso</span>;
  }

  return (
    <span className="text-red-600" title={emailErrore ?? emailFatturazione ?? undefined}>
      Non inviata
    </span>
  );
}

/**
 * Modale di invio o reinvio del verbale all'indirizzo di fatturazione. Una
 * modale e non un pulsante secco: spesso l'indirizzo va prima corretto.
 */
export function InviaNoleggioModal({
  noleggio,
  onClose,
  onInviato,
}: {
  noleggio: Noleggio | null;
  onClose: () => void;
  /** Dopo ogni tentativo: lo stato della mail e' cambiato comunque. */
  onInviato: () => void;
}) {
  const [indirizzo, setIndirizzo] = useState('');
  const [isInviando, setIsInviando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    setIndirizzo(noleggio?.emailFatturazione ?? '');
    setErrore(null);
  }, [noleggio]);

  const handleInvia = async () => {
    if (!noleggio) return;

    setIsInviando(true);
    setErrore(null);
    try {
      const { data } = await noleggiApi.inviaMail(noleggio.id, indirizzo.trim() || undefined);
      onInviato();

      if (data.stato !== 'INVIATA') {
        setErrore(data.messaggio ?? 'Invio non riuscito');
        return;
      }

      onClose();
    } catch (err: any) {
      setErrore(err.response?.data?.message ?? err.response?.data?.error ?? 'Errore durante l\'invio della mail');
    } finally {
      setIsInviando(false);
    }
  };

  return (
    <Modal isOpen={noleggio !== null} onClose={onClose} title="Invia il verbale per la fatturazione">
      {errore && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errore}
        </div>
      )}
      <div className="mb-4">
        <label htmlFor="indirizzoNoleggio" className="label">Indirizzo di fatturazione</label>
        <input
          type="email"
          id="indirizzoNoleggio"
          className="input"
          inputMode="email"
          autoCapitalize="none"
          maxLength={254}
          value={indirizzo}
          onChange={(e) => setIndirizzo(e.target.value)}
          placeholder="fatture@cliente.ch"
        />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-secondary" disabled={isInviando}>
          Annulla
        </button>
        <button
          type="button"
          onClick={handleInvia}
          className="btn-primary"
          disabled={isInviando || !indirizzo.trim()}
        >
          {isInviando ? 'Invio...' : 'Invia'}
        </button>
      </div>
    </Modal>
  );
}
