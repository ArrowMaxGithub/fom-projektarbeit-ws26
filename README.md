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
└── docker-compose.yaml - Zentrale Datei für Deployment
```

## Development mit Hot-Reloading

Installieren: docker, docker-buildx, docker-compose, npm, nodejs, uv

1. .env Datei anlegen mit Werten für `POSTGRES_USER`, `POSTGRES_PASSWORD` und `POSTGRES_DB`
2. Datenbank starten via `sudo docker compose up -d db`
3. In Ordner `backend` wechseln
4. FastAPI Server starten via: `uv run fastapi dev main.py`
5. In separatem Terminal in Ordner `frontend` wechseln
6. Vite Development Server starten via: `npm run dev`

Vite Server erreichbar unter: http://localhost:5173/

API-Aufrufe werden durch den Vite Dev-Server analog zur späteren Produktionsumgebung umgeleitet (frontend/vite.config.ts).
Vite erkennt lokale Dateiänderungen und lädt die geöffnete Seite automatisch neu. Analog gilt das auch für den FastAPI-Dev-Server, welcher bei Dateiänderungen die API-Definitionen neu generiert.

## Deployment

Installieren: docker, docker-buildx, docker-compose

Für Produktionsumgebung:
1. .env Datei anlegen mit Werten für `POSTGRES_USER`, `POSTGRES_PASSWORD` und `POSTGRES_DB`
2. Gesamten Container starten via `sudo docker compose up --build`

Nginx Server erreichbar unter: http://localhost:80/