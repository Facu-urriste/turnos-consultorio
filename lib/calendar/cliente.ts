import { google, calendar_v3 } from "googleapis";
import { JWT } from "google-auth-library";
import { DateTime } from "luxon";
import { config, secrets } from "@/config/config";
import { telefonoTelUrl, telefonoWhatsAppUrl } from "@/lib/telefono";
import type { Intervalo } from "@/lib/calendar/disponibilidad";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

let clienteCalendar: calendar_v3.Calendar | null = null;

/** Cliente autenticado con la service account, memoizado entre invocaciones. */
function obtenerClienteCalendar(): calendar_v3.Calendar {
  if (clienteCalendar) return clienteCalendar;

  const auth = new JWT({
    email: secrets.googleServiceAccountEmail,
    key: secrets.googleServiceAccountPrivateKey,
    scopes: SCOPES,
  });

  clienteCalendar = google.calendar({ version: "v3", auth });
  return clienteCalendar;
}

function esErrorConCodigo(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const conCodigo = err as { code?: unknown; response?: { status?: unknown } };
  if (typeof conCodigo.code === "number") return conCodigo.code;
  if (typeof conCodigo.code === "string" && /^\d+$/.test(conCodigo.code)) return Number(conCodigo.code);
  if (typeof conCodigo.response?.status === "number") return conCodigo.response.status;
  return undefined;
}

/** True si el error indica que el recurso ya no existe (borrado a mano, o ganó una cancelación concurrente). */
export function esErrorRecursoInexistente(err: unknown): boolean {
  const codigo = esErrorConCodigo(err);
  return codigo === 404 || codigo === 410;
}

/** True si el error indica conflicto de id duplicado al insertar (ver `crearEvento`). */
function esErrorIdDuplicado(err: unknown): boolean {
  return esErrorConCodigo(err) === 409;
}

/**
 * Id determinístico para el evento de un slot: mismo horario de inicio -> mismo id, siempre.
 * Esto es lo que vuelve atómica la reserva: si dos pacientes confirman el mismo horario a la
 * vez, el segundo `events.insert` de Calendar va a fallar por id duplicado (409) sin importar
 * qué devolvió el chequeo previo de disponibilidad. Formato válido para un id de evento de
 * Calendar (base32hex: dígitos y letras a-v en minúscula).
 */
function idEventoParaSlot(inicio: DateTime): string {
  return `turno${inicio.toUTC().toFormat("yyyyMMddHHmmss")}`;
}

export class SlotOcupadoError extends Error {
  constructor() {
    super("El horario ya estaba ocupado");
  }
}

function eventoAIntervalo(evento: calendar_v3.Schema$Event): Intervalo | null {
  const inicioRaw = evento.start?.dateTime ?? evento.start?.date;
  const finRaw = evento.end?.dateTime ?? evento.end?.date;
  if (!inicioRaw || !finRaw) return null;

  const esDiaCompleto = !evento.start?.dateTime;
  if (esDiaCompleto) {
    return {
      inicio: DateTime.fromISO(inicioRaw, { zone: config.zonaHoraria }).startOf("day"),
      fin: DateTime.fromISO(finRaw, { zone: config.zonaHoraria }).startOf("day"),
    };
  }
  return {
    inicio: DateTime.fromISO(inicioRaw, { zone: config.zonaHoraria }),
    fin: DateTime.fromISO(finRaw, { zone: config.zonaHoraria }),
  };
}

/**
 * Trae, ya resueltos como intervalos en la zona horaria del consultorio, todos los eventos
 * (de cualquier origen: la web o el profesional a mano) que se superponen con [desde, hasta).
 * Un evento de día completo bloquea el día entero.
 */
export async function obtenerEventosOcupados(desde: DateTime, hasta: DateTime): Promise<Intervalo[]> {
  const calendar = obtenerClienteCalendar();
  const eventos: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId: secrets.googleCalendarId,
      timeMin: desde.toUTC().toISO() ?? undefined,
      timeMax: hasta.toUTC().toISO() ?? undefined,
      singleEvents: true,
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    });
    eventos.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return eventos
    .filter((e) => e.status !== "cancelled")
    .map(eventoAIntervalo)
    .filter((i): i is Intervalo => i !== null);
}

export interface DatosNuevaReserva {
  nombre: string;
  telefonoNormalizado: string;
  mensaje?: string;
  inicio: DateTime;
  fin: DateTime;
  token: string;
}

/**
 * Crea el evento en Calendar y devuelve su id. Guarda token/telefono/mensaje en
 * extendedProperties.private para poder encontrarlo después sin necesitar una base de datos
 * propia. Usa un id determinístico por slot (ver `idEventoParaSlot`) para que la creación sea
 * atómica: si el id ya existe porque otra reserva ganó la carrera para el mismo horario,
 * Calendar devuelve 409 y tiramos `SlotOcupadoError` en vez de duplicar el turno. Si el id ya
 * existe pero pertenece a un evento CANCELADO (una reserva anterior para ese mismo horario que
 * se canceló), Calendar no permite "insert" de nuevo con ese id: hay que reactivarlo con
 * "update" en vez de crear uno nuevo.
 */
export async function crearEvento(datos: DatosNuevaReserva): Promise<string> {
  const calendar = obtenerClienteCalendar();
  const eventId = idEventoParaSlot(datos.inicio);

  const descripcion = [
    `Tel: ${telefonoTelUrl(datos.telefonoNormalizado)}`,
    `WhatsApp: ${telefonoWhatsAppUrl(datos.telefonoNormalizado)}`,
    ...(datos.mensaje ? ["", `Mensaje: ${datos.mensaje}`] : []),
  ].join("\n");

  const requestBody: calendar_v3.Schema$Event = {
    summary: datos.nombre,
    description: descripcion,
    start: { dateTime: datos.inicio.toISO() ?? undefined, timeZone: config.zonaHoraria },
    end: { dateTime: datos.fin.toISO() ?? undefined, timeZone: config.zonaHoraria },
    extendedProperties: {
      private: {
        token: datos.token,
        telefono: datos.telefonoNormalizado,
        mensaje: datos.mensaje ?? "",
      },
    },
  };

  try {
    const res = await calendar.events.insert({
      calendarId: secrets.googleCalendarId,
      requestBody: { ...requestBody, id: eventId },
    });
    if (!res.data.id) {
      throw new Error("Google Calendar no devolvió un id de evento al crear la reserva");
    }
    return res.data.id;
  } catch (err) {
    if (!esErrorIdDuplicado(err)) throw err;

    const existente = await calendar.events
      .get({ calendarId: secrets.googleCalendarId, eventId })
      .catch(() => null);
    if (!existente || existente.data.status !== "cancelled") {
      throw new SlotOcupadoError();
    }

    const res = await calendar.events.update({
      calendarId: secrets.googleCalendarId,
      eventId,
      requestBody: { ...requestBody, status: "confirmed" },
    });
    if (!res.data.id) {
      throw new Error("Google Calendar no devolvió un id de evento al reactivar la reserva");
    }
    return res.data.id;
  }
}

export interface EventoTurno {
  id: string;
  nombre: string;
  telefonoNormalizado: string;
  mensaje?: string;
  inicio: DateTime;
  fin: DateTime;
}

function eventoATurno(evento: calendar_v3.Schema$Event): EventoTurno | null {
  const intervalo = eventoAIntervalo(evento);
  const telefono = evento.extendedProperties?.private?.telefono;
  if (!intervalo || !telefono || !evento.id) return null;

  const mensaje = evento.extendedProperties?.private?.mensaje;
  return {
    id: evento.id,
    nombre: evento.summary ?? "",
    telefonoNormalizado: telefono,
    mensaje: mensaje ? mensaje : undefined,
    inicio: intervalo.inicio,
    fin: intervalo.fin,
  };
}

/** Busca el turno por su token (extendedProperties.private.token). Null si no existe o fue borrado. */
export async function buscarEventoPorToken(token: string): Promise<EventoTurno | null> {
  const calendar = obtenerClienteCalendar();
  const res = await calendar.events.list({
    calendarId: secrets.googleCalendarId,
    privateExtendedProperty: [`token=${token}`],
    showDeleted: false,
    singleEvents: true,
    maxResults: 1,
  });

  const evento = (res.data.items ?? []).find((e) => e.status !== "cancelled");
  if (!evento) return null;
  return eventoATurno(evento);
}

/** Cuenta las reservas futuras (desde `ahora`) asociadas a un teléfono normalizado. */
export async function contarEventosFuturosPorTelefono(
  telefonoNormalizado: string,
  ahora: DateTime
): Promise<number> {
  const calendar = obtenerClienteCalendar();
  let total = 0;
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId: secrets.googleCalendarId,
      privateExtendedProperty: [`telefono=${telefonoNormalizado}`],
      timeMin: ahora.toUTC().toISO() ?? undefined,
      singleEvents: true,
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    });
    const items = res.data.items ?? [];
    total += items.filter((e) => e.status !== "cancelled").length;
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return total;
}

/** Elimina el evento. Si ya no existe (404/410), propaga el error para que el llamador lo trate como "no encontrado". */
export async function eliminarEvento(eventId: string): Promise<void> {
  const calendar = obtenerClienteCalendar();
  await calendar.events.delete({
    calendarId: secrets.googleCalendarId,
    eventId,
  });
}
