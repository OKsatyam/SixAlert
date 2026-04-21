"""
MatchPoller — ties the circuit breaker and pipeline layers together.
Polls every 6 seconds, routes to the correct layer, POSTs normalized
BallEvents to the Node backend with the shared worker secret header.
"""
import asyncio
import dataclasses
import logging
import os
from typing import Optional

import httpx

from app.core.circuit_breaker import CircuitBreaker
from app.core.normalizer import BallEvent
from app.layers.layer1_api import fetch_ball_event as layer1_fetch, ApiError
from app.layers.layer2_scraper import scrape_ball_event as layer2_fetch, ScraperError

POLL_INTERVAL_SECONDS = 6

logger = logging.getLogger(__name__)


class MatchPoller:
    """Runs the per-match polling loop and delegates layer selection to CircuitBreaker."""

    def __init__(self, circuit_breaker: CircuitBreaker) -> None:
        """Initialise with an external CircuitBreaker so it can be shared or inspected."""
        self._cb = circuit_breaker
        # True while polling is active for a given match_id
        self._active: dict[str, bool] = {}

    async def start_polling(self, match_id: str) -> None:
        """Poll match_id every 6 seconds until stopped or circuit breaker halts.

        On each tick:
        1. Stop if circuit breaker is halted.
        2. Fetch from the active layer.
        3. Success → record_success + POST to Node backend.
        4. Failure → record_failure + log (circuit breaker handles layer switch).
        5. Sleep 6 seconds before next tick.
        """
        self._active[match_id] = True
        logger.info(f"Started polling match {match_id}")

        while self._active.get(match_id):
            if self._cb.is_halted():
                logger.error(
                    f"Circuit breaker halted — stopping poll for match {match_id}. "
                    "Manual intervention required."
                )
                break

            layer = self._cb.get_active_layer()
            try:
                ball_event = await self._fetch(layer, match_id)
                if ball_event:
                    self._cb.record_success(layer)
                    await self._post_to_backend(ball_event)
            except (ApiError, ScraperError, Exception) as exc:
                self._cb.record_failure(layer)
                logger.error(f"Layer {layer} failed for match {match_id}: {exc}")

            await asyncio.sleep(POLL_INTERVAL_SECONDS)

        self._active.pop(match_id, None)
        logger.info(f"Stopped polling match {match_id}")

    async def stop_polling(self, match_id: str) -> None:
        """Signal the polling loop for match_id to exit after the current tick."""
        self._active[match_id] = False

    async def _fetch(self, layer: int, match_id: str) -> Optional[BallEvent]:
        """Dispatch to the correct layer function based on the active layer."""
        if layer == 1:
            return await layer1_fetch(match_id)
        if layer == 2:
            return await layer2_fetch(match_id)
        # layer 3 is emergency — no automated source, requires admin action
        logger.critical(
            f"Layer 3 (emergency) active for match {match_id} — no automated source available."
        )
        return None

    async def _post_to_backend(self, ball_event: BallEvent) -> None:
        """POST a normalized BallEvent to the Node backend /internal/ball-event.

        X-Worker-Secret authenticates this worker to the Node backend.
        Logs a warning on non-2xx but does not raise — a failed POST should
        not increment the circuit breaker (it is not a pipeline layer failure).
        """
        backend_url = os.environ["NODE_BACKEND_URL"]
        worker_secret = os.environ["WORKER_SECRET"]

        payload = dataclasses.asdict(ball_event)
        # datetime is not JSON-serialisable by default
        payload["timestamp"] = ball_event.timestamp.isoformat()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{backend_url}/internal/ball-event",
                json=payload,
                headers={"X-Worker-Secret": worker_secret},
                timeout=5.0,
            )
        if response.status_code not in (200, 201):
            logger.warning(
                f"Backend rejected ball event for {ball_event.match_id}: "
                f"HTTP {response.status_code}"
            )
