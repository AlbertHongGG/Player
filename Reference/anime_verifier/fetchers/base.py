"""Abstract base protocol and exceptions for page fetchers."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


class FetchError(Exception):
    """Raised when fetching a page fails."""


class CloudflareBlockedError(FetchError):
    """Raised when a request is blocked by Cloudflare anti-bot challenge."""


@runtime_checkable
class PageFetcher(Protocol):
    """Protocol for page fetcher strategies."""

    def fetch_html(self, url: str) -> str:
        """Fetches and returns the HTML content of the target URL.

        Args:
            url: The webpage URL to fetch.

        Returns:
            The raw HTML content string.

        Raises:
            CloudflareBlockedError: If intercepted by Cloudflare challenge.
            FetchError: If any network, HTTP, or rendering error occurs.
        """
        ...
