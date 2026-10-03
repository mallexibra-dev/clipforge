export type JobStatus = "queued" | "running" | "completed" | "failed";
export type CropMode = "center" | "person" | "streamer";
export type CamCorner = "auto" | "br" | "bl" | "tr" | "tl";
export type CaptionPosition = "center" | "bottom";
export type CaptionFont =
  | "DejaVu Sans"
  | "DejaVu Serif"
  | "Liberation Sans"
  | "Liberation Serif"
  | "Noto Sans";
export type SourceMode = "url" | "upload";

export type ClipFile = {
  name: string;
  url: string;
  size_bytes: number;
  thumbnail_url?: string | null;
  thumbnail_prompt?: string | null;
  social_caption?: string | null;
};

export type ClipCandidate = {
  index: number;
  start: number;
  end: number;
  duration: number;
  score: number;
  title: string;
  reason: string;
  text: string;
};

export type ClipJob = {
  id: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  logs: string[];
  clips: ClipFile[];
  candidates: ClipCandidate[];
  error: string | null;
  request: {
    url: string;
    top: number | null;
    min_duration: number;
    max_duration: number;
    model: string;
    language: string;
    analyze_seconds: number | null;
    burn_subtitles: boolean;
    crop_mode: CropMode;
    cam_corner: CamCorner;
    caption_font_size: number;
    caption_position: CaptionPosition;
    caption_color: string;
    caption_font: CaptionFont;
    caption_outline: number;
    caption_outline_color: string;
    ai_enabled: boolean;
    ai_base_url: string;
    ai_model: string;
  };
};

export type CreateClipJobInput = {
  url?: string;
  source_file?: string;
  top?: number;
  min_duration: number;
  max_duration: number;
  model: string;
  language: string;
  analyze_seconds?: number | null;
  burn_subtitles: boolean;
  crop_mode: CropMode;
  cam_corner?: CamCorner;
  caption_font_size?: number;
  caption_position?: CaptionPosition;
  caption_color?: string;
  caption_font?: CaptionFont;
  caption_outline?: number;
  caption_outline_color?: string;
  required_hashtags?: string[];
  ai_enabled?: boolean;
  ai_base_url?: string;
  ai_model?: string;
  ai_api_key?: string;
};

export type DownloadMediaType = "video" | "audio";
export type DownloadResolution = "best" | "1080" | "720" | "480" | "360";
export type DownloadAudioFormat = "mp3" | "m4a" | "opus" | "wav";

export type DownloadRequest = {
  url: string;
  media_type: DownloadMediaType;
  resolution?: DownloadResolution;
  audio_format?: DownloadAudioFormat;
};

export type DownloadJob = {
  id: string;
  status: JobStatus;
  request: DownloadRequest;
  title: string | null;
  file_url: string | null;
  file_size: number | null;
  progress: number | null;
  logs: string[];
  error: string | null;
  created_at: string;
  updated_at: string;
};
