import os
import time
from datetime import datetime, timedelta, timezone

import api


def make_job(job_id: str, status: str, file_url: str | None, minutes_ago: int) -> api.DownloadJob:
    updated = (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat()
    return api.DownloadJob(
        id=job_id,
        status=status,
        request=api.DownloadRequest(url="https://youtu.be/x", media_type="video", resolution="360"),
        title="t",
        file_url=file_url,
        file_size=None,
        progress=None,
        logs=[],
        error=None,
        created_at=updated,
        updated_at=updated,
    )


def patch_globals(monkeypatch, tmp_path, registry):
    monkeypatch.setattr(api, "downloads", registry)
    monkeypatch.setattr(api, "DOWNLOADS_DIR", tmp_path / "downloads")
    monkeypatch.setattr(api, "DOWNLOADS_PATH", tmp_path / "downloads.json")
    monkeypatch.setattr(api, "OUTPUTS_DIR", tmp_path)


def test_cleanup_removes_stale_jobs_and_files(monkeypatch, tmp_path):
    downloads_dir = tmp_path / "downloads"
    downloads_dir.mkdir()
    old_file = downloads_dir / "old.mp4"
    old_file.write_bytes(b"x" * 10)
    fresh_file = downloads_dir / "fresh.mp4"
    fresh_file.write_bytes(b"y" * 10)

    registry = {
        "old": make_job("old", "completed", "/outputs/downloads/old.mp4", 60),
        "fresh": make_job("fresh", "completed", "/outputs/downloads/fresh.mp4", 1),
    }
    patch_globals(monkeypatch, tmp_path, registry)

    api.cleanup_stale_downloads()

    assert "old" not in api.downloads
    assert "fresh" in api.downloads
    assert not old_file.exists()
    assert fresh_file.exists()


def test_cleanup_keeps_running_jobs(monkeypatch, tmp_path):
    downloads_dir = tmp_path / "downloads"
    downloads_dir.mkdir()
    running_file = downloads_dir / "running.mp4.part"
    running_file.write_bytes(b"r" * 10)

    registry = {"running": make_job("running", "running", None, 60)}
    patch_globals(monkeypatch, tmp_path, registry)

    api.cleanup_stale_downloads()

    assert "running" in api.downloads
    assert running_file.exists()


def test_cleanup_sweeps_orphan_files(monkeypatch, tmp_path):
    downloads_dir = tmp_path / "downloads"
    downloads_dir.mkdir()
    orphan = downloads_dir / "leftover.mp4.part"
    orphan.write_bytes(b"p" * 10)
    old_time = time.time() - 3600
    os.utime(orphan, (old_time, old_time))

    patch_globals(monkeypatch, tmp_path, {})

    api.cleanup_stale_downloads()

    assert not orphan.exists()
