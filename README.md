# LocalDocs

LocalDocs is a local document-management learning project built with **React, TypeScript, Vite, FastAPI, PostgreSQL, SeaweedFS, and Docker Compose**.

The frontend provides a document-focused dashboard. The backend exposes an asynchronous REST API. File contents are stored in SeaweedFS, while PostgreSQL stores the metadata needed to list, preview, download, and delete documents.

> **Project status:** This is a local-development and learning project, not a production-ready document platform. Authentication, authorization, sharing permissions, database migrations, and production hardening are not implemented.

## Features

- Upload documents through a drag-and-drop or file-selection interface.
- Show browser upload-transfer progress and loading, empty, and error states.
- List persisted document metadata and refresh the list.
- Preview supported image, PDF, and text files in the browser.
- Download files using their original filename and content type.
- Delete a document and its metadata.
- Navigate between the dashboard, documents, recent files, activity, shared files, settings, notifications, profile, and local-development pages.
- Check API health and open the FastAPI API documentation.
- Keep file bytes in SeaweedFS and document metadata in PostgreSQL.

Some frontend sections are UI scaffolding for future work. For example, the Shared page explains that sharing is not implemented; it does not provide real sharing or access control. Activity and some preferences are held in the current browser session rather than persisted on the server.

## Technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 18, TypeScript, Vite | UI, navigation, document interactions |
| API | FastAPI, Uvicorn, HTTPX | REST endpoints and asynchronous HTTP requests |
| Database | PostgreSQL 16, SQLAlchemy 2, asyncpg | Persistent document metadata |
| File storage | SeaweedFS | Actual uploaded file bytes |
| Web server | Nginx | Serves the production frontend and proxies `/api/` requests |
| Local orchestration | Docker Compose | Runs the frontend, API, database, and storage services |

## Requirements

- Docker Desktop with Docker Compose
- Git (optional, for cloning/version control)

For the Docker-based setup, you do not need to install Python, Node.js, or PostgreSQL directly on your host machine.

## Quick start: production-style container setup

Run these commands from the project root (the directory containing `docker-compose.yml`):

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

The example environment file is for local development only. Review it before starting and never use its example credentials in a public or production environment.

Open the app and services:

| Service | URL |
|---|---|
| LocalDocs frontend (Nginx) | http://localhost |
| FastAPI Swagger UI (through Nginx) | http://localhost/api/docs |
| FastAPI ReDoc (through Nginx) | http://localhost/api/redoc |
| API health check (through Nginx) | http://localhost/api/health |
| API health check (direct backend, development compose only) | http://localhost:8000/health |
| SeaweedFS master UI/API | http://localhost:9333 |
| SeaweedFS volume endpoint | http://localhost:8080 |
| PostgreSQL | `localhost:5432` |

The default `docker-compose.yml` publishes the frontend on port `80`. It does not publish the backend's port `8000` directly; Nginx forwards `/api/` requests to the backend container. The separate development Compose file publishes the frontend on `5173` and the backend on `8000`.

Check service status and logs:

```bash
docker compose ps
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f seaweed-master seaweed-volume
```

Stop the services while preserving their data:

```bash
docker compose down
```

**Data warning:** `docker compose down -v` removes the named volumes, including PostgreSQL metadata and SeaweedFS data. Use it only if you intentionally want to delete the project's persisted local data.

## Development setup

The repository includes `docker-compose.dev.yml`, which runs the Vite development server and publishes the backend directly.

1. Make sure `.env` includes local settings similar to the following:

   ```dotenv
   POSTGRES_DB=localdocs
   POSTGRES_USER=localdocs
   POSTGRES_PASSWORD=localdocs_dev_password
   APP_NAME=LocalDocs
   CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ```

2. Start the development services, explicitly configuring the browser-facing API URL:

   ```bash
   VITE_API_BASE_URL=http://localhost:8000 docker compose -f docker-compose.dev.yml up --build
   ```

3. Open:
   - Frontend: http://localhost:5173
   - Swagger UI: http://localhost:8000/docs
   - Health check: http://localhost:8000/health

The `VITE_API_BASE_URL` value is used by Vite in the browser, so it must be a URL reachable from your browser. In this development setup, `http://localhost:8000` is appropriate because the backend port is published to the host. `CORS_ALLOW_ORIGINS` must include the exact frontend origin you use.

To stop the development setup, press `Ctrl+C` and run:

```bash
docker compose -f docker-compose.dev.yml down
```

The Vite configuration currently does **not** define a `/api` development proxy. If you prefer using `/api` in development, add a proxy in `frontend/vite.config.ts` and configure it to target the backend service appropriately.

## Running the frontend without Docker

If you want to work on the React UI directly on your machine, install Node.js (a version compatible with the included Vite version) and run:

```bash
cd frontend
npm ci
npm run dev
```

For a production build and local preview:

```bash
npm run build
npm run preview
```

When running Vite directly, set `VITE_API_BASE_URL` to a browser-accessible backend URL and configure the backend's `CORS_ALLOW_ORIGINS` accordingly. For example, if the API is running directly on port `8000`, use `VITE_API_BASE_URL=http://localhost:8000`.

## API reference

The backend registers the health router and file router. When calling the backend directly, the endpoints are:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Return a basic API health response |
| `GET` | `/files` | List document metadata, newest first |
| `POST` | `/files` | Upload a file using multipart form data; the field name is `file` |
| `GET` | `/files/{file_id}` | Retrieve file content; defaults to download behavior |
| `GET` | `/files/{file_id}?download=false` | Return file content inline for browser preview |
| `DELETE` | `/files/{file_id}` | Delete file content and metadata |

Through the production Nginx proxy, prefix these paths with `/api`, for example `/api/files`.

### Example API requests

Upload a local file:

```bash
curl -F 'file=@./sample.txt' http://localhost/api/files
```

List documents:

```bash
curl http://localhost/api/files
```

Download a document (replace the placeholder with a real `file_id` returned by the upload/list response):

```bash
curl -OJ 'http://localhost/api/files/FILE_ID'
```

Preview supported content inline:

```bash
curl -i 'http://localhost/api/files/FILE_ID?download=false'
```

Delete a document:

```bash
curl -i -X DELETE 'http://localhost/api/files/FILE_ID'
```

For the development Compose setup, replace `http://localhost/api` in these examples with `http://localhost:8000`.

### Document response

A document response includes:

- `file_id`: SeaweedFS file identifier
- `filename`: original filename
- `content_type`: MIME type
- `size_bytes`: file size in bytes
- `uploaded_at`: timestamp recorded by PostgreSQL
- `download_url`: API-relative URL for retrieving the file

## How file persistence works

The project separates file storage from searchable/listable metadata:

1. The frontend sends the selected file to `POST /files`.
2. FastAPI reads the upload and asks the SeaweedFS master to assign a file ID.
3. FastAPI sends the file bytes to a SeaweedFS volume server.
4. FastAPI stores the file ID, original filename, content type, byte size, and upload timestamp in PostgreSQL.
5. `GET /files` queries PostgreSQL, so the document list survives browser refreshes and container restarts when the volumes are preserved.
6. For preview/download, the backend finds the metadata row and retrieves the bytes from SeaweedFS.
7. For deletion, the backend removes the stored content and then removes the metadata row.

If storing the file succeeds but inserting metadata fails, the backend attempts best-effort cleanup of the stored content. Because PostgreSQL and SeaweedFS are separate systems, this is not a fully transactional operation; failures can still require reconciliation.

The SQLAlchemy models are currently created at backend startup with `Base.metadata.create_all()`. This is convenient for learning, but schema changes in a mature application should be managed with database migrations such as Alembic.

## Project structure

```text
LocalDocs/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI health and file endpoints
│   │   ├── core/             # Environment-based configuration
│   │   ├── db/               # SQLAlchemy models, base, and async session
│   │   ├── schemas/           # Pydantic response schemas
│   │   ├── services/          # Document use cases and workflow coordination
│   │   ├── storage/           # SeaweedFS HTTP adapter
│   │   └── main.py            # FastAPI app, lifespan, middleware, routers
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/               # Calls to the backend API
│   │   ├── app/               # App providers and page navigation/routes
│   │   ├── components/        # Shared UI and layout components
│   │   ├── features/          # Feature-specific contexts, hooks, components
│   │   ├── lib/               # Configuration and file/format helpers
│   │   ├── pages/             # Page-level UI
│   │   ├── types/             # Shared TypeScript types
│   │   ├── App.tsx            # Main UI composition
│   │   ├── main.tsx           # React entry point
│   │   └── style.css          # Application styles
│   ├── nginx/default.conf     # Production static server and API proxy
│   ├── Dockerfile             # Production frontend image
│   └── Dockerfile.dev         # Vite development image
├── docker-compose.yml         # Production-style local containers
├── docker-compose.dev.yml     # Development containers
├── .env.example               # Example local environment variables
└── README.md
```

## Architecture overview

### Frontend

- `main.tsx` mounts React and wraps the app in `AppProviders`.
- `App.tsx` composes the sidebar, toolbar, current page, and document preview modal.
- `app/navigation.ts` and `app/routes.tsx` manage page selection and map each page to its component.
- `features/documents/` contains document UI state, data state, hooks, upload/list/preview components, and related behavior.
- `api/documentsApi.ts` centralizes HTTP operations rather than embedding requests in page components.
- `lib/config.ts` builds API URLs from `VITE_API_BASE_URL`, defaulting to `/api`.

### Backend

- `main.py` creates the FastAPI application, configures CORS and lifespan resource cleanup, and includes routers.
- `api/routes/` defines the HTTP endpoints and obtains database sessions through dependency injection.
- `services/document_service.py` coordinates document operations across the database and storage adapter.
- `storage/seaweedfs.py` encapsulates HTTP calls to SeaweedFS.
- `db/` defines the SQLAlchemy model and asynchronous database session.
- `schemas/document.py` defines the Pydantic response shape returned by the API.

## Configuration

The main environment variables are:

| Variable | Purpose | Default / example |
|---|---|---|
| `APP_NAME` | API application name | `LocalDocs` |
| `POSTGRES_DB` | PostgreSQL database name | `localdocs` |
| `POSTGRES_USER` | PostgreSQL user | `localdocs` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `localdocs_dev_password` (local only) |
| `DATABASE_URL` | Backend SQLAlchemy connection URL | Constructed by Compose |
| `SEAWEEDFS_MASTER_URL` | SeaweedFS master address from the backend container | `http://seaweed-master:9333` |
| `SEAWEEDFS_VOLUME_URL` | SeaweedFS volume address from the backend container | `http://seaweed-volume:8080` |
| `CORS_ALLOW_ORIGINS` | Comma-separated browser origins permitted by FastAPI | Set for the frontend origin in development |
| `VITE_API_BASE_URL` | Browser-facing API base URL used by Vite | `/api` in the production frontend |

Environment variables for URLs used by the backend inside Docker must use Compose service names, while URLs used by the browser must be reachable from the host browser.

## Troubleshooting

**Frontend loads, but documents do not load**
- Check `docker compose ps` and backend logs.
- Confirm the API URL is correct for the chosen setup (`/api` behind Nginx, or `http://localhost:8000` in development).
- In development, verify `VITE_API_BASE_URL` and `CORS_ALLOW_ORIGINS`.

**Backend cannot connect to PostgreSQL**
- Wait for the `postgres` health check to pass.
- Check the `DATABASE_URL` credentials and service hostname. Inside Compose, the database hostname is `postgres`, not `localhost`.

**Uploads or downloads fail**
- Check `seaweed-master`, `seaweed-volume`, and backend logs.
- Ensure both SeaweedFS services are running and their named volumes are intact.
- The production Nginx configuration limits request bodies to `10M`; larger uploads are rejected at the web-server layer.

**Need to reset all local data**
- This is destructive. Only if you intend to erase all persisted local data, run:

  ```bash
  docker compose down -v
  ```

  For the development Compose file, use `docker compose -f docker-compose.dev.yml down -v`.

## Current limitations and next steps

- No login, authentication, authorization, or user-specific document ownership.
- Shared files and notifications are not backed by corresponding server-side APIs.
- Document metadata schema is created with `create_all()` rather than migrations.
- Uploads are read into backend memory instead of streamed in chunks.
- PostgreSQL and SeaweedFS updates are not covered by a distributed transaction; recovery/reconciliation is limited.
- The app has only basic health checking and no comprehensive automated test suite included in the current project.
- Example credentials, exposed development ports, and current Nginx settings are for local use only.

Potential next improvements include Alembic migrations, automated backend/frontend tests, authentication and permissions, safer production configuration/secrets, upload streaming and size validation, and robust consistency repair between PostgreSQL and SeaweedFS.
