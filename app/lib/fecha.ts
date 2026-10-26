const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM" del mes actual, según la fecha local del dispositivo. */
export function formatoMesActual(): string {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${pad2(ahora.getMonth() + 1)}`;
}

/** Suma (o resta) meses a un "YYYY-MM" y devuelve el resultado en el mismo formato. */
export function sumarMeses(mesISO: string, delta: number): string {
  const [anio, mes] = mesISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1 + delta, 1);
  return `${fecha.getFullYear()}-${pad2(fecha.getMonth() + 1)}`;
}

/** "Noviembre 2026" a partir de "YYYY-MM". */
export function nombreMesAnio(mesISO: string): string {
  const [anio, mes] = mesISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, 1);
  const texto = fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export interface CeldaDia {
  fecha: string; // "YYYY-MM-DD"
  numero: number;
}

/**
 * Celdas para pintar la grilla del mes (lunes a domingo). Devuelve `null` para los huecos
 * antes del día 1, de forma que el día 1 caiga en la columna correcta.
 */
export function diasDelMes(mesISO: string): (CeldaDia | null)[] {
  const [anio, mes] = mesISO.split("-").map(Number);
  const primerDia = new Date(anio, mes - 1, 1);
  const cantidadDias = new Date(anio, mes, 0).getDate();
  // getDay(): 0=domingo..6=sábado -> lo convertimos a lunes=0..domingo=6
  const huecosIniciales = (primerDia.getDay() + 6) % 7;

  const celdas: (CeldaDia | null)[] = [];
  for (let i = 0; i < huecosIniciales; i++) celdas.push(null);
  for (let dia = 1; dia <= cantidadDias; dia++) {
    celdas.push({ fecha: `${anio}-${pad2(mes)}-${pad2(dia)}`, numero: dia });
  }
  return celdas;
}

/** "martes 4 de noviembre" a partir de "YYYY-MM-DD" (sin componente horario). */
export function formatFechaLarga(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

/** "martes 4 de noviembre a las 10:00", a partir de un ISO con offset (zona del consultorio). */
export function formatFechaHoraDesdeISO(iso: string): string {
  const fecha = new Date(iso);
  const diaTexto = fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: ZONA_HORARIA,
  });
  const horaTexto = fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA_HORARIA,
  });
  return `${diaTexto} a las ${horaTexto}`;
}

/** "del martes 4 a las 10:00", para usar dentro del texto del modal de cancelación. */
export function formatDescripcionCorta(iso: string): string {
  const fecha = new Date(iso);
  const diaSemana = fecha.toLocaleDateString("es-AR", { weekday: "long", timeZone: ZONA_HORARIA });
  const dia = fecha.toLocaleDateString("es-AR", { day: "numeric", timeZone: ZONA_HORARIA });
  const hora = fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA_HORARIA,
  });
  return `del ${diaSemana} ${dia} a las ${hora}`;
}

/** Convierte un ISO con offset a formato "YYYYMMDDTHHmmssZ" (UTC), para links de Google Calendar. */
export function formatFechaGoogleCalendar(iso: string): string {
  const fecha = new Date(iso);
  return fecha.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
