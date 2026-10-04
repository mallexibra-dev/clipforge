export const panelClass = "rounded-2xl border border-line bg-panel shadow-sm";

export const panelHeaderClass = "flex items-center gap-3 border-b border-line pb-4";

export const sectionHeaderClass =
  "mb-6 flex items-center justify-between border-b border-line pb-4";

export const fieldLabelClass = "text-sm font-semibold text-ink";

export const fieldHelpClass = "mt-1 text-xs text-muted";

export const errorClass =
  "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium leading-normal text-danger";

export const inputBaseClass =
  "w-full border border-line bg-white text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-[3px] focus:ring-brand/15";

export const textFieldClass = `${inputBaseClass} min-h-11 rounded-lg px-4`;

export const primaryButtonClass =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-semibold text-white shadow-sm transition enabled:hover:bg-brand-hover enabled:hover:shadow-md disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-65";

export const iconButtonClass =
  "inline-grid cursor-pointer place-items-center rounded-lg border border-line bg-panel text-muted transition hover:bg-canvas hover:text-brand";

export const emptyStateClass =
  "flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-panel p-8 text-center text-muted";

export function segmentedContainer(cols: 2 | 3, extra = "") {
  return `grid gap-1 rounded-lg border border-line bg-[#EEF2F7] p-1 ${
    cols === 2 ? "grid-cols-2" : "grid-cols-3"
  } ${extra}`;
}

export function segmentedItem(active: boolean, extra = "", compact = false) {
  return [
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent text-[13px] font-bold text-slate-600 transition",
    compact ? "min-h-[34px]" : "min-h-[38px]",
    "hover:bg-white/65 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand/35",
    active
      ? "border-blue-500 bg-linear-to-b from-blue-400 to-blue-500 text-white shadow-[0_4px_10px_rgba(37,99,235,0.18)] hover:from-blue-500 hover:to-brand hover:border-brand hover:text-white"
      : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}
