# Lead Management Tool (React + Node.js + MongoDB)

This project includes:
- React frontend (Vite + TypeScript)
- Node.js backend (Express)
- MongoDB integration (Mongoose)

## Setup

1. Create your local environment file:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS/Linux/Git Bash
cp .env.example .env
```

2. Update MONGODB_URI in .env if needed.

## Run

Start frontend and backend together:

```bash
npm run dev:full
```

Frontend:
- http://localhost:5173 (or next available port)

Backend:
- http://localhost:5000

## Build frontend

```bash
npm run build
```

## API Endpoints

- GET /api/health
- GET /api/leads
- POST /api/leads

POST body example:

```json
{
  "name": "Asha",
  "email": "asha@example.com",
  "status": "new"
}
```
