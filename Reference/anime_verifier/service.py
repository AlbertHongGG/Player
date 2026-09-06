"""Verification orchestration service combining Fetcher, Parser, Client, and Verifier."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Callable

from anime_verifier.client import AnimeApiClient
from anime_verifier.fetchers import PageFetcher, get_fetcher
from anime_verifier.models import (
    EpisodeArticle,
    EpisodePlayer,
    EpisodeVerificationReport,
    ExecutionMetadata,
    ExecutionRunRecord,
    PlayerVerificationReport,
)
from anime_verifier.parser import parse_anime_page
from anime_verifier.verifier import StreamVerifier

logger = logging.getLogger(__name__)


class AnimeVerificationService:
    """High-level orchestration service for Anime1 video verification."""

    def __init__(
        self,
        api_client: AnimeApiClient | None = None,
        stream_verifier: StreamVerifier | None = None,
    ) -> None:
        self.api_client = api_client or AnimeApiClient()
        self.stream_verifier = stream_verifier or StreamVerifier()

    def fetch_articles(
        self,
        url: str,
        fetcher: PageFetcher | None = None,
    ) -> list[EpisodeArticle]:
        """Fetches page HTML and extracts articles."""
        active_fetcher = fetcher or get_fetcher(mode="auto")
        html = active_fetcher.fetch_html(url)
        return parse_anime_page(html)

    def verify_player(self, player: EpisodePlayer) -> PlayerVerificationReport:
        """Simulates the API request and verifies stream accessibility for a single player."""
        try:
            exchange = self.api_client.execute_exchange(player.payload)
            sources = exchange.sources
            cookies = exchange.session_cookies
        except Exception as exc:
            logger.error(f"API request failed for player {player.player_index}: {exc}")
            return PlayerVerificationReport(
                player_index=player.player_index,
                container_id=player.container_id,
                data_apireq=player.payload,
                sources=[],
                cookies=None,
                api_exchange=None,
                stream_result=None,
            )

        stream_res = None
        if sources:
            # Probe the first valid stream source
            stream_res = self.stream_verifier.verify_stream(sources[0], cookies=cookies)

        return PlayerVerificationReport(
            player_index=player.player_index,
            container_id=player.container_id,
            data_apireq=player.payload,
            sources=sources,
            cookies=cookies,
            api_exchange=exchange,
            stream_result=stream_res,
        )

    def verify_article(self, article: EpisodeArticle) -> EpisodeVerificationReport:
        """Verifies all players inside an article."""
        player_reports: list[PlayerVerificationReport] = []
        for p in article.players:
            rep = self.verify_player(p)
            player_reports.append(rep)

        is_fully_verified = bool(
            player_reports
            and all(
                pr.stream_result and pr.stream_result.is_success
                for pr in player_reports
            )
        )

        return EpisodeVerificationReport(
            article=article,
            player_reports=player_reports,
            is_fully_verified=is_fully_verified,
        )

    def build_execution_run_record(
        self,
        url: str,
        fetcher_mode: str,
        reports: list[EpisodeVerificationReport],
        timestamp: datetime | None = None,
    ) -> ExecutionRunRecord:
        """Transforms runtime verification reports into an auditable ExecutionRunRecord."""
        ts = timestamp or datetime.now().astimezone()
        article_records = [rep.to_article_record() for rep in reports]

        total_players = sum(len(art.players) for art in article_records)
        verified_streams = sum(
            1
            for art in article_records
            for p in art.players
            if p.stream_verification and p.stream_verification.is_success
        )
        failed_streams = total_players - verified_streams

        metadata = ExecutionMetadata(
            execution_timestamp=ts,
            target_url=url,
            fetcher_mode=fetcher_mode,
            total_articles=len(article_records),
            total_players=total_players,
            verified_streams=verified_streams,
            failed_streams=failed_streams,
        )

        return ExecutionRunRecord(
            metadata=metadata,
            articles=article_records,
        )

    def run_verification(
        self,
        url: str,
        fetcher_mode: str = "auto",
        limit: int | None = None,
        headless: bool = True,
        on_progress: Callable[[str, int, int], None] | None = None,
    ) -> list[EpisodeVerificationReport]:
        """Executes end-to-end verification of all articles in the specified anime URL."""
        fetcher = get_fetcher(mode=fetcher_mode, headless=headless)
        articles = self.fetch_articles(url, fetcher=fetcher)

        if limit is not None and limit > 0:
            articles = articles[:limit]

        total = len(articles)
        reports: list[EpisodeVerificationReport] = []

        for idx, article in enumerate(articles, start=1):
            if on_progress:
                on_progress(f"Verifying {article.title}", idx, total)
            rep = self.verify_article(article)
            reports.append(rep)

        return reports
