import { Download } from "lucide-react";

export function DownloadPage() {
  return (
    <section className="downloadPage">
      <div className="downloadEmpty">
        <span className="downloadIcon">
          <Download size={26} />
        </span>
        <h2>Download Video</h2>
        <p>Unduh video YouTube lengkap tanpa dipotong. Fitur ini sedang disiapkan.</p>
      </div>
    </section>
  );
}
