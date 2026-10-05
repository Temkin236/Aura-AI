# AURA AI — Intelligent Conversational Companion

AURA AI is a simple, elegant, and fully functional AI chatbot powered by Google Gemini, designed with luxury editorial aesthetics and real-time streaming responses.

---

## Features

- **Real Google Gemini AI**: Powered by `@google/genai` with SSE streaming responses.
- **5 Distinct Personas**: Developer, Creative, Tutor, Friendly, and Professional.
- **Luxury Editorial UI**: Warm cream, deep espresso, and soft gold styling with light and dark themes.
- **Markdown & Code Highlighting**: Beautiful code blocks with line count and one-click copy buttons.
- **Local Persistence**: Client-side `localStorage` conversation memory and automatic topic titling.
- **Zero Database Dependency**: Starts instantly without PostgreSQL, Supabase, or external database setup.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your Google Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
```

### 3. Run Development Server

```bash
npm run dev
```

Open **`http://localhost:3000`** in your browser.

---

## Available Scripts

- `npm run dev`: Starts the local dev server.
- `npm run build`: Compiles production assets.
- `npm test`: Runs automated test suite.
- `npm run lint`: Checks TypeScript types.
