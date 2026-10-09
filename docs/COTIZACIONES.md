# Cotizaciones comerciales

La herramienta aparece entre Agenda de servicios y Venta de certificados. Está disponible para administradores y vendedores; no incorpora departamentos nuevos.

- Una propuesta pertenece al comercial asignado a quien la crea. Los administradores pueden consultar todas; los vendedores solo las de su comercial. Reasignar o eliminar una cuenta conserva las cotizaciones y su comercial original.
- Registra empresa, contacto, cursos del catálogo, participantes opcionales, importe único, modalidad, fechas tentativas, vigencia, próxima llamada, condiciones y observaciones.
- Estados: Borrador, Enviada, Aceptada, Rechazada y Vencida. Borradores y enviadas muestran Vencida desde el día posterior a su vigencia, según la fecha de Perú. Enviada es un registro de seguimiento; la aplicación no envía correos.
- El filtro de seguimientos muestra las propuestas activas cuya próxima llamada es hoy o anterior. Las cotizaciones se consultan sin restringirse al período de la agenda.
- Guarda la cotización y abre su ficha para adjuntar el PDF preparado por el vendedor. Máximo 10 MB por archivo. Se conservan varias versiones y se pueden abrir o descargar; no se generan PDF automáticamente ni se publican enlaces abiertos.
- Aceptar una propuesta no registra una venta. Crear servicio exige completar correlativo, todas las fechas y horarios y comprobar disponibilidad. Conserva empresa, precio, cursos y comercial; permite concretar modalidad si estaba Por definir. Crea un servicio Programado con importe único y una jornada por fecha.
- La conversión es transaccional e idempotente. Dos clics o solicitudes simultáneas generan un solo servicio. Su enlace y fecha de conversión quedan registrados y sus datos aceptados ya no se editan. Cambios posteriores se realizan en la agenda.
- El borrado definitivo del servicio después de su semana en Papelera no elimina la propuesta ni permite volver a convertirla. El historial conserva la conversión.
- Cotizaciones sin convertir no contribuyen a indicadores de ventas, facturación, bonos ni cierre mensual. Los servicios convertidos siguen las reglas comerciales existentes, incluido el cierre mensual y el aviso de duplicados.
- El tutorial recorre los campos, carga de PDF y conversión para ambos roles. No guarda propuestas de demostración.

## Entorno y despliegue

`npm ci`, `npm run prisma:deploy`, `npm run build`. La migración `20261010030000_quotations` es aditiva: crea propuestas, relaciones y documentos sin modificar servicios existentes. No ejecutar reset ni seed sobre bases remotas.

La carga necesita `BLOB_READ_WRITE_TOKEN` de un almacén **privado** de Vercel Blob, enlazado al entorno correspondiente. La vista de prueba reutiliza el almacén privado ya conectado exclusivamente a Preview. Antes de activar esta función en producción, enlazar un almacén privado separado a Production; no copiar datos o claves de Preview.

La carga viaja directamente al almacén con un permiso limitado a una ruta, tipo PDF, tamaño y tres minutos. El servidor valida tamaño, MIME y encabezado PDF antes de habilitar la descarga, siempre autenticada y limitada al comercial. El mantenimiento diario existente retira cargas incompletas de más de 24 horas, en lotes de 100, con reintentos.

Validación local: `SMOKE_BASE_URL=http://127.0.0.1:3060 node --use-env-proxy --env-file=.env scripts/quotations-smoke.mjs`. Usa únicamente una base local y elimina sus fixtures y archivos. Node 24 admite el proxy del entorno con `NODE_USE_ENV_PROXY=1`; no desactivar TLS. Además se verifican los smoke existentes de asignación/horarios y cierre mensual, el flujo real de navegador y el tutorial completo por rol.

Actualización de modalidad: las propuestas admiten Virtual / Presencial. Su conversión requiere elegir Virtual o Presencial en cada jornada; conserva el precio único y la modalidad mixta de la propuesta. Véase `docs/MODALIDAD_MIXTA.md`.
