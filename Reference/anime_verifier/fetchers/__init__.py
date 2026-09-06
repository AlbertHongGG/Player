"""Fetchers package exposing strategies and factory functions."""

from __future__ import annotations

from anime_verifier.fetchers.base import (
    PageFetcher,
    FetchError,
    CloudflareBlockedError,
)
from anime_verifier.fetchers.http import HttpFetcher
from anime_verifier.fetchers.browser import BrowserFetcher, find_native_chrome_path
from anime_verifier.fetchers.auto import AutoFallbackFetcher

__all__ = [
    "PageFetcher",
    "FetchError",
    "CloudflareBlockedError",
    "HttpFetcher",
    "BrowserFetcher",
    "AutoFallbackFetcher",
    "find_native_chrome_path",
    "get_fetcher",
]


def get_fetcher(
    mode: str = "auto",
    headless: bool = True,
    browser_path: str | None = None,
    timeout: float = 15.0,
) -> PageFetcher:
    """Factory function to instantiate the requested fetcher strategy.

    Args:
        mode: One of 'auto', 'http', or 'browser'.
        headless: Whether browser fetcher should run headlessly.
        browser_path: Custom Chrome path if specified.
        timeout: Network / element wait timeout in seconds.

    Returns:
        Instance conforming to PageFetcher protocol.
    """
    mode_lower = mode.lower().strip()
    if mode_lower == "http":
        return HttpFetcher(timeout=timeout)
    elif mode_lower == "browser":
        return BrowserFetcher(
            browser_path=browser_path,
            headless=headless,
            timeout=timeout,
        )
    elif mode_lower == "auto":
        http = HttpFetcher(timeout=timeout)
        browser = BrowserFetcher(
            browser_path=browser_path,
            headless=headless,
            timeout=timeout + 5.0,
        )
        return AutoFallbackFetcher(http_fetcher=http, browser_fetcher=browser)
    else:
        raise ValueError(f"Unknown fetcher mode: '{mode}'. Expected 'auto', 'http', or 'browser'.")
