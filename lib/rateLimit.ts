import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { secrets } from "@/config/config";

const VENTANA = "10 m";
const MAX_SOLICITUDES = 5;

let limiterCache: Ratelimit | null | undefined;

/**
 * Devuelve el limitador de Upstash, o null si no está configurado (en cuyo caso no se limita
 * por IP; el límite por teléfono sigue aplicando igual porque no depende de esto).
 */
function obtenerLimiter(): Ratelimit | null {
  if (limiterCache !== undefined) return limiterCache;

  if (!secrets.upstashRedisRestUrl || !secrets.upstashRedisRestToken) {
    limiterCache = null;
    return limiterCache;
  }

  const redis = new Redis({
    url: secrets.upstashRedisRestUrl,
    token: secrets.upstashRedisRestToken,
  });

  limiterCache = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(MAX_SOLICITUDES, VENTANA),
    prefix: "turnos-consultorio:reservas",
  });

  return limiterCache;
}

/** True si la IP todavía puede hacer una solicitud de reserva dentro de la ventana actual. */
export async function permitirReserva(ip: string): Promise<boolean> {
  const limiter = obtenerLimiter();
  if (!limiter) return true;
  const { success } = await limiter.limit(ip);
  return success;
}

/** Extrae la IP del cliente de los headers estándar que reenvía Next.js / el proxy. */
export function obtenerIpDesdeHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const primera = forwarded.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return headers.get("x-real-ip") ?? "desconocida";
}
