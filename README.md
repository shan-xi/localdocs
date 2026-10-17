# LocalDocs

A local document management learning project using React + TypeScript, FastAPI, PostgreSQL, SeaweedFS, and Docker Compose.

## Stage 3: persistent document metadata

Stage 3 adds a PostgreSQL `documents` table. SeaweedFS stores file bytes; PostgreSQL stores the SeaweedFS file ID, original filename, content type, byte size, and upload timestamp. The React page now loads the saved document list and supports downloading and deleting documents.

## Requirements

- Docker Desktop for Mac, running
- Git

Python, Node.js, and PostgreSQL are run in Docker containers.

## Start

From the project root:

```bash
cp .env.example .env  # optional; Compose has local development defaults
docker compose up --build
```

Open:

- Frontend: http://localhost:5173
- FastAPI Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/health
- PostgreSQL: localhost:5432
- SeaweedFS master: http://localhost:9333

## Stage 3 API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check API health |
| GET | `/files` | List document metadata from PostgreSQL |
| POST | `/files` | Store bytes in SeaweedFS and metadata in PostgreSQL |
| GET | `/files/{file_id}` | Look up metadata, then download bytes from SeaweedFS |
| DELETE | `/files/{file_id}` | Delete bytes and metadata |

Example:

```bash
curl -F 'file=@./sample.txt' http://localhost:8000/files
curl http://localhost:8000/files
curl -OJ 'http://localhost:8000/files/FILE_ID_FROM_UPLOAD'
curl -X DELETE 'http://localhost:8000/files/FILE_ID_FROM_UPLOAD'
```

## How metadata persistence works

1. FastAPI asks the SeaweedFS master to assign a file ID.
2. FastAPI sends the file bytes to SeaweedFS.
3. FastAPI inserts a metadata row into PostgreSQL.
4. `GET /files` queries PostgreSQL, so a refreshed page can show previous uploads.
5. Download uses the database row to recover the original filename/content type, then retrieves bytes from SeaweedFS.

The `documents` table is created on backend startup using SQLAlchemy `create_all`, suitable for this learning stage. For a mature application, use Alembic migrations and define explicit recovery/consistency strategies for failures across the database and object store.

## Useful commands

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f postgres
docker compose down
```

**Warning:** `docker compose down -v` deletes named volumes, including the PostgreSQL metadata and SeaweedFS stored data. Do not use it unless you intend to erase the local project data.

## Development notes

- The example database password is for local development only.
- The API reads uploaded content into memory; file-size limits and streaming are future improvements.
- PostgreSQL and SeaweedFS are separate systems. A real production design needs stronger retry, reconciliation, and migration strategies.
- This project is intended for localhost development, not production deployment.
