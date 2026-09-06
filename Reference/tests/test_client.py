from anime_verifier.client import AnimeApiClient
from anime_verifier.models import ApiRequestPayload, SessionCookies, VideoSource
from anime_verifier.verifier import StreamVerifier


def test_api_client_payload_formatting():
    client = AnimeApiClient()
    payload = ApiRequestPayload(
        c="1941",
        e="6b",
        t=1787233540,
        p=0,
        s="f02cd278f93df0d5c4c8916af92dddda",
    )
    form_data = payload.to_api_form_data()
    assert form_data == {
        "d": '{"c":"1941","e":"6b","t":1787233540,"p":0,"s":"f02cd278f93df0d5c4c8916af92dddda"}'
    }


def test_stream_verifier_cookie_formatting():
    verifier = StreamVerifier()
    source = VideoSource(src="//example.com/test.mp4")
    assert source.src == "https://example.com/test.mp4"

    cookies = SessionCookies(
        e="12345",
        p="token",
        h="hash",
        raw_cookies={"e": "12345", "p": "token", "h": "hash"},
    )
    cookie_str = cookies.to_cookie_header()
    assert "e=12345" in cookie_str
    assert "p=token" in cookie_str
    assert "h=hash" in cookie_str
