// Clases de Tailwind compartidas para botones grandes, pensadas para dedos (no mouse) y
// buena legibilidad. Se usan tanto en <button> como en <a> con apariencia de botón.

export const claseBotonPrimario =
  "inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-teal-600 px-6 py-4 text-center text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500";

export const claseBotonSecundario =
  "inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-teal-600 px-6 py-4 text-center text-lg font-semibold text-teal-700 transition active:scale-[0.98] hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400";

export const claseBotonPeligro =
  "inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-red-600 px-6 py-4 text-center text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500";

export const claseBotonTexto =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-center text-base font-semibold text-zinc-600 underline underline-offset-2 transition hover:text-zinc-900";
