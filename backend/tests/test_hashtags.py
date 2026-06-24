from clipper import _normalize_hashtag


def test_normalize_adds_hash():
    assert _normalize_hashtag("clipforge") == "#clipforge"


def test_normalize_keeps_existing_hash():
    assert _normalize_hashtag("#viral") == "#viral"


def test_normalize_strips_whitespace():
    assert _normalize_hashtag("  fyp  ") == "#fyp"


def test_normalize_empty():
    assert _normalize_hashtag("") == ""
    assert _normalize_hashtag("#") == ""


def test_normalize_double_hash():
    # Leading '#' chars are stripped before re-adding exactly one.
    assert _normalize_hashtag("##tag") == "#tag"
