import { NextResponse } from "next/server";
import { buscarEventoPorToken } from "@/lib/calendar/cliente";
import { generarIcs } from "@/lib/ics";

interface Contexto {
  params: Promise<{ token: string }>;
}

/**
 * Resuelve la URL absoluta a la página personal del turno. Usa NEXT_PUBLIC_SITE_URL si está
 * definida (recomendado en producción); si no, la arma con los headers del request (host /
 * x-forwarded-host + x-forwarded-proto), que es lo que llega detrás de casi cualquier proxy/CDN.
 */
function construirUrlTurno(request: Request, token: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    return `${siteUrl.replace(/\/+$/, "")}/turno/${token}`;
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}/turno/${token}`;
}

export async function GET(request: Request, { params }: Contexto) {
  const { token } = await params;

  const evento = await buscarEventoPorToken(token).catch((error: unknown) => {
    console.error("Error al buscar turno para .ics:", error instanceof Error ? error.message : "desconocido");
    return null;
  });

  if (!evento) {
    return new NextResponse(null, { status: 404 });
  }

  const contenido = generarIcs({
    inicio: evento.inicio,
    fin: evento.fin,
    nombrePaciente: evento.nombre,
    urlTurno: construirUrlTurno(request, token),
    uid: token,
  });

  return new NextResponse(contenido, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="turno.ics"',
    },
  });
}
