# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZenReader - An AI-powered progressive web app (PWA) that transforms content (YouTube videos, text, files) into high-quality, distraction-free ebook chapters using Google Gemini AI. Features include smart formatting, AI summaries, Q&A chat, and EPUB export.

## Development Commands

### Running Locally (requires both servers)

```bash
# Terminal 1: Start backend API server (port 8080)
npm run dev:server

# Terminal 2: Start frontend dev server (port 3000)
npm run dev
```

Frontend available at http://localhost:3000 (proxies `/api` to backend at http://localhost:8080)

### Build & Deploy

```bash
npm run build          # TypeScript check + Vite build to /dist
npm run preview        # Preview production build locally
npm start              # Run production server (tsx server/index.ts)
```

Docker single-container deployment to Google Cloud Run:

```bash
docker build -t zenreader .
# VITE_GEMINI_API_KEY injected via Cloud Run environment variables
```

### Testing

```bash
npm run test           # Run Vitest tests
npm run lint           # ESLint check
```

**IMPORTANT**: Never commit test or lint result files (e.g., `lint_results.txt`, `test_errors.txt`) to git. These are temporary artifacts and should be:

- Excluded via `.gitignore` patterns (`lint_*.txt`, `test_*.txt`)
- Generated on-demand during development or CI/CD
- Deleted after use or kept only in local build artifacts directories

## Architecture

### Two-Process Architecture

```
┌─────────────────────┐     ┌──────────────────────────────────┐
│  React Frontend     │────▶│  Express Backend (server/)       │
│  (Vite dev server)  │/api │  - Gemini API proxy              │
│  Port 3000          │     │  - Rate limiting (30 req/min)    │
└─────────────────────┘     │  Port 8080                       │
                            └──────────────────────────────────┘
```

- **Frontend** calls `/api/*` endpoints (proxied via Vite in dev, Express static in prod)
- **Backend** holds the API key and makes Gemini calls with search grounding
- Production: Single Docker container serves both static files and API
- **Storage**: IndexedDB for books (hundreds of MB), localStorage for settings

### Key Files

| File                                       | Purpose                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `server/index.ts`                          | Express TypeScript server with `/health` and `/api/generate` endpoints |
| `src/services/geminiService.ts`            | Client-side Gemini API wrapper with model fallback chains              |
| `src/services/db.ts`                       | IndexedDB operations for book storage                                  |
| `src/store/useBookStore.ts`                | Zustand store for current book state (in-memory)                       |
| `src/store/useSettingsStore.ts`            | Zustand store for reader settings (persisted to localStorage)          |
| `src/store/useUIStore.ts`                  | Zustand store for UI states (modal, sidebar, splash)                   |
| `src/types/index.ts`                       | TypeScript interfaces for Book, Chapter, ReaderSettings, Highlight     |
| `src/components/App.tsx`                   | Root component with view state routing                                 |
| `src/components/Reader.tsx`                | Main reading view with highlights and navigation                       |
| `src/components/library/LibraryUpload.tsx` | Import interface (file/YouTube/text)                                   |
| `src/utils/fileHelpers.ts`                 | Text extraction from PDF, DOCX, TXT, MD files                          |
| `src/utils/epubGenerator.ts`               | EPUB 3 generation with JSZip                                           |

### API Endpoints

**GET /health**

- Health check endpoint
- Returns: `{ status: 'ok', time, env: { hasApiKey, nodeEnv, version } }`

**POST /api/generate**

- Gemini API proxy with rate limiting (30 req/min per IP)
- Request body:
  ```json
  {
    "model": "gemini-2.5-flash",
    "contents": "string | Content[]",
    "config": {
      "systemInstruction": "string?",
      "tools": "object[]?",
      "generationConfig": "object?"
    }
  }
  ```
- Response: `{ text: string, ...responseData }`

### Model Fallback Chains

Service tries models in order until one succeeds:

```typescript
PRO_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash'];
FLASH_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
YOUTUBE_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
```

### Content Chunking Strategy

```typescript
CONTENT_LIMITS = {
  CHAPTER_SUMMARY: 10000, // ~2,500 tokens
  BOOK_SUMMARY_CHUNK: 20000, // ~5,000 tokens per chunk
  QUESTION_CONTEXT: 15000, // ~3,750 tokens
  MAX_BOOK_CONTENT: 100000, // Above this triggers chunking
};
```

Large books are split into chunks for summarization, then summaries are combined.

## Environment Variables

```bash
# .env file in project root
VITE_GEMINI_API_KEY=your_gemini_api_key

# For production builds
NODE_ENV=production
PORT=8080
```

Note: `dotenv` does NOT override existing system environment variables. If API calls fail with "invalid key", check for conflicting system env vars.

## State Management (Zustand)

Three separate stores for different concerns:

```typescript
useBookStore(); // Current book & chapter state (in-memory)
useSettingsStore(); // Reader settings: theme, font, etc. (persisted to localStorage)
useUIStore(); // Modal/sidebar/splash states (transient)
```

## Known Bugs & Solutions (Gemini API)

| Issue                                  | Symptom                                      | Solution                                            |
| -------------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| `response.text` is property not method | `TypeError: response.text is not a function` | Use `response.text` not `response.text()`           |
| JSON in markdown blocks                | `SyntaxError: Unexpected token`              | Strip ` ```json ``` ` wrapper before parsing        |
| googleSearch + responseSchema          | `400: controlled generation not supported`   | Remove responseSchema, prompt for JSON instead      |
| Outdated model names                   | `404: model not found`                       | Use `gemini-2.5-pro`, `gemini-2.5-flash`            |
| dotenv doesn't override system vars    | Wrong API key used                           | Unset system env var or explicitly set when running |
| Rate limiting                          | `429: Too many requests`                     | Max 30 req/min per IP (express-rate-limit)          |
| Safety filters                         | Content blocked                              | Content was blocked by Gemini safety filters        |

## Known Issues & Solutions

| Issue                    | Symptom                                        | Solution                                                                        |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Language Translation Bug | "Smart Format" unexpectedly translates content | Split language handling into generation vs interaction instructions             |
| Stale UI after deploy    | Old UI persists after Cloud Run redeploy       | Update `CACHE_NAME` in `sw.js`; unregister old service workers                  |
| Missing API Key in prod  | "Error: API Key missing"                       | Inject `VITE_GEMINI_API_KEY` at build time via `.env.production`                |
| YouTube import fails     | "Unable to fetch transcript"                   | Gemini uses `googleSearch` tool to find transcript; may fail for private videos |
| Unsupported file type    | "This file type is not supported"              | Supported: PDF, DOCX, MD, TXT, SRT, VTT                                         |
| PDF extraction fails     | "Unable to read this PDF"                      | Some encrypted or image-only PDFs cannot be parsed                              |

## Supported File Types

- **PDF** - Text extraction via `pdfjs-dist`
- **DOCX** - Parsing via `mammoth`
- **Markdown** - Direct parsing
- **TXT** - Plain text
- **SRT/VTT** - Subtitle files

## Theme System

5 themes available: `light`, `sepia`, `dark`, `forest`, `midnight`

- Font sizes: 1-8 (xs to 3xl)
- Font families: `serif` | `sans`
- Defined in `src/constants/index.ts`
- Persisted via Zustand + localStorage

## Data Flow

### Import a File

```
User → LibraryUpload → extractTextFromFile → parseMarkdownToBook → saveBook(IndexedDB)
                                    ↓
                        (if Smart Format enabled)
                                    ↓
                        generateBookFromText → Gemini API (via proxy)
```

### YouTube Import

```
User → URL Input → generateBookFromYouTube → Gemini (with googleSearch tool)
                                      ↓
                        Parse JSON response → saveBook → Reader
```

### Reader AI Features

```
Text Selection → [Ask question] → answerQuestion(contents, query)
                                ↓
                        Gemini API → renderMarkdown → Chat message
```

### EPUB Export

```
Reader → [Export button] → epubGenerator.generateEpub()
                        ↓
                JSZip (create ZIP with EPUB structure)
                        ↓
                Download as `.epub` file
```

## Error Handling

Centralized error mapping in `src/utils/errorMessages.ts`:

- Maps technical errors to user-friendly messages
- Rate limit (429), auth (401), model not found (404), etc.
- React Error Boundaries wrap `<Reader>` and `<AIPanel>` components

## Security & Validation

### Server-Side

- **Model Whitelist**: Only allowed Gemini models accepted
- **Content Type Check**: String or array validation
- **Rate Limiting**: 30 req/min per IP
- **Error Messages**: Stack traces only in dev mode
- **Body Limit**: 10MB max (Express)

### Client-Side

- **File Types**: PDF, DOCX, MD, TXT, SRT, VTT only
- **API Key**: Never exposed to client (server-side only)
- **IndexedDB**: Books stored locally (no server persistence)

## Deployment

### Local Production Test

```bash
npm run build
npm start
# Visit http://localhost:8080
```

### Docker Build

```bash
docker build -t zenreader .
docker run -e VITE_GEMINI_API_KEY=your_key -p 8080:8080 zenreader
```

### Cloud Run Deployment

```bash
gcloud run deploy zenreader \
  --source . \
  --port 8080 \
  --set-env-vars VITE_GEMINI_API_KEY=your_key \
  --allow-unauthenticated
```

**Current Deployment:** [https://zenreader-757733164050.us-west1.run.app](https://zenreader-757733164050.us-west1.run.app)

## TODO: Implement Secret Manager

Currently `VITE_GEMINI_API_KEY` must be set manually after each Cloud Run deployment. Implement Google Cloud Secret Manager:

```bash
# 1. Create secret
echo -n "YOUR_API_KEY" | gcloud secrets create VITE_GEMINI_API_KEY --data-file=-

# 2. Grant Cloud Run access
gcloud secrets add-iam-policy-binding VITE_GEMINI_API_KEY \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 3. Update deployment to reference secret (not the actual value)
gcloud run deploy zenreader \
  --set-secrets="VITE_GEMINI_API_KEY=VITE_GEMINI_API_KEY:latest"
```

## Performance Characteristics

- **IndexedDB**: Hundreds of MB capacity for books
- **LocalStorage**: ~5MB for settings
- **Rate Limit**: 30 requests/min per IP
- **Body Limit**: 10MB (Express)
- **Content Chunks**: 20K chars per chunk for large books
- **No server-side persistence**: All data client-local

## Component Tree

```
App
├── SplashScreen (initial load)
├── LibraryUpload (no book loaded)
│   ├── Tabs: "Import" | "Library"
│   ├── Import Types: File | YouTube | Text
│   └── Library: Book cards with actions
└── Reader (book loaded)
    ├── Sidebar (TOC, chapter list, EPUB export)
    ├── ReaderTopBar (navigation, settings)
    ├── AIPanel (summary & chat tabs)
    └── Main content (ReactMarkdown, highlights, notes)
```

## Best Practices

### Code Quality

- **TypeScript Strict Mode**: Enabled in `tsconfig.json` for type safety
- **ESLint**: Run `npm run lint` before committing
- **Testing**: Run `npm run test` to ensure tests pass

### Version Control (Git)

**NEVER commit these files/directories:**

- ❌ Test/lint result files (`lint_*.txt`, `test_*.txt`, `*_results.txt`, `*_errors.txt`)
- ❌ Coverage reports (`coverage/`, `*.lcov`)
- ❌ Build artifacts (`dist/`, `node_modules/`)
- ❌ Environment files with secrets (`.env`, `.env.production`)
- ❌ IDE/editor files (`.vscode/`, `.idea/`)
- ❌ OS files (`.DS_Store`, `Thumbs.db`)

**Why?** Test and lint results are:

- Temporary artifacts regenerated on every run
- Pollute git history with noise
- Can conflict between team members
- Should be generated in CI/CD pipelines, not stored in version control

**What to do instead:**

1. Ensure `.gitignore` excludes these patterns
2. Generate test/lint reports on-demand during development
3. Use CI/CD to generate and store reports as build artifacts
4. If needed for documentation, keep in a separate `reports/` directory that's gitignored

### Service Worker Updates

- Update `CACHE_VERSION` in `sw.js` before each deployment
- Format: `v{major}.{minor}.{timestamp}` (e.g., `v1.0.20260128`)
- This ensures users get the latest UI after browser refresh

### Environment Variables

- Never commit `.env` files with real API keys
- Use `.env.example` or `.env.template` for documentation
- In production, inject secrets via Cloud Run environment variables or Secret Manager

## Testing

```bash
npm run test    # Run Vitest tests
npm run lint    # ESLint check
```

Test files:

- `src/App.test.tsx` - App component tests
- `src/services/geminiService.lang.test.ts` - Language handling tests
