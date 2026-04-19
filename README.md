# SixAlert 🏏

Real-time cricket offer alerts. When a six is hit, deals go live on Swiggy,
Zomato, and more. Users get notified instantly via Web Push, Telegram, or Email.

## Services

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| backend | Node.js + Express | 4000 | REST API + WebSocket server |
| worker | Python + FastAPI | 8000 | Cricket data pipeline |
| frontend | Next.js 14 | 3000 | Web app |

## Local Setup

### Backend
cd backend
copy .env.example .env
npm install
npm run dev

### Worker
cd worker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

### Frontend
cd frontend
copy .env.example .env.local
npm install
npm run dev

## Branching Strategy
main     → production only, never push directly
dev      → integration branch, all PRs merge here
feature/ → one branch per phase or feature

Never push directly to main or dev. Always open a PR.
