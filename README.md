# GicaTask Frontend

Frontend React per GicaTask - Portale Gestione Attività Logistica.

## Stack Tecnologico

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Query + Context API
- **Styling**: TailwindCSS
- **HTTP Client**: Axios
- **Linguaggio**: TypeScript

## Requisiti

- Node.js 18+
- Backend GicaTask in esecuzione

## Installazione Locale

```bash
# Clona il repository
git clone https://github.com/federicodipierro87-beep/gicatask-frontend.git
cd gicatask-frontend

# Installa dipendenze
npm install

# Copia e configura variabili ambiente
cp .env.example .env
# Modifica VITE_API_URL se necessario

# Avvia in development
npm run dev
```

L'applicazione sarà disponibile su http://localhost:5173

## Variabili Ambiente

```env
VITE_API_URL=http://localhost:3001
```

In produzione (Netlify):
```env
VITE_API_URL=https://your-backend-url.railway.app
```

## Script Disponibili

| Script | Descrizione |
|--------|-------------|
| `npm run dev` | Avvia in modalità sviluppo |
| `npm run build` | Build per produzione |
| `npm run preview` | Preview build locale |
| `npm run typecheck` | Verifica tipi TypeScript |

## Struttura Progetto

```
src/
├── api/
│   └── client.ts           # Client Axios e funzioni API
├── components/
│   ├── DipendenteLayout.tsx
│   ├── ResponsabileLayout.tsx
│   ├── ProtectedRoute.tsx
│   └── Modal.tsx
├── context/
│   └── AuthContext.tsx     # Gestione autenticazione
├── pages/
│   ├── Login.tsx
│   ├── ResponsabileDashboard.tsx
│   ├── dipendente/
│   │   ├── AttivitaListPage.tsx
│   │   └── AttivitaFormPage.tsx
│   └── responsabile/
│       ├── ClientiPage.tsx
│       ├── ClienteDetailPage.tsx
│       ├── UtentiPage.tsx
│       ├── ReportPage.tsx
│       ├── AssegnaAttivitaPage.tsx
│       └── BackupPage.tsx
├── types/
│   └── index.ts
├── App.tsx                 # Router e providers
├── main.tsx               # Entry point
└── index.css              # Stili TailwindCSS
```

## Funzionalità

### Area Pubblica
- **Login** - Selezione utente con password opzionale

### Area Dipendente
- **Le Mie Attività** - Lista attività raggruppate per data
- **Nuova Attività** - Form con select a cascata (Cliente → Cantiere → Tipo)
- **Modifica/Elimina** - Su tutte le proprie attività, senza limiti di data

### Area Responsabile
- **Dashboard** - Panoramica con accesso rapido alle funzioni
- **Gestione Clienti** - CRUD clienti, cantieri e tipi attività
- **Gestione Utenti** - CRUD utenti con gestione password
- **Assegna Attività** - Inserimento e modifica attività per conto dei dipendenti
- **Report** - Filtri, statistiche, export PDF/Excel
- **Backup** - Gestione backup e ripristino database

## Deploy su Netlify

### Metodo 1: Collegamento GitHub

1. Accedi a [Netlify](https://netlify.com)
2. "Add new site" → "Import an existing project"
3. Collega questo repository GitHub
4. Configura:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Aggiungi variabile ambiente:
   - `VITE_API_URL` = URL del backend su Railway
6. Deploy automatico ad ogni push

### Metodo 2: CLI

```bash
# Installa Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
npm run build
netlify deploy --prod --dir=dist
```

## Configurazione netlify.toml

Il file `netlify.toml` è già configurato per gestire il routing SPA:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Note

- L'autenticazione usa cookie httpOnly cross-site
- Il design è responsive (mobile-first)
- I form con select a cascata auto-selezionano se c'è una sola opzione

## Licenza

ISC
