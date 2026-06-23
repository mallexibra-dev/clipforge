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

export async function handleDownload(url: string, filename: string) {
  toast
    .promise(downloadClip(url, filename), {
      loading: "Mengunduh klip...",
      success: "Klip berhasil diunduh!",
      error: "Gagal mengunduh klip",
    })
    .catch(() => {
      window.open(url, "_blank");
    });
}

export async function handleCopyTitle(title: string) {
  await navigator.clipboard.writeText(title);
  toast.success("Judul klip berhasil disalin");
}

export async function handleCopyText(text: string, message = "Berhasil disalin") {
  await navigator.clipboard.writeText(text);
  toast.success(message);
}
