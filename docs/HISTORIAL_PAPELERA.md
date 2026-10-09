# Historial, papelera y avisos de duplicados

Historial de cambios registra las altas, ediciones, eliminaciones y restauraciones realizadas desde que se activa la función. Cada evento conserva fecha, actor y datos antes/después. También registra catálogos y cuentas, sin contraseñas ni hashes. No reconstruye cambios anteriores a su instalación. Los administradores ven todos los eventos; los vendedores ven los registros de su comercial asignado y sus propias acciones.

Los servicios y ventas de certificados se envían a Papelera, sin borrar sus fechas, cursos, importes o estado. Mientras estén allí no aparecen en agenda, reportes, metas, registro de instructores ni reservas del instructor. La recuperación vence exactamente siete días (168 horas) después de eliminarlos. Restaurar mantiene el identificador y los datos originales; comprueba el comercial del usuario y la disponibilidad del instructor. Si este ya tiene otro servicio en alguna fecha, debe resolverse ese conflicto antes de restaurar. Los administradores recuperan cualquier registro; los vendedores, los de su comercial actual.

Los registros vencidos ya no pueden recuperarse. Una limpieza diaria de Vercel los elimina físicamente; consultar Papelera también realiza esa limpieza. El historial se conserva para mantener trazabilidad. La limpieza diaria solo se ejecuta en Production después de integrar/desplegar el PR. Las cuentas y catálogos no se recuperan desde Papelera. No se permite eliminar cursos, ubicaciones, instructores o comerciales vinculados a registros o cuentas: así se evita destruir los datos que hacen posible su recuperación.

Los avisos de posibles duplicados comparan cliente (sin diferencias de mayúsculas, acentos o espacios), fecha y curso. En servicios con varias fechas/cursos basta una coincidencia compartida. Se revisa al crear y editar, excluyendo el mismo registro y los eliminados. Volver y revisar conserva el formulario. Guardar de todos modos confirma que es una venta distinta y vuelve a validar los datos y la disponibilidad; no anula las demás validaciones.

El tutorial incluye historial, papelera y avisos. La explicación general de búsqueda/filtros y la demostración de eliminación aparecen una sola vez. Ver tutorial permite revisar los cambios si el usuario ya había finalizado el recorrido.

## Despliegue y mantenimiento

Aplicar la migración aditiva `20261009010000_history_trash` con `npm run prisma:deploy`. No ejecutar seed en una base existente. Las nuevas columnas deletedAt son nulas en los registros anteriores; no se eliminan ni modifican importes históricos.

`CRON_SECRET` autentica `/api/maintenance/trash`. Está configurado de forma privada en Preview y Production del proyecto Vercel; nunca compartir su valor en chat ni guardarlo en Git. `vercel.json` programa la limpieza diaria. La ruta rechaza llamadas sin autorización; no acepta una sesión de usuario como sustituto de la clave de mantenimiento.

En desarrollo se necesita un CRON_SECRET local aleatorio en `.env` para comprobar la limpieza autorizada. No reutilizar la clave de Production. Las pruebas `scripts/history-trash-smoke.mjs` solo permiten localhost/consitec y crean/eliminan sus propios datos. El historial se guarda en la misma transacción que la modificación, evitando registros parciales.
