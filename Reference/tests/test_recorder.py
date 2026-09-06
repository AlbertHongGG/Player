import json
import re
from datetime import datetime
from pathlib import Path
import pytest

from anime_verifier.models import (
    ApiRequestPayload,
    ApiRequestRecord,
    ApiResponseRecord,
    ArticleRecord,
    ExecutionMetadata,
    ExecutionRunRecord,
    PlayerRecord,
    StreamVerificationResult,
)
from anime_verifier.recorder import ExecutionRecorder, generate_verifier_filename


def test_filename_pattern():
    dt = datetime(2026, 9, 6, 20, 25, 10)
    fname = generate_verifier_filename(dt)
    assert fname == "20260906_202510_verifier.json"
    assert re.match(r"^\d{8}_\d{6}_verifier\.json$", fname)


def test_save_and_verify_json_structure(tmp_path: Path):
    output_dir = tmp_path / "custom_output"
    recorder = ExecutionRecorder(output_dir=output_dir)

    payload = ApiRequestPayload(
        c="256",
        e="12",
        t=1788693678,
        p=5,
        s="1673b171dcb842caffc6123773f8366e",
    )

    player = PlayerRecord(
        player_index=1,
        container_id="vjs-test",
        data_apireq=payload,
        api_request=ApiRequestRecord(
            endpoint="https://v.anime1.me/api",
            method="POST",
            headers={"Origin": "https://anime1.me"},
            form_payload={"d": '{"c":"256","e":"12"}'},
        ),
        api_response=ApiResponseRecord(
            status_code=200,
            headers={"content-type": "application/json"},
            body={"s": [{"src": "https://example.com/12.mp4", "type": "video/mp4"}]},
            cookies={"e": "123", "p": "jwt", "h": "hash"},
        ),
        stream_verification=StreamVerificationResult(
            stream_url="https://example.com/12.mp4",
            is_success=True,
            status_code=206,
            content_type="video/mp4",
            content_range="bytes 0-1024/100000",
            content_length=1025,
            latency_ms=120.5,
        ),
    )

    article = ArticleRecord(
        post_id="post-4711",
        title="搖曳露營△ [12]",
        updated_at=datetime(2018, 3, 23, 4, 17, 10),
        article_url="https://anime1.me/4711",
        players=[player],
    )

    record = ExecutionRunRecord(
        metadata=ExecutionMetadata(
            execution_timestamp=datetime(2026, 9, 6, 20, 25, 10),
            target_url="https://anime1.me/4711",
            fetcher_mode="auto",
            total_articles=1,
            total_players=1,
            verified_streams=1,
            failed_streams=0,
        ),
        articles=[article],
    )

    saved_path = recorder.save_run_record(record)
    assert saved_path.exists()
    assert saved_path.name == "20260906_202510_verifier.json"

    # Read back and strictly assert that data_apireq is a JSON Object (dict), NOT string!
    raw_content = saved_path.read_text(encoding="utf-8")
    parsed_json = json.loads(raw_content)

    assert "metadata" in parsed_json
    assert parsed_json["metadata"]["total_players"] == 1

    first_article = parsed_json["articles"][0]
    assert first_article["title"] == "搖曳露營△ [12]"
    assert first_article["post_id"] == "post-4711"

    first_player = first_article["players"][0]
    # CRITICAL: Verify data_apireq is dict/JSON object, not string!
    data_apireq = first_player["data_apireq"]
    assert isinstance(data_apireq, dict), f"Expected dict, got {type(data_apireq)}"
    assert data_apireq["c"] == "256"
    assert data_apireq["e"] == "12"
    assert data_apireq["p"] == 5
    assert data_apireq["s"] == "1673b171dcb842caffc6123773f8366e"

    # Verify api_request and api_response
    assert first_player["api_request"]["method"] == "POST"
    assert first_player["api_response"]["status_code"] == 200
    assert first_player["api_response"]["cookies"]["h"] == "hash"
    assert first_player["stream_verification"]["status_code"] == 206
