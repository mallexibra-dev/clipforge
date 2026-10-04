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
      <body className={`${inter.variable} flex min-h-screen flex-col bg-canvas font-sans text-ink tracking-[-0.01em]`}>
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 min-[921px]:px-6 min-[921px]:py-8">
          <Topbar />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </div>
        <Toaster
          position="top-center"
          gutter={12}
          toastOptions={{
            duration: 3600,
            style: {
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-md)",
              color: "var(--color-ink)",
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
