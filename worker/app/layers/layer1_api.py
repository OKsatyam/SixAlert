"""
Layer 1 — CricAPI polling (primary data source).
Polls CricAPI every 6 seconds per match for live ball events.
All output passes through normalize() to enforce the BallEvent contract.
"""
import os
import time
from typing import Optional

import httpx

from app.core.normalizer import BallEvent, normalize

CRICAPI_BASE_URL = "https://api.cricapi.com/v1"
# must not exceed free-tier poll rate — one request per match per window
RATE_LIMIT_SECONDS = 6


class ApiError(Exception):
    """Raised when CricAPI returns a non-success status or error response."""


# module-level so the rate limit persists across calls within a process
_last_request_time: dict[str, float] = {}


async def fetch_live_matches() -> list[str]:
    """Return the list of match IDs currently live according to CricAPI."""
    api_key = os.environ["CRICAPI_KEY"]
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{CRICAPI_BASE_URL}/currentMatches",
            params={"apikey": api_key, "offset": 0},
            timeout=10.0,
        )
    if response.status_code != 200:
        raise ApiError(f"HTTP {response.status_code} from /currentMatches")
    body = response.json()
    if body.get("status") != "success":
        raise ApiError(f"CricAPI error: {body.get('status')}")
    return [m["id"] for m in body.get("data", []) if m.get("matchStarted")]


async def fetch_ball_event(match_id: str) -> Optional[BallEvent]:
    """Fetch the latest ball event for match_id from CricAPI.

    Returns None (no HTTP call) if called within RATE_LIMIT_SECONDS of the
    previous request for this match — callers must not treat this as an error.
    Returns None if the match exists but has no live ball data yet.
    Raises ApiError on any non-success API response.
    """
    now = time.monotonic()
    if now - _last_request_time.get(match_id, 0.0) < RATE_LIMIT_SECONDS:
        return None

    api_key = os.environ["CRICAPI_KEY"]
    _last_request_time[match_id] = now

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{CRICAPI_BASE_URL}/match",
            params={"apikey": api_key, "id": match_id},
            timeout=10.0,
        )
    if response.status_code != 200:
        raise ApiError(f"HTTP {response.status_code} from /match for {match_id}")
    body = response.json()
    if body.get("status") != "success":
        raise ApiError(f"CricAPI error: {body.get('status')}")

    match_data = body.get("data")
    if not match_data or not match_data.get("matchStarted"):
        return None

    # CricAPI returns most recent delivery under "lastBallResult"
    last_ball = match_data.get("lastBallResult")
    if not last_ball:
        return None

    return normalize(
        {
            "match_id": match_id,
            "over": last_ball.get("over", 0),
            "ball": last_ball.get("ball", 1),
            "runs": last_ball.get("runs", 0),
            "is_six": last_ball.get("isSix", False),
            "is_four": last_ball.get("isFour", False),
            "is_wicket": last_ball.get("isWicket", False),
            "batsman": last_ball.get("batsman", ""),
            "bowler": last_ball.get("bowler", ""),
        },
        source="api",
    )
