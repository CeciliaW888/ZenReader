# Architecture & Technical Decisions

## High-Level Overview

ZenReader is a **Client-Side First** Progressive Web App (PWA) with a lightweight Express backend proxy. It creates the illusion of a complex backend CMS but runs primarily in the browser, leveraging Google's Gemini API for AI features.

## Project Structure

```
src/
├── components/
│   ├── ai/              # AI-related components (AIPanel)
│   ├── common/          # Shared components (ErrorBoundary, Skeleton)
│   ├── library/         # Library view components (LibraryUpload, SplashScreen)
│   └── reader/          # Reader components (ReaderTopBar, AppearanceMenu)
├── constants/           # App constants and theme definitions
├── services/            # Business logic (db.ts, geminiService.ts)
├── store/               # Zustand state management
├── types/               # TypeScript type definitions
└── utils/               # Utility functions (fileHelpers, errorMessages)

server/
└── index.ts             # Express TypeScript backend (API proxy)
```

## Core Stack Decisions

### 1. React 19 + Vite + TypeScript
*   **Why:** Performance, modern concurrency features, and type safety.
*   **Routing:** No complex router needed; simple state-based view switching keeps the app lightweight.

### 2. State Management: Zustand + IndexedDB
*   **Decision:** We use Zustand for in-memory state and IndexedDB for persistence.
*   **Zustand Stores:**
    *   `useBookStore` - Current book and chapter state
    *   `useSettingsStore` - Reader settings (persisted via Zustand middleware)
    *   `useUIStore` - UI state (modals, sidebar, splash screen)
*   **IndexedDB (via `services/db.ts`):**
    *   **Capacity:** Handles hundreds of megabytes (LocalStorage is capped at ~5MB).
    *   **Performance:** Asynchronous, preventing UI blocking.
    *   **Privacy:** User data never leaves the device (unless sent to Gemini API).

### 3. Backend: Express + TypeScript
*   **Decision:** Lightweight Express server as an API proxy.
*   **Purpose:**
    *   Hide API keys from the client
    *   Rate limiting (30 requests/minute per IP)
    *   Input validation with model whitelist
*   **Runtime:** Uses `tsx` for TypeScript execution in production.

### 4. UI Styling: Tailwind CSS + Typography
*   **Decision:** Use `@tailwindcss/typography` (`prose` classes).
*   **Reasoning:** The `prose` plugin provides professionally typeset defaults for the reader experience, customized via theme config (Sepia, Midnight, Forest, etc.) in `constants/index.ts`.

### 5. Error Handling
*   **React Error Boundaries:** Wrap major components to prevent full app crashes.
*   **Centralized Error Messages:** `utils/errorMessages.ts` maps API/system errors to user-friendly messages.
*   **Skeleton Loading:** Reusable skeleton components for loading states.

## AI Architecture

### Model Selection (Updated January 2026)
We use model fallback chains to balance reliability, cost, and quality:

1.  **Pro Chain (`gemini-2.5-pro` → `gemini-2.5-flash` → `gemini-2.0-flash`):**
    *   **Use Case:** Complex reasoning tasks, book generation.
2.  **Flash Chain (`gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash`):**
    *   **Use Case:** Chat, summarization, quick responses.
3.  **YouTube Chain (`gemini-2.5-flash` → `gemini-2.5-pro` → `gemini-2.0-flash`):**
    *   **Use Case:** Video processing with search grounding.

### Content Chunking
For large books (>100K characters), content is automatically chunked for:
*   Staged summarization (summarize chunks → combine summaries)
*   Respecting API token limits

### The "Skill Injection" Pattern
*   **Decision:** Prompt engineering logic (the "Podcast-to-Book" skill) is embedded as a constant in `geminiService.ts`.
*   **Reasoning:**
    *   **Reliability:** No network dependency for prompts.
    *   **Versioning:** Skill definitions are versioned with code.
    *   **Context:** Passed to `systemInstruction` parameter.

### The "Ghostwriter" Pipeline
When a user inputs a YouTube URL:
1.  **Search:** The model uses the `googleSearch` tool to find metadata and transcript.
2.  **Instruction:** The model applies the `PODCAST_TO_BOOK_SKILL` (narrative non-fiction rules).
3.  **Schema Enforcement:** We force a `responseSchema` (JSON) to ensure valid Title and Chapters array.
4.  **Language Preservation:** Explicit instructions to maintain source language unless translation requested.
