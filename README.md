# LocalDocs

A local document management system built with FastAPI, React + TypeScript, Docker Compose, PostgreSQL, and SeaweedFS.

## Prerequisites

- Docker Desktop for Mac, running
- Git

You do not need to install Python, Node.js, or PostgreSQL on macOS for this stage; Docker runs them in containers.

## Start

From the repository root:

```bash
docker compose up --build
```

The first run may take a few minutes while Docker downloads images and builds the frontend and backend.

## Local services

| Service | URL / port |
|---|---|
| React + Vite | http://localhost:5173 |
| FastAPI health check | http://localhost:8000/health |
| FastAPI Swagger UI | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| SeaweedFS master UI/API | http://localhost:9333 |
| SeaweedFS volume server | http://localhost:8080 |

## Useful commands

Stop containers:

```bash
docker compose down
```

Stop containers and delete persisted database/file-storage data:

```bash
docker compose down -v
```

View service logs:

```bash
docker compose logs -f
```

Check service status:

```bash
docker compose ps
```

## Stage 1 acceptance checks

1. Open http://localhost:5173 and see the LocalDocs welcome page.
2. Open http://localhost:8000/health and see `{"status":"ok","app":"LocalDocs"}`.
3. Open http://localhost:8000/docs and see FastAPI documentation.
4. Run `docker compose ps` and check that all five services are running.

## Notes

- This is a local development setup, not a production deployment.
- The example PostgreSQL password is for local development only.
- PostgreSQL and SeaweedFS data are stored in Docker named volumes.
- File upload and PostgreSQL application integration will be implemented in later stages.
