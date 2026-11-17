/**
 * Festivi del Canton Ticino e calendario annuale per la griglia a schermo.
 *
 * La sorgente di verita' e' `backend/src/utils/festivita.ts`:
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

/** Tetto di un periodo di assenza: oltre e' quasi sempre un refuso nell'anno. */
export const MAX_GIORNI_PERIODO = 366;

export interface PeriodoLavorativo {
  /** I giorni da lunedi' a venerdi' non festivi, in ordine, come `YYYY-MM-DD`. */
  lavorativi: string[];
  /** Quanti sabati e domeniche cadono nel periodo. */
  weekend: number;
  /** I festivi infrasettimanali saltati (quelli di sabato/domenica contano nel weekend). */
  festivi: string[];
}

/**
 * Scompone un periodo `dal`-`al` (estremi inclusi) in giorni lavorativi,
 * saltando sabati, domeniche e festivi ticinesi. `null` se le date non sono
 * valide, se `al` precede `dal` o se il periodo supera `MAX_GIORNI_PERIODO`.
 */
export function periodoLavorativo(dal: string, al: string): PeriodoLavorativo | null {
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO.test(dal) || !ISO.test(al)) return null;

  const inizio = new Date(`${dal}T00:00:00Z`);
  const fine = new Date(`${al}T00:00:00Z`);
  if (Number.isNaN(inizio.getTime()) || Number.isNaN(fine.getTime())) return null;

  // Il cap si controlla prima del ciclo: un anno digitato a meta' (0020)
  // darebbe centinaia di migliaia di giorni
  const giorni = Math.round((fine.getTime() - inizio.getTime()) / 86_400_000) + 1;
  if (giorni < 1 || giorni > MAX_GIORNI_PERIODO) return null;

  const festiviPerAnno = new Map<number, Set<string>>();
  const risultato: PeriodoLavorativo = { lavorativi: [], weekend: 0, festivi: [] };

  for (let i = 0; i < giorni; i++) {
    const giorno = piuGiorni(inizio, i);
    const chiave = iso(giorno);
    const anno = giorno.getUTCFullYear();
    if (!festiviPerAnno.has(anno)) festiviPerAnno.set(anno, festiviTicino(anno));

    const giornoSettimana = giorno.getUTCDay();
    if (giornoSettimana === 0 || giornoSettimana === 6) {
      risultato.weekend++;
    } else if (festiviPerAnno.get(anno)!.has(chiave)) {
      risultato.festivi.push(chiave);
    } else {
      risultato.lavorativi.push(chiave);
    }
  }

  return risultato;
}

export const NOMI_MESI = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];
