import type { User } from '../types';

/**
 * Dove mandare l'utente dopo il login o quando apre una pagina che non gli è
 * permessa. Per il dipendente è "Nuova Attività", ma solo se ce l'ha:
 * altrimenti "Le Mie Attività", che vedono tutti (rimandarlo a una pagina
 * negata creerebbe un giro di redirect senza fine).
 */
export function paginaIniziale(user: Pick<User, 'ruolo' | 'abilitatoAttivita'> | null | undefined) {
  if (user?.ruolo === 'RESPONSABILE') return '/responsabile';
  return user?.abilitatoAttivita === false ? '/dipendente' : '/dipendente/nuova';
}
