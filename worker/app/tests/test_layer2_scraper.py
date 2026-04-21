"""
Tests for layer2_scraper.py — success path, ScraperError on HTTP/parse failure,
and correct source field. httpx is mocked; HTML fixtures are hardcoded below.
"""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.layers.layer2_scraper import scrape_ball_event, ScraperError
from app.core.normalizer import BallEvent

# minimal Cricbuzz-like HTML that _parse_ball_event expects
VALID_HTML = """
<html><body>
  <div class="cb-ov-num">15.2</div>
  <div class="cb-com-ln">Bumrah to Kohli, SIX! Short ball pulled over fine leg</div>
  <div class="cb-com-runs">6</div>
</body></html>
"""

WICKET_HTML = """
<html><body>
  <div class="cb-ov-num">18.4</div>
  <div class="cb-com-ln">Shami to Dhoni, OUT! Caught at deep square leg</div>
  <div class="cb-com-runs">0</div>
</body></html>
"""

EMPTY_HTML = "<html><body><p>No live data</p></body></html>"
MALFORMED_HTML = "<html><body><div class='cb-ov-num'>not-a-number</div><div class='cb-com-ln'>x</div></body></html>"


def make_mock(html: str, status_code: int = 200) -> MagicMock:
    """Build a mock httpx.AsyncClient that returns the given HTML response."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.text = html

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)
    return mock_client


class TestScrapeSuccessPath:
    def test_returns_ball_event_from_valid_html(self):
        """scrape_ball_event() must return a BallEvent when HTML is parseable."""
        mock = make_mock(VALID_HTML)
        with patch("app.layers.layer2_scraper.httpx.AsyncClient", return_value=mock):
            result = asyncio.run(scrape_ball_event("12345"))
        assert isinstance(result, BallEvent)
        assert result.over == 15
        assert result.ball == 2
        assert result.runs == 6
        assert result.is_six is True
        assert result.match_id == "12345"

    def test_source_is_exactly_scraper(self):
        """source field must be exactly 'scraper', not 'api' or anything else."""
        mock = make_mock(VALID_HTML)
        with patch("app.layers.layer2_scraper.httpx.AsyncClient", return_value=mock):
            result = asyncio.run(scrape_ball_event("12345"))
        assert result.source == "scraper"

    def test_detects_wicket_from_commentary(self):
        """'OUT' in commentary must set is_wicket=True."""
        mock = make_mock(WICKET_HTML)
        with patch("app.layers.layer2_scraper.httpx.AsyncClient", return_value=mock):
            result = asyncio.run(scrape_ball_event("12345"))
        assert result.is_wicket is True

    def test_returns_none_when_no_live_elements(self):
        """Missing .cb-ov-num or .cb-com-ln means no live data — return None, not error."""
        mock = make_mock(EMPTY_HTML)
        with patch("app.layers.layer2_scraper.httpx.AsyncClient", return_value=mock):
            result = asyncio.run(scrape_ball_event("12345"))
        assert result is None


class TestScrapeErrorCases:
    def test_raises_scraper_error_on_http_failure(self):
        """Non-200 HTTP status must raise ScraperError."""
        mock = make_mock("", status_code=503)
        with patch("app.layers.layer2_scraper.httpx.AsyncClient", return_value=mock):
            with pytest.raises(ScraperError, match="HTTP 503"):
                asyncio.run(scrape_ball_event("12345"))

    def test_raises_scraper_error_on_malformed_html(self):
        """Unparseable over format must raise ScraperError, not crash silently."""
        mock = make_mock(MALFORMED_HTML)
        with patch("app.layers.layer2_scraper.httpx.AsyncClient", return_value=mock):
            with pytest.raises(ScraperError, match="Failed to parse"):
                asyncio.run(scrape_ball_event("12345"))
