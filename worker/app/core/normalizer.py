"""
Normalizer — defines the BallEvent dataclass and normalize() function.
This is the shared contract all pipeline layers must return. No layer
may return its own format; everything passes through normalize().
"""
from dataclasses import dataclass
from datetime import datetime, timezone

# the only accepted source values — mirrors the Mongoose enum in ball-event.js
VALID_SOURCES = {"api", "scraper", "manual"}


@dataclass
class BallEvent:
    """Canonical representation of a single ball bowled during a live match."""

    match_id: str        # external API match ID
    over: int            # over number, 0-indexed
    ball: int            # ball within the over, 1–6
    runs: int            # runs scored on this ball
    is_six: bool
    is_four: bool
    is_wicket: bool
    batsman: str         # empty string if unknown, never None
    bowler: str          # empty string if unknown, never None
    source: str          # "api" | "scraper" | "manual"
    raw_data: dict       # original response stored verbatim for debugging
    timestamp: datetime  # UTC, always set by normalize(), never by the caller


def normalize(raw: dict, source: str) -> BallEvent:
    """Convert a raw API or scraper response dict into a BallEvent.

    Raises ValueError if source is not one of the three allowed values.
    timestamp is always set to UTC now — callers must not pass it in raw.
    batsman and bowler fall back to empty string so downstream code never
    has to guard against None.
    """
    if source not in VALID_SOURCES:
        raise ValueError(
            f"Invalid source '{source}'. Must be one of: {sorted(VALID_SOURCES)}"
        )

    return BallEvent(
        match_id=str(raw.get("match_id", "")),
        over=int(raw.get("over", 0)),
        ball=int(raw.get("ball", 1)),
        runs=int(raw.get("runs", 0)),
        is_six=bool(raw.get("is_six", False)),
        is_four=bool(raw.get("is_four", False)),
        is_wicket=bool(raw.get("is_wicket", False)),
        # "or ''" converts None to empty string; str() handles missing key
        batsman=str(raw.get("batsman") or ""),
        bowler=str(raw.get("bowler") or ""),
        source=source,
        raw_data=raw,
        timestamp=datetime.now(timezone.utc),
    )
