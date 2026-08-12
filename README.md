# resume_RAG_model

Local RAG-powered ATS resume tailoring dashboard.

## Features

- **Jobilly ATS readiness** — Keywords 30% · Content 25% · Parse 20% · Structure 15% · Format 10% + Top 3 fixes
- **Our RAG keywords** — BM25 skill KB extract (grounded) powers the Keywords category + rewrite gaps
- **AI rewrite from report** — Gemini applies Top Fixes to raise readiness to 95+
- **Boost loop** — re-score with the same Jobilly+RAG rubric until threshold
- **Secure API** — Gemini key stays server-side via Vercel serverless function

## Files

| File | Purpose |
|------|---------|
| `rd.html` | ATS dashboard UI |
| `rag-engine.js` | Local RAG keywords + Jobilly readiness scoring |
| `api/gemini.js` | Vercel serverless proxy for Gemini |

## Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `GEMINI_API_KEY` | **Yes** | — | Google AI Studio API key (tailor/boost only) |
| `GEMINI_MODEL` | No | `gemini-flash-lite-latest` | Gemini model name |

ATS check and scoring need **no** env vars — they run entirely in the browser.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add `GEMINI_API_KEY` in Environment Variables.
4. Deploy — root `/` serves `rd.html`, `/api/gemini` handles AI calls.

## Local development

```bash
npm i -g vercel
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY
vercel dev
```

Open the URL shown (usually `http://localhost:3000`).  
Opening `rd.html` directly as a file will **not** work for tailor/boost — use `vercel dev`.

## Config (client-side, `rd.html`)

```javascript
const USE_RAG = true;
const GEMINI_KEYWORD_FALLBACK = false;
const SCORE_TAILOR_THRESHOLD = 95; // Jobilly readiness target
```
