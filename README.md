# LocalDocs


## Stage 4 UI refresh

The frontend now uses a document-dashboard layout inspired by the supplied reference image: a dark vertical navigation rail, search and list/grid controls, document table, type filter, right-side drag-and-drop upload panel, recent documents, and upload progress. Unneeded reference-only features such as sharing and user notifications are decorative/omitted. Existing API behavior is preserved: upload to FastAPI/SeaweedFS, metadata in PostgreSQL, list, preview supported files, download, and delete.

A local document management learning project using React + TypeScript, FastAPI, PostgreSQL, SeaweedFS, and Docker Compose.

## Stage 4: document listing and frontend integration

Stage 3 added PostgreSQL-backed document metadata. Stage 4 builds on that foundation with upload progress, refresh/loading/error/empty states, a persistent document list, preview for images/PDFs/text files, download, and delete actions. SeaweedFS stores file bytes; PostgreSQL stores the SeaweedFS file ID, original filename, content type, byte size, and upload timestamp.

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

## API

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


## Stage 4.1 frontend improvements

- Sidebar navigation opens functional Dashboard, Documents, Activity, Shared files, Recent, Settings, and Local development pages. The toolbar notification and local-user controls open their own pages.
- Dashboard and Recent are based on the current API document list. Activity records upload, delete, and manual refresh actions in the current browser session.
- Shared files shows an explanatory empty state because this learning project does not yet implement sharing APIs or user permissions.
- Settings lets you switch list/grid view, change the page size, and toggle in-app success messages for the current session.
- Local development checks the FastAPI `/health` endpoint and links to Swagger UI.
- The Documents type filter displays the selected option. Pagination supports 5, 10, 20, or 50 records per page.

## Stage 4 frontend behavior

- Upload progress is reported by the browser's `XMLHttpRequest.upload` progress event. This measures transfer progress to the API; the operation is only complete after SeaweedFS storage and PostgreSQL metadata persistence succeed.
- Preview is offered for image MIME types, PDFs, and text MIME types. The preview endpoint uses `GET /files/{file_id}?download=false`, allowing the browser to render supported content inline.
- Other file types remain downloadable, but the browser preview is not offered.
- The frontend refreshes the metadata list after a successful upload or delete.
