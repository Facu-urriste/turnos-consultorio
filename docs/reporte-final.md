# Reporte final — Zaldi

## Qué se hizo

Proyecto completo: página de reserva de turnos (Next.js + TypeScript, mobile-first, español rioplatense) integrada con Google Calendar vía service account, sin base de datos propia. Se construyó con tres agentes en paralelo (backend, frontend, pruebas) que reporté y coordiné yo.

- **Backend** (`lib/calendar/**`, `lib/ics.ts`, `lib/rateLimit.ts`, `app/api/**`): cálculo de disponibilidad en vivo contra Calendar (cortes de horario, eventos superpuestos, eventos de día completo, eventos estirados a mano), creación/cancelación de turnos, protección contra dobles reservas, límite de reservas por teléfono, rate limiting opcional por IP, honeypot, generación de `.ics`.
- **Frontend** (`app/**`): flujo completo del paciente (calendario → horarios → formulario → confirmación) sin recargas de página, página del link personal (`/turno/[token]`) con cancelación, página de privacidad, diseño mobile-first con botones grandes y buen contraste.
- **Pruebas** (`lib/calendar/disponibilidad.test.ts`, `app/api/**/*.test.ts`): 45 tests automáticos (ver más abajo) + revisión manual en viewport de celular + revisión de logs.
- **Documentación**: este reporte, [README.md](../README.md) (cuenta de Google, configuración, despliegue), [guía para el profesional](guia-profesional.md), borrador de [política de privacidad](../app/privacidad/page.tsx).

## Decisiones que tomé y por qué

- **Next.js + Vercel**, confirmado con vos antes de arrancar.
- **Service account** (no OAuth de usuario) para Calendar: no necesita refresh de tokens ni que el profesional vuelva a loguearse nunca; el acceso se da compartiendo el calendario con un email técnico, revocable en cualquier momento sin tocar la cuenta personal.
- **Reserva atómica con id determinístico por evento** (`lib/calendar/cliente.ts`): en vez de confiar solo en "chequear y después crear" (que tiene una carrera real), cada horario tiene siempre el mismo id de evento en Calendar. Si dos personas confirman el mismo horario a la vez, el segundo `insert` choca con ese id y Calendar lo rechaza — ahí es donde realmente se garantiza que no haya dobles reservas, no en el chequeo previo (que queda solo como optimización para no pegarle a la API en casos obvios). Lo agregué yo después de que los agentes de backend/frontend terminaran, porque el diseño original dependía solo del chequeo previo y no cerraba la carrera del todo.
- **Config pública sin duplicar**: el frontend originalmente tenía el nombre/dirección/teléfono del consultorio hardcodeados a mano (duplicando `config/consultorio.json`). Lo cambié para que lean directamente ese mismo JSON (es un dato público, sin secretos) — un solo lugar para editar los datos del consultorio.
- **Cache Components desactivado** (`next.config.ts`): Next.js 16 trae esta función experimental activada por defecto, pensada para apps con contenido mayormente estático. Esta app es dinámica por naturaleza (disponibilidad en vivo, por paciente, por request) y la función solo agregaba restricciones (por ejemplo, no poder leer la fecha actual en un componente de cliente) sin ningún beneficio real acá.
- **Límite de reservas futuras por teléfono**: 3 (no estaba especificado un número exacto). Es editable en `config/consultorio.json` (`limiteReservasFuturasPorTelefono`).
- **Rate limiting por IP opcional vía Upstash**: me dejaste esta decisión a mí. Lo dejé como dependencia opcional — si no se configuran las credenciales de Upstash, ese límite específico simplemente no se aplica (pero el límite por teléfono, que no depende de esto, sigue activo siempre). Me pareció el mejor balance entre protección y no forzar una cuenta más antes de poder arrancar.
- **Normalización de teléfono argentino**: no existe una tabla completa y confiable de códigos de área, así que usa una heurística (probar longitudes de código de área típicas) que cubre bien el caso dominante para este proyecto (CABA/GBA, código "11") y razonablemente el resto del país. Está en [`lib/telefono.ts`](../lib/telefono.ts), con tests.

## Qué quedó pendiente o con riesgo

1. ~~Falta la cuenta de Google real~~ **Resuelto el 28/10.** Ya está conectada tu cuenta de prueba (`turnos-web@turnos-consultorio-513022.iam.gserviceaccount.com`, calendario "Turnos consultorio"), con `.env.local` completo. Cuando quieran pasar a producción con la cuenta definitiva del profesional, se repiten los mismos pasos de la sección 1 del README y se actualiza `.env.local` (o las variables de entorno en Vercel).
2. ~~Riesgo sin verificar: reactivar un horario recién cancelado~~ **Verificado el 28/10 contra la API real**: reservé un turno de prueba, lo cancelé, y volví a reservar exactamente el mismo horario (29/10 9:00) — funcionó al toque (201), confirmando que Calendar sí permite reactivar el evento cancelado con el mismo id. El mecanismo de no-dobles-reservas queda validado de punta a punta, no solo contra mocks.
3. **Confirmado (no solo teórico) el 28/10**: si alguien vuelve a abrir el link personal de un turno ya cancelado, ve "No encontramos este turno" en vez de un mensaje específico de "este turno fue cancelado" — lo probé en vivo y es el comportamiento real. La cancelación en sí funciona perfecto (libera el horario), es solo el mensaje el que no distingue "cancelado" de "el link nunca existió". Sigue siendo una mejora opcional, no un bug que bloquee nada: lo dejaría para más adelante si en algún momento quieren pulirlo.
4. **Todavía no se subió a GitHub ni se desplegó a Vercel** — son los dos únicos pasos que, por política, tenés que hacer vos (crear cuentas): están detallados paso a paso en la sección 5 del README.
5. **Tipos de prestación con duraciones distintas**: la estructura está preparada en `config/consultorio.json` (`prestaciones`) pero, como pedía el encargo, no está implementada en la interfaz todavía.

## Resultado de las pruebas

```
Test Files  5 passed (5)
     Tests  45 passed (45)
```

Cubren: cortes de horario, eventos superpuestos (parciales, totales, varios chicos), eventos de día completo, eventos estirados a mano, cambio de mes, anticipación mínima, horizonte máximo, zona horaria (`America/Argentina/Buenos_Aires`), reserva concurrente (dos reservas al mismo horario, exactamente una pasa), y cancelación (válida, token inválido, ya cancelado, pasado, borrado a mano, dentro/fuera de la ventana mínima).

Además: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores. Revisión de logs: ningún `console.log/error/warn` imprime nombre, teléfono, mensaje de paciente ni token. Prueba manual en viewport de celular (375×812): diseño mobile-first correcto, sin overflow horizontal.

**Prueba de punta a punta con la cuenta real (28/10):** reservar un turno → aparece en Google Calendar con nombre/teléfono/mensaje → el horario desaparece de la disponibilidad → cancelar desde el link personal → el evento se borra y el horario vuelve a estar libre → volver a reservar exactamente ese mismo horario funciona. Único hallazgo: al principio la reserva fallaba con `500` porque el calendario estaba compartido con permiso de solo lectura ("Ver todos los detalles del evento") en vez de "Hacer cambios en los eventos" — una vez corregido el permiso, todo funcionó.

## Cómo probarlo vos mismo, paso a paso

**Ahora mismo, sin cuenta de Google todavía** (para ver el diseño y los mensajes de error):

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) y achicá la ventana del navegador a un ancho de celular (o abrilo desde el celular si están en la misma red). Vas a ver el calendario, pero con un mensaje de "No pudimos cargar el calendario" — es esperado, porque todavía no hay credenciales de Google conectadas. Las páginas `/privacidad` y `/turno/cualquier-cosa` (va a decir "no encontrado") sí se pueden ver completas ya mismo.

**Para probar el flujo real de punta a punta:**

1. Seguí la sección 1 del [README](../README.md) (cuenta de Google, calendario dedicado, service account) — son los únicos pasos que tenés que hacer vos.
2. Copiá `.env.example` a `.env.local` y completá las variables con lo que te dio Google.
3. `npm run dev` de nuevo y reservá un turno de prueba desde el celular, como lo haría un paciente.
4. Revisá que el evento aparezca en el calendario "Turnos consultorio" en Google Calendar, con el teléfono y el mensaje en la descripción.
5. Probá cancelar ese turno desde el link personal, y confirmá que el evento desaparece del calendario y el horario vuelve a estar libre en la web.
6. Cuando quieras, seguí la sección 5 del README para subir el proyecto a GitHub y desplegarlo en Vercel.

Cualquier cosa que quieras ajustar (horarios, duración del turno, datos del consultorio) se edita en `config/consultorio.json`, sin tocar código — ver sección 2 del README.
