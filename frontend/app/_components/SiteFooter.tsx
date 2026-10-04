import { Coffee, Heart } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-10 flex flex-col items-center gap-3 border-t border-line pt-[22px] pb-2 text-center text-[13px] font-medium text-muted min-[521px]:flex-row min-[521px]:justify-between min-[521px]:gap-4 min-[521px]:text-left">
      <p className="inline-flex items-center gap-[5px]">
        Open-source project by{" "}
        <a
          className="font-bold text-brand transition hover:text-brand-hover hover:underline"
          href="https://mallexibra.my.id/"
          target="_blank"
          rel="noreferrer"
        >
          Mallexibra
        </a>
        <Heart size={14} className="text-danger" aria-hidden="true" />
      </p>
      <a
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 shadow-sm transition hover:border-amber-500 hover:bg-amber-50 hover:no-underline"
        href="https://saweria.co/mallexibra"
        target="_blank"
        rel="noreferrer"
      >
        <Coffee size={16} className="text-amber-700" aria-hidden="true" />
        Buy me a coffee
      </a>
    </footer>
  );
}
