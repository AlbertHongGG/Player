import pytest
from anime_verifier.models import ApiRequestPayload, SessionCookies, VideoSource


def test_api_request_payload_decoding():
    raw = "%7B%22c%22%3A%221941%22%2C%22e%22%3A%226b%22%2C%22t%22%3A1787233540%2C%22p%22%3A0%2C%22s%22%3A%22f02cd278f93df0d5c4c8916af92dddda%22%7D"
    payload = ApiRequestPayload.from_raw_encoded(raw)
    assert payload.c == "1941"
    assert payload.e == "6b"
    assert payload.t == 1787233540
    assert payload.p == 0
    assert payload.s == "f02cd278f93df0d5c4c8916af92dddda"

    # Verify form data format
    form_data = payload.to_api_form_data()
    assert "d" in form_data
    assert form_data["d"] == '{"c":"1941","e":"6b","t":1787233540,"p":0,"s":"f02cd278f93df0d5c4c8916af92dddda"}'


def test_api_request_payload_validation():
    # Invalid signature length
    with pytest.raises(ValueError, match="Invalid signature length"):
        ApiRequestPayload(c="1", e="2", t=123, p=0, s="short")


def test_video_source_url_normalization():
    src1 = VideoSource(src="//miru.v.anime1.me/1941/6b.mp4")
    assert src1.src == "https://miru.v.anime1.me/1941/6b.mp4"

    src2 = VideoSource(src="https://hinata.v.anime1.me/1941/5b.mp4")
    assert src2.src == "https://hinata.v.anime1.me/1941/5b.mp4"


def test_session_cookies():
    headers = [
        "e=1787262340; expires=Thu, 20 Aug 2026 21:45:40 GMT; path=/1941/6b.mp4; domain=.v.anime1.me; secure; HttpOnly",
        "p=eyJpc3MiOiJhbmltZTEubWUiLCJleHAiOjE3ODcyNjIzNDAwMDAsImlhdCI6MTc4NzIzNzEwMDAwMCwic3ViIjoiLzE5NDEvNmIubXA0In0; path=/1941/6b.mp4; domain=.v.anime1.me; secure; HttpOnly",
        "h=F_Tg4tZlaWv0mR80KxL4Xw; path=/1941/6b.mp4; domain=.v.anime1.me; secure; HttpOnly",
    ]
    cookies = SessionCookies.from_cookie_list(headers)
    assert cookies.e == "1787262340"
    assert cookies.p.startswith("eyJ")
    assert cookies.h == "F_Tg4tZlaWv0mR80KxL4Xw"
    header_str = cookies.to_cookie_header()
    assert "e=1787262340" in header_str
    assert "h=F_Tg4tZlaWv0mR80KxL4Xw" in header_str
