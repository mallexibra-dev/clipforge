import type { Metadata } from "next";
import { DownloadPage } from "../_components/DownloadPage";

export const metadata: Metadata = {
  title: "Download · ClipForge",
};

export default function DownloadRoute() {
  return (
    <main>
      <DownloadPage />
    </main>
  );
}
