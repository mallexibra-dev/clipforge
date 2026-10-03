"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";

const PAGES = [
  { href: "/", label: "Clipping" },
  { href: "/download", label: "Download" },
];

export const REFRESH_EVENT = "clipforge:refresh";

export function Topbar() {
  const pathname = usePathname();

  return (
    <section className="topbar">
      <div className="topbar-brand">
        <img className="brandMark" src="/logo.svg" alt="" aria-hidden="true" />
        <div className="brandCopy">
          <h1 className="logo-text">ClipForge</h1>
          <p className="tagline">Turn long videos into ready-to-post clips.</p>
        </div>
      </div>
      <div className="topbarActions">
        <div className="segmentedControl pageToggle" role="tablist" aria-label="Pilih halaman">
          {PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              role="tab"
              aria-selected={pathname === page.href}
              className={pathname === page.href ? "active" : ""}
            >
              {page.label}
            </Link>
          ))}
        </div>
        <button
          className="iconButton"
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(REFRESH_EVENT))}
          title="Refresh data"
        >
          <RefreshCw size={18} />
        </button>
      </div>
    </section>
  );
}
