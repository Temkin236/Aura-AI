# AURA AI — Intelligent Editorial Companion

> **"Think better. Create freely."**
> A personal intelligence companion for deep learning, software engineering, research, and creative exploration, designed with an intentional editorial luxury aesthetic.

---

## Overview

AURA AI pairs high-velocity, server-side streaming intelligence with an editorial visual identity: deep espresso `#2B1D17`, dark chocolate `#4A3026`, warm cream `#F8F3ED`, and soft gold `#C7A46A`.

Generated originally via Google AI Studio and now engineered for stability, security, and responsive performance, AURA keeps all AI credentials on the server, streams incremental chunks directly over Server-Sent Events (SSE), and incorporates an offline fallback engine for local offline development.

---

## Key Features

- **Real Server-Sent Events (SSE) Streaming**: Incremental chunk delivery from the server with instant first-token response and clean client abort handling (`AbortController`).
- **PostgreSQL Foundation & Auto-Migrations**: Automated transactional migration runner with health checks and pooled connection management.
- **Session Authentication & RBAC**: Secure `httpOnly` cookie sessions, salted Argon2/scrypt password hashing, and role-based access control (`USER`, `ADMIN`).
- **Conversation & Message Persistence**: Multi-user isolated conversation history stored in PostgreSQL with cascading deletion.
- **5 Adaptive AI Personas**:
  - **Developer**: Architectural rigor, bounded algorithms, clean typed code, and edge case breakdown.
  - **Creative**: Sensory resonance, nuanced metaphors, and literary prose.
  - **Tutor**: First-principles intuition, conceptual frameworks, and Socratic patience.
  - **Friendly**: Empathetic, calm, mindful conversation.
  - **Professional**: Executive synthesis, risk mitigation, and strategic action plans.
- **Server-Side Model Abstraction**: Fully server-side Google Gen AI integration via `@google/genai` SDK. Supports configurable models (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`).
- **Offline & Graceful Fallback**: If an API key is absent or an upstream failure occurs, AURA activates its local fallback engine with clear status indication in the UI.
- **Editorial Markdown & Code Highlighting**: Syntax-highlighted code blocks with line numbering, language tags, and animated copy actions.
- **Markdown URL Security**: Safe link sanitization rejecting dangerous schemes (`javascript:`, `data:`, `vbscript:`, `file:`, `blob:`).
- **Responsive Architecture**:
  - Independent desktop collapsible sidebar.
  - Full mobile drawer with backdrop overlay, Escape key binding, auto-close on selection, and touch-friendly controls.
  - Crowding-free mobile composer and header (tested down to 360px).
- **Class-Based Tailwind v4 Dark Mode**: Flawless switching across Warm Cream (Light), Night Espresso (Dark), and System Sync.
- **Resilient Conversation State**: Debounced storage synchronization with quota error isolation and empty state welcome cards.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Runtime & Backend** | Node.js (>= 20), Express 4.x, `tsx`, `pg` |
| **Database** | PostgreSQL with automated schema migrations |
| **Authentication & Security** | Cookie-based session auth, RBAC (`USER`/`ADMIN`), Rate Limiting |
| **Frontend Framework** | React 19, TypeScript 5.8 |
| **Bundler & Build Tool** | Vite 8.x / Vite 6.x |
| **Styling & Design System**| Tailwind CSS v4, Vanilla CSS Design Tokens, Cormorant Garamond, Plus Jakarta Sans |
| **AI Integration** | Official `@google/genai` SDK (Server-Side Only) |
| **Icons & Animation** | Lucide React, Motion |
| **Testing** | Vitest 3.x with in-memory PostgreSQL testing harness |

---

## Prerequisites

- **Node.js**: v20.11.0 or higher
- **npm**: v10.0.0 or higher
- **PostgreSQL**: v14 or higher (or optional in-memory / local test database)
- **Google Gemini API Key** (optional for local fallback; required for live model streaming)

---

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Temkin236/Aura-AI.git
   cd Aura-AI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Configure your database and Gemini credentials:
   ```env
   DATABASE_URL="postgres://user:password@localhost:5432/aura"
   GEMINI_API_KEY="AIzaSy..."
   GEMINI_MODEL="gemini-2.5-flash"
   PORT=3000
   SESSION_SECRET="your-secure-session-secret"
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Database migrations run automatically on startup. The application will be live at `http://localhost:3000`.

---

## Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts Express server with automatic migrations and Vite development middleware |
| `npm run build` | Compiles client assets to production bundle in `dist/` |
| `npm run lint` | Runs TypeScript compiler type-check (`tsc --noEmit`) |
| `npm test` | Runs the automated Vitest test suite (Auth, RBAC, Persistence, Stream, UI) |
| `npm run clean` | Cross-platform directory cleaner (`dist/`, `server.js`) |
| `npm start` | Runs server in production mode |

---

## API Endpoints

### 1. `GET /api/health`
Checks server readiness, database connection, API key availability, default model, and allowed model catalogue.

### 2. `POST /api/auth/signup` & `POST /api/auth/signin`
User registration and secure session creation with HTTP-only cookie assignment.

### 3. `GET /api/auth/me` & `POST /api/auth/signout`
Session verification and server-side session invalidation.

### 4. `GET /api/conversations` & `POST /api/conversations`
Authenticated CRUD for persistent conversations and message history.

### 5. `POST /api/chat/stream`
Server-Sent Events (SSE) streaming endpoint with automatic conversation turn persistence.

---

## Security Model

- **Zero Client Credential Exposure**: `GEMINI_API_KEY` and session tokens are strictly confined to server-side memory.
- **Model Name Allowlisting**: The backend rejects arbitrary client model parameters and falls back safely to `DEFAULT_GEMINI_MODEL`.
- **Context Limiting**: Conversation turns are bounded to prevent prompt injection and token explosion.
- **Rate Limiting**: Protected with `express-rate-limit` against abuse and denial of service.
- **Strict Multi-User Isolation**: Database queries enforce tenant/user boundaries with cascade integrity.
- **Markdown Sanitization**: Links strictly allow `https:`, `http:`, and `mailto:`, blocking `javascript:`, `data:`, `vbscript:`, and file protocols.

---

## License

MIT License. Designed with Google AI Studio and refined for production-grade web craftsmanship.
