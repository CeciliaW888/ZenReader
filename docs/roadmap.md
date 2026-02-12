# ZenReader Roadmap & Status

## Project Goal
To build an immersive, AI-powered "Ghostwriter" application that transforms fragmented content (YouTube videos, raw text, Markdown) into structured, high-quality, book-like reading experiences.

## ✅ What Works (Current Status)

### 1. Core Engine ("The Transformer")
- **YouTube to Book:** Fully functional.
    - Uses `gemini-2.5-flash` with Google Search grounding.
    - Injects a specialized "Podcast-to-Book" skill (Ghostwriter Persona) via system instructions.
    - Automatically generates "Introduction", "Source & Context", and "Bio" sections.
    - Restructures video content into logical, narrative chapters.
    - Language preservation (maintains source language unless translation requested).
- **Text to Book:** Functional.
    - Takes raw text paste and uses AI to organize it into chapters with titles.
- **File Import:** Functional.
    - Supports MD, TXT, PDF, DOCX, SRT, VTT files.
    - Optional "Smart Format" AI processing.

### 2. The Reading Experience
- **Distraction-Free Reader:** Implemented using Tailwind Typography (`prose`).
- **Customization:**
    - 5 Themes (Light, Sepia, Dark, Forest, Midnight).
    - Font toggle (Serif/Sans).
    - Font size adjustment (8 levels).
- **Navigation:**
    - Sidebar TOC (Table of Contents).
    - Next/Previous chapter buttons.
    - Scroll progress preservation.
    - Heading navigation (keyboard shortcuts).

### 3. AI Companion
- **Side Panel:** Integrated active reading assistant.
- **Book Summary:** On-demand summarization with chunking for large books.
- **Chat:** Context-aware Q&A based on book content.
- **Skeleton Loading:** Visual feedback during AI processing.

### 4. Technical Foundation
- **PWA:** Service Worker registered; app installable; assets cached.
- **Persistence:** Books saved locally using IndexedDB.
- **State Management:** Zustand for reactive state with persistence middleware.
- **Backend Proxy:** TypeScript Express server with:
    - API key protection
    - Rate limiting (30 req/min per IP)
    - Input validation with model whitelist
- **Error Handling:**
    - React Error Boundaries prevent full app crashes
    - User-friendly error messages
- **Responsive:** Mobile-first design with collapsible sidebars.

### 5. Export & Backup
- **EPUB Export:** Generate valid EPUB files from books.
- **Library Backup:** Export/import full library as JSON.

---

## ✅ Recently Completed (January 2026)

1.  **TypeScript Server:** Converted `server/index.js` to TypeScript with proper types.
2.  **Zustand State Management:** Centralized state with three stores (book, settings, UI).
3.  **Architecture Restructure:** Organized components into ai/, common/, library/, reader/ folders.
4.  **Loading Skeletons:** Reusable skeleton components for better loading UX.
5.  **Error Messages:** Centralized user-friendly error handling.
6.  **Model Updates:** Updated to Gemini 2.5 series (gemini-2.5-pro, gemini-2.5-flash).
7.  **Content Chunking:** Large book handling with staged summarization.
8.  **Language Bug Fix:** Fixed Smart Format translating content unexpectedly.

---

## 🚧 Known Limitations

1.  **API Quotas:**
    - Heavy usage of Pro models for video processing is intensive.
    - Rate limiting helps but users may hit Gemini API limits.
2.  **Long Video Handling:**
    - Very long videos (>2 hours) might hit context window limits.
3.  **Image Support:**
    - Book generation is text-only; no screenshot extraction from videos.

---

## 🚀 Future Roadmap

### Phase 2: Audio & Accessibility
- [ ] **TTS (Text-to-Speech):** Generate audiobook versions using AI.
- [ ] **Podcast Mode:** Direct audio file upload with transcription.

### Phase 3: Cloud & Sync
- [ ] **Backend Sync:** Optional login to sync with Firebase/Supabase.
- [ ] **Cross-Device State:** Sync reading progress across devices.

### Phase 4: Enhanced Export
- [ ] **PDF Export:** Print-ready PDF generation.
- [ ] **Kindle Direct:** Send to Kindle integration.

### Phase 5: Advanced Features
- [ ] **Highlights & Annotations:** In-reader highlighting with notes.
- [ ] **Reading Statistics:** Track reading time and progress.
- [ ] **Collections:** Organize books into collections/folders.
