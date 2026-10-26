import { DateTime } from "luxon";
import { config } from "@/config/config";

export interface DatosIcs {
  inicio: DateTime;
  fin: DateTime;
  nombrePaciente: string;
  /** URL absoluta a la página personal del turno (para ver/cancelar), ej. https://sitio/turno/<token>. */
  urlTurno: string;
  /** Identificador único y estable del evento (se puede usar el token del turno). */
  uid: string;
}

function formatoFechaUTC(dt: DateTime): string {
  return dt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
}

/** Escapa texto según la sintaxis de valores de texto de RFC 5545. */
function escaparTexto(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Genera el contenido completo de un archivo .ics con un único VEVENT. Función pura, sin I/O. */
export function generarIcs(datos: DatosIcs): string {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escaparTexto(config.consultorio.nombre)}//Turnos//ES`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escaparTexto(datos.uid)}@turnos-consultorio`,
    `DTSTAMP:${formatoFechaUTC(DateTime.now())}`,
    `DTSTART:${formatoFechaUTC(datos.inicio)}`,
    `DTEND:${formatoFechaUTC(datos.fin)}`,
    `SUMMARY:${escaparTexto(`Turno - ${config.profesional.nombre}`)}`,
    `LOCATION:${escaparTexto(`${config.consultorio.nombre}, ${config.consultorio.direccion}`)}`,
    `DESCRIPTION:${escaparTexto(
      `Turno de ${datos.nombrePaciente} en ${config.consultorio.nombre}. Ver o cancelar: ${datos.urlTurno}`
    )}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lineas.join("\r\n") + "\r\n";
}
