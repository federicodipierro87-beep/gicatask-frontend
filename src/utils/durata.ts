/**
 * Formattazione delle durate e riconoscimento delle assenze che sottraggono ore.
 *
 * La sorgente di verita' della regola sul segno e' `backend/src/utils/assenze.ts`:
 * i due repository sono separati e non c'e' un package condiviso, quindi le due
 * copie vanno tenute allineate a mano, come gia' avviene per `festivita.ts`.
 * Qui `isAssenzaNegativa` serve solo a scrivere la nota giusta sotto le select
 * delle form; il valore salvato lo decide sempre il backend.
 */

/**
 * Minuti in formato leggibile, es. "8h 12m", "45m", "-8h 12m".
 *
 * I minuti possono essere negativi (un "Recupero ore" vale -492): il segno va
 * anteposto alla stringa intera, perche' scomporre il negativo con Math.floor
 * darebbe "-9h -12m".
 */
export function formatDuration(minutes: number): string {
  const segno = minutes < 0 ? '-' : '';
  const assoluti = Math.abs(minutes);
  const hours = Math.floor(assoluti / 60);
  const mins = assoluti % 60;
  if (hours === 0) return `${segno}${mins}m`;
  if (mins === 0) return `${segno}${hours}h`;
  return `${segno}${hours}h ${mins}m`;
}

/** Nomi (gia' normalizzati) delle assenze che sottraggono ore dal montante. */
const ASSENZE_NEGATIVE = new Set(['recupero ore']);

/** True se il tipo assenza sottrae ore invece di aggiungerle. */
export function isAssenzaNegativa(nome: string): boolean {
  return ASSENZE_NEGATIVE.has(nome.trim().toLowerCase().replace(/\s+/g, ' '));
}
