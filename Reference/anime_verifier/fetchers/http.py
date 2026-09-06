"""HTTP-based page fetcher using httpx."""

from __future__ import annotations

import logging
import httpx

from anime_verifier.fetchers.base import (
    DEFAULT_HEADERS,
    CloudflareBlockedError,
    FetchError,
)

logger = logging.getLogger(__name__)

CF_SIGNATURES = [
    "Just a moment...",
    "cf-browser-verification",
    "Attention Required! | Cloudflare",
    "Checking your browser before accessing",
    "cf-mitigated",
]


class HttpFetcher:
    """High-performance direct HTTP fetcher using httpx."""

    def __init__(self, timeout: float = 15.0, headers: dict[str, str] | None = None) -> None:
        self.timeout = timeout
        self.headers = {**DEFAULT_HEADERS, **(headers or {})}

    def fetch_html(self, url: str) -> str:
        """Fetches HTML content via HTTP request."""
        logger.debug(f"Fetching {url} via HttpFetcher...")
        try:
            with httpx.Client(
                headers=self.headers,
                timeout=self.timeout,
                follow_redirects=True,
                http2=True,
            ) as client:
                response = client.get(url)

            # Check status and Cloudflare challenge
            if response.status_code in (403, 503):
                text_preview = response.text[:2000]
                if any(sig in text_preview for sig in CF_SIGNATURES):
                    raise CloudflareBlockedError(
                        f"Cloudflare anti-bot verification triggered (status {response.status_code})"
                    )
                response.raise_for_status()

            response.raise_for_status()
            html = response.text

            # Check for silent 200 CF challenge page
            if any(sig in html[:1000] for sig in CF_SIGNATURES):
                raise CloudflareBlockedError(
                    "Cloudflare challenge detected in response body despite status 200"
                )

            return html

        except (httpx.HTTPError, httpx.NetworkError) as exc:
            raise FetchError(f"HTTP fetch failed for {url}: {exc}") from exc
