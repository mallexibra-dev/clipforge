import type { ClipJob, CreateClipJobInput } from "../types/clip.type";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8010";
const CLIENT_API_BASE = "";

export const uploadVideo = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  // Upload straight to the backend; the Next.js proxy corrupts binary bodies.
  const response = await fetch(`${API_BASE}/api/uploads`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Failed to upload video");
  }
  return (await response.json()) as {
    source_file: string;
    original_name: string;
    duration: number | null;
  };
};

export const fetchModels = async (baseUrl: string, apiKey: string) => {
  const response = await fetch(`${API_BASE}/api/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_url: baseUrl, api_key: apiKey }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Failed to load models");
  }
  const data = (await response.json()) as { models: string[] };
  return data.models;
};

export const probeUrlDuration = async (url: string) => {
  const response = await fetch(`${API_BASE}/api/probe?url=${encodeURIComponent(url)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { duration: number | null };
  return data.duration;
};

export const getJobs = async () => {
  const response = await fetch(`${CLIENT_API_BASE}/api/jobs`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load jobs");
  }
  return (await response.json()) as ClipJob[];
};

export const deleteJobs = async () => {
  const response = await fetch(`${CLIENT_API_BASE}/api/jobs`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to delete jobs");
  }
};

export const getJob = async (jobId: string) => {
  const response = await fetch(`${CLIENT_API_BASE}/api/jobs/${jobId}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load job");
  }
  return (await response.json()) as ClipJob;
};

export const createJob = async (input: CreateClipJobInput) => {
  const response = await fetch(`${CLIENT_API_BASE}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Failed to create job");
  }

  return (await response.json()) as ClipJob;
};

export const getOutputUrl = (path: string) => `${API_BASE}${path}`;
