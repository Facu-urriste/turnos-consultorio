import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Esta app es inherentemente dinámica (disponibilidad en vivo contra Calendar, por
  // paciente y por request): no hay nada que beneficie del prerender estático de
  // Cache Components, y agrega reglas estrictas (ej. no poder leer la fecha/hora actual
  // en un Client Component) sin aportar nada acá.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
