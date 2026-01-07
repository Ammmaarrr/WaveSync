# WaveSync Monorepo

A simple monorepo for a synced-music app:

- Server: Node 18+ TypeScript (Express + ws)
- Client: Flutter (mobile + web)

## File tree

```text
WaveSync/
├─ server/
│  ├─ src/
│  │  └─ index.ts
│  ├─ .env.example
│  ├─ Dockerfile
│  ├─ package.json
│  └─ tsconfig.json
├─ client/
│  ├─ lib/
│  │  └─ main.dart
│  ├─ web/
│  │  ├─ index.html
│  │  └─ manifest.json
│  ├─ analysis_options.yaml
│  ├─ pubspec.yaml
│  └─ README.md
└─ .gitignore
```

## Setup

- Requirements
  - Node 18+
  - Flutter 3.x (for mobile + web)

### Install

- Server deps:

```powershell
cd server; npm install
```

- Flutter (first time):

```powershell
cd client; flutter pub get
```

### Run server

```powershell
cd server; npm run dev
```

The server listens on <http://localhost:4000> and WebSocket at <ws://localhost:4000/ws>.

### Run client

- Web:

```powershell
cd client; flutter run -d chrome
```

- Mobile (example Android emulator):

```powershell
cd client; flutter run -d emulator-5554
```

## Env

Copy `server/.env.example` to `server/.env` and adjust if needed. No third-party secrets are included.
