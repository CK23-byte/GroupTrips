# GroupTrips

Een app voor het organiseren van verrassingsgroepsreizen met getimede ticket onthulling.

## Features

- **Verrassingsreizen**: Houd de bestemming geheim tot het laatste moment
- **Getimede Onthulling**: QR-codes 3 uur voor vertrek, volledige tickets 1 uur voor vertrek
- **Lobby Systeem**: Leden joinen met een unieke code
- **Real-time Updates**: Berichten en notificaties naar de hele groep
- **Locatie Delen**: Zie waar iedereen is op een kaart
- **Media Delen**: Upload foto's en video's van de reis
- **Planning/Tijdlijn**: Bekijk het programma via een tijdlijn

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm of yarn
- Supabase account

### Installation

1. Clone de repository:
```bash
git clone https://github.com/CK23-byte/GroupTrips.git
cd GroupTrips
```

2. Installeer dependencies:
```bash
npm install
```

3. Kopieer `.env.example` naar `.env` en vul je Supabase credentials in:
```bash
cp .env.example .env
```

4. Start de development server:
```bash
npm run dev
```

### Supabase Setup

Voer de SQL queries uit in `supabase-setup.sql` in de Supabase SQL Editor om de database tabellen aan te maken.

## Project Structure

```
src/
├── components/          # Herbruikbare UI componenten
│   ├── MembersList.tsx
│   ├── MessagesPanel.tsx
│   ├── TicketReveal.tsx
│   └── Timeline.tsx
├── contexts/            # React Context providers
│   ├── AuthContext.tsx
│   └── TripContext.tsx
├── lib/                 # Utilities en configuraties
│   └── supabase.ts
├── pages/               # Route pagina's
│   ├── DashboardPage.tsx
│   ├── JoinPage.tsx
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── TripAdminPage.tsx
│   └── TripLobbyPage.tsx
├── types/               # TypeScript types
│   └── index.ts
├── App.tsx              # Main app met routing
├── main.tsx             # Entry point
└── index.css            # Global styles
```

## User Roles

### Admin
- Kan trips aanmaken en beheren
- Upload tickets voor alle leden
- Stuurt berichten en notificaties
- Beheert de planning/tijdlijn

### Lid
- Joined trips met lobby code
- Bekijkt eigen ticket (getimed)
- Ontvangt updates en berichten
- Deelt locatie en media

## Ticket Onthulling Tijdlijn

| Tijd voor vertrek | Wat is zichtbaar |
|-------------------|------------------|
| > 3 uur | Niets - ticket verborgen |
| 3 uur | QR-code voor inchecken |
| 1 uur | Volledige ticket met bestemming |

## Deployment

Het project is geconfigureerd voor automatische deployment naar Vercel bij pushes naar de `main` branch.

## License

MIT
