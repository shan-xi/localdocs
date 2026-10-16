# LocalDocs

A local document management system built with FastAPI, React + TypeScript, Docker Compose, PostgreSQL, and SeaweedFS.

## Stage 2: upload and download files

Stage 2 connects FastAPI to SeaweedFS and adds a small React upload screen. File content is stored in SeaweedFS. PostgreSQL is running but application metadata is not yet persisted there; that comes in a later stage.

## Prerequisites

- Docker Desktop for Mac, running
- Git

You do not need to install Python, Node.js, or PostgreSQL on macOS for this stage; Docker runs them in containers.

## Start

Optionally copy the example environment file first (Compose also has safe local defaults):

```bash
cp .env.example .env
```

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

## Try a file upload

1. Open http://localhost:5173.
2. Choose a small test file and click **Upload file**.
3. After success, note the returned Storage ID.
4. Click **Download stored file** to retrieve it through FastAPI.
5. You can also use the interactive API docs at http://localhost:8000/docs.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check that FastAPI is running |
| POST | `/files` | Upload one file to SeaweedFS; returns a storage ID and file details |
| GET | `/files/{file_id}` | Download a stored file by its storage ID |
| DELETE | `/files/{file_id}` | Delete a stored file by its storage ID |

Example upload with `curl`:

```bash
curl -F "file=@./sample.txt" http://localhost:8000/files
```

Use the `file_id` in the JSON response to download or delete that file:

```bash
curl -OJ "http://localhost:8000/files/YOUR_FILE_ID"
curl -X DELETE "http://localhost:8000/files/YOUR_FILE_ID"
```

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

## Stage 2 acceptance checks

1. Open http://localhost:5173 and see the upload form.
2. Upload a small test file and receive a storage ID.
3. Download the file and confirm its contents match the original.
4. Open http://localhost:8000/docs and see the `Files` endpoints.
5. Check `docker compose ps` to confirm the services are running.

## Notes and current limitations

- This is a local development setup, not a production deployment.
- The example PostgreSQL password is for local development only.
- Uploaded content persists in the SeaweedFS Docker volume.
- File metadata is not yet saved in PostgreSQL, so the UI does not have a persistent list of previous uploads. Keep the returned storage ID if you want to retrieve a file later.
- The API reads each uploaded file into memory in this stage; large-file streaming and upload limits can be improved later.
- CORS is restricted to the local Vite development origins.
