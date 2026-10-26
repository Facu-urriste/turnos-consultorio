import consultorioJson from "./consultorio.json";

export interface Corte {
  inicio: string; // "HH:mm"
  fin: string; // "HH:mm"
}

export type DiaSemana = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

export interface Prestacion {
  id: string;
  nombre: string;
  duracionMinutos: number;
}

export interface ConfigConsultorio {
  zonaHoraria: string;
  profesional: { nombre: string };
  consultorio: { nombre: string; direccion: string; telefono: string };
  duracionTurnoMinutos: number;
  anticipacionMinimaReservaHoras: number;
  anticipacionMinimaCancelacionHoras: number;
  horizonteReservaSemanas: number;
  horarios: Record<DiaSemana, Corte[]>;
  prestaciones: Prestacion[];
}

export const DIAS_SEMANA: DiaSemana[] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

/** Luxon usa weekday 1=lunes ... 7=domingo; este arreglo lo mapea a la clave del config. */
export function diaSemanaDesdeLuxonWeekday(weekday: number): DiaSemana {
  return DIAS_SEMANA[weekday - 1];
}

export const config: ConfigConsultorio = consultorioJson as ConfigConsultorio;

export const secrets = {
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
  googleServiceAccountPrivateKey: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID ?? "",
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
};
