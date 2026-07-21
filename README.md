# GicaTask Frontend

Frontend React per GicaTask - Portale Gestione Attività Logistica.

## Stack Tecnologico

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Query + Context API
- **Styling**: TailwindCSS
- **Linguaggio**: TypeScript

## Setup Locale

```bash
npm install
cp .env.example .env
npm run dev
```

L'applicazione sarà disponibile su http://localhost:5173

## Scripts

- `npm run dev` - Avvia in modalità sviluppo
- `npm run build` - Build per produzione
- `npm run preview` - Preview build locale
- `npm run typecheck` - Verifica tipi TypeScript

## Variabili d'Ambiente

```env
VITE_API_URL=http://localhost:3001
```

## Deploy su Netlify

1. Crea sito su [Netlify](https://netlify.com)
2. Collega questo repository
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Aggiungi `VITE_API_URL` con URL backend Railway

## Struttura

```
src/
├── api/            # Client API Axios
├── components/     # Componenti React riutilizzabili
├── context/        # React Context (Auth)
├── pages/          # Pagine dell'applicazione
├── types/          # TypeScript types
├── App.tsx         # Router e providers
├── main.tsx        # Entry point
└── index.css       # Stili TailwindCSS
```

## Funzionalità

- Login con selezione utente
- Dashboard dipendente
- Dashboard responsabile
- Autenticazione JWT con cookies httpOnly
- Responsive design mobile-first
