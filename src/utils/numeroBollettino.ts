/**
 * Numero da documento, "numero-anno", lo stesso stampato sul PDF. Ripiega
 * sull'id per un bollettino non ancora numerato, che esiste solo per pochi
 * istanti durante un deploy.
 */
export function numeroBollettino(b: { id: number; anno?: number | null; numero?: number | null }): string {
  return b.numero && b.anno ? `${b.numero}-${b.anno}` : String(b.id);
}
