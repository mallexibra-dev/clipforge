import toast from "react-hot-toast";
import type { ClipJob } from "../types/clip.type";

export function isActiveJob(job: ClipJob | null) {
  return job?.status === "queued" || job?.status === "running";
}

export function clipTitle(name: string) {
  return name.replace(/\.mp4$/i, "").replace(/^clip_\d+_/, "").replace(/-/g, " ");
}

async function downloadClip(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Gagal mengunduh file");

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

export async function handleDownload(url: string, filename: string, subject = "Klip") {
  return toast
    .promise(downloadClip(url, filename), {
      loading: `Mengunduh ${subject.toLowerCase()}...`,
      success: `${subject} berhasil disimpan ke perangkat!`,
      error: `Gagal mengunduh ${subject.toLowerCase()}`,
    })
    .catch(() => {
      window.open(url, "_blank");
    });
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export async function handleCopyTitle(title: string) {
  await navigator.clipboard.writeText(title);
  toast.success("Judul klip berhasil disalin");
}

export async function handleCopyText(text: string, message = "Berhasil disalin") {
  await navigator.clipboard.writeText(text);
  toast.success(message);
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
