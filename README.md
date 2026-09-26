# fom-projektarbeit-ws26
Projektarbeit im Modul Softwareentwicklung &amp; UX

Umsetzung eines Online-Brettspiels:
- React als Typescript Frontend, gebündelt durch Vite
- FastAPI als Python Backend
- PostgreSQL als Datenbank
- Deployment via Docker-Compose

## Projektstruktur
```
├── backend - FastAPI Server mit UV Projektmanagement
│   ├── Dockerfile
│   ├── main.py
│   └── pyproject.toml
├── frontend - Nginx Server für React App und API-Routing
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── public/
│   └── src/
├── database - Datenbankinitialisierung und -schemas
├── docker-compose.override.yaml - Override-Datei für Entwicklungsumgebung
└── docker-compose.yaml - Basis-Datei für Deployment
```

## Benötigte Umgebungsvariablen

Auf der Hauptebene eine .env Datei anlegen mit:

- POSTGRES_PASSWORD: Passwort für `postgres` Superuser
- POSTGRES_LOCAL_USER: Name des regulären Users
- POSTGRES_LOCAL_PASSWORD: Passwort des regulären Users
- POSTGRES_DB: Name der verwendeten Datenbank

## Benötigte Pakete

Installieren: docker, docker-buildx, docker-compose, npm, uv

## Development mit Hot-Reloading

Frontend Dependencies installieren:

1. `cd frontend/`
2. `npm ci`

Backend Dependencies installieren:

1. `cd backend/`
2. `uv sync`

Gesamten Container starten via `sudo docker compose up --build`

Vite Server erreichbar unter: http://localhost:5173/

FastAPI Server erreichbar unter: http://localhost:8000/

API-Aufrufe werden durch den Vite Dev-Server analog zur späteren Produktionsumgebung umgeleitet (Konfiguration unter `frontend/vite.config.ts`).
Vite erkennt lokale Dateiänderungen und lädt die geöffnete Seite automatisch neu. Analog gilt das auch für den FastAPI-Dev-Server, welcher bei Dateiänderungen die API-Definitionen neu generiert.

## Deployment

Gesamten Container starten via `sudo docker compose -f docker-compose.yaml up --build `

Durch `-f docker-compose.yaml` wird die Entwicklungsumgebung aus `docker-compose.override.yaml` übersprungen.

Nginx Server erreichbar unter: http://localhost:80/