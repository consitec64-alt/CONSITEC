# Cierre mensual

El cierre es manual y exclusivo de administradores. Se habilita desde el último día del mes según America/Lima. Nunca se cierra automáticamente: aparece una ventana para revisar el mes y confirmar. También se pueden cerrar meses anteriores desde el selector de mes/año. Recordar después pospone los avisos pendientes durante el día en la pestaña/sesión actual. Un administrador puede reabrirlo cuando necesite corregir registros.

El bloqueo se aplica en el servidor tanto a administradores como a vendedores: no permite crear, editar, enviar a papelera ni restaurar servicios o ventas de certificados que afecten un mes cerrado. Se comprueban las fechas originales y nuevas, todas las jornadas de los servicios y el mes de facturación. Esto impide mover una venta fuera de un mes cerrado para evitar el bloqueo. Un servicio de varios meses requiere que todos sus meses estén abiertos para modificarlo; su importe sigue contando una sola vez.

Los reportes siguen siendo consultables. El cierre no cambia estados, importes, facturas o fechas, ni transforma Programado o Ejecutado en Facturado. La eliminación física de registros vencidos que ya estaban en papelera continúa, porque esos registros no forman parte de los totales activos. La administración de cuentas y catálogos sigue disponible; el cierre protege los registros de servicios y ventas, no congela los nombres del catálogo como una copia histórica.

El cierre y la reapertura quedan registrados en Historial de cambios con el administrador y fecha. Los vendedores consultan el estado y reciben un mensaje para solicitar reapertura, sin controles de administración ni avisos automáticos. El recorrido de administrador explica cerrar, confirmar y reabrir; el de vendedor explica la consulta de un mes cerrado.

El tutorial sigue la navegación: Vista general, Agenda, Certificados, Rendimiento, Registro de instructores, Base de soporte, Historial, Papelera y Usuarios (solo administradores). Las instrucciones comunes de búsqueda/filtros y eliminación aparecen una vez. Los tres pasos finales son Actualizar, Tema claro y oscuro y Repetir el tutorial. Los ejemplos no escriben registros ni cierran meses.

## Instalación

Aplicar `npm run prisma:deploy`: migración aditiva `20261009020000_monthly_close`, décima migración. No necesita nuevas variables de entorno ni credenciales. No ejecutar seed sobre una base existente. Los registros anteriores siguen abiertos hasta que un administrador confirme el cierre.

`node scripts/monthly-close-smoke.mjs` requiere la base local consitec y el servidor indicado por SMOKE_BASE_URL. Crea fixtures locales y comprueba permisos, bloqueo de facturación/jornadas, conservación de reportes, restauración, reapertura, auditoría y una operación concurrente con el cierre. Nunca ejecutar contra una base remota.
