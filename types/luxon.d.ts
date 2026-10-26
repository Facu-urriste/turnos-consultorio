/**
 * Shim de tipos mínimo para "luxon".
 *
 * El paquete `luxon` (ya instalado) no trae sus propios `.d.ts` y `@types/luxon` no está
 * en package.json. No se puede instalar nada nuevo en esta tarea (ver instrucciones del
 * backend), así que este archivo cubre únicamente la superficie de la API que usa el
 * código de `lib/calendar/**`, `lib/ics.ts` y `app/api/**`. Si en algún momento se agrega
 * la dependencia real `@types/luxon` (`npm i --save-dev @types/luxon`), este archivo se
 * puede borrar sin más.
 */
declare module "luxon" {
  export type DateTimeUnit =
    | "year"
    | "quarter"
    | "month"
    | "week"
    | "day"
    | "hour"
    | "minute"
    | "second"
    | "millisecond";

  export interface DateTimeOptions {
    zone?: string;
    locale?: string;
  }

  export interface DurationLikeObject {
    years?: number;
    quarters?: number;
    months?: number;
    weeks?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
  }

  export interface DateObjectUnits {
    year?: number;
    month?: number;
    day?: number;
    weekday?: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
  }

  export interface ToISOTimeOptions {
    suppressMilliseconds?: boolean;
    suppressSeconds?: boolean;
    includeOffset?: boolean;
  }

  export class Duration {
    readonly days: number;
    readonly hours: number;
    readonly minutes: number;
    valueOf(): number;
  }

  export class DateTime {
    private constructor();

    static now(): DateTime;
    static fromISO(text: string, opts?: DateTimeOptions): DateTime;
    static fromMillis(ms: number, opts?: DateTimeOptions): DateTime;
    static fromJSDate(date: Date, opts?: DateTimeOptions): DateTime;

    readonly isValid: boolean;
    readonly weekday: number;
    readonly daysInMonth: number | undefined;
    readonly zoneName: string | null;
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;

    setZone(zone: string, opts?: { keepLocalTime?: boolean }): DateTime;
    startOf(unit: DateTimeUnit): DateTime;
    endOf(unit: DateTimeUnit): DateTime;
    plus(duration: DurationLikeObject): DateTime;
    minus(duration: DurationLikeObject): DateTime;
    set(values: DateObjectUnits): DateTime;
    diff(other: DateTime, unit?: DateTimeUnit | DateTimeUnit[]): Duration;
    toFormat(fmt: string): string;
    toISO(opts?: ToISOTimeOptions): string | null;
    toUTC(): DateTime;
    toJSDate(): Date;
    equals(other: DateTime): boolean;
    valueOf(): number;
  }
}
