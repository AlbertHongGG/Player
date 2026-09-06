"""HTML DOM Parser for Anime1 pages.

Extracts articles, episode metadata, and data-apireq payloads
from the site-main container with zero I/O side effects.
"""

from __future__ import annotations

import logging
from datetime import datetime
from bs4 import BeautifulSoup, Tag

from anime_verifier.models import (
    ApiRequestPayload,
    EpisodeArticle,
    EpisodePlayer,
)

logger = logging.getLogger(__name__)


def parse_anime_page(html_content: str) -> list[EpisodeArticle]:
    """Parses Anime1 HTML content and extracts all episode articles.

    Args:
        html_content: Raw HTML text of the page.

    Returns:
        List of EpisodeArticle objects found in the page.
    """
    soup = BeautifulSoup(html_content, "lxml")

    # Locate main container (site-main or #main)
    main_container = soup.select_one("main#main, main.site-main, div#primary")
    root = main_container if main_container else soup

    articles: list[EpisodeArticle] = []
    article_elements = root.select("article")

    for art_tag in article_elements:
        article = _parse_single_article(art_tag)
        if article:
            articles.append(article)

    return articles


def _parse_single_article(art_tag: Tag) -> EpisodeArticle | None:
    """Extracts metadata and players from a single <article> tag."""
    post_id = art_tag.get("id") or "unknown-post"

    # 1. Extract Header Information
    header = art_tag.select_one("header.entry-header, header")
    title = ""
    article_url = None
    published_at = None

    if header:
        title_el = header.select_one("h2.entry-title a, h1.entry-title a, h2.entry-title, h1.entry-title")
        if title_el:
            title = title_el.get_text(strip=True)
            if title_el.name == "a" and title_el.has_attr("href"):
                article_url = title_el["href"]

        if not article_url:
            link_el = header.select_one("a[rel='bookmark']")
            if link_el and link_el.has_attr("href"):
                article_url = link_el["href"]

        # Extract published datetime
        time_el = header.select_one("time.entry-date, time[datetime]")
        if time_el and time_el.has_attr("datetime"):
            raw_dt = time_el["datetime"]
            try:
                published_at = datetime.fromisoformat(raw_dt)
            except ValueError:
                logger.warning(f"Failed to parse datetime string: {raw_dt}")

    if not title:
        # Fallback to any heading
        fallback_title = art_tag.select_one("h1, h2, h3")
        title = fallback_title.get_text(strip=True) if fallback_title else post_id

    # 2. Extract Entry Content & Players
    players: list[EpisodePlayer] = []
    content = art_tag.select_one("div.entry-content, div.entry-summary")
    search_root = content if content else art_tag

    # Find all .vjscontainer elements
    containers = search_root.select(".vjscontainer")

    if containers:
        for idx, container in enumerate(containers, start=1):
            # In each container, find elements with data-apireq
            req_el = container.select_one("[data-apireq]")
            if req_el and req_el.has_attr("data-apireq"):
                raw_payload = req_el["data-apireq"]
                try:
                    payload = ApiRequestPayload.from_raw_encoded(raw_payload)
                    container_id = req_el.get("id") or container.get("id")
                    players.append(
                        EpisodePlayer(
                            player_index=idx,
                            container_id=container_id,
                            payload=payload,
                        )
                    )
                except Exception as exc:
                    logger.error(f"Error parsing payload in container {idx}: {exc}")
    else:
        # Fallback: search for any [data-apireq] directly inside search_root
        raw_req_els = search_root.select("[data-apireq]")
        seen_payloads = set()
        player_idx = 1
        for el in raw_req_els:
            raw_val = el["data-apireq"]
            if raw_val in seen_payloads:
                continue
            seen_payloads.add(raw_val)
            try:
                payload = ApiRequestPayload.from_raw_encoded(raw_val)
                players.append(
                    EpisodePlayer(
                        player_index=player_idx,
                        container_id=el.get("id"),
                        payload=payload,
                    )
                )
                player_idx += 1
            except Exception as exc:
                logger.error(f"Error parsing direct data-apireq: {exc}")

    return EpisodeArticle(
        post_id=str(post_id),
        title=title,
        published_at=published_at,
        article_url=article_url,
        players=players,
    )
