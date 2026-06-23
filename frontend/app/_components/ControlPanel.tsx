import { Link2, Loader2, Play, RefreshCw, Scissors, Sparkles, Type, Upload } from "lucide-react";
import { CAPTION_FONT_SIZE_MAX, CAPTION_FONT_SIZE_MIN, CAPTION_FONTS } from "../../lib/constants";
import type { CamCorner, CaptionFont, CaptionPosition, CropMode, SourceMode } from "../../types/clip.type";
import { CaptionPreview } from "./CaptionPreview";

const CAM_CORNER_OPTIONS: { value: CamCorner; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "tl", label: "Kiri Atas" },
  { value: "tr", label: "Kanan Atas" },
  { value: "bl", label: "Kiri Bawah" },
  { value: "br", label: "Kanan Bawah" },
];

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
    <section className="panel controlPanel">
      <div className="panelHeader">
        <Scissors size={20} />
        <h2>Potong Video</h2>
      </div>

      <div className="segmentedField">
        <span>Sumber Video</span>
        <div className="segmentedControl" role="group" aria-label="Sumber video">
          <button
            className={sourceMode === "url" ? "active" : ""}
            type="button"
            onClick={() => onSourceModeChange("url")}
          >
            <Link2 size={15} /> Link YouTube
          </button>
          <button
            className={sourceMode === "upload" ? "active" : ""}
            type="button"
            onClick={() => onSourceModeChange("upload")}
          >
            <Upload size={15} /> Upload Video
          </button>
        </div>
      </div>

      {sourceMode === "url" ? (
        <label className="field wide">
          <span>Link Video YouTube</span>
          <input
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="field-help">Pastikan video memiliki percakapan yang jelas untuk hasil transkripsi terbaik.</p>
        </label>
      ) : (
        <label className="field wide">
          <span>Upload File Video</span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm,.m4v,.avi"
            onChange={(event) => onUploadFileChange(event.target.files?.[0] ?? null)}
          />
          <p className="field-help">
            {isUploading
              ? "Mengunggah video..."
              : uploadFileName
                ? `Siap: ${uploadFileName}`
                : "Format didukung: MP4, MOV, MKV, WEBM, M4V, AVI."}
          </p>
          {uploadPreviewUrl ? (
            <video className="uploadPreview" src={uploadPreviewUrl} controls preload="metadata" />
          ) : null}
        </label>
      )}

      <div className="gridFields">
        <label className="field">
          <span>Durasi Minimum</span>
          <input
            min={5}
            max={600}
            type="number"
            value={minDuration}
            onChange={(event) => onMinDurationChange(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Durasi Maksimum</span>
          <input
            min={10}
            max={600}
            type="number"
            value={maxDuration}
            onChange={(event) => onMaxDurationChange(Number(event.target.value))}
          />
        </label>
      </div>

      <label className="field wide">
        <span>Target Jumlah Clip</span>
        <input
          min={0}
          max={maxClips ?? 50}
          type="number"
          value={targetClips || ""}
          placeholder="Auto (kosongkan = otomatis)"
          onChange={(event) => onTargetClipsChange(Math.max(0, Number(event.target.value)))}
        />
        <p className="field-help">
          {videoDuration
            ? `Durasi video ~${Math.round(videoDuration)}s. Maks ${maxClips} clip (durasi min × jumlah ≤ 80% video).`
            : "Kosongkan untuk otomatis. Akan disesuaikan dengan panjang video."}
          {maxClips !== null && targetClips > maxClips
            ? ` Target ${targetClips} melebihi batas, akan dipangkas ke ${maxClips}.`
            : ""}
        </p>
      </label>

      <div className="segmentedField">
        <span>Mode Crop</span>
        <div className="segmentedControl" role="group" aria-label="Mode crop video">
          <button
            className={cropMode === "center" ? "active" : ""}
            type="button"
            onClick={() => onCropModeChange("center")}
          >
            Center
          </button>
          <button
            className={cropMode === "person" ? "active" : ""}
            type="button"
            onClick={() => onCropModeChange("person")}
          >
            Follow Person
          </button>
          <button
            className={cropMode === "streamer" ? "active" : ""}
            type="button"
            onClick={() => onCropModeChange("streamer")}
          >
            Streamer
          </button>
        </div>
      </div>

      {cropMode === "streamer" ? (
        <div className="segmentedField">
          <span>Posisi Webcam di Sumber</span>
          <div className="segmentedControl segmentedControl--grid" role="group" aria-label="Posisi webcam">
            {CAM_CORNER_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={camCorner === option.value ? "active" : ""}
                type="button"
                onClick={() => onCamCornerChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="field-help">
            Webcam di-crop dari pojok ini lalu ditumpuk di atas gameplay (vertikal 9:16).
          </p>
        </div>
      ) : null}

      <div className="aiBlock">
        <label className="aiToggle">
          <span className="aiToggleLabel">
            <Type size={16} />
            Caption Otomatis
          </span>
          <input
            type="checkbox"
            checked={burnSubtitles}
            onChange={(event) => onBurnSubtitlesChange(event.target.checked)}
          />
        </label>
        <p className="field-help">Tempelkan teks transkrip langsung ke dalam video.</p>

        {burnSubtitles ? (
          <div className="captionFields">
            <div className="captionControls">
              <div className="segmentedField">
                <span>
                  Ukuran Font: <strong>{captionFontSize}</strong>
                </span>
                <input
                  className="fontSlider"
                  type="range"
                  min={CAPTION_FONT_SIZE_MIN}
                  max={CAPTION_FONT_SIZE_MAX}
                  step={1}
                  value={captionFontSize}
                  onChange={(event) => onCaptionFontSizeChange(Number(event.target.value))}
                  aria-label="Ukuran font caption"
                />
                <div className="sliderTicks">
                  <span>Kecil</span>
                  <span>Sedang</span>
                  <span>Besar</span>
                </div>
              </div>

              <div className="segmentedField">
                <span>Posisi</span>
                <div className="segmentedControl" role="group" aria-label="Posisi caption">
                  <button
                    className={captionPosition === "center" ? "active" : ""}
                    type="button"
                    onClick={() => onCaptionPositionChange("center")}
                  >
                    Tengah
                  </button>
                  <button
                    className={captionPosition === "bottom" ? "active" : ""}
                    type="button"
                    onClick={() => onCaptionPositionChange("bottom")}
                  >
                    Bawah
                  </button>
                </div>
              </div>

              <label className="field">
                <span>Jenis Font</span>
                <select
                  className="fontSelect"
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

              <div className="captionColorRow">
                <label className="field captionColorField">
                  <span>Warna Teks</span>
                  <input
                    type="color"
                    value={captionColor}
                    onChange={(event) => onCaptionColorChange(event.target.value.toUpperCase())}
                  />
                </label>
                <label className="field captionColorField">
                  <span>Warna Border</span>
                  <input
                    type="color"
                    value={captionOutlineColor}
                    onChange={(event) => onCaptionOutlineColorChange(event.target.value.toUpperCase())}
                  />
                </label>
              </div>

              <div className="segmentedField">
                <span>
                  Tebal Border: <strong>{captionOutline}</strong>
                </span>
                <input
                  className="fontSlider"
                  type="range"
                  min={0}
                  max={8}
                  step={0.5}
                  value={captionOutline}
                  onChange={(event) => onCaptionOutlineChange(Number(event.target.value))}
                  aria-label="Tebal border caption"
                />
                <div className="sliderTicks">
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

      <div className="aiBlock">
        <label className="aiToggle">
          <span className="aiToggleLabel">
            <Sparkles size={16} />
            AI Agent Pemilih Klip
          </span>
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(event) => onAiEnabledChange(event.target.checked)}
          />
        </label>
        <p className="field-help">
          LLM menilai setiap kandidat dan memilih bagian paling kuat untuk dijadikan klip.
        </p>

        {aiEnabled ? (
          <div className="aiFields">
            <label className="field wide">
              <span>Endpoint (Base URL)</span>
              <input
                value={aiBaseUrl}
                onChange={(event) => onAiBaseUrlChange(event.target.value)}
                placeholder="http://localhost:20128/v1"
              />
            </label>
            <label className="field wide">
              <span>API Key</span>
              <input
                type="password"
                value={aiApiKey}
                onChange={(event) => onAiApiKeyChange(event.target.value)}
                placeholder="sk-..."
                autoComplete="off"
              />
            </label>
            <label className="field wide">
              <span>Model</span>
              <div className="modelRow">
                {aiModels.length > 0 ? (
                  <select
                    className="fontSelect"
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
                    value={aiModel}
                    onChange={(event) => onAiModelChange(event.target.value)}
                    placeholder="tr/MiniMax-M3"
                  />
                )}
                <button
                  type="button"
                  className="loadModelsButton"
                  onClick={onLoadModels}
                  disabled={isLoadingModels || !aiBaseUrl.trim()}
                >
                  {isLoadingModels ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}
                  {aiModels.length > 0 ? "Refresh" : "Muat Model"}
                </button>
              </div>
            </label>
          </div>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <button className="primary" type="button" disabled={isStartDisabled} onClick={onStartJob}>
        {isProcessing ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
        {isProcessing ? "Sedang Memproses..." : "Mulai Potong Video"}
      </button>
    </section>
  );
}
