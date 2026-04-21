"""
CircuitBreaker — tracks consecutive failures per pipeline layer and decides
when to switch layers or halt polling entirely.
This is the only thing in the codebase that decides which layer is active.
"""

# number of consecutive failures before switching to the next layer
FAILURE_THRESHOLD = 3

# valid layer numbers
LAYERS = (1, 2, 3)


class CircuitBreaker:
    """Manages layer switching for the cricket data pipeline.

    Rules (from CLAUDE.md):
    - Each layer starts with a failure counter of 0.
    - 3 consecutive failures on layer N → switch to layer N+1 and reset counter.
    - 3 consecutive failures on layer 3 → set state to 'halted', stop polling.
    - A single success on any layer resets that layer's counter to 0.
    - Switching layers always resets the new layer's counter before it starts.
    """

    def __init__(self) -> None:
        """Initialise with layer 1 active and all counters at zero."""
        self._current_layer: int = 1
        self._state: str = "active"
        # separate counter per layer so a recovered layer 1 doesn't carry
        # stale failures if it gets reactivated in a future reset
        self._failures: dict[int, int] = {1: 0, 2: 0, 3: 0}

    @property
    def current_layer(self) -> int:
        """The layer currently being used for polling."""
        return self._current_layer

    @property
    def state(self) -> str:
        """Either 'active' or 'halted'."""
        return self._state

    def get_active_layer(self) -> int:
        """Return the currently active layer number."""
        return self._current_layer

    def is_halted(self) -> bool:
        """Return True if all layers have exhausted their retries."""
        return self._state == "halted"

    def record_success(self, layer: int) -> None:
        """Reset the failure counter for the given layer on a successful poll."""
        if layer not in LAYERS:
            raise ValueError(f"Invalid layer {layer}. Must be one of {LAYERS}")
        self._failures[layer] = 0

    def record_failure(self, layer: int) -> None:
        """Increment the failure counter for the given layer.

        If the counter reaches FAILURE_THRESHOLD:
        - Switch to the next layer and reset its counter (layers 1 and 2).
        - Set state to 'halted' if layer 3 has exhausted its retries.
        """
        if layer not in LAYERS:
            raise ValueError(f"Invalid layer {layer}. Must be one of {LAYERS}")

        self._failures[layer] += 1

        if self._failures[layer] >= FAILURE_THRESHOLD:
            if layer == 3:
                self._state = "halted"
            else:
                next_layer = layer + 1
                # reset the new layer's counter before activating it so it
                # gets a clean slate regardless of any previous failures
                self._failures[next_layer] = 0
                self._current_layer = next_layer

    def reset(self) -> None:
        """Restore initial state: layer 1 active, all counters zeroed.

        Intended for testing and manual admin recovery only.
        """
        self._current_layer = 1
        self._state = "active"
        self._failures = {1: 0, 2: 0, 3: 0}
