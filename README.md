# DownloadHub ⬇️

DownloadHub is a lightweight, self-hosted web application designed to run on homelabs, NAS servers, Raspberry Pis, or VPS instances to download files in the background. 

Instead of routing downloads through your local browser, submit URLs to DownloadHub. The server handles the downloads in the background using the battle-tested **aria2** engine, allowing you to disconnect or close your browser without interruption.

---

## Key Features

- **Background Downloads:** Close your browser or shut down your personal device; downloads continue uninterrupted on the host.
- **Aria2 Integration:** Uses a localized `aria2c` daemon communicating securely over JSON-RPC.
- **Real-Time Dashboards:** Displays queue stats, network speeds, download progress, and host disk space availability.
- **Advanced State Machine:** Pause, resume, stop, restart, and retry failed downloads.
- **Automatic Resume:** Automatically checks and recovers unfinished downloads after container crashes, power losses, or connection drops.
- **Secure File Management:** Restricts directory traversal using absolute path resolution filters.
- **Premium UI:** Out-of-the-box support for beautiful, glassmorphic dark and light theme styles.

---

## Directory Layout

```text
downloadhub/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # API router entries
│   │   ├── core/             # Base configurations
│   │   ├── database/         # Database engine and sessions
│   │   ├── models/           # SQLAlchemy schemas (downloads, settings)
│   │   ├── routers/          # API endpoint routes
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic (aria2 integration, downloader)
│   │   ├── tasks/            # Background monitor loops
│   │   └── main.py           # FastAPI entrypoint
│   ├── requirements.txt      # Python dependencies
│   ├── entrypoint.sh         # Migration wrapper
│   └── Dockerfile            # Backend Docker instructions (installs aria2)
│
├── frontend/                 # React SPA (Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── components/       # Interface screens (Dashboard, List, Details, Settings)
│   │   ├── types/            # TypeScript schemas
│   │   ├── utils/            # Size/speed/duration formatting
│   │   └── App.tsx           # React main router
│   ├── public/               # Static assets
│   ├── nginx.conf            # Nginx reverse proxy configurations
│   └── Dockerfile            # Multi-stage production web builder
│
├── downloads/                # Mount: Completed & Incomplete download files
├── config/                   # Mount: Saved aria2 session parameters
├── database/                 # Mount: Persisted SQLite db path
├── logs/                     # Mount: Application logs (backend, aria2)
├── docker-compose.yml        # Orchestration build file
├── .env                      # Custom configurations
└── README.md                 # Setup documentation
```

---

## Quick Start

### 1. Prerequisites
Ensure you have [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

### 2. Configure Environment
Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and configure your parameters:
- `FRONTEND_PORT`: Port exposed to your browser (default `8975`).
- `BACKEND_PORT`: Internal API port (default `8974`).
- `ARIA2_RPC_SECRET`: Change this to a secure random string to lock down the aria2 RPC interface.

### 3. Spin Up Application
Deploy the application in detached mode using Docker Compose:
```bash
docker compose up --build -d
```

Once running:
- Open your browser to `http://localhost:8975` (or `http://your-server-ip:8975`) to access the interface.
- Backend API endpoints are accessible at `http://localhost:8974/api`.

---

## Volumes & Persistence

On first run, Docker Compose will automatically provision the following folders in your workspace directory:
- **`downloads/`**: Holds incomplete downloads (under `incomplete/`) and final files (under `completed/`).
- **`database/`**: Stores the SQLite database file (`downloadhub.db`).
- **`config/`**: Holds configuration files and `aria2.session` parameters.
- **`logs/`**: Keeps output logs (`backend.log` and `aria2.log`) for easy debugging.

---

## Development

If you'd like to run the project locally in development mode:

### Running Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Ensure you have 'aria2' installed on your system
# Start backend in development
export ARIA2_RPC_SECRET=your_secret
uvicorn app.main:app --reload --port 8000
```

### Running Frontend
```bash
cd frontend
npm install
npm run dev
# Serves frontend on http://localhost:8975 and proxies /api to http://localhost:8974
```
