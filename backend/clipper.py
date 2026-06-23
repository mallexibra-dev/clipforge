from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable, Literal

import imageio_ffmpeg
from rich.console import Console
from rich.table import Table
from slugify import slugify
from yt_dlp import YoutubeDL

from llm import AIConfig, chat_completion, extract_json


console = Console()


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str


@dataclass
class ClipCandidate:
    index: int
    start: float
    end: float
    duration: float
    score: int
    title: str
    reason: str
    text: str


HOOK_WORDS = {
    "intinya",
    "ternyata",
    "masalahnya",
    "kenapa",
    "gimana",
    "bagaimana",
    "cara",
    "jangan",
    "harus",
    "penting",
    "rahasia",
    "bedanya",
    "salah",
    "benar",
    "tips",
    "trik",
    "jadi",
    "kalau",
    "misalnya",
}

WEAK_STARTS = {
    "dan",
    "terus",
    "lalu",
    "nah",
    "jadi",
    "itu",
    "ini",
    "em",
    "eh",
    "ya",
}

CropMode = Literal["center", "person", "streamer"]
YUNET_MODEL_PATH = Path(__file__).resolve().parent / "models" / "face_detection_yunet_2023mar.onnx"

TRANSCRIPT_REPLACEMENTS = {
    r"\binkam\b": "income",
    r"\bin kam\b": "income",
    r"\bcoin mass\b": "coin emas",
    r"\bkoin mass\b": "koin emas",
    r"\bfiat namis\b": "Vietnamese",
    r"\bfilipin\b": "Filipina",
    r"\bsilvernya\b": "silver-nya",
    r"\bdolarnya\b": "dolar-nya",
    r"\bsoftware- and wealth\b": "sovereign wealth",
    r"\bsoftware and wealth\b": "sovereign wealth",
    r"\bterperakap\b": "terperangkap",
    r"\bhana kan\b": "menggunakan",
    r"\bpengatahuan\b": "pengetahuan",
    r"\bbarang-barang\b": "bareng-bareng",
    r"\bdimasa\b": "di masa",
    r"\bribuk\b": "ribu",
    r"\bseraksud\b": "seratus",
    r"\bseris\b": "series",
    r"\bmelawangkan\b": "meluangkan",
    r"\bmenyerahanakan\b": "menyederhanakan",
}


def run(command: list[str], cwd: Path | None = None) -> None:
    process = subprocess.run(command, cwd=cwd, text=True)
    if process.returncode != 0:
        raise RuntimeError(f"Command failed with exit code {process.returncode}: {' '.join(command)}")


def ffmpeg_path() -> str:
    return imageio_ffmpeg.get_ffmpeg_exe()


def make_even(value: float, minimum: int) -> int:
    rounded = max(minimum, int(round(value)))
    return rounded if rounded % 2 == 0 else rounded + 1


def clamp_even(value: float, minimum: int, maximum: int) -> int:
    bounded = max(minimum, min(maximum, int(round(value))))
    if bounded % 2:
        bounded -= 1
    return max(minimum, min(maximum, bounded))


def detect_person_focus_x(video_path: Path, clip: ClipCandidate) -> tuple[float, tuple[int, int]] | None:
    try:
        import cv2
    except Exception as exc:
        console.print(f"[yellow]Person crop unavailable:[/yellow] {exc}")
        return None

    capture = cv2.VideoCapture(str(video_path.resolve()))
    if not capture.isOpened():
        return None

    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if width <= 0 or height <= 0:
        capture.release()
        return None

    duration = max(0.1, clip.end - clip.start)
    sample_count = min(12, max(4, int(duration // 8)))
    if sample_count == 1:
        offsets = [duration / 2]
    else:
        step = duration / (sample_count + 1)
        offsets = [step * (index + 1) for index in range(sample_count)]

    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
    face_cascade = cv2.CascadeClassifier(str(Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"))
    profile_cascade = cv2.CascadeClassifier(str(Path(cv2.data.haarcascades) / "haarcascade_profileface.xml"))
    yunet = None
    if YUNET_MODEL_PATH.exists() and hasattr(cv2, "FaceDetectorYN_create"):
        yunet = cv2.FaceDetectorYN_create(
            str(YUNET_MODEL_PATH),
            "",
            (320, 320),
            0.35,
            0.3,
            5000,
        )

    face_weighted_sum = 0.0
    face_total_weight = 0.0
    person_weighted_sum = 0.0
    person_total_weight = 0.0

    for offset in offsets:
        capture.set(cv2.CAP_PROP_POS_MSEC, (clip.start + offset) * 1000)
        ok, frame = capture.read()
        if not ok:
            continue

        resize_scale = min(1.0, 720 / max(frame.shape[:2]))
        if resize_scale < 1:
            resized = cv2.resize(frame, None, fx=resize_scale, fy=resize_scale, interpolation=cv2.INTER_AREA)
        else:
            resized = frame

        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        face_detections: list[tuple[float, float, float]] = []
        person_detections: list[tuple[float, float, float]] = []

        if yunet is not None:
            resized_height, resized_width = resized.shape[:2]
            yunet.setInputSize((resized_width, resized_height))
            _, faces = yunet.detect(resized)
            if faces is not None:
                for face in faces:
                    x, _, w, h = face[:4]
                    confidence = float(face[-1])
                    center_x = (x + w / 2) / resize_scale
                    face_detections.append((center_x, max(w, h) / resize_scale, confidence * 3.0))

        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(36, 36))
        for x, y, w, h in faces:
            center_x = (x + w / 2) / resize_scale
            face_detections.append((center_x, max(w, h) / resize_scale, 2.0))

        profiles = profile_cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4, minSize=(34, 34))
        for x, y, w, h in profiles:
            center_x = (x + w / 2) / resize_scale
            face_detections.append((center_x, max(w, h) / resize_scale, 1.8))

        flipped_gray = cv2.flip(gray, 1)
        flipped_profiles = profile_cascade.detectMultiScale(
            flipped_gray,
            scaleFactor=1.08,
            minNeighbors=4,
            minSize=(34, 34),
        )
        resized_width = resized.shape[1]
        for x, y, w, h in flipped_profiles:
            original_x = resized_width - x - w
            center_x = (original_x + w / 2) / resize_scale
            face_detections.append((center_x, max(w, h) / resize_scale, 1.8))

        people, weights = hog.detectMultiScale(
            resized,
            winStride=(8, 8),
            padding=(16, 16),
            scale=1.05,
        )
        for index, (x, _, w, _) in enumerate(people):
            confidence = float(weights[index]) if len(weights) > index else 1.0
            center_x = (x + w / 2) / resize_scale
            person_detections.append((center_x, w / resize_scale, max(0.25, confidence)))

        if face_detections:
            center_x, box_width, confidence = max(face_detections, key=lambda item: item[1] * item[2])
            weight = box_width * confidence
            face_weighted_sum += (center_x / width) * weight
            face_total_weight += weight
        elif person_detections:
            center_x, box_width, confidence = max(person_detections, key=lambda item: item[1] * item[2])
            weight = box_width * confidence
            person_weighted_sum += (center_x / width) * weight
            person_total_weight += weight

    capture.release()
    if face_total_weight > 0:
        return face_weighted_sum / face_total_weight, (width, height)
    if person_total_weight > 0:
        return person_weighted_sum / person_total_weight, (width, height)
    if face_total_weight <= 0 and person_total_weight <= 0:
        return None


def vertical_crop_filter(video_path: Path, clip: ClipCandidate, crop_mode: CropMode) -> str:
    center_filter = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"
    if crop_mode == "center":
        return center_filter

    focus = detect_person_focus_x(video_path, clip)
    if focus is None:
        console.print(f"[yellow]No person detected for clip {clip.index}; using center crop.[/yellow]")
        return center_filter

    focus_x, (source_width, source_height) = focus
    scale = max(1080 / source_width, 1920 / source_height)
    scaled_width = make_even(source_width * scale, 1080)
    scaled_height = make_even(source_height * scale, 1920)
    crop_x = clamp_even((focus_x * scaled_width) - 540, 0, scaled_width - 1080)
    crop_y = clamp_even((scaled_height - 1920) / 2, 0, scaled_height - 1920)
    console.print(f"[green]Person crop[/green] clip {clip.index}: focus x={focus_x:.2f}, crop x={crop_x}")
    return f"scale={scaled_width}:{scaled_height},crop=1080:1920:{crop_x}:{crop_y},setsar=1"


CamCorner = Literal["br", "bl", "tr", "tl"]
# Vertical canvas is 1080x1920: webcam panel on top, gameplay panel below.
STREAMER_CAM_HEIGHT = 640
STREAMER_GAME_HEIGHT = 1920 - STREAMER_CAM_HEIGHT  # 1280


def get_video_size(video_path: Path) -> tuple[int, int] | None:
    try:
        import cv2
    except Exception:
        return None
    capture = cv2.VideoCapture(str(video_path.resolve()))
    if not capture.isOpened():
        return None
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    capture.release()
    if width <= 0 or height <= 0:
        return None
    return width, height


def detect_webcam_corner(video_path: Path, clip: ClipCandidate) -> CamCorner | None:
    try:
        import cv2
    except Exception:
        return None

    size = get_video_size(video_path)
    if size is None:
        return None
    width, height = size

    capture = cv2.VideoCapture(str(video_path.resolve()))
    if not capture.isOpened():
        return None
    face_cascade = cv2.CascadeClassifier(str(Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"))

    duration = max(0.1, clip.end - clip.start)
    offsets = [duration * frac for frac in (0.2, 0.4, 0.6, 0.8)]
    # Webcam usually occupies ~a third of a corner; weigh faces by which corner they fall in.
    scores: dict[CamCorner, float] = {"br": 0.0, "bl": 0.0, "tr": 0.0, "tl": 0.0}

    for offset in offsets:
        capture.set(cv2.CAP_PROP_POS_MSEC, (clip.start + offset) * 1000)
        ok, frame = capture.read()
        if not ok:
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
        for x, y, w, h in faces:
            cx = x + w / 2
            cy = y + h / 2
            vertical = "b" if cy > height / 2 else "t"
            horizontal = "r" if cx > width / 2 else "l"
            corner: CamCorner = f"{vertical}{horizontal}"  # type: ignore[assignment]
            scores[corner] += float(w * h)

    capture.release()
    best = max(scores, key=lambda key: scores[key])
    if scores[best] <= 0:
        return None
    return best


def streamer_stack_filter(source_width: int, source_height: int, corner: CamCorner) -> str:
    cam_aspect = 1080 / STREAMER_CAM_HEIGHT
    game_aspect = 1080 / STREAMER_GAME_HEIGHT

    # Webcam crop box from the chosen corner, matched to the top panel aspect.
    cam_w = min(source_width * 0.32, source_height * 0.5 * cam_aspect)
    cam_h = cam_w / cam_aspect
    if cam_h > source_height * 0.5:
        cam_h = source_height * 0.5
        cam_w = cam_h * cam_aspect
    cam_w = clamp_even(cam_w, 16, source_width)
    cam_h = clamp_even(cam_h, 16, source_height)
    cam_x = 0 if corner in ("bl", "tl") else source_width - cam_w
    cam_y = 0 if corner in ("tr", "tl") else source_height - cam_h

    # Gameplay crop centered, matched to the bottom panel aspect.
    game_h = source_height
    game_w = game_h * game_aspect
    if game_w > source_width:
        game_w = source_width
        game_h = game_w / game_aspect
    game_w = clamp_even(game_w, 16, source_width)
    game_h = clamp_even(game_h, 16, source_height)
    game_x = clamp_even((source_width - game_w) / 2, 0, source_width - game_w)
    game_y = clamp_even((source_height - game_h) / 2, 0, source_height - game_h)

    return (
        "split=2[cam][game];"
        f"[cam]crop={cam_w}:{cam_h}:{cam_x}:{cam_y},"
        f"scale=1080:{STREAMER_CAM_HEIGHT}:force_original_aspect_ratio=increase,"
        f"crop=1080:{STREAMER_CAM_HEIGHT},setsar=1[ctop];"
        f"[game]crop={game_w}:{game_h}:{game_x}:{game_y},"
        f"scale=1080:{STREAMER_GAME_HEIGHT}:force_original_aspect_ratio=increase,"
        f"crop=1080:{STREAMER_GAME_HEIGHT},setsar=1[gbot];"
        "[ctop][gbot]vstack=inputs=2,setsar=1"
    )


def streamer_crop_filter(video_path: Path, clip: ClipCandidate, cam_corner: str) -> str:
    center_filter = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"
    size = get_video_size(video_path)
    if size is None:
        console.print(f"[yellow]Streamer layout unavailable for clip {clip.index}; using center crop.[/yellow]")
        return center_filter

    corner: CamCorner | None
    if cam_corner == "auto":
        corner = detect_webcam_corner(video_path, clip)
        if corner is None:
            console.print(f"[yellow]No webcam detected for clip {clip.index}; defaulting to bottom-right.[/yellow]")
            corner = "br"
    else:
        corner = cam_corner  # type: ignore[assignment]

    assert corner is not None
    console.print(f"[green]Streamer stack[/green] clip {clip.index}: cam corner={corner}")
    return streamer_stack_filter(size[0], size[1], corner)


def seconds_to_stamp(seconds: float, srt: bool = False) -> str:
    seconds = max(0, seconds)
    millis = int(round((seconds - math.floor(seconds)) * 1000))
    whole = int(math.floor(seconds))
    h = whole // 3600
    m = (whole % 3600) // 60
    s = whole % 60
    sep = "," if srt else "."
    return f"{h:02}:{m:02}:{s:02}{sep}{millis:03}"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def clean_transcript_text(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = cleaned.replace(" ,", ",").replace(" .", ".").replace(" ?", "?").replace(" !", "!")
    for pattern, replacement in TRANSCRIPT_REPLACEMENTS.items():
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def fetch_metadata(url: str) -> dict:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }
    with YoutubeDL(ydl_opts) as ydl:
        return sanitize_metadata(ydl.extract_info(url, download=False))


def download_video(url: str, work_dir: Path, force: bool = False) -> tuple[Path, dict]:
    info_path = work_dir / "metadata.json"
    existing = sorted(work_dir.glob("source.*"))
    if existing and info_path.exists() and not force:
        return existing[0], load_json(info_path)

    ydl_opts = {
        "format": (
            "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/"
            "bestvideo[height<=1080]+bestaudio/"
            "best[height<=1080]/best"
        ),
        "outtmpl": str(work_dir / "source.%(ext)s"),
        "merge_output_format": "mp4",
        "noplaylist": True,
        "quiet": True,
        "noprogress": True,
        "no_warnings": True,
        "ffmpeg_location": ffmpeg_path(),
    }

    work_dir.mkdir(parents=True, exist_ok=True)
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        file_path = Path(ydl.prepare_filename(info))

    if not file_path.exists():
        downloaded = sorted(work_dir.glob("source.*"))
        if not downloaded:
            raise FileNotFoundError("Downloaded video was not found.")
        file_path = downloaded[0]

    save_json(info_path, sanitize_metadata(info))
    return file_path, sanitize_metadata(info)


def sanitize_metadata(info: dict) -> dict:
    keys = ["id", "title", "uploader", "duration", "webpage_url", "ext"]
    return {key: info.get(key) for key in keys}


def extract_audio(video_path: Path, audio_path: Path, force: bool = False, limit_seconds: float | None = None) -> Path:
    if audio_path.exists() and not force:
        return audio_path

    audio_path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        ffmpeg_path(),
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(video_path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
    ]
    if limit_seconds:
        command.extend(["-t", f"{limit_seconds:.3f}"])
    command.append(str(audio_path))
    run(command)
    return audio_path


def transcribe(audio_path: Path, transcript_path: Path, model_name: str, language: str, force: bool = False) -> list[TranscriptSegment]:
    if transcript_path.exists() and not force:
        return [
            TranscriptSegment(
                start=float(item["start"]),
                end=float(item["end"]),
                text=clean_transcript_text(item["text"]),
            )
            for item in load_json(transcript_path)
        ]

    from faster_whisper import WhisperModel

    console.print(f"[bold]Loading model:[/bold] {model_name}")
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        str(audio_path),
        language=language,
        vad_filter=True,
        beam_size=1,
        best_of=1,
    )

    rows: list[TranscriptSegment] = []
    for segment in segments:
        text = clean_transcript_text(segment.text)
        if text:
            rows.append(TranscriptSegment(float(segment.start), float(segment.end), text))

    save_json(transcript_path, [asdict(item) for item in rows])
    console.print(f"[green]Transcribed[/green] {len(rows)} segments. Detected language: {getattr(info, 'language', language)}")
    return rows


def first_sentence(text: str, max_words: int = 8) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip(" .,!?:;-")
    words = cleaned.split()
    return " ".join(words[:max_words]).capitalize() or "Auto clip"


def score_window(items: list[TranscriptSegment], duration: float) -> tuple[int, list[str]]:
    text = " ".join(item.text for item in items)
    words = re.findall(r"[\w']+", text.lower())
    first_word = words[0] if words else ""
    hook_hits = sorted(HOOK_WORDS.intersection(words))

    score = 35
    reasons: list[str] = []

    if 45 <= duration <= 120:
        score += 18
        reasons.append("durasi pas")
    elif 35 <= duration <= 180:
        score += 12
        reasons.append("durasi masih oke")

    if hook_hits:
        bump = min(24, len(hook_hits) * 6)
        score += bump
        reasons.append("ada keyword hook: " + ", ".join(hook_hits[:4]))

    word_count = len(words)
    density = word_count / max(duration, 1)
    if density >= 1.8:
        score += 12
        reasons.append("speech padat")
    elif density >= 1.1:
        score += 6
        reasons.append("speech cukup padat")

    if text.rstrip().endswith((".", "!", "?")):
        score += 5
        reasons.append("ending terasa selesai")

    if first_word in WEAK_STARTS:
        score -= 10
        reasons.append("awal agak menggantung")

    if word_count < 55:
        score -= 12
        reasons.append("terlalu sedikit konteks")

    return max(1, min(100, score)), reasons


def build_candidate_pool(
    segments: list[TranscriptSegment],
    min_duration: float,
    max_duration: float,
) -> list[ClipCandidate]:
    candidates: list[ClipCandidate] = []
    if not segments:
        return candidates

    for start_idx, first in enumerate(segments):
        window: list[TranscriptSegment] = []
        for item in segments[start_idx:]:
            window.append(item)
            duration = window[-1].end - first.start
            if duration < min_duration:
                continue
            if duration > max_duration:
                break

            text = " ".join(part.text for part in window)
            score, reasons = score_window(window, duration)
            candidates.append(
                ClipCandidate(
                    index=0,
                    start=max(0, first.start - 0.35),
                    end=window[-1].end + 0.25,
                    duration=duration,
                    score=score,
                    title=first_sentence(text),
                    reason=", ".join(reasons) or "segmen stabil",
                    text=text,
                )
            )
    return candidates


def select_candidates(candidates: list[ClipCandidate], limit: int) -> list[ClipCandidate]:
    candidates = candidates[:]
    candidates.sort(key=lambda item: (item.score - abs(item.duration - 85) * 0.04), reverse=True)
    picked: list[ClipCandidate] = []
    remaining = candidates[:]
    while remaining and len(picked) < limit:
        best: ClipCandidate | None = None
        best_adjusted = -1_000.0
        for candidate in remaining:
            overlaps = any(not (candidate.end < item.start or candidate.start > item.end) for item in picked)
            if overlaps:
                continue
            duration_similarity = min((abs(candidate.duration - item.duration) for item in picked), default=999)
            diversity_bonus = 8 if duration_similarity > 18 else 0
            adjusted = candidate.score - abs(candidate.duration - 85) * 0.04 + diversity_bonus
            if adjusted > best_adjusted:
                best = candidate
                best_adjusted = adjusted

        if best is None:
            break
        best.index = len(picked) + 1
        picked.append(best)
        remaining.remove(best)

    picked.sort(key=lambda item: item.start)
    for idx, candidate in enumerate(picked, start=1):
        candidate.index = idx
    return picked


AI_RESCORE_POOL_LIMIT = 40
AI_SYSTEM_PROMPT = (
    "You are an expert short-form video editor for TikTok, Reels, and YouTube Shorts. "
    "You are given candidate transcript windows from a longer video. "
    "Judge each candidate on how powerful it would be as a standalone vertical clip: "
    "strong hook, emotional or surprising payoff, self-contained meaning, and clear value. "
    "Return ONLY strict JSON, no markdown, no prose."
)


def ai_rescore_candidates(candidates: list[ClipCandidate], config: AIConfig) -> list[ClipCandidate]:
    if not config.enabled or not candidates:
        return candidates
    if not config.base_url or not config.model:
        console.print("[yellow]AI agent skipped:[/yellow] base_url/model not set.")
        return candidates

    pool = sorted(candidates, key=lambda item: item.score, reverse=True)[:AI_RESCORE_POOL_LIMIT]
    items = [
        {
            "id": idx,
            "start": round(candidate.start, 1),
            "end": round(candidate.end, 1),
            "duration": round(candidate.duration, 1),
            "heuristic_score": candidate.score,
            "text": candidate.text[:1200],
        }
        for idx, candidate in enumerate(pool)
    ]
    user_prompt = (
        "Score each candidate from 0-100 on standalone clip potential.\n"
        "Respond with JSON shaped exactly like:\n"
        '{"clips": [{"id": <int>, "score": <int 0-100>, '
        '"title": "<catchy hook title, max 8 words>", '
        '"reason": "<short why this clip works>"}]}\n\n'
        "Candidates:\n" + json.dumps(items, ensure_ascii=False)
    )

    try:
        console.print(f"[bold]AI agent scoring[/bold] {len(pool)} candidates via {config.model}...")
        content = chat_completion(
            config,
            [
                {"role": "system", "content": AI_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        parsed = extract_json(content)
    except Exception as exc:
        console.print(f"[yellow]AI agent failed, using heuristic scores:[/yellow] {exc}")
        return candidates

    scored = parsed.get("clips") if isinstance(parsed, dict) else None
    if not isinstance(scored, list):
        console.print("[yellow]AI agent returned no usable clips; keeping heuristic scores.[/yellow]")
        return candidates

    applied = 0
    for entry in scored:
        if not isinstance(entry, dict):
            continue
        cid = entry.get("id")
        if not isinstance(cid, int) or cid < 0 or cid >= len(pool):
            continue
        candidate = pool[cid]
        ai_score = entry.get("score")
        if isinstance(ai_score, (int, float)):
            candidate.score = max(1, min(100, int(round(ai_score))))
        title = entry.get("title")
        if isinstance(title, str) and title.strip():
            candidate.title = title.strip()[:80]
        reason = entry.get("reason")
        if isinstance(reason, str) and reason.strip():
            candidate.reason = "AI: " + reason.strip()[:160]
        applied += 1

    console.print(f"[green]AI agent rescored[/green] {applied} candidates.")
    return candidates


def segments_for_clip(segments: Iterable[TranscriptSegment], clip: ClipCandidate) -> list[TranscriptSegment]:
    return [item for item in segments if item.end > clip.start and item.start < clip.end]


def wrap_subtitle(text: str, max_chars: int = 32, max_lines: int = 2) -> str:
    chunks = split_subtitle_text(text, max_chars=max_chars, max_lines=max_lines)
    return chunks[0] if chunks else ""


def split_subtitle_text(text: str, max_chars: int = 32, max_lines: int = 2) -> list[str]:
    words = text.split()
    chunks: list[str] = []
    lines: list[str] = []
    current: list[str] = []

    for word in words:
        candidate = " ".join([*current, word]).strip()
        if current and len(candidate) > max_chars:
            lines.append(" ".join(current))
            current = [word]
            if len(lines) == max_lines:
                chunks.append("\n".join(lines))
                lines = []
        else:
            current.append(word)

    if current and len(lines) < max_lines:
        lines.append(" ".join(current))
    if lines:
        chunks.append("\n".join(lines))

    return chunks


def write_srt(path: Path, segments: list[TranscriptSegment], offset: float, clip_duration: float) -> None:
    lines: list[str] = []
    cue_index = 1
    for item in segments:
        start = max(0, item.start - offset)
        end = min(clip_duration, max(start + 0.2, item.end - offset))
        if start >= clip_duration or end - start < 0.45:
            continue

        chunks = split_subtitle_text(item.text)
        chunk_duration = (end - start) / max(1, len(chunks))
        for chunk_idx, chunk in enumerate(chunks):
            chunk_start = start + chunk_duration * chunk_idx
            chunk_end = end if chunk_idx == len(chunks) - 1 else start + chunk_duration * (chunk_idx + 1)
            lines.extend(
                [
                    str(cue_index),
                    f"{seconds_to_stamp(chunk_start, srt=True)} --> {seconds_to_stamp(chunk_end, srt=True)}",
                    chunk,
                    "",
                ]
            )
            cue_index += 1
    path.write_text("\n".join(lines), encoding="utf-8")


CaptionPosition = Literal["center", "bottom"]


# Fonts installed in the backend container (see Dockerfile). Map the FE choice
# to a real installed family name; anything else falls back to the default.
AVAILABLE_FONTS = {
    "DejaVu Sans": "DejaVu Sans",
    "DejaVu Serif": "DejaVu Serif",
    "Liberation Sans": "Liberation Sans",
    "Liberation Serif": "Liberation Serif",
    "Noto Sans": "Noto Sans",
}
DEFAULT_FONT = "DejaVu Sans"


@dataclass
class CaptionStyle:
    font_size: int = 30
    position: CaptionPosition = "center"
    color: str = "#FFFFFF"
    font_family: str = DEFAULT_FONT
    outline_width: float = 2.0
    outline_color: str = "#000000"


def _hex_to_ass_color(hex_color: str) -> str:
    value = hex_color.strip().lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if len(value) != 6:
        return "&H00FFFFFF"
    red, green, blue = value[0:2], value[2:4], value[4:6]
    # ASS uses &HAABBGGRR (alpha first, then BGR).
    return f"&H00{blue}{green}{red}".upper()


def build_subtitle_style(caption: CaptionStyle) -> str:
    font_size = max(6, min(120, caption.font_size))
    primary = _hex_to_ass_color(caption.color)
    outline_color = _hex_to_ass_color(caption.outline_color)
    outline = max(0.0, min(8.0, caption.outline_width))
    font_name = AVAILABLE_FONTS.get(caption.font_family, DEFAULT_FONT)
    if caption.position == "bottom":
        alignment = 2
        margin_v = 90
    else:
        alignment = 5
        margin_v = 0
    return (
        f"FontName={font_name},FontSize={font_size},Bold=1,PrimaryColour={primary},"
        f"OutlineColour={outline_color},BorderStyle=1,Outline={outline},Shadow=1,"
        f"Alignment={alignment},MarginL=60,MarginR=60,MarginV={margin_v}"
    )


THUMBNAIL_SYSTEM_PROMPT = (
    "You write prompts for an AI image generator that will ONLY add a text overlay onto a "
    "provided screenshot. The screenshot is the thumbnail background and must NOT be redrawn, "
    "restyled, or replaced. Reply ONLY with strict JSON, no markdown."
)


def grab_best_frame(video_path: Path, clip: ClipCandidate, thumb_path: Path) -> Path | None:
    # Best moment heuristic: sample the clip's middle, where the payoff usually lands.
    timestamp = clip.start + max(0.0, (clip.end - clip.start) * 0.5)
    thumb_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        run(
            [
                ffmpeg_path(),
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-ss",
                f"{timestamp:.3f}",
                "-i",
                str(video_path.resolve()),
                "-frames:v",
                "1",
                "-q:v",
                "3",
                str(thumb_path.name),
            ],
            cwd=thumb_path.parent,
        )
    except RuntimeError as exc:
        console.print(f"[yellow]Thumbnail frame failed for clip {clip.index}:[/yellow] {exc}")
        return None
    return thumb_path if thumb_path.exists() else None


def generate_thumbnail_prompt(clip: ClipCandidate, config: AIConfig) -> dict | None:
    fallback_hook = first_sentence(clip.title, max_words=6).upper()
    if not config.enabled or not config.base_url or not config.model:
        return {
            "hook_text": fallback_hook,
            "prompt": (
                f'Add a bold short-form video thumbnail text overlay reading "{fallback_hook}" '
                "onto the provided screenshot. Keep the screenshot itself untouched as the background. "
                "Place large high-contrast bold text (white fill, thick dark outline) in the upper third, "
                "do not cover faces, do not redraw or restyle the background image."
            ),
        }

    user_prompt = (
        "Create a viral thumbnail text overlay plan for this clip. The user already has a screenshot "
        "(the best moment) and will feed it plus your prompt to an image generator that only writes text.\n"
        "Return JSON exactly like:\n"
        '{"hook_text": "<3-6 word punchy hook, ALL CAPS>", '
        '"prompt": "<instruction for the image generator: what text to write, where to place it, '
        'style (bold, high contrast, outline), and an explicit rule to keep the screenshot background '
        'unchanged and not cover key subjects>"}\n\n'
        f"Clip title: {clip.title}\n"
        f"Clip transcript: {clip.text[:1000]}"
    )
    try:
        content = chat_completion(
            config,
            [
                {"role": "system", "content": THUMBNAIL_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        parsed = extract_json(content)
    except Exception as exc:
        console.print(f"[yellow]Thumbnail prompt failed for clip {clip.index}, using fallback:[/yellow] {exc}")
        return {
            "hook_text": fallback_hook,
            "prompt": (
                f'Add a bold thumbnail text overlay reading "{fallback_hook}" onto the provided '
                "screenshot, keeping the screenshot background unchanged."
            ),
        }

    if not isinstance(parsed, dict):
        return None
    hook = parsed.get("hook_text")
    prompt = parsed.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        return None
    return {
        "hook_text": (hook if isinstance(hook, str) and hook.strip() else fallback_hook).strip()[:80],
        "prompt": prompt.strip()[:1500],
    }


SOCIAL_CAPTION_SYSTEM_PROMPT = (
    "You are a viral social media copywriter for TikTok, Instagram Reels, and YouTube Shorts. "
    "You write short, scroll-stopping captions in Indonesian that make people want to watch and read. "
    "Open with a strong hook, keep it punchy, add a soft call-to-action, a few relevant emojis, "
    "and 5-8 niche hashtags. Reply ONLY with strict JSON, no markdown."
)


def generate_social_caption(clip: ClipCandidate, config: AIConfig) -> str | None:
    if not config.enabled or not config.base_url or not config.model:
        return None

    user_prompt = (
        "Write a social media post caption (Bahasa Indonesia) for this short clip. "
        "Make the first line a hook that stops the scroll and makes people curious to read more.\n"
        "Return JSON exactly like:\n"
        '{"caption": "<hook line\\n\\nbody 1-2 sentences with emojis\\n\\nsoft CTA>", '
        '"hashtags": ["#tag1", "#tag2", ...]}\n\n'
        f"Clip title: {clip.title}\n"
        f"Clip transcript: {clip.text[:1200]}"
    )
    try:
        content = chat_completion(
            config,
            [
                {"role": "system", "content": SOCIAL_CAPTION_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        parsed = extract_json(content)
    except Exception as exc:
        console.print(f"[yellow]Social caption failed for clip {clip.index}:[/yellow] {exc}")
        return None

    if not isinstance(parsed, dict):
        return None
    caption = parsed.get("caption")
    if not isinstance(caption, str) or not caption.strip():
        return None
    text = caption.strip()
    hashtags = parsed.get("hashtags")
    if isinstance(hashtags, list):
        tags = " ".join(
            tag.strip() if str(tag).startswith("#") else f"#{str(tag).strip()}"
            for tag in hashtags
            if str(tag).strip()
        )
        if tags:
            text = f"{text}\n\n{tags}"
    return text[:2000]


def export_clip(
    video_path: Path,
    clip: ClipCandidate,
    clip_segments: list[TranscriptSegment],
    clips_dir: Path,
    burn_subtitles: bool,
    crop_mode: CropMode,
    caption: CaptionStyle | None = None,
    ai_config: AIConfig | None = None,
    cam_corner: str = "auto",
) -> Path:
    clips_dir.mkdir(parents=True, exist_ok=True)
    base_name = f"clip_{clip.index:02}_{slugify(clip.title)[:42] or 'auto'}"
    srt_path = clips_dir / f"{base_name}.srt"
    json_path = clips_dir / f"{base_name}.json"
    out_path = clips_dir / f"{base_name}.mp4"
    temp_video_path = clips_dir / f"{base_name}.video_tmp.mp4"
    temp_audio_path = clips_dir / f"{base_name}.audio_tmp.wav"

    duration = clip.end - clip.start
    write_srt(srt_path, clip_segments, clip.start, duration)
    save_json(json_path, asdict(clip))

    if crop_mode == "streamer":
        vf = streamer_crop_filter(video_path, clip, cam_corner)
    else:
        vf = vertical_crop_filter(video_path, clip, crop_mode)
    if burn_subtitles and clip_segments:
        style = build_subtitle_style(caption or CaptionStyle())
        vf = (
            f"{vf},subtitles='{srt_path.name}'"
            ":original_size=1080x1920"
            f":force_style='{style}'"
        )

    common_input = [
        ffmpeg_path(),
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        f"{clip.start:.3f}",
        "-t",
        f"{duration:.3f}",
        "-i",
        str(video_path.resolve()),
    ]

    run(
        [
            *common_input,
            "-map",
            "0:v:0",
            "-an",
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-profile:v",
            "baseline",
            "-level",
            "4.0",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            str(temp_video_path.name),
        ],
        cwd=clips_dir,
    )
    run(
        [
            *common_input,
            "-map",
            "0:a:0?",
            "-vn",
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000",
            "-ac",
            "2",
            "-ar",
            "48000",
            "-c:a",
            "pcm_s16le",
            str(temp_audio_path.name),
        ],
        cwd=clips_dir,
    )
    run(
        [
            ffmpeg_path(),
            "-hide_banner",
            "-loglevel",
            "error",
            "-fflags",
            "+genpts",
            "-y",
            "-i",
            str(temp_video_path.name),
            "-i",
            str(temp_audio_path.name),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-profile:a",
            "aac_low",
            "-b:a",
            "160k",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-disposition:a:0",
            "default",
            "-shortest",
            "-brand",
            "mp42",
            "-tag:v",
            "avc1",
            "-tag:a",
            "mp4a",
            "-movflags",
            "+faststart",
            str(out_path.name),
        ],
        cwd=clips_dir,
    )
    temp_video_path.unlink(missing_ok=True)

    thumb_path = clips_dir / f"{base_name}_thumb.jpg"
    prompt_path = clips_dir / f"{base_name}_thumb.txt"
    if grab_best_frame(video_path, clip, thumb_path) is not None:
        thumb_prompt = generate_thumbnail_prompt(clip, ai_config or AIConfig())
        if thumb_prompt:
            prompt_path.write_text(
                f"HOOK: {thumb_prompt['hook_text']}\n\n{thumb_prompt['prompt']}\n",
                encoding="utf-8",
            )

    social_caption = generate_social_caption(clip, ai_config or AIConfig())
    if social_caption:
        (clips_dir / f"{base_name}_caption.txt").write_text(social_caption + "\n", encoding="utf-8")

    return out_path


def print_candidates(candidates: list[ClipCandidate]) -> None:
    table = Table(title="Clip candidates")
    table.add_column("#", justify="right")
    table.add_column("Start")
    table.add_column("End")
    table.add_column("Score", justify="right")
    table.add_column("Title")
    table.add_column("Reason")

    for item in candidates:
        table.add_row(
            str(item.index),
            seconds_to_stamp(item.start),
            seconds_to_stamp(item.end),
            str(item.score),
            item.title,
            item.reason,
        )
    console.print(table)


def prepare_uploaded_source(source_file: Path, work_dir: Path) -> tuple[Path, dict]:
    if not source_file.exists():
        raise FileNotFoundError(f"Uploaded source not found: {source_file}")

    work_dir.mkdir(parents=True, exist_ok=True)
    suffix = source_file.suffix or ".mp4"
    target = work_dir / f"source{suffix}"
    if source_file.resolve() != target.resolve():
        import shutil

        shutil.copy2(source_file, target)

    metadata = {
        "id": source_file.stem,
        "title": source_file.stem,
        "uploader": None,
        "duration": None,
        "webpage_url": None,
        "ext": suffix.lstrip("."),
    }
    return target, metadata


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local YouTube auto clipper for short vertical videos.")
    parser.add_argument("url", nargs="?", default="", help="YouTube URL")
    parser.add_argument("--source-file", default="", help="Use a local video file instead of downloading from a URL")
    parser.add_argument("--top", type=int, default=5, help="Number of clips to export")
    parser.add_argument("--min", type=float, default=35, help="Minimum clip duration in seconds")
    parser.add_argument("--max", type=float, default=180, help="Maximum clip duration in seconds")
    parser.add_argument("--model", default="Systran/faster-whisper-small", help="faster-whisper model name")
    parser.add_argument("--language", default="id", help="Transcription language code")
    parser.add_argument("--output", default="outputs", help="Output directory")
    parser.add_argument("--analyze-seconds", type=float, help="Only transcribe the first N seconds; useful for quick tests")
    parser.add_argument("--review-only", action="store_true", help="Stop after generating clip candidates")
    parser.add_argument("--export-indexes", help="Comma-separated candidate indexes to export, e.g. 1,3,5")
    parser.add_argument("--no-burn-subtitles", action="store_true", help="Create SRT files but do not burn subtitles into MP4")
    parser.add_argument(
        "--crop-mode",
        choices=["center", "person", "streamer"],
        default="center",
        help="center, person-focused, or streamer (webcam stacked over gameplay)",
    )
    parser.add_argument(
        "--cam-corner",
        choices=["auto", "br", "bl", "tr", "tl"],
        default="auto",
        help="Webcam corner in the source for streamer mode (auto-detect by default)",
    )
    parser.add_argument("--force", action="store_true", help="Redo download, audio extraction, and transcription")
    parser.add_argument("--ai-enabled", action="store_true", help="Use an LLM agent to rescore clip candidates")
    parser.add_argument("--ai-base-url", default="", help="OpenAI-compatible base URL, e.g. http://localhost:20128/v1")
    parser.add_argument("--ai-model", default="", help="LLM model name for the clip agent")
    parser.add_argument("--ai-api-key", default="", help="API key for the LLM endpoint")
    parser.add_argument("--caption-font-size", type=int, default=30, help="Burned caption font size (10-120)")
    parser.add_argument(
        "--caption-position",
        choices=["center", "bottom"],
        default="center",
        help="Burned caption vertical position",
    )
    parser.add_argument("--caption-color", default="#FFFFFF", help="Burned caption text color, hex e.g. #FFFFFF")
    parser.add_argument("--caption-font", default=DEFAULT_FONT, help="Burned caption font family")
    parser.add_argument("--caption-outline", type=float, default=2.0, help="Caption border/outline width (0-8)")
    parser.add_argument("--caption-outline-color", default="#000000", help="Caption border color, hex")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.min <= 0 or args.max <= args.min:
        console.print("[red]Invalid duration range.[/red]")
        return 2

    if not args.url and not args.source_file:
        console.print("[red]Provide a YouTube URL or --source-file.[/red]")
        return 2

    root = Path(args.output)
    root.mkdir(parents=True, exist_ok=True)

    if args.source_file:
        source_file = Path(args.source_file)
        title = source_file.stem or "uploaded-video"
        work_dir = root / slugify(title)[:80]
        console.print("[bold]Using uploaded video...[/bold]")
        final_video_path, metadata = prepare_uploaded_source(source_file, work_dir)
    else:
        console.print("[bold]Fetching metadata...[/bold]")
        metadata = fetch_metadata(args.url)
        title = metadata.get("title") or metadata.get("id") or "youtube-video"
        work_dir = root / slugify(title)[:80]
        work_dir.mkdir(parents=True, exist_ok=True)

        console.print("[bold]Fetching video...[/bold]")
        final_video_path, metadata = download_video(args.url, work_dir, force=args.force)
    save_json(work_dir / "metadata.json", metadata)

    cache_suffix = f"_{int(args.analyze_seconds)}s" if args.analyze_seconds else ""
    audio_path = extract_audio(
        final_video_path,
        work_dir / f"audio{cache_suffix}.wav",
        force=args.force,
        limit_seconds=args.analyze_seconds,
    )
    transcript = transcribe(
        audio_path,
        work_dir / f"transcript{cache_suffix}.json",
        args.model,
        args.language,
        force=args.force,
    )

    console.print("[bold]Scoring candidate clips...[/bold]")
    pool = build_candidate_pool(transcript, args.min, args.max)
    if not pool:
        console.print("[red]No clip candidates found. Try lowering --min or increasing --max.[/red]")
        return 1

    ai_config = AIConfig(
        enabled=args.ai_enabled,
        base_url=args.ai_base_url,
        model=args.ai_model,
        api_key=args.ai_api_key,
    )
    pool = ai_rescore_candidates(pool, ai_config)
    candidates = select_candidates(pool, args.top)
    if not candidates:
        console.print("[red]No clip candidates found. Try lowering --min or increasing --max.[/red]")
        return 1

    save_json(work_dir / f"candidates{cache_suffix}.json", [asdict(item) for item in candidates])
    print_candidates(candidates)

    if args.review_only:
        console.print("[green]Review candidates ready.[/green]")
        return 0

    if args.export_indexes:
        selected_indexes = {
            int(part.strip())
            for part in args.export_indexes.split(",")
            if part.strip().isdigit()
        }
        candidates = [item for item in candidates if item.index in selected_indexes]
        if not candidates:
            console.print("[red]No matching candidate indexes to export.[/red]")
            return 1

    caption_style = CaptionStyle(
        font_size=args.caption_font_size,
        position=args.caption_position,
        color=args.caption_color,
        font_family=args.caption_font,
        outline_width=args.caption_outline,
        outline_color=args.caption_outline_color,
    )

    console.print("[bold]Exporting vertical clips...[/bold]")
    clips_dir = work_dir / "clips"
    exported: list[Path] = []
    for candidate in candidates:
        clip_segments = segments_for_clip(transcript, candidate)
        exported.append(
            export_clip(
                final_video_path,
                candidate,
                clip_segments,
                clips_dir,
                not args.no_burn_subtitles,
                args.crop_mode,
                caption_style,
                ai_config,
                args.cam_corner,
            )
        )

    console.print("[green]Done.[/green] Exported:")
    for path in exported:
        console.print(f"  {path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        console.print("\n[yellow]Cancelled.[/yellow]")
        raise SystemExit(130)
    except Exception as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise SystemExit(1)
