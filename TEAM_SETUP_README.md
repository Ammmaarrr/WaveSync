# WaveSync Project Setup Guide

> Commands to scaffold a project like WaveSync from scratch.

---

## Prerequisites

Install these tools before starting:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | ≥18 | https://nodejs.org |
| Flutter | ≥3.3 | https://flutter.dev |
| Git | latest | https://git-scm.com |
| Java JDK | 17+ | https://adoptium.net |
| Android Studio | latest | https://developer.android.com/studio |
| Docker (optional) | latest | https://docker.com |

Verify installations:

```powershell
node -v
npm -v
flutter --version
java -version
git --version
docker --version
```

---

## Project Structure

```
WaveSync/
├── server/          # Node.js + Express + WebSocket backend
├── web-client/      # Vite + TypeScript web frontend
├── client/          # Flutter mobile/web app
├── shared/          # Shared TypeScript types
├── docs/            # Documentation
├── tools/           # Utility scripts
├── nginx/           # Nginx config for production
├── docker-compose.yml
└── README.md
```

---

## Step-by-Step Setup

### 1. Create Root Folder & Initialize Git

```powershell
mkdir WaveSync
cd WaveSync
git init
```

---

### 2. Create Node.js Backend Server

```powershell
mkdir server
cd server

# Initialize package.json
npm init -y
npm pkg set type="module"
npm pkg set engines.node=">=18"

# Add scripts
npm pkg set scripts.dev="node --loader tsx --watch ./src/server.ts"
npm pkg set scripts.build="tsc -p tsconfig.json"
npm pkg set scripts.start="node dist/server.js"

# Install dependencies
npm install express cors ws dotenv better-sqlite3

# Install dev dependencies
npm install -D typescript tsx @types/node @types/express @types/cors @types/ws @types/better-sqlite3

# Initialize TypeScript
npx tsc --init

# Create source folder
mkdir src
New-Item src/server.ts -ItemType File

cd ..
```

---

### 3. Create Vite Web Client

```powershell
npm create vite@latest web-client -- --template vanilla-ts
cd web-client
npm install
cd ..
```

---

### 4. Create Flutter Mobile/Web Client

```powershell
flutter create --org com.yourcompany --platforms android,ios,web client
cd client

# Add dependencies
flutter pub add web_socket_channel
flutter pub add http
flutter pub add audioplayers
flutter pub add crypto
flutter pub add flutter_secure_storage
flutter pub add flutter_web_auth_2

cd ..
```

---

### 5. Create Supporting Folders

```powershell
mkdir shared
mkdir docs
mkdir tools
mkdir nginx

New-Item shared/types.ts -ItemType File
New-Item nginx/nginx.conf -ItemType File
New-Item README.md -ItemType File
New-Item docker-compose.yml -ItemType File
New-Item server/Dockerfile -ItemType File
New-Item web-client/Dockerfile -ItemType File
```

---

## Quick One-Liner Setup

Run this after creating and entering the `WaveSync` folder:

```powershell
# All in one (run line by line or as a script)
git init

# Server
mkdir server; cd server; npm init -y; npm pkg set type="module"; npm install express cors ws dotenv better-sqlite3; npm install -D typescript tsx @types/node @types/express @types/cors @types/ws @types/better-sqlite3; npx tsc --init; mkdir src; New-Item src/server.ts -ItemType File; cd ..

# Web client
npm create vite@latest web-client -- --template vanilla-ts; cd web-client; npm install; cd ..

# Flutter client
flutter create --org com.yourcompany --platforms android,ios,web client; cd client; flutter pub add web_socket_channel http audioplayers crypto flutter_secure_storage flutter_web_auth_2; cd ..

# Extras
mkdir shared; mkdir docs; mkdir tools; mkdir nginx
New-Item shared/types.ts -ItemType File
New-Item nginx/nginx.conf -ItemType File
New-Item README.md -ItemType File
New-Item docker-compose.yml -ItemType File
```

---

## Running the Project

### Start Backend Server (dev mode)

```powershell
cd server
npm run dev
```

### Start Web Client (dev mode)

```powershell
cd web-client
npm run dev
```

### Run Flutter App

```powershell
cd client
flutter devices          # List available devices
flutter run              # Run on default device
flutter run -d chrome    # Run on Chrome (web)
flutter run -d android   # Run on Android emulator/device
```

### Run with Docker

```powershell
docker-compose up --build
```

---

## Build for Production

### Server

```powershell
cd server
npm run build
npm start
```

### Web Client

```powershell
cd web-client
npm run build
npm run preview   # Preview production build
```

### Flutter

```powershell
cd client
flutter build apk --release      # Android APK
flutter build appbundle          # Android App Bundle (Play Store)
flutter build ios --release      # iOS (requires macOS)
flutter build web                # Web
```

---

## Android SDK Setup (Windows)

If Android SDK is not installed:

```powershell
# Set environment variable
setx ANDROID_SDK_ROOT "$env:LOCALAPPDATA\Android\Sdk"

# Accept licenses
flutter doctor --android-licenses
```

---

## Testing

```powershell
# Flutter tests
cd client
flutter test
flutter analyze

# Server tests (add your own)
cd server
npm test
```

---

## Environment Variables

Create `.env` files as needed:

**server/.env**
```
PORT=3000
DATABASE_PATH=./data/wavesync.db
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

**web-client/.env**
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

---

## Team Checklist

- [ ] Clone repository
- [ ] Install prerequisites (Node.js, Flutter, Java, Android Studio)
- [ ] Run `npm install` in `server/` and `web-client/`
- [ ] Run `flutter pub get` in `client/`
- [ ] Set up Android SDK and accept licenses
- [ ] Create `.env` files with required secrets
- [ ] Start server: `npm run dev` in `server/`
- [ ] Start web client: `npm run dev` in `web-client/`
- [ ] Run Flutter app: `flutter run` in `client/`

---

## Useful Links

- [Node.js Docs](https://nodejs.org/docs)
- [Flutter Docs](https://docs.flutter.dev)
- [Vite Docs](https://vitejs.dev)
- [Express Docs](https://expressjs.com)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

**Happy coding! 🚀**
