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
