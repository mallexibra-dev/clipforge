import { Trash2 } from "lucide-react";
import { statusCopy, statusIcon } from "../../lib/constants";
import { iconButtonClass, sectionHeaderClass } from "../../lib/ui";
import type { ClipJob } from "../../types/clip.type";

type HistorySectionProps = {
  jobs: ClipJob[];
  onDeleteAll: () => void;
  onSelectJob: (job: ClipJob) => void;
};

const STATUS_TEXT: Record<ClipJob["status"], string> = {
  completed: "text-success",
  running: "text-warning",
  failed: "text-danger",
  queued: "text-muted",
};

export function HistorySection({ jobs, onDeleteAll, onSelectJob }: HistorySectionProps) {
  return (
    <section className="mt-12">
      <div className={sectionHeaderClass}>
        <h2 className="text-xl font-bold text-ink">Riwayat Proses</h2>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-line bg-canvas px-3 py-1 text-[13px] font-semibold text-muted">
            {jobs.length} total
          </span>
          {jobs.length > 0 ? (
            <button
              type="button"
              onClick={onDeleteAll}
              className={`${iconButtonClass} h-8 w-8 text-danger`}
              title="Hapus Semua Riwayat"
            >
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {jobs.map((item) => {
          const Icon = statusIcon[item.status];
          const count = item.clips.length ? `${item.clips.length} klip` : `${item.candidates.length} kandidat`;

          return (
            <button
              className="flex min-h-16 w-full cursor-pointer items-center justify-start gap-4 rounded-2xl border border-line bg-panel px-5 text-sm font-medium text-ink shadow-sm transition hover:border-slate-300 hover:bg-canvas"
              type="button"
              key={item.id}
              onClick={() => onSelectJob(item)}
            >
              <div className={`flex items-center gap-2 text-muted ${STATUS_TEXT[item.status]}`}>
                <Icon className={item.status === "running" ? "animate-spin" : ""} size={18} />
              </div>
              <span>{statusCopy[item.status]}</span>
              <strong className="ml-auto rounded-md border border-line bg-canvas px-2 py-1 text-[13px] font-bold text-ink">
                {count}
              </strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
