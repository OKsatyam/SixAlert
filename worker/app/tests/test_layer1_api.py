"""
Tests for layer1_api.py — success path, ApiError, rate limiting, and no-data None.
httpx is mocked via unittest.mock so no real HTTP calls are made.
"""
import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import app.layers.layer1_api as layer1_module
from app.layers.layer1_api import fetch_ball_event, fetch_live_matches, ApiError
from app.core.normalizer import BallEvent


def make_httpx_mock(json_data: dict, status_code: int = 200) -> MagicMock:
    """Build a mock httpx.AsyncClient context manager with a canned response."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.json.return_value = json_data

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)
    return mock_client


LIVE_MATCHES_RESPONSE = {
    "status": "success",
    "data": [
        {"id": "match-001", "matchStarted": True},
        {"id": "match-002", "matchStarted": False},
    ],
}

MATCH_RESPONSE = {
    "status": "success",
    "data": {
        "id": "match-001",
        "matchStarted": True,
        "lastBallResult": {
            "over": 15, "ball": 2, "runs": 6,
            "isSix": True, "isFour": False, "isWicket": False,
            "batsman": "Kohli", "bowler": "Bumrah",
        },
    },
}


class TestFetchLiveMatches:
    def test_returns_only_started_match_ids(self):
        """fetch_live_matches() must filter to matchStarted:True only."""
        mock = make_httpx_mock(LIVE_MATCHES_RESPONSE)
        with patch("app.layers.layer1_api.httpx.AsyncClient", return_value=mock):
            result = asyncio.run(fetch_live_matches())
        assert result == ["match-001"]

    def test_raises_api_error_on_bad_status_code(self):
        """HTTP non-200 must raise ApiError."""
        mock = make_httpx_mock({}, status_code=500)
        with patch("app.layers.layer1_api.httpx.AsyncClient", return_value=mock):
            with pytest.raises(ApiError, match="HTTP 500"):
                asyncio.run(fetch_live_matches())

    def test_raises_api_error_on_error_status_field(self):
        """CricAPI 'status' != 'success' must raise ApiError."""
        mock = make_httpx_mock({"status": "failure"})
        with patch("app.layers.layer1_api.httpx.AsyncClient", return_value=mock):
            with pytest.raises(ApiError):
                asyncio.run(fetch_live_matches())


class TestFetchBallEvent:
    def setup_method(self):
        """Clear rate limit state before every test."""
        layer1_module._last_request_time.clear()

    def test_returns_ball_event_on_success(self):
        """fetch_ball_event() must return a BallEvent when API responds correctly."""
        mock = make_httpx_mock(MATCH_RESPONSE)
        with patch("app.layers.layer1_api.httpx.AsyncClient", return_value=mock):
            result = asyncio.run(fetch_ball_event("match-001"))
        assert isinstance(result, BallEvent)
        assert result.is_six is True
        assert result.source == "api"
        assert result.match_id == "match-001"

    def test_raises_api_error_on_http_failure(self):
        """HTTP non-200 from /match must raise ApiError."""
        mock = make_httpx_mock({}, status_code=503)
        with patch("app.layers.layer1_api.httpx.AsyncClient", return_value=mock):
            with pytest.raises(ApiError, match="HTTP 503"):
                asyncio.run(fetch_ball_event("match-001"))

    def test_returns_none_when_no_ball_data(self):
        """Missing lastBallResult is not an error — return None."""
        response = {"status": "success", "data": {"id": "match-001", "matchStarted": True}}
        mock = make_httpx_mock(response)
        with patch("app.layers.layer1_api.httpx.AsyncClient", return_value=mock):
            result = asyncio.run(fetch_ball_event("match-001"))
        assert result is None

    def test_rate_limit_returns_none_without_http_call(self):
        """Second call within RATE_LIMIT_SECONDS must return None with no HTTP request."""
        layer1_module._last_request_time["match-001"] = time.monotonic()
        mock = make_httpx_mock(MATCH_RESPONSE)
        with patch("app.layers.layer1_api.httpx.AsyncClient", return_value=mock):
            result = asyncio.run(fetch_ball_event("match-001"))
        assert result is None
        mock.get.assert_not_called()


import pytest
