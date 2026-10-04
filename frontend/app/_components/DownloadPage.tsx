"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, Music, Video } from "lucide-react";
import {
  createDownload,
  fetchDownload,
  fetchDownloadMetadata,
  getDownloadFileUrl,
} from "../../lib/apiClient";
import { JOB_POLL_INTERVAL_MS } from "../../lib/constants";
import { formatDuration, handleDownload } from "../../lib/utils";
import {
  errorClass,
  fieldLabelClass,
  panelClass,
  panelHeaderClass,
  segmentedContainer,
  segmentedItem,
  textFieldClass,
} from "../../lib/ui";
import type {
  DownloadAudioFormat,
  DownloadJob,
  DownloadMediaType,
  DownloadMetadata,
  DownloadResolution,
} from "../../types/clip.type";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type Phase = "idle" | "probing" | "preview" | "downloading";

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

const jobFilename = (job: DownloadJob) =>
  `${job.title ?? job.id}.${
    job.request.media_type === "audio" ? job.request.audio_format ?? "mp3" : "mp4"
  }`;

const downloadButtonClass =
  "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-6 text-sm font-semibold text-white shadow-sm transition enabled:hover:bg-brand-hover enabled:hover:shadow-md";

const infoSpanClass = "text-xs text-muted";

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
    setPhase((prev) => (prev === "preview" ? "idle" : prev));
  }, [url]);

  useEffect(() => {
    if (!activeId) return;

    const interval = window.setInterval(async () => {
      const next = await fetchDownload(activeId).catch(() => null);
      if (!next) return;
      setJob(next);

      if (next.status === "completed" && !savingRef.current) {
        savingRef.current = true;
        await handleDownload(getDownloadFileUrl(next.id), jobFilename(next), "File");
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

  const handleSaveAgain = useCallback(() => {
    if (!job || job.status !== "completed") return;
    void handleDownload(getDownloadFileUrl(job.id), jobFilename(job), "File");
  }, [job]);

  const isDownloadReady = phase === "preview" || job?.status === "failed";
  const isCompleted = job?.status === "completed";

  return (
    <>
      <section className={`${panelClass} flex flex-col gap-5 p-8`}>
        <div className={panelHeaderClass}>
          <Download className="text-brand" size={20} />
          <h2 className="text-lg font-semibold text-ink">Unduh Video YouTube</h2>
        </div>

        <div className="grid grid-cols-2 items-start gap-3 min-[921px]:grid-cols-[minmax(0,1fr)_auto_150px]">
          <label className="col-span-2 flex flex-col gap-2 min-[921px]:col-span-1">
            <span className={fieldLabelClass}>Link Video YouTube</span>
            <input
              className={textFieldClass}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>

          <div className="grid gap-2 min-[921px]:min-w-[17rem]">
            <span className={fieldLabelClass}>Jenis Media</span>
            <div
              className={segmentedContainer(2, "w-full")}
              role="group"
              aria-label="Jenis media"
            >
              {MEDIA_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={segmentedItem(mediaType === value, "w-full px-4", true)}
                  onClick={() => handleMediaTypeChange(value)}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>

          {mediaType === "video" ? (
            <div className="flex flex-col gap-2">
              <span className={fieldLabelClass}>Resolusi</span>
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
            <div className="flex flex-col gap-2">
              <span className={fieldLabelClass}>Format Audio</span>
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

        {error ? <p className={errorClass}>{error}</p> : null}

        <button
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-8 text-sm font-semibold text-white shadow-sm transition enabled:hover:bg-brand-hover enabled:hover:shadow-md disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-65"
          type="button"
          disabled={isSubmitting}
          onClick={handleProcess}
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
          {isSubmitting ? "Memproses..." : "Proses"}
        </button>
      </section>

      {phase !== "idle" ? (
        <div className="mt-8">
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
            {phase === "probing" || !metadata ? (
              <div className="flex w-full items-center justify-center gap-2.5 px-2 py-4 text-sm text-muted">
                <Loader2 className="animate-spin" size={20} />
                <span>Membaca metadata video...</span>
              </div>
            ) : (
              <>
                {metadata.thumbnail ? (
                  <img
                    className="aspect-video w-full rounded-lg bg-canvas object-cover"
                    src={metadata.thumbnail}
                    alt={metadata.title ?? "Thumbnail video"}
                  />
                ) : (
                  <div className="aspect-video w-full rounded-lg bg-canvas object-cover" />
                )}

                <div className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <strong className="text-[15px] font-semibold text-ink">{metadata.title}</strong>
                  <span className={infoSpanClass}>
                    {[metadata.uploader, formatDuration(metadata.duration), formatViews(metadata.view_count)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className={`${infoSpanClass} font-semibold text-ink`}>
                    {formatOptionLabel(mediaType, resolution, audioFormat)}
                  </span>

                  {phase === "downloading" && job?.status === "running" && job.progress != null ? (
                    <div className="mt-1.5 flex w-full items-center justify-center gap-2.5">
                      <div className="h-1.5 max-w-[320px] flex-1 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full bg-brand transition-[width] duration-400"
                          style={{ width: `${Math.min(100, job.progress)}%` }}
                        />
                      </div>
                      <span className="min-w-[38px] text-right text-xs font-semibold text-muted">
                        {Math.floor(job.progress)}%
                      </span>
                    </div>
                  ) : null}

                  {job?.status === "failed" && job.error ? (
                    <span className="text-xs text-danger">{job.error}</span>
                  ) : null}

                  {isDownloadReady || isCompleted ? (
                    <div className="mt-2 flex w-full">
                      {isCompleted ? (
                        <button
                          className={downloadButtonClass}
                          type="button"
                          onClick={handleSaveAgain}
                        >
                          <Download size={16} /> Unduh Ulang
                        </button>
                      ) : (
                        <button
                          className={downloadButtonClass}
                          type="button"
                          onClick={handleStartDownload}
                        >
                          <Download size={16} /> Unduh Sekarang
                        </button>
                      )}
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
