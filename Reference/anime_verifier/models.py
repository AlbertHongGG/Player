"""Domain models for Anime1 Verifier.

Encapsulates all domain entities, value objects, and serialization logic
with strict Pydantic V2 validation.
"""

from __future__ import annotations

import json
from datetime import datetime
from urllib.parse import unquote
from pydantic import BaseModel, Field, field_validator


class ApiRequestPayload(BaseModel):
    """Encapsulates the JSON payload decoded from the data-apireq attribute.

    Example JSON:
        {"c": "1941", "e": "6b", "t": 1787233540, "p": 0, "s": "f02cd278f93df0d5c4c8916af92dddda"}
    """

    c: str = Field(description="Anime Category / Directory ID (e.g. '1941')")
    e: str = Field(description="Episode / File identifier (e.g. '6b', 'sp-episode0')")
    t: int = Field(description="UNIX timestamp")
    p: int = Field(default=0, description="Player / Quality type identifier")
    s: str = Field(description="32-char hexadecimal frontend MD5 signature")

    @field_validator("s")
    @classmethod
    def validate_signature_format(cls, v: str) -> str:
        v = v.strip()
        if len(v) != 32:
            raise ValueError(f"Invalid signature length: expected 32 hex characters, got {len(v)}")
        return v

    @classmethod
    def from_raw_encoded(cls, raw: str) -> ApiRequestPayload:
        """Decodes URL-encoded string or parses raw JSON string into ApiRequestPayload."""
        unquoted = unquote(raw.strip())
        try:
            data = json.loads(unquoted)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Failed to decode data-apireq JSON: {unquoted}") from exc
        return cls.model_validate(data)

    def to_api_form_data(self) -> dict[str, str]:
        """Converts to the form payload expected by POST https://v.anime1.me/api.

        Format: {'d': '{"c":"...","e":"...","t":...,"p":...,"s":"..."}'}
        """
        # separators=(',', ':') guarantees compact JSON without extra whitespace
        payload_str = json.dumps(
            {"c": self.c, "e": self.e, "t": self.t, "p": self.p, "s": self.s},
            separators=(",", ":"),
        )
        return {"d": payload_str}


class EpisodePlayer(BaseModel):
    """Represents a single video player found within an article's .vjscontainer."""

    player_index: int = Field(default=1, description="1-indexed player position")
    container_id: str | None = Field(default=None, description="HTML id of player or container")
    payload: ApiRequestPayload


class EpisodeArticle(BaseModel):
    """Represents an <article> item in #main."""

    post_id: str = Field(description="Article element ID, e.g. 'post-4711'")
    title: str = Field(description="Episode title, e.g. '搖曳露營△ [12]'")
    published_at: datetime | None = Field(default=None, description="Publish datetime from entry-meta")
    article_url: str | None = Field(default=None, description="Permalink URL")
    players: list[EpisodePlayer] = Field(default_factory=list, description="Extracted video players")


class VideoSource(BaseModel):
    """A playable video stream source returned by the backend API."""

    src: str = Field(description="Normalized video stream URL (starts with https:)")
    type: str = Field(default="video/mp4", description="MIME type")

    @field_validator("src")
    @classmethod
    def normalize_url(cls, v: str) -> str:
        v = v.strip()
        if v.startswith("//"):
            return "https:" + v
        return v


class SessionCookies(BaseModel):
    """Authentication cookies set by https://v.anime1.me/api."""

    e: str | None = Field(default=None, description="Expiration timestamp cookie")
    p: str | None = Field(default=None, description="JWT Auth Token cookie")
    h: str | None = Field(default=None, description="Hash signature cookie")
    raw_cookies: dict[str, str] = Field(default_factory=dict, description="All received cookies")

    @classmethod
    def from_cookie_list(cls, set_cookie_headers: list[str]) -> SessionCookies:
        """Parses a list of Set-Cookie header strings."""
        raw: dict[str, str] = {}
        for header in set_cookie_headers:
            # Set-Cookie: key=val; expires=...; path=...
            parts = header.split(";")
            if parts:
                cookie_pair = parts[0].strip()
                if "=" in cookie_pair:
                    name, val = cookie_pair.split("=", 1)
                    raw[name.strip()] = val.strip()

        return cls(
            e=raw.get("e"),
            p=raw.get("p"),
            h=raw.get("h"),
            raw_cookies=raw,
        )

    def to_cookie_header(self) -> str:
        """Formats into Cookie request header value."""
        return "; ".join(f"{k}={v}" for k, v in self.raw_cookies.items())


class StreamVerificationResult(BaseModel):
    """Result of probing a video stream URL."""

    stream_url: str
    is_success: bool
    status_code: int
    content_type: str | None = None
    content_range: str | None = None
    content_length: int | None = None
    error_message: str | None = None
    latency_ms: float = 0.0


class PlayerVerificationReport(BaseModel):
    """Complete verification report for a single player within an article."""

    player_index: int
    payload: ApiRequestPayload
    sources: list[VideoSource] = Field(default_factory=list)
    cookies: SessionCookies | None = None
    stream_result: StreamVerificationResult | None = None


class EpisodeVerificationReport(BaseModel):
    """Complete report for an article/episode."""

    article: EpisodeArticle
    player_reports: list[PlayerVerificationReport] = Field(default_factory=list)
    is_fully_verified: bool = False
