/**
 * Ore complessive di un bollettino: la somma delle ore per collaboratore
 * quando c'e', altrimenti operai per ore come nei bollettini precedenti.
 * Stessa regola di `oreComplessive` nel PDF lato server.
 */
export function oreComplessive(b: {
  oreTotali?: number | null;
  ore: number;
  numeroOperai: number;
}): number {
  return b.oreTotali ?? b.ore * b.numeroOperai;
}

export interface Fasce {
  oraInizioMattino: string;
  oraFineMattino: string;
  oraInizioPomeriggio: string;
  oraFinePomeriggio: string;
}

export const FASCE_VUOTE: Fasce = {
  oraInizioMattino: '',
  oraFineMattino: '',
  oraInizioPomeriggio: '',
  oraFinePomeriggio: '',
};

const minuti = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Minuti di una fascia, 0 se incompleta o con inizio uguale alla fine. Come
 * nelle attivita' (e in `calculateDurationMinutes` lato server), una fine
 * prima dell'inizio e' un turno che finisce il giorno dopo.
 */
function minutiFascia(inizio: string, fine: string): number {
  if (!inizio || !fine || inizio === fine) return 0;
  const diff = minuti(fine) - minuti(inizio);
  return diff > 0 ? diff : diff + 24 * 60;
}

export function minutiFasce(f: Fasce): number {
  return (
    minutiFascia(f.oraInizioMattino, f.oraFineMattino) +
    minutiFascia(f.oraInizioPomeriggio, f.oraFinePomeriggio)
  );
}

/** Una fascia con solo inizio o solo fine, oppure con inizio uguale alla fine. */
export function fasceIncomplete(f: Fasce): boolean {
  const male = (inizio: string, fine: string) =>
    Boolean(inizio) !== Boolean(fine) || (Boolean(inizio) && inizio === fine);
  return (
    male(f.oraInizioMattino, f.oraFineMattino) ||
    male(f.oraInizioPomeriggio, f.oraFinePomeriggio)
  );
}

/** Stringhe vuote a null: il server le tratta come fascia assente. */
export function fascePerApi(f: Fasce) {
  return {
    oraInizioMattino: f.oraInizioMattino || null,
    oraFineMattino: f.oraFineMattino || null,
    oraInizioPomeriggio: f.oraInizioPomeriggio || null,
    oraFinePomeriggio: f.oraFinePomeriggio || null,
  };
}
