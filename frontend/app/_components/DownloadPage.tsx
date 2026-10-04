"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, Music, Video } from "lucide-react";
import {
  createDownload,
  deleteDownload,
  fetchDownload,
  fetchDownloadMetadata,
  getDownloadFileUrl,
} from "../../lib/apiClient";
import { JOB_POLL_INTERVAL_MS } from "../../lib/constants";
import { formatDuration, handleDownload } from "../../lib/utils";
import type {
  DownloadAudioFormat,
  DownloadJob,
  DownloadMediaType,
  DownloadMetadata,
  DownloadResolution,
} from "../../types/clip.type";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type Phase = "idle" | "probing" | "preview" | "downloading" | "saved";

const MEDIA_TYPE_OPTIONS: { value: DownloadMediaType; label: string; icon: typeof Video }[] = [
  { value: "video", label: "Video", icon: Video },
  { value: "audio", label: "Audio", icon: Music },
];

const RESOLUTION_OPTIONS: { value: DownloadResolution; label: string }[] = [
  { value: "best", label: "Terbaik" },
  { value: "1080", label: "1080p" },
  { value: "720", label: "720p" },
  { value: "480", label: "480p" },
  { value: "360", label: "360p" },
];

const AUDIO_FORMAT_OPTIONS: { value: DownloadAudioFormat; label: string }[] = [
  { value: "mp3", label: "MP3" },
  { value: "m4a", label: "M4A" },
  { value: "opus", label: "OPUS" },
  { value: "wav", label: "WAV" },
];

const formatOptionLabel = (
  mediaType: DownloadMediaType,
  resolution: DownloadResolution,
  audioFormat: DownloadAudioFormat,
) =>
  mediaType === "video"
    ? `MP4 · ${resolution === "best" ? "Kualitas terbaik" : `${resolution}p`}`
    : `${audioFormat.toUpperCase()} · Kualitas terbaik`;

const formatViews = (viewCount: number | null) =>
  viewCount && viewCount > 0
    ? `${new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(viewCount)}x ditonton`
    : "";

export function DownloadPage() {
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState<DownloadMediaType>("video");
  const [resolution, setResolution] = useState<DownloadResolution>("best");
  const [audioFormat, setAudioFormat] = useState<DownloadAudioFormat>("mp3");
  const [phase, setPhase] = useState<Phase>("idle");
  const [metadata, setMetadata] = useState<DownloadMetadata | null>(null);
  const [job, setJob] = useState<DownloadJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);

  const activeId =
    job?.status === "queued" || job?.status === "running" ? job.id : null;

  useEffect(() => {
    setPhase((prev) => (prev === "preview" || prev === "saved" ? "idle" : prev));
  }, [url]);

  useEffect(() => {
    if (!activeId) return;

    const interval = window.setInterval(async () => {
      const next = await fetchDownload(activeId).catch(() => null);
      if (!next) return;
      setJob(next);

      if (next.status === "completed" && !savingRef.current) {
        savingRef.current = true;
        const ext =
          next.request.media_type === "audio" ? next.request.audio_format ?? "mp3" : "mp4";
        try {
          await handleDownload(
            getDownloadFileUrl(next.id),
            `${next.title ?? next.id}.${ext}`,
            "File",
          );
        } finally {
          await deleteDownload(next.id).catch(() => undefined);
          setPhase("saved");
        }
      }

      if (next.status === "failed") {
        setPhase("preview");
      }
    }, JOB_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [activeId]);

  const handleProcess = useCallback(async () => {
    const trimmedUrl = url.trim();
    setError("");
    setJob(null);
    setMetadata(null);
    savingRef.current = false;
    if (!trimmedUrl) {
      setError("Link YouTube tidak boleh kosong.");
      return;
    }

    setIsSubmitting(true);
    setPhase("probing");
    try {
      const meta = await fetchDownloadMetadata(trimmedUrl);
      setMetadata(meta);
      setPhase("preview");
    } catch (processError) {
      setPhase("idle");
      setError(
        processError instanceof Error ? processError.message : "Gagal membaca metadata video.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [url]);

  const handleMediaTypeChange = useCallback((next: DownloadMediaType) => {
    setMediaType(next);
    setError("");
  }, []);

  const handleStartDownload = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || !metadata) return;
    setError("");
    savingRef.current = false;
    try {
      const nextJob = await createDownload({
        url: trimmedUrl,
        media_type: mediaType,
        resolution: mediaType === "video" ? resolution : undefined,
        audio_format: mediaType === "audio" ? audioFormat : undefined,
      });
      setJob(nextJob);
      setPhase("downloading");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Gagal memulai unduhan.");
    }
  }, [audioFormat, mediaType, metadata, resolution, url]);

  const isDownloadReady = phase === "preview" || job?.status === "failed";

  return (
    <>
      <section className="panel downloadPanel">
        <div className="panelHeader">
          <Download size={20} />
          <h2>Unduh Video YouTube</h2>
        </div>

        <div className="downloadForm">
          <label className="field">
            <span>Link Video YouTube</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>

          <div className="segmentedField">
            <span>Jenis Media</span>
            <div className="segmentedControl" role="group" aria-label="Jenis media">
              {MEDIA_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={mediaType === value ? "active" : ""}
                  onClick={() => handleMediaTypeChange(value)}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>

          {mediaType === "video" ? (
            <div className="field">
              <span>Resolusi</span>
              <Select value={resolution} onValueChange={(value) => setResolution(value as DownloadResolution)}>
                <SelectTrigger aria-label="Resolusi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="field">
              <span>Format Audio</span>
              <Select
                value={audioFormat}
                onValueChange={(value) => setAudioFormat(value as DownloadAudioFormat)}
              >
                <SelectTrigger aria-label="Format audio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIO_FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {error ? <p className="error">{error}</p> : null}

        <button className="primary" type="button" disabled={isSubmitting} onClick={handleProcess}>
          {isSubmitting ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
          {isSubmitting ? "Memproses..." : "Proses"}
        </button>
      </section>

      {phase !== "idle" ? (
        <div className="downloadPreviewSection">
          <div className="downloadPreview">
            {phase === "probing" || !metadata ? (
              <div className="downloadPreview-loading">
                <Loader2 className="spin" size={20} />
                <span>Membaca metadata video...</span>
              </div>
            ) : (
              <>
                {metadata.thumbnail ? (
                  <img
                    className="downloadPreview-thumb"
                    src={metadata.thumbnail}
                    alt={metadata.title ?? "Thumbnail video"}
                  />
                ) : (
                  <div className="downloadPreview-thumb downloadPreview-thumbEmpty" />
                )}

                <div className="downloadPreview-info">
                  <strong>{metadata.title}</strong>
                  <span>
                    {[metadata.uploader, formatDuration(metadata.duration), formatViews(metadata.view_count)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="downloadPreview-format">
                    {formatOptionLabel(mediaType, resolution, audioFormat)}
                  </span>

                  {phase === "downloading" && job?.progress !== null && job?.progress !== undefined ? (
                    <div className="downloadProgress">
                      <div className="downloadProgress-bar">
                        <div
                          className="downloadProgress-fill"
                          style={{ width: `${Math.min(100, job.progress)}%` }}
                        />
                      </div>
                      <span>{Math.floor(job.progress)}%</span>
                    </div>
                  ) : null}

                  {job?.status === "failed" && job.error ? (
                    <span className="downloadError">{job.error}</span>
                  ) : null}

                  {phase === "saved" ? (
                    <span className="downloadPreview-saved">
                      <CheckCircle2 size={15} /> Tersimpan ke perangkat
                    </span>
                  ) : null}

                  {isDownloadReady ? (
                    <div className="downloadPreview-actions">
                      <button className="primary" type="button" onClick={handleStartDownload}>
                        <Download size={16} /> Unduh Sekarang
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
