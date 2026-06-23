import json

import pytest

from llm import extract_json, resolve_base_url, _content_from_response


def test_extract_json_plain():
    assert extract_json('{"a": 1}') == {"a": 1}


def test_extract_json_strips_think_tags():
    raw = '<think>reasoning {ignored}</think>\n{"clips": [{"id": 0}]}'
    assert extract_json(raw) == {"clips": [{"id": 0}]}


def test_extract_json_strips_code_fence():
    raw = '```json\n{"ok": true}\n```'
    assert extract_json(raw) == {"ok": True}


def test_extract_json_trailing_data():
    # Object followed by extra junk (e.g. SSE "data: [DONE]" leftovers).
    raw = '{"caption": "hi"}\nsome trailing text'
    assert extract_json(raw) == {"caption": "hi"}


def test_extract_json_repairs_literal_newline_in_string():
    # Models sometimes emit raw newlines inside string values (invalid JSON).
    raw = '{"caption": "line1\nline2", "tags": ["#a"]}'
    parsed = extract_json(raw)
    assert parsed["caption"] == "line1\nline2"
    assert parsed["tags"] == ["#a"]


def test_extract_json_repairs_tab_and_cr():
    raw = '{"v": "a\tb\rc"}'
    assert extract_json(raw) == {"v": "a\tb\rc"}


def test_content_from_response_plain_json():
    body = json.dumps({"choices": [{"message": {"content": "hello"}}]})
    assert _content_from_response(body) == "hello"


def test_content_from_response_sse_stream():
    inner = json.dumps({"choices": [{"message": {"content": "streamed"}}]})
    body = f"data: {inner}\ndata: [DONE]\n\n"
    assert _content_from_response(body) == "streamed"


def test_content_from_response_invalid_raises():
    with pytest.raises(ValueError):
        _content_from_response("not json at all")


def test_resolve_base_url_no_docker(monkeypatch):
    monkeypatch.delenv("IN_DOCKER", raising=False)
    assert resolve_base_url("http://localhost:20128/v1") == "http://localhost:20128/v1"


def test_resolve_base_url_in_docker(monkeypatch):
    monkeypatch.setenv("IN_DOCKER", "1")
    assert resolve_base_url("http://localhost:20128/v1") == "http://host.docker.internal:20128/v1"
    assert resolve_base_url("http://127.0.0.1:20128/v1") == "http://host.docker.internal:20128/v1"
