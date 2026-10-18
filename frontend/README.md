# LocalDocs frontend — feature-based refactor

A React + TypeScript + Vite refactor of the supplied LocalDocs frontend. The existing stylesheet and CSS class names are retained to preserve the current design.

## Structure

```text
src/
├── api/                         # HTTP/API operations
│   └── documentsApi.ts
├── components/
│   ├── common/                  # Shared UI primitives
│   └── layout/                  # Sidebar and toolbar
├── features/
│   ├── activity/                # Session activity log
│   └── documents/
│       ├── components/          # List, upload panel, preview modal
│       └── hooks/               # Document state and operations
├── lib/                         # Config, formatting and file helpers
├── pages/                       # Page-level composition
├── types/                       # Shared TypeScript domain types
├── app-context.tsx              # Shared UI state/context contract
├── App.tsx                      # Application composition and page switch
├── main.tsx                     # Vite entry point
└── style.css                    # Existing stylesheet
```

## Run locally

```bash
npm install
npm run dev
```

Build the production bundle:

```bash
npm run build
npm run preview
```

## Backend configuration

The frontend uses `VITE_API_BASE_URL` when configured; otherwise it defaults to `/api`. The expected API endpoints are:

- `GET /files`
- `POST /files` (multipart form field named `file`)
- `DELETE /files/{file_id}`
- `GET /health`
- `GET /docs` for the FastAPI Swagger UI link

For a Vite development proxy, configure the proxy in `vite.config.ts` to point `/api` at your FastAPI service. If the existing project already configures a proxy, keep that configuration.

## Architecture notes

- API calls live in `src/api/documentsApi.ts` and are not embedded in page JSX.
- Document state and operations live in `src/features/documents/hooks/useDocuments.ts`.
- File display/format helpers are centralized in `src/lib`.
- Page components live in `src/pages`; shared navigation lives in `src/components/layout`.
- Shared session state is exposed through `AppContext`, while `App.tsx` composes the app and chooses the current page.

The source is based on the supplied `App.tsx` and `style.css`. Run `npm run build` in your environment and test file upload, download, preview, delete, filters and pagination against your backend before deploying.
