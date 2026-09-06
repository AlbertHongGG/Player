"""Automatic fallback fetcher combining HTTP and Browser strategies."""

from __future__ import annotations

import logging
from anime_verifier.fetchers.base import (
    CloudflareBlockedError,
    FetchError,
    PageFetcher,
)
from anime_verifier.fetchers.http import HttpFetcher
from anime_verifier.fetchers.browser import BrowserFetcher

logger = logging.getLogger(__name__)


class AutoFallbackFetcher:
    """Strategy that uses HttpFetcher first, falling back to BrowserFetcher upon challenge/block."""

    def __init__(
        self,
        http_fetcher: PageFetcher | None = None,
        browser_fetcher: PageFetcher | None = None,
    ) -> None:
        self.http_fetcher = http_fetcher or HttpFetcher()
        self.browser_fetcher = browser_fetcher or BrowserFetcher()

    def fetch_html(self, url: str) -> str:
        """Attempts HTTP fetch first; falls back to browser if blocked."""
        try:
            logger.debug("Attempting fast HTTP fetch...")
            return self.http_fetcher.fetch_html(url)
        except (CloudflareBlockedError, FetchError) as exc:
            logger.warning(
                f"HTTP fetch encountered issue ({exc}); activating DrissionPage native Chrome fallback..."
            )
            return self.browser_fetcher.fetch_html(url)
