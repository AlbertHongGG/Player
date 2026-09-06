"""API Client for simulating Anime1 backend requests to https://v.anime1.me/api."""

from __future__ import annotations

import logging
import httpx

from anime_verifier.models import (
    ApiRequestPayload,
    SessionCookies,
    VideoSource,
)

logger = logging.getLogger(__name__)

API_ENDPOINT = "https://v.anime1.me/api"
DEFAULT_REFERER = "https://anime1.me/"
DEFAULT_ORIGIN = "https://anime1.me"


class ApiClientError(Exception):
    """Raised when anime1 API request fails."""


class AnimeApiClient:
    """Client for resolving video sources and authorization cookies from v.anime1.me/api."""

    def __init__(self, endpoint: str = API_ENDPOINT, timeout: float = 15.0) -> None:
        self.endpoint = endpoint
        self.timeout = timeout

    def request_video_sources(
        self,
        payload: ApiRequestPayload,
    ) -> tuple[list[VideoSource], SessionCookies]:
        """Sends POST request to /api with payload and extracts stream sources & cookies.

        Args:
            payload: Validated ApiRequestPayload with c, e, t, p, s.

        Returns:
            A tuple of (list of VideoSource, SessionCookies).

        Raises:
            ApiClientError: If the API request fails or returns an invalid response.
        """
        form_data = payload.to_api_form_data()
        headers = {
            "Origin": DEFAULT_ORIGIN,
            "Referer": DEFAULT_REFERER,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "*/*",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(self.endpoint, data=form_data, headers=headers)
                response.raise_for_status()

            # Parse JSON body: {"s": [{"src": "...", "type": "video/mp4"}]}
            data = response.json()
            raw_sources = data.get("s", [])
            sources = [VideoSource.model_validate(src) for src in raw_sources]

            # Extract Set-Cookie headers
            set_cookie_headers = response.headers.get_list("set-cookie")
            cookies = SessionCookies.from_cookie_list(set_cookie_headers)

            logger.debug(
                f"Resolved {len(sources)} sources and {len(cookies.raw_cookies)} cookies for e={payload.e}"
            )
            return sources, cookies

        except Exception as exc:
            raise ApiClientError(f"Failed calling {self.endpoint} for episode '{payload.e}': {exc}") from exc
