"""
SixAlert Worker — Python FastAPI service.
Responsibilities:
  - Poll CricAPI (Layer 1) every 6 seconds during live matches
  - Fallback to Cricbuzz scraper (Layer 2) via circuit breaker
  - Normalize all events into standard BallEvent format
  - POST normalized events to Node backend via internal HTTP
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.core.circuit_breaker import CircuitBreaker
from app.core.poller import MatchPoller

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# one circuit breaker and poller shared across all matches in this process
_circuit_breaker = CircuitBreaker()
_poller = MatchPoller(_circuit_breaker)

# background tasks keyed by match_id so we can cancel them on /poll/stop
_poll_tasks: dict[str, asyncio.Task] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Cancel any running poll tasks on shutdown."""
    yield
    for task in _poll_tasks.values():
        task.cancel()


app = FastAPI(title="SixAlert Worker", version="1.0.0", lifespan=lifespan)


class PollStartRequest(BaseModel):
    match_id: str


class PollStopRequest(BaseModel):
    match_id: str


@app.get("/health")
def health():
    """Liveness check — returns ok if the process is running."""
    return {"status": "ok", "service": "sixalert-worker"}


@app.post("/poll/start")
async def poll_start(body: PollStartRequest):
    """Start polling a match in the background.

    Returns 400 if the match is already being polled.
    Returns 400 if the circuit breaker is halted.
    """
    match_id = body.match_id

    if match_id in _poll_tasks and not _poll_tasks[match_id].done():
        raise HTTPException(status_code=400, detail=f"Already polling match {match_id}")

    if _circuit_breaker.is_halted():
        raise HTTPException(status_code=400, detail="Circuit breaker is halted — reset required")

    task = asyncio.create_task(_poller.start_polling(match_id))
    _poll_tasks[match_id] = task
    logger.info(f"Poll task started for match {match_id}")
    return {"status": "started", "match_id": match_id}


@app.post("/poll/stop")
async def poll_stop(body: PollStopRequest):
    """Stop polling a match cleanly.

    Returns 404 if the match is not currently being polled.
    """
    match_id = body.match_id

    if match_id not in _poll_tasks or _poll_tasks[match_id].done():
        raise HTTPException(status_code=404, detail=f"No active poll for match {match_id}")

    await _poller.stop_polling(match_id)
    logger.info(f"Poll stop requested for match {match_id}")
    return {"status": "stopping", "match_id": match_id}


@app.get("/poll/status")
def poll_status():
    """Return which matches are being polled and the current circuit breaker state."""
    active_matches = [
        match_id
        for match_id, task in _poll_tasks.items()
        if not task.done()
    ]
    return {
        "active_matches": active_matches,
        "circuit_breaker": {
            "state": _circuit_breaker.state,
            "active_layer": _circuit_breaker.get_active_layer(),
            "is_halted": _circuit_breaker.is_halted(),
        },
    }
