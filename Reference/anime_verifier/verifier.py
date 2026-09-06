"""Video Stream Verifier for testing media playback accessibility."""

from __future__ import annotations

import logging
import time
import httpx

from anime_verifier.models import (
    SessionCookies,
    StreamVerificationResult,
    VideoSource,
)

logger = logging.getLogger(__name__)

DEFAULT_REFERER = "https://anime1.me/"


class StreamVerifier:
    """Probes video stream endpoints to verify accessibility with session cookies."""

    def __init__(self, timeout: float = 15.0) -> None:
        self.timeout = timeout

    def verify_stream(
        self,
        source: VideoSource,
        cookies: SessionCookies | None = None,
    ) -> StreamVerificationResult:
        """Sends a Byte-Range request (bytes=0-1024) to the stream URL.

        Args:
            source: The VideoSource containing the target stream URL.
            cookies: The authentication cookies returned by the API.

        Returns:
            StreamVerificationResult with accessibility status, HTTP headers, and latency.
        """
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            "Referer": DEFAULT_REFERER,
            "Range": "bytes=0-1024",
        }

        if cookies and cookies.raw_cookies:
            headers["Cookie"] = cookies.to_cookie_header()

        start_time = time.perf_counter()
        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                response = client.get(source.src, headers=headers)

            latency = (time.perf_counter() - start_time) * 1000
            status = response.status_code
            content_type = response.headers.get("content-type")
            content_range = response.headers.get("content-range")
            content_length = (
                int(response.headers["content-length"])
                if "content-length" in response.headers
                else len(response.content)
            )

            # A valid media stream response typically returns 206 (Partial Content) or 200 (OK)
            is_success = (status in (200, 206)) and (
                content_type is not None and "video" in content_type.lower()
            )

            error_msg = None
            if not is_success:
                error_msg = f"HTTP {status}, Content-Type: {content_type}"

            return StreamVerificationResult(
                stream_url=source.src,
                is_success=is_success,
                status_code=status,
                content_type=content_type,
                content_range=content_range,
                content_length=content_length,
                error_message=error_msg,
                latency_ms=round(latency, 2),
            )

        except Exception as exc:
            latency = (time.perf_counter() - start_time) * 1000
            return StreamVerificationResult(
                stream_url=source.src,
                is_success=False,
                status_code=0,
                error_message=str(exc),
                latency_ms=round(latency, 2),
            )
