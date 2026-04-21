"""
Layer 2 — Cricbuzz scraper (fallback data source).
Activated by the circuit breaker when Layer 1 fails 3 consecutive times.
Uses httpx + BeautifulSoup to parse live match data from Cricbuzz.
All output passes through normalize() to enforce the BallEvent contract.
"""
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.core.normalizer import BallEvent, normalize

CRICBUZZ_BASE_URL = "https://www.cricbuzz.com"
SCRAPER_TIMEOUT_SECONDS = 10

# prevents Cricbuzz from blocking the request as a bot
BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


class ScraperError(Exception):
    """Raised when scraping fails for any reason (HTTP error or parse failure)."""


async def scrape_live_matches() -> list[str]:
    """Return a list of match IDs currently live on Cricbuzz."""
    try:
        async with httpx.AsyncClient(headers={"User-Agent": BROWSER_USER_AGENT}) as client:
            response = await client.get(
                f"{CRICBUZZ_BASE_URL}/cricket-match/live-scores",
                timeout=SCRAPER_TIMEOUT_SECONDS,
            )
    except httpx.RequestError as exc:
        raise ScraperError(f"HTTP request failed: {exc}") from exc

    if response.status_code != 200:
        raise ScraperError(f"Cricbuzz returned HTTP {response.status_code}")

    soup = BeautifulSoup(response.text, "html.parser")
    match_links = soup.select("a[href*='/live-cricket-scores/']")
    # extract numeric match ID from href e.g. /live-cricket-scores/12345/...
    ids = []
    for link in match_links:
        parts = link.get("href", "").split("/")
        if len(parts) > 2 and parts[2].isdigit():
            ids.append(parts[2])
    return list(dict.fromkeys(ids))  # deduplicate while preserving order


async def scrape_ball_event(match_id: str) -> Optional[BallEvent]:
    """Scrape the latest ball event for match_id from Cricbuzz.

    Returns None if the match page has no live ball data.
    Raises ScraperError on HTTP failure or HTML parse failure.
    """
    try:
        async with httpx.AsyncClient(headers={"User-Agent": BROWSER_USER_AGENT}) as client:
            response = await client.get(
                f"{CRICBUZZ_BASE_URL}/live-cricket-scorecard/{match_id}",
                timeout=SCRAPER_TIMEOUT_SECONDS,
            )
    except httpx.RequestError as exc:
        raise ScraperError(f"HTTP request failed for match {match_id}: {exc}") from exc

    if response.status_code != 200:
        raise ScraperError(f"Cricbuzz returned HTTP {response.status_code} for match {match_id}")

    try:
        return _parse_ball_event(response.text, match_id)
    except (AttributeError, ValueError, TypeError) as exc:
        raise ScraperError(f"Failed to parse Cricbuzz HTML for match {match_id}: {exc}") from exc


def _parse_ball_event(html: str, match_id: str) -> Optional[BallEvent]:
    """Parse a BallEvent from Cricbuzz match page HTML.

    Expects a .cb-com-ln element for the latest ball commentary and
    a .cb-ov-num element for the over.ball string (e.g. '15.2').
    Returns None if those elements are absent (match not yet live).
    """
    soup = BeautifulSoup(html, "html.parser")

    over_elem = soup.select_one(".cb-ov-num")
    commentary_elem = soup.select_one(".cb-com-ln")
    runs_elem = soup.select_one(".cb-com-runs")

    if not over_elem or not commentary_elem:
        return None

    over_str = over_elem.get_text(strip=True)  # e.g. "15.2"
    over_parts = over_str.split(".")
    if len(over_parts) != 2:
        raise ValueError(f"Unexpected over format: {over_str!r}")

    over = int(over_parts[0])
    ball = int(over_parts[1])
    runs = int(runs_elem.get_text(strip=True)) if runs_elem else 0
    commentary = commentary_elem.get_text(strip=True)
    is_six = "SIX" in commentary.upper()
    is_four = "FOUR" in commentary.upper()
    is_wicket = "OUT" in commentary.upper() or "WICKET" in commentary.upper()

    return normalize(
        {
            "match_id": match_id,
            "over": over,
            "ball": ball,
            "runs": runs,
            "is_six": is_six,
            "is_four": is_four,
            "is_wicket": is_wicket,
            "batsman": "",
            "bowler": "",
        },
        source="scraper",
    )
