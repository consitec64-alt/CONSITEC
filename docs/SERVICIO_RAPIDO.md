# Servicio rápido

En Agenda de servicios, inmediatamente debajo del calendario, «Servicio rápido»
despliega un formulario para registrar una fecha con uno o varios cursos e
instructores. Se puede plegar sin perder lo escrito. Cambiar de apartado tampoco
borra esos datos durante la misma sesión del panel; recargar la página sí los descarta.

La fecha inicial es hoy en Perú cuando se consulta el mes actual, o el primer día
del mes seleccionado. Si se escribe otra fecha, se conserva al cambiar de mes.
El importe y el horario son opcionales. Sin horas, los instructores quedan
reservados durante todo el día. La modalidad puede quedar por definir.

«Más detalles» transfiere lo escrito al formulario completo: empresa, cursos,
instructores, fecha, horas, modalidad, importe y comercial. Allí se pueden agregar
varias fechas y asignaciones por jornada, ubicación, correlativo y facturación.
Un borrador guardado anteriormente se conserva al completar este nuevo servicio.
Guardar borrador en el formulario completo sigue reemplazando el único borrador
personal mediante la acción explícita existente.

El guardado usa `POST /api/services` y sus controles de disponibilidad, duplicados,
permisos y meses cerrados. La consulta de disponibilidad se comparte con el
formulario completo. Los duplicados requieren revisar o confirmar expresamente.
El comercial se asigna mediante las reglas existentes; el supervisor no ve esta
opción y un vendedor sin comercial asignado no puede guardar.

Después de guardar, el formulario se limpia y la agenda se actualiza. No hay
cambios en la base de datos ni migraciones para esta función.
