# AURA AI — Intelligent Editorial Companion & Full-Stack AI Platform

> **"Think better. Create freely."**
> A production-grade personal intelligence companion and LLM application platform engineered with architectural rigor, multimodal perception, vector RAG, tool calling, controlled agents, and an intentional editorial luxury aesthetic.

---

## Architecture Diagram

```
                         ┌─────────────────────────────────────────┐
                         │               React 19 UI               │
                         │                                         │
                         │  • Editorial Chat & Personas            │
                         │  • Multimodal Attachments & Preview     │
                         │  • Vector RAG Sources Accordion         │
                         │  • Tool Call Execution Trace            │
                         │  • Voice Input & Text-to-Speech         │
                         │  • Conversation Search & Export (MD/PDF)│
                         │  • Secure Read-Only Public Sharing      │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │            Express 4.x Server           │
                         │                                         │
                         │  • Cookie Session Auth & RBAC           │
                         │  • Real-Time SSE Stream Engine          │
                         │  • Rate Limiting & Input Sanitization   │
                         │  • Attachments & Document Ingestion API │
                         │  • Telemetry & Admin Directory          │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │             AI Orchestrator             │
                         │                                         │
                         │  • Prompt Pipelines & Personas          │
                         │  • Bounded Conversation Memory          │
                         │  • Multimodal InlineData Processing     │
                         │  • Semantic Chunking & Vector RAG       │
                         │  • Sandboxed Tool Registry (Math, etc.) │
                         │  • Bounded Controlled Agent Workflow    │
                         └───────┬────────────┼────────────┬───────┘
                                 │            │            │
                 ┌───────────────┘            │            └──────────────┐
                 ▼                            ▼                           ▼
        ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
        │  Google Gemini   │        │ Embeddings & RAG │        │ Tool Registry    │
        │  (@google/genai) │        │                  │        │                  │
        │  • 2.5 Flash/Pro │        │  • text-embed    │        │  • Calculator    │
        │  • Vision & Docs │        │  • Dense Vectors │        │  • Weather       │
        │  • Token Stream  │        │  • Cosine Search │        │  • Currency      │
        │  • Fallback      │        │  • Grounding     │        │  • DateTime      │
        └──────────────────┘        └─────────┬────────┘        └──────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │ PostgreSQL Pool  │
                                    │                  │
                                    │  • Users & Auth  │
                                    │  • Conversations │
                                    │  • Messages      │
                                    │  • Attachments   │
                                    │  • RAG Documents │
                                    │  • Vector Chunks │
                                    │  • Share Links   │
                                    │  • Settings      │
                                    │  • Telemetry     │
                                    └──────────────────┘
```

---

## Core Capabilities

### 1. Multimodal AI & File Attachments
- Accepts image uploads (PNG, JPEG, WEBP, GIF) and documents (PDF, Markdown, CSV, JSON, TXT).
- Client-side thumbnail previews with size validation and removal controls.
- Server-side MIME validation and size enforcement ($\le$ 10MB).
- Direct `@google/genai` multimodal pipeline via `inlineData` parts.
- Attachment persistence in PostgreSQL (`attachments` table).

### 2. Embeddings, Vector Search & RAG
- **Embedding Service**: Powered by Google Gen AI embedding models with deterministic fallback.
- **Semantic Chunking**: Context-aware windowing with sentence-boundary preservation and overlap.
- **Vector Retrieval**: User-scoped semantic similarity search ($k$-NN cosine scoring).
- **Grounded Answers**: Context injection with strict grounding rules preventing hallucination.
- **Editorial UX**: Collapsible grounding source citations with match percentage and excerpt snippets.

### 3. Prompt Pipelines & 5 AI Personas
- Standardized prompt templates (`buildSystemPrompt`, `buildPersonaPrompt`, `buildRagContextString`, `buildToolContextString`).
- 5 Tailored Personas:
  - **Developer**: Architectural precision, type safety, memory bounds, complexity trade-offs.
  - **Creative**: Sensory depth, intentional restraint, evocative prose.
  - **Tutor**: First-principles intuition, Socratic checkpoints.
  - **Friendly**: Mindful reflection, empathetic conversation.
  - **Professional**: Executive summaries, risk mitigation, operational action plans.

### 4. Sandboxed Tool Calling & Controlled Agent Workflows
- **Tool Registry**: Safe mathematical calculator (strict non-eval parser supporting percentages, roots, arithmetic), weather lookup, currency converter, and real-time datetime tools.
- **Controlled Agent Loop**: Bounded execution (maximum 3 iterations, execution timeouts, safe structured output).

### 5. Workspace Intelligence, Search & Organization
- **Search**: PostgreSQL full-text and title/message search (`GET /api/conversations/search?q=`).
- **Organization**: Pinning, archiving, renaming, and tags.
- **Export**: Instant export to Markdown (`.md`), structured JSON, or print-ready PDF HTML.
- **Secure Public Snapshots**: Cryptographically random share tokens (`/share/:token`) for read-only public viewing without leaking user identities or credentials.

### 6. Authentication, RBAC & Cloud Settings
- HttpOnly cookie sessions, Argon2/bcrypt password hashing.
- Role-based access control (`USER` vs `ADMIN`).
- PostgreSQL persistence for authenticated users, localStorage fallback for anonymous guests.
- Real-time admin telemetry (`GET /api/admin/metrics`) with live user directory and persona distribution analytics.

### 7. Voice Dictation & Synthesis
- Browser-native Web Speech API speech-to-text dictation.
- Text-to-speech audio playback with user control.

---

## Database Migrations

Automated startup transactional migration runner manages the following ordered schema:

1. `001_initial_schema.sql` — Users, Profiles, Conversations, Messages, Settings, Admin Roles, Audit Logs.
2. `002_sessions.sql` — Server-side HTTP-only session tokens with expiration.
3. `003_attachments.sql` — File attachments metadata, MIME types, and storage keys.
4. `004_rag_documents.sql` — Ingested documents and vector embedding chunks.
5. `005_shares_and_tags.sql` — Public share links and conversation tags.

---

## Production Deployment & DevOps

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start local dev server (migrations run automatically)
npm run dev
```

### Docker & Docker Compose
```bash
# Start containerized PostgreSQL 16 + AURA AI application
docker compose up --build -d
```

### Verification & Quality Gates
```bash
# Typecheck
npm run lint

# Automated test suite (107 tests across 14 suites)
npm test

# Production build
npm run build
```

---

## License

MIT License. Designed with Google AI Studio and engineered for production AI applications.
