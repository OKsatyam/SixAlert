# CLAUDE.md — SixAlert Project Instructions

This file tells Claude Code exactly how to behave on this project.
Read this entire file before doing anything. Follow every rule here.
If something is unclear, ask before proceeding.

---

## What is SixAlert?

A real-time cricket offer alert platform. When a six is hit during an IPL match,
deals go live on Swiggy, Zomato, and other brands. Users get notified instantly
via Web Push, Telegram, or Email. The app supports any sport and any brand —
IPL + Swiggy/Zomato is just the first use case.

---

## Project Structure

```
sixalert/
├── CLAUDE.md              ← you are here
├── README.md
├── .gitignore
├── backend/               ← Node.js + Express (REST API + WebSocket)
│   ├── src/
│   │   ├── config/        ← db.js, env validation
│   │   ├── models/        ← Mongoose schemas
│   │   ├── routes/        ← Express route handlers
│   │   ├── services/      ← business logic (offer engine, websocket, notifications)
│   │   │   ├── cricket/   ← 3-layer data pipeline
│   │   │   ├── offers/    ← trigger engine
│   │   │   └── notifications/
│   │   ├── middleware/    ← auth, rate limiting, error handling
│   │   └── utils/         ← shared helpers
│   ├── tests/             ← mirrors src/ structure
│   ├── package.json
│   └── .env.example
├── worker/                ← Python + FastAPI (cricket data pipeline)
│   ├── app/
│   │   ├── layers/        ← layer1_api.py, layer2_scraper.py
│   │   ├── core/          ← circuit_breaker.py, normalizer.py
│   │   └── tests/
│   ├── main.py
│   └── requirements.txt
└── frontend/              ← Next.js 14 (App Router)
    ├── app/
    ├── components/
    └── hooks/
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend API | Node.js + Express | Node 18+, Express 4 |
| Background worker | Python + FastAPI | Python 3.11+ |
| Database | MongoDB + Mongoose | Atlas free M0 |
| Real-time | Native `ws` library | No socket.io |
| Auth | JWT (jsonwebtoken + bcryptjs) | — |
| Frontend | Next.js App Router | 14+ |
| Notifications | Web Push + Telegram Bot + Resend email | All free tier |
| Deployment | Railway (backend + worker) + Vercel (frontend) | — |

---

## OS & Environment

- **OS**: Windows
- **Shell**: Use PowerShell-compatible commands
- **Editor**: VS Code
- **Node**: 18+ (ES Modules — `import/export` syntax, NOT `require`)
- **Python**: 3.11+
- **Package manager (Node)**: npm
- **Package manager (Python)**: pip inside a venv

### Windows-specific rules
- Use `copy` not `cp`, `type` not `cat` for file operations in shell commands
- Path separators in shell: use `\` or forward `/` (both work in PowerShell)
- To run scripts: `npm run dev` not `./start.sh`
- Python venv activation: `.venv\Scripts\activate` not `source .venv/bin/activate`

---

## Code Style Rules

### JavaScript / Node.js
- **Module system**: ES Modules only — `import`/`export`. Never `require()`.
- **Naming**: camelCase for variables and functions (`userId`, `ballEvent`)
- **Files**: kebab-case (`trigger-engine.js`, `circuit-breaker.js`)
- **Async**: always `async/await`, never raw `.then()` chains
- **Error handling**: always use `try/catch` in async functions, never swallow errors silently
- **No magic numbers**: extract constants to the top of the file with a comment explaining them
- **Comments**: add comments only on non-obvious logic — explain WHY, not WHAT
  - Good: `// retry 3 times because Atlas free tier has cold-start delays`
  - Bad: `// connect to database`

### Python
- **Naming**: snake_case for everything (`ball_event`, `circuit_breaker`)
- **Files**: snake_case (`layer1_api.py`, `circuit_breaker.py`)
- **Type hints**: always add type hints to function signatures
- **Docstrings**: one-line docstring on every function explaining its purpose

### General
- No commented-out dead code — delete it
- No `console.log` left in production paths — use a logger
- Every file starts with a 2-3 line comment block explaining what the file does
- No hardcoded secrets, URLs, or magic strings — use `process.env` or constants

---

## Writing Code — Chunk Size Rule

This is the most important rule for how you write code.

**Never write more than 150 lines of backend code in a single response.**

Why: the developer reads and understands every line before moving on.
Writing 400 lines at once makes it impossible to review properly.

### The correct workflow:
1. Tell the developer what you are about to write (file name, what it does, why)
2. Write the chunk (≤150 lines for backend, frontend has no limit)
3. After writing, explain:
   - What each major section does
   - Any decision you made that wasn't obvious
   - What the next chunk will be
4. Wait for the developer to say "continue" or "next chunk"
5. Do NOT proceed to the next file or chunk without confirmation

### Frontend exception
Frontend pages and components can be written fully in one go — no line limit.
The 150-line rule applies only to backend and worker (Python) files.

---

## File Creation Rules

- You CAN create new files without asking
- You MUST ask before installing any new npm package or pip package
- Format your ask like this:
  ```
  I need to install: [package-name] v[version]
  Reason: [one sentence why]
  Command: npm install [package-name]
  Should I proceed?
  ```
- Never modify `.env` files — only `.env.example`
- Never touch `CLAUDE.md` unless explicitly asked

---

## Git Rules — CRITICAL

- **NEVER push directly to `main`**
- **NEVER push directly to `dev`**
- Always work on a `feature/` branch
- Branch naming: `feature/phase-X-description` (e.g. `feature/phase-2-models`)

### Commit policy
- Do NOT auto-commit
- When a chunk is done, remind the developer with this exact message:
  ```
  ✅ Chunk complete. Remind me to commit when you're ready:
  git add .
  git commit -m "feat: [description of what was built]"
  ```
- Wait for the developer to explicitly say "commit" before doing anything git-related
- Commit message format: `feat:`, `fix:`, `refactor:`, `test:`, `docs:` prefixes

---

## Error Handling Policy

If you encounter an error while building:

1. **Stop immediately** — do not try to silently work around it
2. **Explain the error clearly**:
   - What the error message says
   - Which file and line it came from
   - Your understanding of WHY it happened
3. **Try to fix it** — attempt up to 3 times with a different approach each time
4. **If all 3 attempts fail**: stop, explain exactly what you tried, and ask the developer
   to solve it together — do not keep guessing

Never say "this should work" — verify it actually works before moving on.

---

## Testing Rules

- Every backend file gets a corresponding test file in `backend/tests/`
- Mirror the `src/` structure: `src/models/user.js` → `tests/models/user.test.js`
- Test framework: **Jest** (already in dependencies)
- What to test:
  - Models: schema validation, required fields, default values
  - Services: core logic with mocked DB
  - Routes: HTTP responses, auth guards, error cases
  - Cricket pipeline: normalizer output, circuit breaker state transitions
- Write tests IN THE SAME CHUNK as the code, not after
- Minimum: happy path + one error case per function

---

## The Cricket Data Pipeline — Never Break These Rules

This is the most critical part of the system. The previous version failed here.

```
Layer 1 (Primary)   → CricAPI polling every 6 seconds
Layer 2 (Fallback)  → Cricbuzz scraper (Cheerio / BeautifulSoup)
Layer 3 (Emergency) → Admin can pause/resume, system auto-alerts
```

Rules:
- Each layer is a **separate file** — they never call each other directly
- All 3 layers output the **exact same BallEvent format** — enforced by the normalizer
- The circuit breaker is the **only** thing that decides which layer is active
- Every single API call and scrape attempt must be logged to `DataSourceLog`
- Rate limiting: Layer 1 must never exceed the free tier limit (check the API docs first)
- If Layer 1 fails 3 consecutive times → auto-switch to Layer 2, log the switch
- If Layer 2 fails 3 consecutive times → stop polling, alert via console + log

---

## Database Rules

- Always add indexes on fields used in queries (match_id, triggered_at, etc.)
- `ball_events` collection must have a TTL index: auto-delete after 30 days
- `data_source_log` collection must have a TTL index: auto-delete after 7 days
- Never do unbounded queries — always add `.limit()` on list endpoints
- Mongoose models go in `backend/src/models/` — one file per model

---

## Phases Build Order

Work through these in order. Never skip ahead.

```
Phase 1  — Project scaffold (DONE)
           backend/ + worker/ + frontend/ structure, package.json, db.js, index.js

Phase 2  — Mongoose models
           Match, BallEvent, Sport, Brand, Offer, OfferTrigger, User,
           Notification, DataSourceLog

Phase 3  — Cricket pipeline (worker)
           event normalizer → Layer 1 API → circuit breaker → Layer 2 scraper

Phase 4  — Offer trigger engine (backend)
           BallEvent in → match offers → fire OfferTrigger → emit WebSocket event

Phase 5  — WebSocket server (backend)
           native ws, rooms per match_id, broadcast offer triggers to clients

Phase 6  — REST API routes (backend)
           /matches, /offers, /brands, /sports, /auth (register + login)

Phase 7  — Notifications (backend)
           Web Push dispatcher, Telegram bot, Resend email

Phase 8  — Admin routes (backend)
           offer CRUD, user management, data source logs — role-guarded

Phase 9  — Frontend
           Next.js pages: Home/Live, Schedule, Brands, History, Settings, Admin
           Landing page with scroll-driven canvas animation

Phase 10 — Hardening
           Rate limiting, input validation, error logging, Railway deploy config
```

---

## How to Use This File

When starting a new session with Claude Code, say:

> "Read CLAUDE.md and tell me what phase we're on and what the next chunk is."

Claude Code should respond with the current phase, what has been built,
and exactly what it will write next — before writing a single line of code.

---

## Quick Reference — Commands

```powershell
# Backend dev server
cd backend
npm run dev

# Worker dev server
cd worker
.venv\Scripts\activate
uvicorn main:app --reload --port 8000

# Frontend dev server
cd frontend
npm run dev

# Run backend tests
cd backend
npm test

# Generate VAPID keys for Web Push
npx web-push generate-vapid-keys
```

---

## What Claude Code Should Never Do

- Never push to `main` or `dev` directly
- Never modify `.env` files
- Never install packages without asking
- Never write more than 150 lines of backend code in one chunk without stopping
- Never move to the next chunk without the developer saying "continue"
- Never use `require()` — ES Modules only in the backend
- Never hardcode API keys, secrets, or passwords anywhere
- Never use `socket.io` — we use native `ws`
- Never create a new branch without telling the developer first
- Never silently swallow errors or write empty catch blocks
- Never skip writing tests for a piece of code