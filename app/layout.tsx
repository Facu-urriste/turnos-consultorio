import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { consultorioPublico } from "@/app/lib/consultorioPublico";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `Turnos - ${consultorioPublico.nombreConsultorio}`,
  description: "Reservá tu turno online de forma simple y rápida.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
