import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import type { Corte } from "@/config/config";
import { calcularEstadoDia, calcularHorariosLibres, eventosQueSuperponenRango, type Intervalo } from "./disponibilidad";

const ZONA = "America/Argentina/Buenos_Aires";
const CORTES_DOBLE: Corte[] = [
  { inicio: "09:00", fin: "13:00" },
  { inicio: "15:00", fin: "19:00" },
];
const DURACION = 30;

/** Un lunes cualquiera, lejos del horizonte y sin problema de anticipación. */
function diaBase(): DateTime {
  return DateTime.fromISO("2026-11-02", { zone: ZONA }); // lunes
}

/** `ahora` muy anterior para que la anticipación mínima nunca estorbe en los tests que no la testean. */
function ahoraLejano(fecha: DateTime): DateTime {
  return fecha.minus({ days: 10 });
}

describe("calcularHorariosLibres - cortes de horario", () => {
  it("no ofrece un slot que cruza el límite entre el corte de la mañana y el de la tarde", () => {
    // El corte de la mañana termina a las 13:00. Un slot de 30' que arrancara a las 12:45
    // terminaría a las 13:15, fuera del corte de la mañana, y el corte de la tarde empieza
    // a las 15:00: no hay continuidad, así que ese horario nunca debe aparecer.
    const fecha = diaBase();
    const libres = calcularHorariosLibres({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
    });
    expect(libres).not.toContain("12:45");
    // El último slot válido de la mañana es el que arranca a las 12:30 (termina justo a las 13:00).
    expect(libres).toContain("12:30");
    expect(libres).not.toContain("13:00");
    expect(libres).not.toContain("13:30");
    // El corte de la tarde arranca limpio a las 15:00.
    expect(libres).toContain("15:00");
  });

  it("genera exactamente los slots esperados para un día con dos cortes", () => {
    const fecha = diaBase();
    const libres = calcularHorariosLibres({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
    });
    const mañana = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"];
    const tarde = ["15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"];
    expect(libres).toEqual([...mañana, ...tarde]);
  });

  it("no genera ningún slot si no hay cortes ese día (p. ej. fin de semana)", () => {
    const fecha = diaBase();
    const libres = calcularHorariosLibres({
      fecha,
      cortes: [],
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
    });
    expect(libres).toEqual([]);
  });
});

describe("calcularHorariosLibres - eventos superpuestos", () => {
  function slot(fecha: DateTime, horaIni: string, horaFin: string): Intervalo {
    const [h1, m1] = horaIni.split(":").map(Number);
    const [h2, m2] = horaFin.split(":").map(Number);
    return {
      inicio: fecha.set({ hour: h1, minute: m1, second: 0, millisecond: 0 }),
      fin: fecha.set({ hour: h2, minute: m2, second: 0, millisecond: 0 }),
    };
  }

  it("bloquea solo el slot que se superpone parcialmente", () => {
    const fecha = diaBase();
    // Evento de 09:15 a 09:45 se superpone parcialmente con los slots 09:00-09:30 y 09:30-10:00.
    const ocupado = slot(fecha, "09:15", "09:45");
    const libres = calcularHorariosLibres({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [ocupado],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
    });
    expect(libres).not.toContain("09:00");
    expect(libres).not.toContain("09:30");
    expect(libres).toContain("10:00");
  });

  it("bloquea el slot que coincide totalmente", () => {
    const fecha = diaBase();
    const ocupado = slot(fecha, "10:00", "10:30");
    const libres = calcularHorariosLibres({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [ocupado],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
    });
    expect(libres).not.toContain("10:00");
    expect(libres).toContain("09:30");
    expect(libres).toContain("11:00");
  });

  it("varios eventos chicos que juntos tapan un corte entero lo dejan sin slots", () => {
    const fecha = diaBase();
    // Cuatro eventos de 1h cada uno cubren exactamente el corte de la tarde (15-19).
    const ocupados = [
      slot(fecha, "15:00", "16:00"),
      slot(fecha, "16:00", "17:00"),
      slot(fecha, "17:00", "18:00"),
      slot(fecha, "18:00", "19:00"),
    ];
    const libres = calcularHorariosLibres({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: ocupados,
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
    });
    const tardeLibre = libres.filter((h) => h >= "15:00");
    expect(tardeLibre).toEqual([]);
    // La mañana sigue intacta.
    expect(libres).toContain("09:00");
  });

  it("un evento estirado por el profesional (más largo que la duración del turno) tapa varios slots", () => {
    const fecha = diaBase();
    // El profesional anotó un procedimiento largo de 09:00 a 11:00 (4 slots de 30').
    const ocupado = slot(fecha, "09:00", "11:00");
    const libres = calcularHorariosLibres({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [ocupado],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
    });
    expect(libres).not.toContain("09:00");
    expect(libres).not.toContain("09:30");
    expect(libres).not.toContain("10:00");
    expect(libres).not.toContain("10:30");
    expect(libres).toContain("11:00");
  });

  it("un evento de día completo bloquea todo el día (vía calcularEstadoDia)", () => {
    const fecha = diaBase();
    // Un evento de día completo se modela como un intervalo que cubre todo [00:00, 24:00).
    const diaCompleto: Intervalo = {
      inicio: fecha.startOf("day"),
      fin: fecha.startOf("day").plus({ days: 1 }),
    };
    const estado = calcularEstadoDia({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [diaCompleto],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
      horizonteReservaSemanas: 4,
    });
    expect(estado).toBe("completo");

    const libres = calcularHorariosLibres({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [diaCompleto],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
    });
    expect(libres).toEqual([]);
  });
});

describe("eventosQueSuperponenRango", () => {
  it("filtra eventos fuera del rango y conserva los que se solapan", () => {
    const fecha = diaBase();
    const dentro: Intervalo = {
      inicio: fecha.set({ hour: 10 }),
      fin: fecha.set({ hour: 11 }),
    };
    const fuera: Intervalo = {
      inicio: fecha.set({ hour: 20 }),
      fin: fecha.set({ hour: 21 }),
    };
    const resultado = eventosQueSuperponenRango(
      [dentro, fuera],
      fecha.set({ hour: 9 }),
      fecha.set({ hour: 13 })
    );
    expect(resultado).toEqual([dentro]);
  });
});

describe("calcularEstadoDia - cambio de mes", () => {
  it("calcula bien el primer día de un mes", () => {
    // 2026-11-01 es domingo: sin cortes configurados -> cerrado.
    const fecha = DateTime.fromISO("2026-11-01", { zone: ZONA });
    const estado = calcularEstadoDia({
      fecha,
      cortes: [],
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
      horizonteReservaSemanas: 4,
    });
    expect(estado).toBe("cerrado");
  });

  it("calcula bien el último día de un mes", () => {
    // 2026-11-30 es lunes: con cortes y sin eventos -> disponible.
    const fecha = DateTime.fromISO("2026-11-30", { zone: ZONA });
    const estado = calcularEstadoDia({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
      horizonteReservaSemanas: 52,
    });
    expect(estado).toBe("disponible");
  });

  it("calcula bien el primer día de un mes con 31 días que empieza en año distinto (diciembre/enero)", () => {
    const fecha = DateTime.fromISO("2027-01-01", { zone: ZONA }); // viernes
    const estado = calcularEstadoDia({
      fecha,
      cortes: [{ inicio: "09:00", fin: "13:00" }],
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora: ahoraLejano(fecha),
      anticipacionMinimaHoras: 2,
      horizonteReservaSemanas: 52,
    });
    expect(estado).toBe("disponible");
  });
});

describe("calcularHorariosLibres - anticipación mínima", () => {
  it("no ofrece un slot que cae dentro de las próximas N horas", () => {
    const fecha = diaBase();
    // "ahora" es a las 08:00 del mismo día, con anticipación mínima de 2 horas: el límite
    // es las 10:00. El slot de 09:30 cae dentro de esa ventana y no debe ofrecerse.
    const ahora = fecha.set({ hour: 8, minute: 0 });
    const libres = calcularHorariosLibres({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora,
      anticipacionMinimaHoras: 2,
    });
    expect(libres).not.toContain("09:00");
    expect(libres).not.toContain("09:30");
    expect(libres).toContain("10:00");
  });

  it("el slot justo en el límite de anticipación sí se ofrece (comparación estricta <)", () => {
    const fecha = diaBase();
    const ahora = fecha.set({ hour: 7, minute: 30 }); // límite: 09:30
    const libres = calcularHorariosLibres({
      fecha,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora,
      anticipacionMinimaHoras: 2,
    });
    expect(libres).toContain("09:30");
  });
});

describe("calcularEstadoDia - horizonte máximo", () => {
  it("un día más allá del horizonte configurado es fuera-de-horizonte", () => {
    const ahora = DateTime.fromISO("2026-11-02", { zone: ZONA });
    // Horizonte de 4 semanas desde el inicio de hoy: 2026-11-30 inclusive es el límite.
    const diaFueraDeHorizonte = DateTime.fromISO("2026-12-01", { zone: ZONA });
    const estado = calcularEstadoDia({
      fecha: diaFueraDeHorizonte,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora,
      anticipacionMinimaHoras: 2,
      horizonteReservaSemanas: 4,
    });
    expect(estado).toBe("fuera-de-horizonte");
  });

  it("el último día dentro del horizonte sigue siendo evaluado normalmente", () => {
    const ahora = DateTime.fromISO("2026-11-02", { zone: ZONA });
    const ultimoDiaValido = DateTime.fromISO("2026-11-30", { zone: ZONA }); // lunes
    const estado = calcularEstadoDia({
      fecha: ultimoDiaValido,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora,
      anticipacionMinimaHoras: 2,
      horizonteReservaSemanas: 4,
    });
    expect(estado).toBe("disponible");
  });

  it("un día pasado es 'pasado' incluso si también estaría dentro de horario", () => {
    const ahora = DateTime.fromISO("2026-11-02", { zone: ZONA });
    const diaPasado = DateTime.fromISO("2026-11-01", { zone: ZONA });
    const estado = calcularEstadoDia({
      fecha: diaPasado,
      cortes: [],
      duracionMinutos: DURACION,
      eventosOcupados: [],
      ahora,
      anticipacionMinimaHoras: 2,
      horizonteReservaSemanas: 4,
    });
    expect(estado).toBe("pasado");
  });
});

describe("zona horaria", () => {
  it("un evento guardado en UTC se interpreta bien en America/Argentina/Buenos_Aires (cruce de medianoche)", () => {
    // Argentina es UTC-3. Un evento que en UTC arranca a las 02:00 del 3 de noviembre
    // corresponde a las 23:00 del 2 de noviembre en hora local: debe bloquear el *lunes* 2,
    // no el martes 3.
    const inicioUTC = DateTime.fromISO("2026-11-03T02:00:00Z", { zone: "utc" });
    const finUTC = DateTime.fromISO("2026-11-03T03:00:00Z", { zone: "utc" });
    const ocupadoLocal: Intervalo = {
      inicio: inicioUTC.setZone(ZONA),
      fin: finUTC.setZone(ZONA),
    };

    expect(ocupadoLocal.inicio.toFormat("yyyy-MM-dd HH:mm")).toBe("2026-11-02 23:00");

    const lunes = DateTime.fromISO("2026-11-02", { zone: ZONA });
    const cortesConNoche: Corte[] = [{ inicio: "22:00", fin: "23:59" }];
    // Truco: para probar el bloqueo necesitamos un corte que contenga 23:00-23:30; como el
    // horario real del consultorio no llega tan tarde, usamos un corte ad-hoc solo para
    // confirmar que la comparación de instantes (no de strings "HH:mm") funciona cruzando
    // la frontera del día en UTC.
    const libres = calcularHorariosLibres({
      fecha: lunes,
      cortes: cortesConNoche,
      duracionMinutos: DURACION,
      eventosOcupados: [ocupadoLocal],
      ahora: ahoraLejano(lunes),
      anticipacionMinimaHoras: 2,
    });
    expect(libres).not.toContain("23:00");
  });

  it("el martes (día siguiente en UTC) no se ve afectado por ese mismo evento", () => {
    const inicioUTC = DateTime.fromISO("2026-11-03T02:00:00Z", { zone: "utc" });
    const finUTC = DateTime.fromISO("2026-11-03T03:00:00Z", { zone: "utc" });
    const ocupadoLocal: Intervalo = {
      inicio: inicioUTC.setZone(ZONA),
      fin: finUTC.setZone(ZONA),
    };

    const martes = DateTime.fromISO("2026-11-03", { zone: ZONA });
    const libres = calcularHorariosLibres({
      fecha: martes,
      cortes: CORTES_DOBLE,
      duracionMinutos: DURACION,
      eventosOcupados: [ocupadoLocal],
      ahora: ahoraLejano(martes),
      anticipacionMinimaHoras: 2,
    });
    // El evento ocurrió entre las 23:00 y 00:00 hora local del lunes, así que no toca
    // ningún slot del martes.
    expect(libres).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
    ]);
  });
});
