# AURA AI — Intelligent Conversational Companion

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://resonant-torrone-d7c467.netlify.app/)
[![Backend API](https://img.shields.io/badge/Backend%20API-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://aura-ai-ow5f.onrender.com/)
[![Database](https://img.shields.io/badge/Database-Neon%20PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Model](https://img.shields.io/badge/AI%20Model-Gemini%203.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

> **AURA AI** is an intelligent, fast, and responsive conversational AI companion designed with luxury editorial aesthetics, real-time Gemini streaming responses, and persistent cloud synchronization with Neon PostgreSQL.

---

## 🌐 Live Deployment Links

- **Frontend (Netlify):** [https://resonant-torrone-d7c467.netlify.app/](https://resonant-torrone-d7c467.netlify.app/)
- **Backend API (Render):** [https://aura-ai-ow5f.onrender.com/](https://aura-ai-ow5f.onrender.com/)
- **Health Endpoint:** [https://aura-ai-ow5f.onrender.com/api/health](https://aura-ai-ow5f.onrender.com/api/health)

---

## 📸 Preview

![AURA AI Interface](./docs/screenshot.png)

---

## ✨ Key Features

- **⚡ Real-Time Gemini 3.5 Flash Streaming**: Server-Sent Events (SSE) streaming with fluid, low-latency generation.
- **💬 Natural AI Chat Formatting**: Conversational formatting with clean bold titles, elegant paragraph rhythm, bullet points, and syntax-highlighted code blocks (no raw markdown `#` or `#####` artifacts).
- **🐘 Neon PostgreSQL Cloud Sync**: Multi-device persistent conversation history, message feedback ratings, and user preferences stored securely in serverless PostgreSQL.
- **🎭 5 Distinct Persona Mindsets**:
  - **Developer**: Precision system architecture, clean TypeScript/Python/Rust code, and algorithms.
  - **Creative**: Nuanced metaphors, poetic resonance, essays, and worldbuilding.
  - **Tutor**: Socratic intuition, first-principles analogies, and conceptual mastery.
  - **Friendly**: Warm, conversational, empathetic personal companion.
  - **Professional**: High-signal executive memos, strategic briefs, and decision matrices.
- **🎨 Luxury Editorial Aesthetic**: Cormorant Garamond serif typography, Plus Jakarta Sans body, warm cream, rich espresso, and champagne gold accents with full Light and Dark modes.
- **🔊 Algorithmic Web Audio Synthesizer**: Subtle harmonic tactile sound effects synthesized natively via the Web Audio API with zero external audio assets.
- **🎙️ Speech Dictation & Voice Readout**: Native browser SpeechRecognition for voice input and SpeechSynthesis for natural vocal narration.
- **📎 Multi-File Attachments & Prompt Refiner**: Attach code files, documents, or context directly into prompt turns with AI prompt polishers.

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Temkin236/Aura-AI.git
cd Aura-AI
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# Neon PostgreSQL Database
DATABASE_URL=postgresql://user:password@ep-ancient-river...neon.tech/neondb?sslmode=require

# Server Port
PORT=3000
```

### 3. Run Development Server

```bash
npm run dev
```

Open **`http://localhost:3000`** in your browser.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons, Motion |
| **Backend** | Express 4, Node.js (ESM), `@google/genai` SDK |
| **Database** | Neon Serverless PostgreSQL (`@neondatabase/serverless`) |
| **Styling & Fonts** | Cormorant Garamond, Plus Jakarta Sans, Custom Glassmorphism |
| **Testing** | Vitest 3 (18 unit & integration test suites) |
| **Hosting** | Netlify (Frontend Edge CDN) & Render (Backend Web Service) |

---

## 📜 Available Scripts

- `npm run dev`: Starts the local dev server with hot reload and API backend.
- `npm run build`: Compiles optimized production client bundle (`dist/`).
- `npm start`: Starts production Node/Express server.
- `npm test`: Runs automated Vitest test suite.
- `npm run lint`: Validates TypeScript types across all source modules (`tsc --noEmit`).

---

## 📄 License

MIT © [Temkin236](https://github.com/Temkin236)
