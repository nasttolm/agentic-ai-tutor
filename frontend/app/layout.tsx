import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Tutor",
  description: "AI-powered tutor with LoRA + RAG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
