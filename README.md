# resume_RAG_model

Local RAG-powered ATS resume tailoring dashboard.

## Features

- **Free ATS check** — local keyword extraction + scoring (no API calls)
- **RAG engine** — BM25 retrieval over a skill knowledge base (`rag-engine.js`)
- **AI tailor** — Gemini rewrite with compact RAG context (~60% fewer API calls)
- **Boost to 95+** — targeted gap fixes with local re-scoring

## Files

| File | Purpose |
|------|---------|
| `rd.html` | ATS dashboard UI |
| `rag-engine.js` | Local RAG: keywords, scoring, caching |

## Setup

1. Open `rd.html` in a browser (keep `rag-engine.js` in the same folder).
2. Set your Gemini API key in `rd.html` → `GEMINI_API_KEY` (rewrite/boost only).
3. Paste a job description and resume → **Check ATS Score** (free) or **AI Tailor Resume**.

## Config

In `rd.html`:

```javascript
const USE_RAG = true;
const GEMINI_KEYWORD_FALLBACK = false;
const SCORE_TAILOR_THRESHOLD = 95;
```
