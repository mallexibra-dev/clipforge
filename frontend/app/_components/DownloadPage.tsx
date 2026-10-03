"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Download, Loader2, Music, Save, Video } from "lucide-react";
import { createDownload, fetchDownload, getDownloadFileUrl } from "../../lib/apiClient";
import { JOB_POLL_INTERVAL_MS, statusCopy, statusIcon } from "../../lib/constants";
import { formatBytes, handleDownload } from "../../lib/utils";
import type {
  DownloadAudioFormat,
  DownloadJob,
  DownloadMediaType,
  DownloadResolution,
} from "../../types/clip.type";

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

const fileExtension = (job: DownloadJob) =>
  job.request.media_type === "audio" ? job.request.audio_format ?? "mp3" : "mp4";

export function DownloadPage() {
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState<DownloadMediaType>("video");
  const [resolution, setResolution] = useState<DownloadResolution>("best");
  const [audioFormat, setAudioFormat] = useState<DownloadAudioFormat>("mp3");
  const [current, setCurrent] = useState<DownloadJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeId =
    current?.status === "queued" || current?.status === "running" ? current.id : null;

  useEffect(() => {
    if (!activeId) return;

    const interval = window.setInterval(async () => {
      const next = await fetchDownload(activeId).catch(() => null);
      if (next) setCurrent(next);
    }, JOB_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [activeId]);

  const handleMediaTypeChange = useCallback((next: DownloadMediaType) => {
    setMediaType(next);
    setError("");
  }, []);

  const handleStartDownload = useCallback(async () => {
    const trimmedUrl = url.trim();
    setError("");
    if (!trimmedUrl) {
      setError("Link YouTube tidak boleh kosong.");
      return;
    }

    setIsSubmitting(true);
    try {
      const job = await toast.promise(
        createDownload({
          url: trimmedUrl,
          media_type: mediaType,
          resolution: mediaType === "video" ? resolution : undefined,
          audio_format: mediaType === "audio" ? audioFormat : undefined,
        }),
        {
          loading: "Memulai proses unduhan...",
          success: "Proses unduhan berhasil dimulai!",
          error: "Gagal memulai proses unduhan",
        },
      );
      setUrl("");
      setCurrent(job);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal memulai unduhan.");
    } finally {
      setIsSubmitting(false);
    }
  }, [audioFormat, mediaType, resolution, url]);

  return (
    <>
      <section className="panel downloadPanel">
        <div className="panelHeader">
          <Download size={20} />
          <h2>Unduh Video YouTube</h2>
        </div>

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

        <label className="field wide">
          <span>Link Video YouTube</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="field-help">
            {mediaType === "video"
              ? "Video digabung ke MP4 pada resolusi maksimum yang dipilih."
              : "Audio diekstrak pada kualitas terbaik."}
          </p>
        </label>

        <div className="gridFields">
          {mediaType === "video" ? (
            <label className="field">
              <span>Resolusi</span>
              <select
                value={resolution}
                onChange={(event) => setResolution(event.target.value as DownloadResolution)}
              >
                {RESOLUTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Format Audio</span>
              <select
                value={audioFormat}
                onChange={(event) => setAudioFormat(event.target.value as DownloadAudioFormat)}
              >
                {AUDIO_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {error ? <p className="error">{error}</p> : null}

        <button className="primary" type="button" disabled={isSubmitting} onClick={handleStartDownload}>
          {isSubmitting ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
          {isSubmitting ? "Sedang Memproses..." : "Mulai Unduh"}
        </button>
      </section>

      {current ? (
        <div className="downloadCurrent">
          <div className="downloadRow">
            <div className={`jobRow-status status-${current.status}`}>
              {(() => {
                const Icon = statusIcon[current.status];
                return <Icon className={current.status === "running" ? "spin" : ""} size={18} />;
              })()}
            </div>

            <div className="downloadRow-info">
              <strong>{current.title ?? statusCopy[current.status]}</strong>
              <span>
                {current.request.media_type === "video"
                  ? `Video · ${current.request.resolution === "best" ? "Terbaik" : `${current.request.resolution}p`}`
                  : `Audio · ${(current.request.audio_format ?? "mp3").toUpperCase()}`}
                {current.file_size ? ` · ${formatBytes(current.file_size)}` : ""}
              </span>

              {activeId && current.progress !== null ? (
                <div className="downloadProgress">
                  <div className="downloadProgress-bar">
                    <div
                      className="downloadProgress-fill"
                      style={{ width: `${Math.min(100, current.progress)}%` }}
                    />
                  </div>
                  <span>{Math.floor(current.progress)}%</span>
                </div>
              ) : null}

              {current.status === "failed" && current.error ? (
                <span className="downloadRow-error">{current.error}</span>
              ) : null}
            </div>

            {current.status === "completed" ? (
              <button
                type="button"
                className="iconButton"
                title="Simpan ke perangkat"
                onClick={() =>
                  handleDownload(
                    getDownloadFileUrl(current.id),
                    `${current.title ?? current.id}.${fileExtension(current)}`,
                  )
                }
              >
                <Save size={16} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
