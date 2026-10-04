import { Clipboard, Download, ExternalLink, Video } from "lucide-react";
import { getOutputUrl } from "../../lib/apiClient";
import { clipTitle, handleCopyTitle, handleDownload } from "../../lib/utils";
import { emptyStateClass, sectionHeaderClass } from "../../lib/ui";
import type { ClipFile } from "../../types/clip.type";
import { ThumbnailPrompt } from "./ThumbnailPrompt";

type ResultsSectionProps = {
  clips: ClipFile[];
};

const clipActionButtonClass =
  "inline-flex min-h-12 w-1/2 cursor-pointer items-center justify-center gap-2 text-[13px] font-semibold text-muted transition hover:bg-canvas hover:text-brand";

export function ResultsSection({ clips }: ResultsSectionProps) {
  return (
    <section className="mt-12">
      <div className={sectionHeaderClass}>
        <h2 className="text-xl font-bold text-ink">Klip Siap Digunakan</h2>
        <span className="rounded-full border border-line bg-canvas px-3 py-1 text-[13px] font-semibold text-muted">
          {clips.length} klip siap
        </span>
      </div>

      {clips.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
          {clips.map((clip) => {
            const title = clipTitle(clip.name);
            const url = getOutputUrl(clip.url);

            return (
              <article
                className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm transition duration-200 [transition-property:transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                key={clip.url}
              >
                <video className="block aspect-[9/16] w-full bg-black" controls preload="metadata" src={url} />
                <div className="flex items-start justify-between gap-3 p-4">
                  <h3 className="text-sm font-semibold leading-[1.4] capitalize text-ink">{title}</h3>
                  <button
                    className="inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-bold text-brand transition hover:border-blue-200 hover:bg-blue-50"
                    type="button"
                    onClick={() => handleCopyTitle(title)}
                    title="Salin judul klip"
                  >
                    <Clipboard size={14} />
                    Copy
                  </button>
                </div>
                <div className="flex items-center border-t border-line [&>*+*]:border-l [&>*+*]:border-line">
                  <a className={clipActionButtonClass} href={url} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                    Buka
                  </a>
                  <button
                    className={clipActionButtonClass}
                    type="button"
                    onClick={() => handleDownload(url, clip.name)}
                  >
                    <Download size={16} />
                    Unduh
                  </button>
                </div>
                <ThumbnailPrompt clip={clip} />
              </article>
            );
          })}
        </div>
      ) : (
        <div className={emptyStateClass}>
          <Video className="mb-3 opacity-50" size={32} />
          <p className="mt-2 max-w-[400px] text-sm leading-normal">
            Klip vertikal 9:16 yang selesai diproses akan muncul di sini.
          </p>
        </div>
      )}
    </section>
  );
}
