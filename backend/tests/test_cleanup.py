import tempfile
from pathlib import Path

from clipper import cleanup_intermediate, prepare_uploaded_source


def test_cleanup_removes_source_and_audio_keeps_clips():
    work = Path(tempfile.mkdtemp())
    (work / "source.mp4").write_bytes(b"x" * 100)
    (work / "audio_1800s.wav").write_bytes(b"y" * 100)
    (work / "transcript.json").write_text("[]")
    (work / "clips").mkdir()
    (work / "clips" / "clip_01.mp4").write_bytes(b"z" * 10)

    cleanup_intermediate(work, work / "source.mp4")

    names = {p.name for p in work.iterdir()}
    assert "source.mp4" not in names
    assert "audio_1800s.wav" not in names
    assert "transcript.json" in names
    assert "clips" in names
    assert (work / "clips" / "clip_01.mp4").exists()


def test_prepare_uploaded_source_does_not_copy():
    upload = Path(tempfile.mkdtemp()) / "video.mp4"
    upload.write_bytes(b"u" * 100)
    work = Path(tempfile.mkdtemp())

    returned, meta = prepare_uploaded_source(upload, work)

    # The upload is read in place, not duplicated into the work dir.
    assert returned == upload
    assert list(work.iterdir()) == []
    assert meta["ext"] == "mp4"


def test_cleanup_does_not_delete_external_upload():
    upload = Path(tempfile.mkdtemp()) / "video.mp4"
    upload.write_bytes(b"u" * 100)
    work = Path(tempfile.mkdtemp())

    # An uploaded source lives outside the work dir and must survive cleanup.
    cleanup_intermediate(work, upload)

    assert upload.exists()
