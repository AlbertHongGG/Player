from anime_verifier.fetchers import (
    PageFetcher,
    HttpFetcher,
    BrowserFetcher,
    AutoFallbackFetcher,
    get_fetcher,
    find_native_chrome_path,
)


def test_page_fetcher_protocol():
    http = HttpFetcher()
    assert isinstance(http, PageFetcher)

    browser = BrowserFetcher()
    assert isinstance(browser, PageFetcher)

    auto = AutoFallbackFetcher(http, browser)
    assert isinstance(auto, PageFetcher)


def test_get_fetcher_factory():
    assert isinstance(get_fetcher("http"), HttpFetcher)
    assert isinstance(get_fetcher("browser"), BrowserFetcher)
    assert isinstance(get_fetcher("auto"), AutoFallbackFetcher)


def test_native_chrome_detected():
    path = find_native_chrome_path()
    assert path is not None
    assert "chrome.exe" in path.lower()
