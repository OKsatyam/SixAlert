"""
Tests for CircuitBreaker — layer switching, failure counting, halt state, and reset.
Zero external dependencies: pure in-memory state only.
"""
import pytest
from app.core.circuit_breaker import CircuitBreaker, FAILURE_THRESHOLD


@pytest.fixture
def cb() -> CircuitBreaker:
    """Fresh CircuitBreaker for every test."""
    return CircuitBreaker()


class TestInitialState:
    def test_starts_on_layer_1(self, cb: CircuitBreaker) -> None:
        """Circuit breaker must start on layer 1."""
        assert cb.current_layer == 1
        assert cb.get_active_layer() == 1

    def test_starts_active(self, cb: CircuitBreaker) -> None:
        """State must be 'active' on init."""
        assert cb.state == "active"
        assert cb.is_halted() is False


class TestLayerSwitching:
    def test_three_failures_on_layer1_switches_to_layer2(self, cb: CircuitBreaker) -> None:
        """3 consecutive layer-1 failures must switch to layer 2."""
        for _ in range(FAILURE_THRESHOLD):
            cb.record_failure(1)
        assert cb.current_layer == 2

    def test_three_failures_on_layer2_switches_to_layer3(self, cb: CircuitBreaker) -> None:
        """3 consecutive layer-2 failures must switch to layer 3."""
        for _ in range(FAILURE_THRESHOLD):
            cb.record_failure(1)
        for _ in range(FAILURE_THRESHOLD):
            cb.record_failure(2)
        assert cb.current_layer == 3

    def test_switching_resets_failure_counter_for_new_layer(self, cb: CircuitBreaker) -> None:
        """The new layer's counter must be 0 after a switch so it gets a clean slate."""
        for _ in range(FAILURE_THRESHOLD):
            cb.record_failure(1)
        # layer 2 is now active — two failures should NOT trigger a switch yet
        cb.record_failure(2)
        cb.record_failure(2)
        assert cb.current_layer == 2
        assert cb.state == "active"

    def test_two_failures_do_not_switch(self, cb: CircuitBreaker) -> None:
        """Fewer than FAILURE_THRESHOLD failures must not trigger a switch."""
        cb.record_failure(1)
        cb.record_failure(1)
        assert cb.current_layer == 1


class TestHaltedState:
    def test_three_failures_on_layer3_sets_halted(self, cb: CircuitBreaker) -> None:
        """3 consecutive layer-3 failures must set state to 'halted'."""
        for _ in range(FAILURE_THRESHOLD):
            cb.record_failure(1)
        for _ in range(FAILURE_THRESHOLD):
            cb.record_failure(2)
        for _ in range(FAILURE_THRESHOLD):
            cb.record_failure(3)
        assert cb.state == "halted"
        assert cb.is_halted() is True

    def test_halted_does_not_advance_beyond_layer3(self, cb: CircuitBreaker) -> None:
        """There is no layer 4 — halted state must stay at layer 3."""
        for layer in (1, 2, 3):
            for _ in range(FAILURE_THRESHOLD):
                cb.record_failure(layer)
        assert cb.current_layer == 3


class TestSuccessResetsCounter:
    def test_success_resets_failure_count(self, cb: CircuitBreaker) -> None:
        """A success must reset the counter so failures don't accumulate across polls."""
        cb.record_failure(1)
        cb.record_failure(1)
        cb.record_success(1)
        # one more failure after reset should not switch — counter is back to 1
        cb.record_failure(1)
        assert cb.current_layer == 1

    def test_is_halted_false_when_active(self, cb: CircuitBreaker) -> None:
        """is_halted() must return False before any halt condition is reached."""
        cb.record_failure(1)
        assert cb.is_halted() is False


class TestReset:
    def test_reset_returns_to_layer1(self, cb: CircuitBreaker) -> None:
        """reset() must restore layer 1 as the active layer."""
        for _ in range(FAILURE_THRESHOLD):
            cb.record_failure(1)
        cb.reset()
        assert cb.current_layer == 1

    def test_reset_clears_halted_state(self, cb: CircuitBreaker) -> None:
        """reset() must clear 'halted' and restore 'active'."""
        for layer in (1, 2, 3):
            for _ in range(FAILURE_THRESHOLD):
                cb.record_failure(layer)
        assert cb.is_halted() is True
        cb.reset()
        assert cb.is_halted() is False
        assert cb.state == "active"

    def test_reset_clears_all_failure_counters(self, cb: CircuitBreaker) -> None:
        """After reset(), each layer must tolerate FAILURE_THRESHOLD-1 failures."""
        for layer in (1, 2, 3):
            for _ in range(FAILURE_THRESHOLD):
                cb.record_failure(layer)
        cb.reset()
        # two failures on layer 1 after reset must not switch
        cb.record_failure(1)
        cb.record_failure(1)
        assert cb.current_layer == 1
