"""Browser-based page fetcher using DrissionPage and native Chrome."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from DrissionPage import ChromiumPage, ChromiumOptions

from anime_verifier.fetchers.base import FetchError

logger = logging.getLogger(__name__)

STANDARD_CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
]


def find_native_chrome_path() -> str | None:
    """Detects native Google Chrome executable path on the system."""
    for p in STANDARD_CHROME_PATHS:
        if Path(p).is_file():
            return p
    return None


class BrowserFetcher:
    """Browser-based fetcher powered by DrissionPage and native Chrome."""

    def __init__(
        self,
        browser_path: str | None = None,
        headless: bool = True,
        timeout: float = 20.0,
    ) -> None:
        self.browser_path = browser_path or find_native_chrome_path()
        self.headless = headless
        self.timeout = timeout

        if not self.browser_path:
            logger.warning(
                "Native Chrome executable not found in default locations. "
                "DrissionPage will attempt default browser discovery."
            )

    def fetch_html(self, url: str) -> str:
        """Loads the webpage in native Chrome and retrieves rendered HTML."""
        logger.info(f"Fetching {url} using native Chrome (headless={self.headless})...")

        options = ChromiumOptions()
        if self.browser_path:
            options.set_browser_path(self.browser_path)

        options.auto_port()
        options.headless(self.headless)
        options.set_argument("--no-sandbox")
        options.set_argument("--disable-gpu")
        options.set_argument("--disable-blink-features=AutomationControlled")

        page = None
        try:
            page = ChromiumPage(options)
            page.get(url)

            # Wait for content or articles to load
            try:
                page.wait.eles_loaded("tag:article", timeout=self.timeout)
            except Exception:
                logger.warning("Timeout waiting for article elements; capturing current HTML state.")


            html = page.html
            if not html or len(html.strip()) == 0:
                raise FetchError(f"Received empty HTML content from browser for {url}")

            return html

        except Exception as exc:
            raise FetchError(f"DrissionPage browser fetch failed for {url}: {exc}") from exc
        finally:
            if page:
                try:
                    page.quit()
                except Exception:
                    pass
