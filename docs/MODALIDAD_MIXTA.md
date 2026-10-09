# Servicios Virtual / Presencial

En Nuevo servicio y Editar servicio, Modalidad de la clase ofrece **Virtual**, **Presencial** y **Virtual / Presencial**.

Al elegir Virtual / Presencial aparece una lista independiente en cada fecha. Cada jornada debe tener Virtual o Presencial seleccionado antes de guardar; una fecha nueva empieza sin selección. Se conservan las horas, el descanso y la disponibilidad del instructor por fecha. Todas las jornadas comparten el importe único del servicio.

Editar un servicio recupera las selecciones guardadas. Cambiar a Virtual o Presencial aplica esa modalidad a todas las jornadas y oculta las listas individuales. Las cotizaciones también permiten Virtual / Presencial; al crear su servicio se completan las modalidades de cada jornada.

La agenda muestra la modalidad de la fecha visible, junto con su propio horario. En Registro de instructores:

- Virtual incluye solo jornadas virtuales, también de servicios mixtos.
- Presencial incluye solo jornadas presenciales, también de servicios mixtos.
- Servicios Virtual / Presencial incluye todas las jornadas de esos servicios.
- Las jornadas virtuales muestran Virtual como lugar; las presenciales muestran la ubicación registrada.

El archivo Excel contiene las filas y modalidades filtradas. Historial y Papelera conservan las modalidades de las fechas. El tutorial explica la nueva opción y resalta el selector de una jornada, sin guardar datos de demostración.

## Despliegue y validación

La migración aditiva `20261009140000_mixed_service_modality` amplía ClassModality con MIXED y añade ServiceDay.modality. Completa las fechas históricas con la modalidad Virtual/Presencial de su servicio, sin alterar importes ni horarios. Las fechas cuyo servicio no tenía modalidad permanecen sin modalidad; las consultas conservan el fallback histórico. Una restricción impide guardar MIXED en una fecha individual.

No requiere nuevas dependencias ni variables: `npm ci`, `npm run prisma:deploy`, `npm run build`. Nunca resetear o reseedear una base remota para esta actualización.

Prueba local: `SMOKE_BASE_URL=http://127.0.0.1:3061 node --env-file=.env scripts/mixed-modality-smoke.mjs` (solo localhost/consitec, limpia sus registros). Verifica validación por fecha, precio único, filtros, meses distintos, edición a modalidad única, recuperación, cotizaciones mixtas, compatibilidad histórica y restricción SQL. Se comprobaron además los smoke existentes de instructor-register y assignment-sessions; flujo de navegador en escritorio/móvil; Excel descargado; y tutorial completo de ambos roles.
