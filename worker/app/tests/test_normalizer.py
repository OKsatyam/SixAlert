"""
Tests for normalizer.py — BallEvent contract, source validation, UTC timestamp,
and empty-string defaults for batsman/bowler.
Zero external dependencies: no DB, no HTTP.
"""
import pytest
from datetime import timezone

from app.core.normalizer import BallEvent, normalize, VALID_SOURCES

SAMPLE_RAW = {
    "match_id": "cricapi-001",
    "over": 3,
    "ball": 2,
    "runs": 6,
    "is_six": True,
    "is_four": False,
    "is_wicket": False,
    "batsman": "Virat Kohli",
    "bowler": "Bumrah",
}


class TestNormalizeReturnsCorrectBallEvent:
    def test_returns_ball_event_instance(self):
        """normalize() must return a BallEvent dataclass."""
        result = normalize(SAMPLE_RAW, "api")
        assert isinstance(result, BallEvent)

    def test_fields_mapped_correctly(self):
        """All fields from raw dict are mapped to the correct BallEvent fields."""
        result = normalize(SAMPLE_RAW, "api")
        assert result.match_id == "cricapi-001"
        assert result.over == 3
        assert result.ball == 2
        assert result.runs == 6
        assert result.is_six is True
        assert result.is_four is False
        assert result.is_wicket is False
        assert result.batsman == "Virat Kohli"
        assert result.bowler == "Bumrah"

    def test_source_is_preserved(self):
        """source field on the returned BallEvent matches what was passed in."""
        for source in VALID_SOURCES:
            assert normalize(SAMPLE_RAW, source).source == source

    def test_raw_data_stored_verbatim(self):
        """raw_data must be the exact dict passed in, unchanged."""
        result = normalize(SAMPLE_RAW, "api")
        assert result.raw_data is SAMPLE_RAW


class TestNormalizeSourceValidation:
    def test_raises_value_error_for_invalid_source(self):
        """normalize() must raise ValueError when source is not allowed."""
        with pytest.raises(ValueError, match="Invalid source 'webhook'"):
            normalize(SAMPLE_RAW, "webhook")

    def test_error_message_lists_valid_sources(self):
        """ValueError message must name the allowed values."""
        with pytest.raises(ValueError, match="api"):
            normalize(SAMPLE_RAW, "bad")

    def test_source_is_case_sensitive(self):
        """'API' is not the same as 'api' — enum must be exact."""
        with pytest.raises(ValueError):
            normalize(SAMPLE_RAW, "API")


class TestNormalizeTimestamp:
    def test_timestamp_is_set(self):
        """normalize() always sets a timestamp."""
        result = normalize(SAMPLE_RAW, "api")
        assert result.timestamp is not None

    def test_timestamp_is_utc(self):
        """timestamp timezone must be UTC, never naive or local."""
        result = normalize(SAMPLE_RAW, "api")
        assert result.timestamp.tzinfo == timezone.utc


class TestNormalizeDefaults:
    def test_batsman_defaults_to_empty_string_not_none(self):
        """batsman must be '' when missing from raw, never None."""
        result = normalize({"match_id": "x", "over": 0, "ball": 1}, "manual")
        assert result.batsman == ""
        assert result.batsman is not None

    def test_bowler_defaults_to_empty_string_not_none(self):
        """bowler must be '' when missing from raw, never None."""
        result = normalize({"match_id": "x", "over": 0, "ball": 1}, "manual")
        assert result.bowler == ""
        assert result.bowler is not None

    def test_none_batsman_coerced_to_empty_string(self):
        """explicit None in raw dict must be coerced to '' not kept as None."""
        result = normalize({**SAMPLE_RAW, "batsman": None}, "api")
        assert result.batsman == ""

    def test_none_bowler_coerced_to_empty_string(self):
        """explicit None in raw dict must be coerced to '' not kept as None."""
        result = normalize({**SAMPLE_RAW, "bowler": None}, "api")
        assert result.bowler == ""
