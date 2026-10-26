# Turnos del consultorio

> Primera vez acá: leé el [reporte final](docs/reporte-final.md) — qué se hizo, qué decisiones se tomaron y por qué, qué queda pendiente, el resultado de las pruebas y cómo probarlo paso a paso.

Página de reserva de turnos online para un consultorio odontológico. El paciente entra desde el celular, ve los horarios libres y se anota solo — sin intercambiar mensajes con el profesional. La disponibilidad se calcula siempre en vivo contra un calendario de Google Calendar dedicado: cualquier evento en ese calendario (cargado por la web o a mano por el profesional) bloquea el horario.

No hay base de datos propia: los únicos datos del paciente que se guardan viven en el evento de Google Calendar.

## 1. Crear la cuenta y el calendario del profesional

Estos pasos los tiene que hacer el profesional (o vos en su nombre, con su mail). No se pueden automatizar: crear cuentas es algo que cada persona tiene que hacer desde su propio navegador.

### 1.1. Cuenta de Google

Si el profesional no tiene (o no quiere usar) su Gmail personal para esto, crear una cuenta nueva en [accounts.google.com/signup](https://accounts.google.com/signup), por ejemplo `turnos.consultorio.nombre@gmail.com`.

### 1.2. Calendario dedicado

1. Entrar a [calendar.google.com](https://calendar.google.com) con esa cuenta.
2. En el panel izquierdo, al lado de "Otros calendarios", tocar **+** → **Crear un calendario nuevo**.
3. Nombre: por ejemplo "Turnos consultorio". Crear.
4. Anotar el **ID del calendario**: en la configuración de ese calendario (⚙️ → "Configuración y uso compartido" → buscar el calendario en la lista de la izquierda → "Integrar calendario") aparece como algo como `xxxxxxxxx@group.calendar.google.com`. Ese valor va en la variable de entorno `GOOGLE_CALENDAR_ID` (ver sección 3).

### 1.3. Proyecto de Google Cloud y service account

La web se conecta al calendario con una "cuenta de servicio" (service account): es una identidad técnica de Google a la que el profesional le da permiso para ver y editar ese calendario puntual, sin compartir la contraseña de su cuenta de Google.

1. Ir a [console.cloud.google.com](https://console.cloud.google.com) (con cualquier cuenta de Google que vaya a administrar esto — puede ser la misma del paso 1.1 o una tuya).
2. Crear un proyecto nuevo (arriba a la izquierda, selector de proyecto → "Proyecto nuevo"). Nombre sugerido: "turnos-consultorio".
3. En el buscador de arriba, escribir "Google Calendar API" → abrirla → **Habilitar**.
4. Ir a **APIs y servicios → Credenciales** → **Crear credenciales** → **Cuenta de servicio**.
   - Nombre: "turnos-web" (o el que prefieras).
   - Rol: no hace falta asignar ningún rol de proyecto (los permisos reales se dan paso a paso en el calendario, no en Google Cloud).
5. Entrar a la cuenta de servicio recién creada → pestaña **Claves** → **Agregar clave** → **Crear clave nueva** → tipo **JSON**. Se descarga un archivo `.json`. **Guardalo en un lugar seguro y no lo subas nunca a git.**
6. De ese archivo vas a necesitar dos valores:
   - `client_email` → variable `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → variable `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (incluye los `\n`, copialo tal cual está en el JSON, entre comillas)

### 1.4. Compartir el calendario con la service account

1. Volver a [calendar.google.com](https://calendar.google.com), configuración del calendario "Turnos consultorio" (mismo lugar que en 1.2).
2. **Agregar personas y grupos** → pegar el `client_email` de la service account (termina en `.iam.gserviceaccount.com`).
3. Permiso: **"Hacer cambios en los eventos"** (no hace falta "Hacer cambios y administrar el uso compartido"). Enviar.

Con esto la web ya puede leer y escribir en ese calendario puntual, sin ningún otro acceso a la cuenta de Google del profesional.

## 2. Configurar horarios y datos del consultorio

Todo lo que cambia seguido está en **`config/consultorio.json`** — es un archivo de datos, no de código, se edita con cualquier editor de texto y no hace falta saber programar:

```json
{
  "zonaHoraria": "America/Argentina/Buenos_Aires",
  "profesional": { "nombre": "Dr. ..." },
  "consultorio": { "nombre": "...", "direccion": "...", "telefono": "..." },
  "duracionTurnoMinutos": 30,
  "anticipacionMinimaReservaHoras": 2,
  "anticipacionMinimaCancelacionHoras": 2,
  "horizonteReservaSemanas": 4,
  "limiteReservasFuturasPorTelefono": 3,
  "horarios": {
    "lunes": [{ "inicio": "09:00", "fin": "13:00" }, { "inicio": "15:00", "fin": "19:00" }],
    "...": "..."
  },
  "prestaciones": [{ "id": "general", "nombre": "Consulta general", "duracionMinutos": 30 }]
}
```

- **`horarios`**: una entrada por día de la semana (`lunes` a `domingo`). Cada día es una lista de cortes `{inicio, fin}` en formato 24 horas. Un día sin atención se deja como lista vacía `[]`.
- **`duracionTurnoMinutos`**: duración base del turno. Si un paciente necesita más tiempo, el profesional estira el evento a mano en Google Calendar — ver la [guía para el profesional](docs/guia-profesional.md).
- **`anticipacionMinimaReservaHoras`**: con cuánta anticipación mínima se puede reservar.
- **`anticipacionMinimaCancelacionHoras`**: por debajo de esa cantidad de horas antes del turno, no se puede cancelar online (se muestra el teléfono del consultorio).
- **`horizonteReservaSemanas`**: hasta cuántas semanas adelante se puede reservar.
- **`limiteReservasFuturasPorTelefono`**: tope de reservas futuras simultáneas por número de teléfono (protección contra abuso).
- **`prestaciones`**: estructura preparada para más adelante (tipos de prestación con duraciones distintas). Hoy no se usa en la interfaz.

Después de editar este archivo hay que volver a desplegar (o reiniciar el servidor si corre localmente) para que tome el cambio.

## 3. Variables de entorno (secretos)

Copiar `.env.example` a `.env.local` (este archivo nunca se sube a git) y completar:

| Variable | De dónde sale |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` del JSON de la service account (paso 1.3) |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` del mismo JSON |
| `GOOGLE_CALENDAR_ID` | ID del calendario dedicado (paso 1.2) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | opcional — ver sección de abuso/rate limiting más abajo |

## 4. Desarrollo local

Requiere [Node.js](https://nodejs.org) (versión 20 o superior).

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Correr los tests automáticos:

```bash
npm test
```

## 5. Desplegar

Se eligió **Vercel** como hosting: tiene soporte nativo para Next.js, un plan gratuito que sobra para este volumen de uso, y es la opción de menor mantenimiento para una sola persona (sin servidores propios que actualizar).

1. Subir este repositorio a GitHub (crear un repo nuevo, privado está bien, y hacer `git push`).
2. Entrar a [vercel.com](https://vercel.com), crear una cuenta (se puede con la misma cuenta de GitHub) e **"Add New Project"** → importar ese repositorio.
3. En **Environment Variables**, agregar las mismas variables de la sección 3 (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`, y las de Upstash si se usan).
4. Deploy. Vercel va a dar una URL (`algo.vercel.app`); se puede usar esa directamente o conectar un dominio propio después, desde **Project Settings → Domains**.
5. Cada vez que se haga `git push` a la rama principal, Vercel vuelve a desplegar solo.

## 6. Protección contra abuso

- **Rate limiting por IP**: si se completan `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (cuenta gratuita en [upstash.com](https://upstash.com), producto Redis), se limita la cantidad de reservas por IP en una ventana de tiempo corta. Si se dejan vacías, este límite queda deshabilitado — igual queda el límite por teléfono (`limiteReservasFuturasPorTelefono`), que no depende de esto.
- **Honeypot**: el formulario tiene un campo invisible para personas que los bots suelen completar; si llega completado, la reserva se rechaza.
- Sin CAPTCHA visible.

## 7. Privacidad

- El contenido del formulario (nombre, teléfono, mensaje) nunca se escribe en logs del servidor ni se envía a servicios de terceros — solo viaja a Google Calendar.
- No hay analytics de terceros.
- El link personal de cada turno usa un token aleatorio que no expone ningún dato del paciente.
- Borrador de política de privacidad para pacientes: [`app/privacidad/page.tsx`](app/privacidad/page.tsx).

## Mantenimiento

Proyecto pensado para que lo mantenga una sola persona: pocas dependencias (Next.js, `googleapis`, `luxon`, y opcionalmente `@upstash/redis`/`@upstash/ratelimit`), sin base de datos propia, sin servidores que administrar.
