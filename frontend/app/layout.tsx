import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { SiteFooter } from "./_components/SiteFooter";
import { Topbar } from "./_components/Topbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ClipForge",
  description: "Turn long videos into ready-to-post clips",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable}`}>
        <div className="shell">
          <Topbar />
          {children}
          <SiteFooter />
        </div>
        <Toaster
          position="top-center"
          gutter={12}
          toastOptions={{
            duration: 3600,
            style: {
              border: "1px solid var(--border)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-md)",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontWeight: 500,
              padding: "12px 14px",
            },
          }}
        />
      </body>
    </html>
  );
}
