import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { consultorioPublico } from "@/app/lib/consultorioPublico";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: `Turnos - ${consultorioPublico.nombreConsultorio}`,
  description: "Reservá tu turno online de forma simple y rápida.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
