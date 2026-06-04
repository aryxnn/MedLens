import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedLens · AI Diagnosis Grounded in NHS Evidence",
  description: "Next-generation symptom triage tool powered by localized RAG retrieval and safety guardrails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b132b] text-white">
        <div className="nav">
          <Link href="/" className="nav-logo">
            <div className="logo-dot"></div>
            MedLens
          </Link>
          <div className="nav-links">
            <Link href="/diagnose">Workspace</Link>
            <Link href="/metrics">Metrics</Link>
          </div>
          <Link href="/diagnose">
            <button className="nav-cta">Try Workspace</button>
          </Link>
        </div>

        <main className="flex-1 flex flex-col">
          {children}
        </main>

        <footer className="w-full py-8 text-center text-xs text-[#64748b] border-t border-[rgba(255,255,255,0.05)] mt-12">
          &copy; {new Date().getFullYear()} MedLens. Grounded in NHS Guidelines. For evaluation/demo purposes only.
        </footer>
      </body>
    </html>
  );
}
