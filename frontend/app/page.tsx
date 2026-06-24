"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  createJob,
  deleteJobs,
  fetchModels,
  getJob,
  getJobs,
  probeUrlDuration,
  uploadVideo,
} from "../lib/apiClient";
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_CAPTION_COLOR,
  DEFAULT_CAPTION_FONT,
  DEFAULT_CAPTION_FONT_SIZE,
  DEFAULT_CAPTION_OUTLINE,
  DEFAULT_CAPTION_OUTLINE_COLOR,
  DEFAULT_CAPTION_POSITION,
  DEFAULT_LANGUAGE,
  DEFAULT_MAX_DURATION,
  DEFAULT_MIN_DURATION,
  DEFAULT_MODEL,
  JOB_POLL_INTERVAL_MS,
  RECENT_LOG_LIMIT,
} from "../lib/constants";
import { isActiveJob } from "../lib/utils";
import type {
  CamCorner,
  CaptionFont,
  CaptionPosition,
  ClipJob,
  CropMode,
  SourceMode,
} from "../types/clip.type";
import { ControlPanel } from "./_components/ControlPanel";
import { DeleteAllToast } from "./_components/DeleteAllToast";
import { HistorySection } from "./_components/HistorySection";
import { ResultsSection } from "./_components/ResultsSection";
import { SiteFooter } from "./_components/SiteFooter";
import { StatusPanel } from "./_components/StatusPanel";
import { Topbar } from "./_components/Topbar";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("url");
  const [uploadToken, setUploadToken] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [minDuration, setMinDuration] = useState(DEFAULT_MIN_DURATION);
  const [maxDuration, setMaxDuration] = useState(DEFAULT_MAX_DURATION);
  const [targetClips, setTargetClips] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState("");
  const [cropMode, setCropMode] = useState<CropMode>("person");
  const [camCorner, setCamCorner] = useState<CamCorner>("auto");
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [captionFontSize, setCaptionFontSize] = useState(DEFAULT_CAPTION_FONT_SIZE);
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>(DEFAULT_CAPTION_POSITION);
  const [captionColor, setCaptionColor] = useState(DEFAULT_CAPTION_COLOR);
  const [captionFont, setCaptionFont] = useState<CaptionFont>(DEFAULT_CAPTION_FONT);
  const [captionOutline, setCaptionOutline] = useState(DEFAULT_CAPTION_OUTLINE);
  const [captionOutlineColor, setCaptionOutlineColor] = useState(DEFAULT_CAPTION_OUTLINE_COLOR);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiBaseUrl, setAiBaseUrl] = useState(DEFAULT_AI_BASE_URL);
  const [aiModel, setAiModel] = useState(DEFAULT_AI_MODEL);
  const [aiApiKey, setAiApiKey] = useState("");
  const [requiredHashtags, setRequiredHashtags] = useState("");
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [job, setJob] = useState<ClipJob | null>(null);
  const [jobs, setJobs] = useState<ClipJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeJobId = job?.id;
  const isBusy = isActiveJob(job);
  const latestLogs = useMemo(() => job?.logs.slice(-RECENT_LOG_LIMIT) ?? [], [job]);

  // min_duration * target_clips must fit within 80% of the video length.
  const maxClips = useMemo(() => {
    if (!videoDuration || minDuration <= 0) return null;
    return Math.max(1, Math.floor((videoDuration * 0.8) / minDuration));
  }, [videoDuration, minDuration]);

  useEffect(() => {
    if (sourceMode !== "url") return;
    const trimmed = url.trim();
    if (!trimmed) {
      setVideoDuration(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const duration = await probeUrlDuration(trimmed).catch(() => null);
      if (!cancelled) setVideoDuration(duration);
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [url, sourceMode]);

  const loadJobs = useCallback(async () => {
    setJobs(await getJobs());
  }, []);

  useEffect(() => {
    loadJobs().catch(() => undefined);
  }, [loadJobs]);

  useEffect(() => {
    if (!activeJobId) return;

    const interval = window.setInterval(async () => {
      const nextJob = await getJob(activeJobId);
      setJob(nextJob);

      if (nextJob.status === "completed" || nextJob.status === "failed") {
        loadJobs().catch(() => undefined);
      }
    }, JOB_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [activeJobId, loadJobs]);

  const handleLoadModels = useCallback(async () => {
    const base = aiBaseUrl.trim();
    if (!base) return;
    setIsLoadingModels(true);
    try {
      const models = await fetchModels(base, aiApiKey.trim());
      setAiModels(models);
      if (models.length) {
        toast.success(`${models.length} model dimuat`);
      } else {
        toast.error("Tidak ada model ditemukan");
      }
    } catch (modelsError) {
      toast.error(modelsError instanceof Error ? modelsError.message : "Gagal memuat model");
    } finally {
      setIsLoadingModels(false);
    }
  }, [aiBaseUrl, aiApiKey]);

  const handleSourceModeChange = useCallback((mode: SourceMode) => {
    setSourceMode(mode);
    setError("");
  }, []);

  const handleUploadFileChange = useCallback(async (file: File | null) => {
    setError("");
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : "";
    });
    if (!file) {
      setUploadToken("");
      setUploadFileName("");
      setVideoDuration(null);
      return;
    }

    setIsUploading(true);
    try {
      const result = await toast.promise(uploadVideo(file), {
        loading: "Mengunggah video...",
        success: "Video berhasil diunggah!",
        error: "Gagal mengunggah video",
      });
      setUploadToken(result.source_file);
      setUploadFileName(result.original_name);
      setVideoDuration(result.duration);
    } catch (uploadError) {
      setUploadToken("");
      setVideoDuration(null);
      setUploadFileName("");
      setError(uploadError instanceof Error ? uploadError.message : "Gagal mengunggah video.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleStartJob = useCallback(async () => {
    const trimmedUrl = url.trim();
    setError("");

    if (sourceMode === "url" && !trimmedUrl) {
      setError("Link YouTube tidak boleh kosong.");
      return;
    }
    if (sourceMode === "upload" && !uploadToken) {
      setError("Unggah file video terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);

    try {
      const nextJob = await toast.promise(
        createJob({
          url: sourceMode === "url" ? trimmedUrl : "",
          source_file: sourceMode === "upload" ? uploadToken : "",
          top: targetClips > 0 ? targetClips : undefined,
          min_duration: minDuration,
          max_duration: maxDuration,
          model: DEFAULT_MODEL,
          language: DEFAULT_LANGUAGE,
          burn_subtitles: burnSubtitles,
          crop_mode: cropMode,
          cam_corner: camCorner,
          caption_font_size: captionFontSize,
          caption_position: captionPosition,
          caption_color: captionColor,
          caption_font: captionFont,
          caption_outline: captionOutline,
          caption_outline_color: captionOutlineColor,
          required_hashtags: requiredHashtags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          ai_enabled: aiEnabled,
          ai_base_url: aiBaseUrl.trim(),
          ai_model: aiModel.trim(),
          ai_api_key: aiApiKey.trim(),
        }),
        {
          loading: "Mempersiapkan proses pemotongan...",
          success: "Proses pemotongan berhasil dimulai!",
          error: "Gagal memulai proses pemotongan",
        },
      );

      setJob(nextJob);
      await loadJobs();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal memulai proses.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    aiApiKey,
    aiBaseUrl,
    aiEnabled,
    aiModel,
    burnSubtitles,
    camCorner,
    captionColor,
    captionFont,
    captionFontSize,
    captionOutline,
    captionOutlineColor,
    captionPosition,
    cropMode,
    loadJobs,
    maxDuration,
    minDuration,
    requiredHashtags,
    sourceMode,
    targetClips,
    uploadToken,
    url,
  ]);

  const handleDeleteAllConfirmed = useCallback(async () => {
    await toast.promise(deleteJobs(), {
      loading: "Menghapus riwayat...",
      success: "Seluruh riwayat berhasil dihapus!",
      error: "Gagal menghapus riwayat",
    });

    setJob(null);
    await loadJobs();
  }, [loadJobs]);

  const handleDeleteAll = useCallback(() => {
    toast((item) => <DeleteAllToast toastId={item.id} onConfirm={handleDeleteAllConfirmed} />, {
      duration: Infinity,
    });
  }, [handleDeleteAllConfirmed]);

  return (
    <main className="shell">
      <Topbar onRefresh={loadJobs} />

      <section className="workspace">
        <ControlPanel
          cropMode={cropMode}
          error={error}
          isBusy={isBusy}
          isSubmitting={isSubmitting}
          sourceMode={sourceMode}
          uploadFileName={uploadFileName}
          uploadPreviewUrl={uploadPreviewUrl}
          isUploading={isUploading}
          camCorner={camCorner}
          onCamCornerChange={setCamCorner}
          onSourceModeChange={handleSourceModeChange}
          onUploadFileChange={handleUploadFileChange}
          maxDuration={maxDuration}
          minDuration={minDuration}
          targetClips={targetClips}
          maxClips={maxClips}
          videoDuration={videoDuration}
          onTargetClipsChange={setTargetClips}
          burnSubtitles={burnSubtitles}
          captionFontSize={captionFontSize}
          captionPosition={captionPosition}
          captionColor={captionColor}
          captionFont={captionFont}
          captionOutline={captionOutline}
          captionOutlineColor={captionOutlineColor}
          onCaptionFontChange={setCaptionFont}
          onCaptionOutlineChange={setCaptionOutline}
          onCaptionOutlineColorChange={setCaptionOutlineColor}
          aiEnabled={aiEnabled}
          aiBaseUrl={aiBaseUrl}
          aiModel={aiModel}
          aiApiKey={aiApiKey}
          aiModels={aiModels}
          isLoadingModels={isLoadingModels}
          onLoadModels={handleLoadModels}
          requiredHashtags={requiredHashtags}
          onRequiredHashtagsChange={setRequiredHashtags}
          onCropModeChange={setCropMode}
          onMaxDurationChange={setMaxDuration}
          onMinDurationChange={setMinDuration}
          onBurnSubtitlesChange={setBurnSubtitles}
          onCaptionFontSizeChange={setCaptionFontSize}
          onCaptionPositionChange={setCaptionPosition}
          onCaptionColorChange={setCaptionColor}
          onAiEnabledChange={setAiEnabled}
          onAiBaseUrlChange={setAiBaseUrl}
          onAiModelChange={setAiModel}
          onAiApiKeyChange={setAiApiKey}
          onStartJob={handleStartJob}
          onUrlChange={setUrl}
          url={url}
        />
        <StatusPanel job={job} latestLogs={latestLogs} />
      </section>

      <ResultsSection clips={job?.clips ?? []} />
      <HistorySection jobs={jobs} onDeleteAll={handleDeleteAll} onSelectJob={setJob} />
      <SiteFooter />
    </main>
  );
}
