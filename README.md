# Beytullah Ayvat — Personal CV Website & AI Chatbot

A personal resume website featuring an integrated bilingual (English & Turkish) AI chatbot powered by a lightweight Node.js/Express backend, designed for free-tier deployment on Render.

## Features
- Clean, responsive CV layout with Light/Dark theme, EN/TR language toggle, and Print/PDF resume support
- Integrated AI CV assistant (`POST /api/chat`) that answers visitor questions about Beytullah Ayvat's education, skills, and interests
- Secure backend API key handling via environment variables (OpenRouter primary with Gemini fallback)

## Local Development
```bash
npm install
npm start
```
Open `http://localhost:3000`.

## Deployment (Render)
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:** Set `OPENROUTER_API_KEY` (and optionally `GEMINI_API_KEY`) in Render dashboard.
