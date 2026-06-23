import { CheckCircle2, Clock3, Loader2, XCircle, type LucideIcon } from "lucide-react";
import type { JobStatus } from "../types/clip.type";

export const DEFAULT_MIN_DURATION = 35;
export const DEFAULT_MAX_DURATION = 180;
export const DEFAULT_MODEL = "Systran/faster-whisper-small";
export const DEFAULT_LANGUAGE = "id";
export const DEFAULT_AI_BASE_URL = "http://localhost:20128/v1";
export const DEFAULT_AI_MODEL = "tr/MiniMax-M3";
export const DEFAULT_CAPTION_FONT_SIZE = 30;
export const DEFAULT_CAPTION_POSITION = "center";
export const DEFAULT_CAPTION_COLOR = "#FFFFFF";
export const CAPTION_FONT_SIZE_MIN = 8;
export const CAPTION_FONT_SIZE_MAX = 60;
export const DEFAULT_CAPTION_FONT = "DejaVu Sans";
export const DEFAULT_CAPTION_OUTLINE = 2;
export const DEFAULT_CAPTION_OUTLINE_COLOR = "#000000";
// Maps backend font family -> a CSS stack for the live preview.
export const CAPTION_FONTS = [
  { value: "DejaVu Sans", label: "DejaVu Sans", css: '"DejaVu Sans", system-ui, sans-serif' },
  { value: "DejaVu Serif", label: "DejaVu Serif", css: '"DejaVu Serif", Georgia, serif' },
  { value: "Liberation Sans", label: "Liberation Sans", css: '"Liberation Sans", Arial, sans-serif' },
  { value: "Liberation Serif", label: "Liberation Serif", css: '"Liberation Serif", "Times New Roman", serif' },
  { value: "Noto Sans", label: "Noto Sans", css: '"Noto Sans", system-ui, sans-serif' },
] as const;
export const JOB_POLL_INTERVAL_MS = 2200;
export const RECENT_LOG_LIMIT = 10;

export const statusCopy: Record<JobStatus, string> = {
  queued: "Queued",
  running: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export const statusIcon: Record<JobStatus, LucideIcon> = {
  queued: Clock3,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};
