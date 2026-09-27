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
- **Resilient Conversation State**: Debounced local storage synchronization (500ms post-stream) with quota error isolation and empty state welcome cards.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Runtime & Backend** | Node.js (>= 20), Express 4.x, `tsx` |
| **Frontend Framework** | React 19, TypeScript 5.8 |
| **Bundler & Build Tool** | Vite 8.x / Vite 6.x |
| **Styling & Design System**| Tailwind CSS v4, Vanilla CSS Design Tokens, Cormorant Garamond, Plus Jakarta Sans |
| **AI Integration** | Official `@google/genai` SDK (Server-Side Only) |
| **Icons & Animation** | Lucide React, Motion |
| **Testing** | Vitest 3.x |

---

## Prerequisites

- **Node.js**: v20.11.0 or higher
- **npm**: v10.0.0 or higher
- **Google Gemini API Key** (optional for local fallback; required for live model streaming)

---

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/aura-ai.git
   cd aura-ai
   ```

2. **Install dependencies** (clean install without legacy peer flag workarounds):
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   GEMINI_MODEL="gemini-2.5-flash"
   PORT=3000
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   The application will be live at `http://localhost:3000`.

---

## Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts Express server with Vite development middleware |
| `npm run build` | Compiles client assets to production bundle in `dist/` |
| `npm run lint` | Runs TypeScript compiler type-check (`tsc --noEmit`) |
| `npm test` | Runs the automated Vitest test suite |
| `npm run clean` | Cross-platform directory cleaner (`dist/`, `server.js`) |
| `npm start` | Runs server in production mode |

---

## API Endpoints

### 1. `GET /api/health`
Checks server readiness, API key availability, default model, and allowed model catalogue.
```json
{
  "status": "ok",
  "hasApiKey": true,
  "defaultModel": "gemini-2.5-flash",
  "allowedModels": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
  "timestamp": "2026-09-27T12:00:00.000Z"
}
```

### 2. `POST /api/chat/stream`
Server-Sent Events (SSE) streaming endpoint.
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "prompt": "How do event loops work?",
    "mode": "developer",
    "model": "gemini-2.5-flash",
    "temperature": 0.7,
    "systemInstruction": "Optional persona instruction override",
    "history": [
      { "role": "user", "content": "Hello" },
      { "role": "model", "content": "Greetings." }
    ]
  }
  ```
- **Stream Response**:
  ```
  data: {"text":"Event","model":"gemini-2.5-flash","isFallback":false}

  data: {"text":" loops...","model":"gemini-2.5-flash","isFallback":false}

  data: [DONE]
  ```

### 3. `POST /api/chat`
Standard buffered JSON endpoint (for non-streaming clients or automated tests).

---

## Security Model

- **Zero Client Credential Exposure**: `GEMINI_API_KEY` is strictly confined to server-side memory and never delivered to the client bundle or browser environment.
- **Model Name Allowlisting**: The backend rejects arbitrary client model parameters and falls back safely to `DEFAULT_GEMINI_MODEL`.
- **Context Limiting**: Conversation turns are bounded to the last 8 messages, 4,000 characters per turn, and 16,000 characters total context to prevent prompt injection and token explosion.
- **Rate Limiting**: AI endpoints are protected with `express-rate-limit` (default: 60 req/min). Exceeding the threshold returns a clean `429` with user-friendly error guidance.
- **Markdown Sanitization**: Links strictly allow `https:`, `http:`, and `mailto:`, blocking `javascript:`, `data:`, `vbscript:`, and file protocols.

---

## Current Architecture & Scope

- **Admin Console**: The admin interface is currently a **local prototype preview** for inspecting persona prompts, model catalogues, and simulated metrics. Real multi-tenant authorization, remote logging, and persistence require a dedicated auth and database backend.
- **Storage**: User conversations are maintained client-side in `localStorage`.
- **Fallback Persona**: When offline or running without an API key, AURA generates contextual fallback reflections for each mode without failing or masquerading as an external API response.

---

## License

MIT License. Designed with Google AI Studio and refined for production-grade web craftsmanship.
