# Cursos e instructores por fecha

En el servicio se seleccionan los cursos e instructores generales. Si hay más de
uno, cada jornada muestra «Asignación de esta fecha» con una selección opcional
para cursos e instructores. Ambas selecciones son independientes: puedes repartir
solo instructores, solo cursos o ambos.

Dejar una selección vacía significa usar todos los seleccionados para el servicio.
«Usar todos los del servicio» restablece esa herencia. Las asignaciones específicas
solo aceptan elementos de la selección general. No dependen del correlativo ni
crean ventas o importes adicionales.

El Registro de instructores, sus filtros y su Excel muestran únicamente los
instructores y cursos de cada jornada. También se respetan en la agenda, su Excel,
el resumen del formulario, los recordatorios diarios y las estadísticas de cursos
e instructores. Cambiar el equipo o los cursos de una fecha invalida su confirmación
anterior. La disponibilidad reserva únicamente las fechas asignadas a cada instructor;
una jornada sin horario continúa reservando el día completo.

Las asignaciones se conservan al editar, guardar/recuperar borradores y restaurar
servicios desde Papelera. La conversión de cotizaciones permite repartir los cursos
aceptados y los instructores al completar las fechas del servicio.

La migración `20261016190000_service_day_assignments` añade dos arreglos vacíos a
`ServiceDay`: `courseIds` e `instructorIds`. Los registros históricos siguen usando
sus selecciones generales. Aplicar mediante el flujo habitual `npm run prisma:deploy`.

# Acceso rápido para agregar

El botón «+» permanece abajo a la derecha al desplazarse en Agenda de servicios,
Venta de certificados y Cotizaciones. Abre el formulario correspondiente. Se oculta
cuando hay una ventana abierta y durante el tutorial, y respeta los permisos de consulta.

# Verificación

`npm run build`, `node --import tsx scripts/check-service-requirements.ts` y
`node --import tsx scripts/instructor-availability-check.ts` no requieren escrituras
en una base real.

`scripts/date-assignments-smoke.ts` requiere `TEST_DATABASE_URL` apuntando a un
PostgreSQL local aislado, `TEST_BASE_URL` y `AUTH_SECRET` coincidente con ese servidor.
Crea datos de prueba y recorre las APIs reales para comprobar guardado, herencia,
disponibilidad, duplicados, registro/Excel, confirmaciones, borradores, papelera,
cotizaciones y recordatorios. No ejecutar contra datos de trabajo.
