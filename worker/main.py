"""
SixAlert Worker — Python FastAPI service
Responsibilities:
  - Poll cricket API (Layer 1) every 6 seconds during live matches
  - Fallback to Cricbuzz scraper (Layer 2) via circuit breaker
  - Normalize all events into standard BallEvent format
  - POST normalized events to Node backend via internal HTTP

Scaffold only. Full implementation in Phase 3.
"""
from fastapi import FastAPI

app = FastAPI(title="SixAlert Worker", version="1.0.0")

@app.get("/health")
def health():
    return {"status": "ok", "service": "sixalert-worker"}
