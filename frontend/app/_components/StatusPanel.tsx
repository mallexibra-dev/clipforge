import { Activity } from "lucide-react";
import { statusIcon } from "../../lib/constants";
import { emptyStateClass, errorClass, panelClass, panelHeaderClass } from "../../lib/ui";
import type { ClipJob } from "../../types/clip.type";

type StatusPanelProps = {
  job: ClipJob | null;
  latestLogs: string[];
};

export function StatusPanel({ job, latestLogs }: StatusPanelProps) {
  const StatusIcon = job ? statusIcon[job.status] : Activity;

  return (
    <section className={`${panelClass} flex min-h-[300px] flex-col p-8`}>
      <div className={`${panelHeaderClass} mb-6`}>
        <StatusIcon
          className={`text-brand ${job?.status === "running" ? "animate-spin" : ""}`}
          size={20}
        />
        <h2 className="text-lg font-semibold text-ink">Aktivitas</h2>
      </div>

      {job ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-line bg-canvas px-3 py-1.5 text-[13px] font-medium text-muted">
              {job.request.top ?? "Auto"} klip target
            </span>
            <span className="rounded-md border border-line bg-canvas px-3 py-1.5 text-[13px] font-medium text-muted">
              {job.request.min_duration}s - {job.request.max_duration}s
            </span>
            <span className="rounded-md border border-line bg-canvas px-3 py-1.5 text-[13px] font-medium text-muted">
              {job.request.analyze_seconds ? `Test: ${job.request.analyze_seconds}s` : "Full video"}
            </span>
            <span className="rounded-md border border-line bg-canvas px-3 py-1.5 text-[13px] font-medium text-muted">
              {job.request.crop_mode === "person" ? "Follow person" : "Center crop"}
            </span>
          </div>

          <div className="min-h-60 flex-1 overflow-auto rounded-lg border border-line bg-slate-800 p-4">
            {latestLogs.length ? (
              latestLogs.map((line, index) => (
                <p
                  key={`${line}-${index}`}
                  className="mb-1 font-mono text-[13px] leading-[1.6] text-slate-200 last:mb-0 last:text-sky-400"
                >
                  {line}
                </p>
              ))
            ) : (
              <p className="mb-1 font-mono text-[13px] leading-[1.6] text-slate-200">
                Memulai proses pipeline...
              </p>
            )}
          </div>

          {job.error ? <p className={`${errorClass} mt-4`}>{job.error}</p> : null}
        </div>
      ) : (
        <div className={`${emptyStateClass} min-h-0 flex-1`}>
          <Activity className="mb-3 opacity-50" size={32} />
          <p className="mt-2 max-w-[400px] text-sm leading-normal">Belum ada proses berjalan.</p>
          <p className="mt-1 text-[13px]">
            Masukkan link YouTube, lalu klik <strong>Mulai Potong Video</strong> untuk memulai.
          </p>
        </div>
      )}
    </section>
  );
}
