import { Link2, Loader2, Play, RefreshCw, Scissors, Sparkles, Type, Upload } from "lucide-react";
import {
  CAPTION_FONT_SIZE_MAX,
  CAPTION_FONT_SIZE_MIN,
  CAPTION_FONTS,
  MAX_DURATION,
  MIN_DURATION,
  MIN_DURATION_MAX,
  clampDurations,
} from "../../lib/constants";
import {
  errorClass,
  fieldHelpClass,
  fieldLabelClass,
  inputBaseClass,
  panelClass,
  panelHeaderClass,
  primaryButtonClass,
  segmentedContainer,
  segmentedItem,
  textFieldClass,
} from "../../lib/ui";
import type { CamCorner, CaptionFont, CaptionPosition, CropMode, SourceMode } from "../../types/clip.type";
import { CaptionPreview } from "./CaptionPreview";

const CAM_CORNER_OPTIONS: { value: CamCorner; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "tl", label: "Kiri Atas" },
  { value: "tr", label: "Kanan Atas" },
  { value: "bl", label: "Kiri Bawah" },
  { value: "br", label: "Kanan Bawah" },
];

const fontSelectClass = `${inputBaseClass} min-h-11 cursor-pointer rounded-lg pl-3 pr-8`;
const colorInputClass = `${inputBaseClass} h-10 min-h-0 cursor-pointer rounded-[10px] p-0.5`;
const fileInputClass = `${inputBaseClass} cursor-pointer px-2.5 py-2 [&::file-selector-button]:mr-3 [&::file-selector-button]:cursor-pointer [&::file-selector-button]:rounded-lg [&::file-selector-button]:bg-indigo-500/90 [&::file-selector-button]:px-3 [&::file-selector-button]:py-1.5 [&::file-selector-button]:font-semibold [&::file-selector-button]:text-white`;
const sliderClass = "w-full cursor-pointer accent-brand";
const segmentedLabelClass = `grid gap-2 ${fieldLabelClass}`;

type ControlPanelProps = {
  cropMode: CropMode;
  error: string;
  isBusy: boolean;
  isSubmitting: boolean;
  sourceMode: SourceMode;
  uploadFileName: string;
  uploadPreviewUrl: string;
  isUploading: boolean;
  camCorner: CamCorner;
  onCamCornerChange: (value: CamCorner) => void;
  onSourceModeChange: (mode: SourceMode) => void;
  onUploadFileChange: (file: File | null) => void;
  maxDuration: number;
  minDuration: number;
  targetClips: number;
  maxClips: number | null;
  videoDuration: number | null;
  onTargetClipsChange: (value: number) => void;
  burnSubtitles: boolean;
  captionFontSize: number;
  captionPosition: CaptionPosition;
  captionColor: string;
  captionFont: CaptionFont;
  captionOutline: number;
  captionOutlineColor: string;
  onCaptionFontChange: (value: CaptionFont) => void;
  onCaptionOutlineChange: (value: number) => void;
  onCaptionOutlineColorChange: (value: string) => void;
  aiEnabled: boolean;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  aiModels: string[];
  isLoadingModels: boolean;
  onLoadModels: () => void;
  requiredHashtags: string;
  onRequiredHashtagsChange: (value: string) => void;
  onCropModeChange: (mode: CropMode) => void;
  onMaxDurationChange: (value: number) => void;
  onMinDurationChange: (value: number) => void;
  onBurnSubtitlesChange: (value: boolean) => void;
  onCaptionFontSizeChange: (value: number) => void;
  onCaptionPositionChange: (value: CaptionPosition) => void;
  onCaptionColorChange: (value: string) => void;
  onAiEnabledChange: (value: boolean) => void;
  onAiBaseUrlChange: (value: string) => void;
  onAiModelChange: (value: string) => void;
  onAiApiKeyChange: (value: string) => void;
  onStartJob: () => void;
  onUrlChange: (value: string) => void;
  url: string;
};

export function ControlPanel({
  cropMode,
  error,
  isBusy,
  isSubmitting,
  sourceMode,
  uploadFileName,
  uploadPreviewUrl,
  isUploading,
  camCorner,
  onCamCornerChange,
  onSourceModeChange,
  onUploadFileChange,
  maxDuration,
  minDuration,
  targetClips,
  maxClips,
  videoDuration,
  onTargetClipsChange,
  burnSubtitles,
  captionFontSize,
  captionPosition,
  captionColor,
  aiEnabled,
  aiBaseUrl,
  aiModel,
  aiApiKey,
  aiModels,
  isLoadingModels,
  onLoadModels,
  requiredHashtags,
  onRequiredHashtagsChange,
  onCropModeChange,
  onMaxDurationChange,
  onMinDurationChange,
  onBurnSubtitlesChange,
  onCaptionFontSizeChange,
  onCaptionPositionChange,
  captionFont,
  captionOutline,
  captionOutlineColor,
  onCaptionFontChange,
  onCaptionOutlineChange,
  onCaptionOutlineColorChange,
  onCaptionColorChange,
  onAiEnabledChange,
  onAiBaseUrlChange,
  onAiModelChange,
  onAiApiKeyChange,
  onStartJob,
  onUrlChange,
  url,
}: ControlPanelProps) {
  const hasSource = sourceMode === "url" ? Boolean(url.trim()) : Boolean(uploadFileName);
  const isStartDisabled = isSubmitting || isBusy || isUploading || !hasSource;
  const isProcessing = isSubmitting || isBusy;

  return (
    <section className={`${panelClass} flex flex-col gap-5 p-8`}>
      <div className={`${panelHeaderClass} mb-6`}>
        <Scissors className="text-brand" size={20} />
        <h2 className="text-lg font-semibold text-ink">Potong Video</h2>
      </div>

      <div className={segmentedLabelClass}>
        <span>Sumber Video</span>
        <div className={segmentedContainer(2)} role="group" aria-label="Sumber video">
          <button
            className={segmentedItem(sourceMode === "url")}
            type="button"
            onClick={() => onSourceModeChange("url")}
          >
            <Link2 size={15} /> Link YouTube
          </button>
          <button
            className={segmentedItem(sourceMode === "upload")}
            type="button"
            onClick={() => onSourceModeChange("upload")}
          >
            <Upload size={15} /> Upload Video
          </button>
        </div>
      </div>

      {sourceMode === "url" ? (
        <label className="col-span-full flex flex-col gap-1.5">
          <span className={fieldLabelClass}>Link Video YouTube</span>
          <input
            className={textFieldClass}
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className={fieldHelpClass}>
            Pastikan video memiliki percakapan yang jelas untuk hasil transkripsi terbaik.
          </p>
        </label>
      ) : (
        <label className="col-span-full flex flex-col gap-1.5">
          <span className={fieldLabelClass}>Upload File Video</span>
          <input
            className={fileInputClass}
            type="file"
            accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm,.m4v,.avi"
            onChange={(event) => onUploadFileChange(event.target.files?.[0] ?? null)}
          />
          <p className={fieldHelpClass}>
            {isUploading
              ? "Mengunggah video..."
              : uploadFileName
                ? `Siap: ${uploadFileName}`
                : "Format didukung: MP4, MOV, MKV, WEBM, M4V, AVI."}
          </p>
          {uploadPreviewUrl ? (
            <video
              className="mt-2.5 max-h-[280px] w-full rounded-xl border border-line bg-black"
              src={uploadPreviewUrl}
              controls
              preload="metadata"
            />
          ) : null}
        </label>
      )}

      <div className="grid grid-cols-1 gap-4 min-[521px]:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>Durasi Minimum (detik)</span>
          <input
            className={textFieldClass}
            min={MIN_DURATION}
            max={MIN_DURATION_MAX}
            type="number"
            value={minDuration}
            onChange={(event) => onMinDurationChange(Number(event.target.value))}
            onBlur={() => {
              const [nextMin, nextMax] = clampDurations(minDuration, maxDuration);
              onMinDurationChange(nextMin);
              if (nextMax !== maxDuration) onMaxDurationChange(nextMax);
            }}
          />
          <p className={fieldHelpClass}>Minimal 1 menit (60 detik).</p>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>Durasi Maksimum (detik)</span>
          <input
            className={textFieldClass}
            min={MIN_DURATION + 5}
            max={MAX_DURATION}
            type="number"
            value={maxDuration}
            onChange={(event) => onMaxDurationChange(Number(event.target.value))}
            onBlur={() => {
              const [nextMin, nextMax] = clampDurations(minDuration, maxDuration);
              if (nextMin !== minDuration) onMinDurationChange(nextMin);
              onMaxDurationChange(nextMax);
            }}
          />
          <p className={fieldHelpClass}>Harus lebih besar dari durasi minimum.</p>
        </label>
      </div>

      <label className="col-span-full flex flex-col gap-1.5">
        <span className={fieldLabelClass}>Target Jumlah Clip</span>
        <input
          className={textFieldClass}
          min={0}
          max={maxClips ?? 50}
          type="number"
          value={targetClips || ""}
          placeholder="Auto (kosongkan = otomatis)"
          onChange={(event) => onTargetClipsChange(Math.max(0, Number(event.target.value)))}
        />
        <p className={fieldHelpClass}>
          {videoDuration
            ? `Durasi video ~${Math.round(videoDuration)}s. Maks ${maxClips} clip (durasi min × jumlah ≤ 80% video).`
            : "Kosongkan untuk otomatis. Akan disesuaikan dengan panjang video."}
          {maxClips !== null && targetClips > maxClips
            ? ` Target ${targetClips} melebihi batas, akan dipangkas ke ${maxClips}.`
            : ""}
        </p>
      </label>

      <div className={segmentedLabelClass}>
        <span>Mode Crop</span>
        <div className={segmentedContainer(2)} role="group" aria-label="Mode crop video">
          <button
            className={segmentedItem(cropMode === "center")}
            type="button"
            onClick={() => onCropModeChange("center")}
          >
            Center
          </button>
          <button
            className={segmentedItem(cropMode === "person")}
            type="button"
            onClick={() => onCropModeChange("person")}
          >
            Follow Person
          </button>
          <button
            className={segmentedItem(cropMode === "streamer")}
            type="button"
            onClick={() => onCropModeChange("streamer")}
          >
            Streamer
          </button>
        </div>
      </div>

      {cropMode === "streamer" ? (
        <div className={segmentedLabelClass}>
          <span>Posisi Webcam di Sumber</span>
          <div
            className={segmentedContainer(3)}
            role="group"
            aria-label="Posisi webcam"
          >
            {CAM_CORNER_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={segmentedItem(camCorner === option.value)}
                type="button"
                onClick={() => onCamCornerChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className={fieldHelpClass}>
            Webcam di-crop dari pojok ini lalu ditumpuk di atas gameplay (vertikal 9:16).
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-[14px] border border-slate-400/[0.18] bg-indigo-500/[0.06] px-4 py-3.5">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[0.95rem] font-semibold text-ink">
            <Type size={16} />
            Caption Otomatis
          </span>
          <input
            type="checkbox"
            className="h-[18px] w-[18px] cursor-pointer accent-indigo-500"
            checked={burnSubtitles}
            onChange={(event) => onBurnSubtitlesChange(event.target.checked)}
          />
        </label>
        <p className={fieldHelpClass}>Tempelkan teks transkrip langsung ke dalam video.</p>

        {burnSubtitles ? (
          <div className="mt-1.5 flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className={segmentedLabelClass}>
                <span>
                  Ukuran Font: <strong>{captionFontSize}</strong>
                </span>
                <input
                  className={sliderClass}
                  type="range"
                  min={CAPTION_FONT_SIZE_MIN}
                  max={CAPTION_FONT_SIZE_MAX}
                  step={1}
                  value={captionFontSize}
                  onChange={(event) => onCaptionFontSizeChange(Number(event.target.value))}
                  aria-label="Ukuran font caption"
                />
                <div className="mt-0.5 flex justify-between text-[11px] text-muted">
                  <span>Kecil</span>
                  <span>Sedang</span>
                  <span>Besar</span>
                </div>
              </div>

              <div className={segmentedLabelClass}>
                <span>Posisi</span>
                <div className={segmentedContainer(2)} role="group" aria-label="Posisi caption">
                  <button
                    className={segmentedItem(captionPosition === "center")}
                    type="button"
                    onClick={() => onCaptionPositionChange("center")}
                  >
                    Tengah
                  </button>
                  <button
                    className={segmentedItem(captionPosition === "bottom")}
                    type="button"
                    onClick={() => onCaptionPositionChange("bottom")}
                  >
                    Bawah
                  </button>
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className={fieldLabelClass}>Jenis Font</span>
                <select
                  className={fontSelectClass}
                  value={captionFont}
                  onChange={(event) => onCaptionFontChange(event.target.value as CaptionFont)}
                >
                  {CAPTION_FONTS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex max-w-[140px] flex-col gap-1.5">
                  <span className={fieldLabelClass}>Warna Teks</span>
                  <input
                    className={colorInputClass}
                    type="color"
                    value={captionColor}
                    onChange={(event) => onCaptionColorChange(event.target.value.toUpperCase())}
                  />
                </label>
                <label className="flex max-w-[140px] flex-col gap-1.5">
                  <span className={fieldLabelClass}>Warna Border</span>
                  <input
                    className={colorInputClass}
                    type="color"
                    value={captionOutlineColor}
                    onChange={(event) => onCaptionOutlineColorChange(event.target.value.toUpperCase())}
                  />
                </label>
              </div>

              <div className={segmentedLabelClass}>
                <span>
                  Tebal Border: <strong>{captionOutline}</strong>
                </span>
                <input
                  className={sliderClass}
                  type="range"
                  min={0}
                  max={8}
                  step={0.5}
                  value={captionOutline}
                  onChange={(event) => onCaptionOutlineChange(Number(event.target.value))}
                  aria-label="Tebal border caption"
                />
                <div className="mt-0.5 flex justify-between text-[11px] text-muted">
                  <span>Tanpa</span>
                  <span>Tebal</span>
                </div>
              </div>
            </div>

            <CaptionPreview
              fontSize={captionFontSize}
              position={captionPosition}
              color={captionColor}
              font={captionFont}
              outline={captionOutline}
              outlineColor={captionOutlineColor}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-[14px] border border-slate-400/[0.18] bg-indigo-500/[0.06] px-4 py-3.5">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[0.95rem] font-semibold text-ink">
            <Sparkles size={16} />
            AI Agent Pemilih Klip
          </span>
          <input
            type="checkbox"
            className="h-[18px] w-[18px] cursor-pointer accent-indigo-500"
            checked={aiEnabled}
            onChange={(event) => onAiEnabledChange(event.target.checked)}
          />
        </label>
        <p className={fieldHelpClass}>
          LLM menilai setiap kandidat dari transkrip (teks saja, tanpa melihat video) dan memilih
          bagian dengan hook paling kuat untuk dijadikan klip. Pengaturan tersimpan otomatis di
          browser ini.
        </p>

        {aiEnabled ? (
          <div className="mt-1 flex flex-col gap-3">
            <label className="col-span-full flex flex-col gap-1.5">
              <span className={fieldLabelClass}>Endpoint (Base URL)</span>
              <input
                className={textFieldClass}
                value={aiBaseUrl}
                onChange={(event) => onAiBaseUrlChange(event.target.value)}
                placeholder="https://api.z.ai/api/coding/paas/v4"
              />
            </label>
            <label className="col-span-full flex flex-col gap-1.5">
              <span className={fieldLabelClass}>API Key</span>
              <input
                className={textFieldClass}
                type="password"
                value={aiApiKey}
                onChange={(event) => onAiApiKeyChange(event.target.value)}
                placeholder="Tempel API key z.ai di sini (tersimpan di browser)"
                autoComplete="off"
              />
            </label>
            <label className="col-span-full flex flex-col gap-1.5">
              <span className={fieldLabelClass}>Model</span>
              <div className="flex items-stretch gap-2">
                {aiModels.length > 0 ? (
                  <select
                    className={`${fontSelectClass} min-w-0 flex-1`}
                    value={aiModel}
                    onChange={(event) => onAiModelChange(event.target.value)}
                  >
                    {!aiModels.includes(aiModel) ? <option value={aiModel}>{aiModel}</option> : null}
                    {aiModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={`${textFieldClass} min-w-0 flex-1`}
                    value={aiModel}
                    onChange={(event) => onAiModelChange(event.target.value)}
                    placeholder="glm-4.6"
                  />
                )}
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-panel px-3.5 text-[13px] font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={onLoadModels}
                  disabled={isLoadingModels || !aiBaseUrl.trim()}
                >
                  {isLoadingModels ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                  {aiModels.length > 0 ? "Refresh" : "Muat Model"}
                </button>
              </div>
            </label>
            <label className="col-span-full flex flex-col gap-1.5">
              <span className={fieldLabelClass}>Hashtag Wajib (opsional)</span>
              <input
                className={textFieldClass}
                value={requiredHashtags}
                onChange={(event) => onRequiredHashtagsChange(event.target.value)}
                placeholder="clipforge, viral, fyp"
              />
              <p className={fieldHelpClass}>
                Hashtag ini selalu ditambahkan ke caption yang digenerate. Pisahkan dengan koma.
              </p>
            </label>
          </div>
        ) : null}
      </div>

      {error ? <p className={errorClass}>{error}</p> : null}

      <button
        className={`${primaryButtonClass} mt-2`}
        type="button"
        disabled={isStartDisabled}
        onClick={onStartJob}
      >
        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
        {isProcessing ? "Sedang Memproses..." : "Mulai Potong Video"}
      </button>
    </section>
  );
}
