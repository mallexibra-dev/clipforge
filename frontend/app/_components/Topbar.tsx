"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { iconButtonClass, segmentedContainer, segmentedItem } from "../../lib/ui";

const PAGES = [
  { href: "/", label: "Clipping" },
  { href: "/download", label: "Download" },
];

export const REFRESH_EVENT = "clipforge:refresh";

export function Topbar() {
  const pathname = usePathname();

  return (
    <section className="sticky top-0 z-20 -mx-4 -mt-6 mb-8 border-b border-line bg-canvas/92 px-4 pt-6 pb-[18px] backdrop-blur-md min-[921px]:-mx-6 min-[921px]:-mt-8 min-[921px]:mb-10 min-[921px]:px-6 min-[921px]:pt-8 min-[921px]:pb-6">
      <div className="flex flex-col items-center gap-3 min-[521px]:flex-row min-[521px]:justify-between min-[521px]:gap-4">
        <div className="flex items-center gap-2.5 min-[521px]:gap-3">
          <img
            className="block h-9 w-9 flex-none min-[521px]:h-10 min-[521px]:w-10"
            src="/logo.svg"
            alt=""
            aria-hidden="true"
          />
          <div className="flex flex-col items-center gap-0.5 min-[521px]:flex-row min-[521px]:items-baseline min-[521px]:gap-3.5">
            <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.03em] text-brand min-[521px]:text-2xl">
              ClipForge
            </h1>
            <p className="m-0 text-center text-[13px] font-medium leading-[1.35] text-muted min-[521px]:text-sm min-[521px]:leading-normal">
              Turn long videos into ready-to-post clips.
            </p>
          </div>
        </div>
        <div className="flex w-full items-center gap-2.5 min-[521px]:w-auto">
          <div
            className={segmentedContainer(2, "flex-1 min-[521px]:flex-none")}
            role="tablist"
            aria-label="Pilih halaman"
          >
            {PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                role="tab"
                aria-selected={pathname === page.href}
                className={segmentedItem(
                  pathname === page.href,
                  "min-w-0 px-2.5 min-[521px]:min-w-24 min-[521px]:px-3.5",
                  true,
                )}
              >
                {page.label}
              </Link>
            ))}
          </div>
          <button
            className={`${iconButtonClass} h-9 w-9 flex-none min-[521px]:h-10 min-[521px]:w-10`}
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(REFRESH_EVENT))}
            title="Refresh data"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
