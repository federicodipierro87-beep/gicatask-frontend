/**
 * Festivi del Canton Ticino e calendario annuale per la griglia a schermo.
 *
 * La sorgente di verita' e' `backend/src/services/calendarioEventiExport.service.ts`:
 * i due repository sono separati e non c'e' un package condiviso, quindi le
 * due copie vanno tenute allineate a mano. Se cambiano i festivi, cambiarli
 * prima nel backend, che e' quello che genera l'export.
 *
 * Tutte le date sono mezzanotte UTC: usarle come date locali sposterebbe il
 * giorno in Europe/Rome.
 */

function iso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function piuGiorni(data: Date, giorni: number): Date {
  return new Date(data.getTime() + giorni * 86_400_000);
}

/** Domenica di Pasqua secondo l'algoritmo gregoriano anonimo. */
export function pasqua(anno: number): Date {
  const a = anno % 19;
  const b = Math.floor(anno / 100);
  const c = anno % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31);
  const giorno = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(anno, mese - 1, giorno));
}

/** Giorni festivi del Canton Ticino (il Venerdi' Santo non e' festivo). */
export function festiviTicino(anno: number): Set<string> {
  const fissi: [number, number][] = [
    [1, 1],   // Capodanno
    [1, 6],   // Epifania
    [3, 19],  // San Giuseppe
    [5, 1],   // Festa del lavoro
    [6, 29],  // Santi Pietro e Paolo
    [8, 1],   // Festa nazionale
    [8, 15],  // Assunzione
    [11, 1],  // Ognissanti
    [12, 8],  // Immacolata
    [12, 25], // Natale
    [12, 26], // Santo Stefano
  ];

  const giorni = fissi.map(([mese, giorno]) =>
    iso(new Date(Date.UTC(anno, mese - 1, giorno)))
  );

  const domenicaPasqua = pasqua(anno);
  giorni.push(
    iso(piuGiorni(domenicaPasqua, 1)),  // Lunedi' dell'Angelo
    iso(piuGiorni(domenicaPasqua, 39)), // Ascensione
    iso(piuGiorni(domenicaPasqua, 50)), // Lunedi' di Pentecoste
    iso(piuGiorni(domenicaPasqua, 60))  // Corpus Domini
  );

  return new Set(giorni);
}

export interface GiornoAnno {
  iso: string;
  /** Numero del giorno nel mese, mostrato nell'intestazione della griglia. */
  numero: number;
  /** Indice del mese, 0 = gennaio. */
  mese: number;
  weekend: boolean;
  festivo: boolean;
}

/** Tutti i giorni dell'anno, 365 o 366 a seconda del bisestile. */
export function giorniAnno(anno: number): GiornoAnno[] {
  const festivi = festiviTicino(anno);
  const giorni: GiornoAnno[] = [];

  let cursore = new Date(Date.UTC(anno, 0, 1));
  while (cursore.getUTCFullYear() === anno) {
    const giornoSettimana = cursore.getUTCDay();
    const chiave = iso(cursore);

    giorni.push({
      iso: chiave,
      numero: cursore.getUTCDate(),
      mese: cursore.getUTCMonth(),
      weekend: giornoSettimana === 0 || giornoSettimana === 6,
      festivo: festivi.has(chiave),
    });

    cursore = piuGiorni(cursore, 1);
  }

  return giorni;
}

export const NOMI_MESI = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];
