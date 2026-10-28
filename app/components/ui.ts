// Clases de Tailwind compartidas para botones grandes, pensadas para dedos (no mouse) y
// buena legibilidad. Se usan tanto en <button> como en <a> con apariencia de botón.

export const claseBotonPrimario =
  "inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary-600 px-6 py-4 text-center text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500";

export const claseBotonSecundario =
  "inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-primary-600 px-6 py-4 text-center text-lg font-semibold text-primary-700 transition active:scale-[0.98] hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400";

export const claseBotonPeligro =
  "inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-red-600 px-6 py-4 text-center text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500";

export const claseBotonTexto =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-center text-base font-semibold text-stone-600 underline underline-offset-2 transition hover:text-stone-900";
