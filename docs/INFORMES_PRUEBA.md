# Departamento de informes — versión de prueba

Rol REPORTS, mostrado como Encargados de informes en Usuarios. Un administrador crea la cuenta sin comercial asignado. Al iniciar sesión se abre /dashboard/reports. La cuenta solo puede utilizar las APIs de Informes y las de su propia sesión/tutorial; no accede a importes, ventas, cuentas o soporte comercial. Los vendedores no acceden a Informes. Los administradores revisan el espacio desde el menú Informes y pueden gestionar sus fichas.

La agenda se deriva de los servicios activos Ejecutados o Facturados. No duplica registros al cambiar entre esos estados y reúne todas las fechas/cursos en una sola ficha. Las copias de solo certificados se excluyen porque no son capacitaciones. Si el comercial vuelve a Programado o envía el servicio a papelera, se oculta el informe y sus descargas; sus datos permanecen durante el plazo de recuperación. Restaurarlo/reactivarlo recupera la misma ficha.

Cada ficha permite asignar responsable (Informes o administrador), estado Pendiente/En elaboración/En revisión/Entregado, plazo, fecha de entrega, observaciones y enlaces HTTPS de carpeta/informe. Entregado requiere un archivo Informe final o enlace final; si no se indica fecha de entrega, se usa la fecha actual de Perú. El trabajo documental es independiente de la facturación y del cierre mensual. El formulario no modifica datos del servicio ni importes comerciales.

Documentación utiliza Vercel Blob privado. Tipos permitidos: PDF, DOC/DOCX, XLS/XLSX, JPG/JPEG, PNG y WebP; máximo 10 MB por archivo. Las categorías son Informe final, Asistencia, Evaluaciones y Evidencias. Los archivos pueden ser generales o de una fecha del servicio. Solo su autor o un administrador puede retirar un archivo; esa acción no se recupera desde Papelera. Para retirar el último informe final de un informe Entregado debe cambiarse antes a En revisión (salvo que exista un enlace final alternativo).

La carga usa un permiso temporal de tres minutos, limitado al archivo, tamaño, formato, usuario y ruta preparados por el servidor. El navegador sube directamente al almacenamiento privado, evitando el límite de cuerpos de las funciones. La confirmación comprueba los metadatos del objeto en el servidor. Una carga interrumpida queda como pendiente y permite Finalizar carga o Retirar. Las descargas requieren sesión y acceso al servicio; la URL del Blob no es pública. No se guarda la clave del almacenamiento en el navegador.

Los informes y archivos se auditan, sin credenciales. Si se elimina definitivamente un servicio vencido de Papelera, se elimina su ficha y los archivos se limpian en la tarea de mantenimiento; también se limpian retirados y cargas pendientes de más de un día. El tutorial tiene una guía exclusiva de Informes y demostraciones sin escrituras; el de administrador incluye el nuevo espacio y rol, y el de vendedor conserva sus permisos.

## Entorno de prueba

La base PostgreSQL de Preview es distinta de Production. El almacén privado consitec-informes-pruebas se conecta solo a Preview. No se modifica la base de producción ni se configura Blob en Production durante esta prueba. No integrar a main sin revisar la función y preparar el almacenamiento definitivo de Production.

Migración aditiva 20261009030000_reports_workspace (undécima). Añade REPORTS, tablas ServiceReport/ReportDocument y estados de informe. No ejecutar seed contra bases remotas. Requiere BLOB_READ_WRITE_TOKEN privado, ya conectado en Preview; nunca guardar su valor en Git, chat o documentación. Local: preservar DATABASE_URL/DIRECT_URL de localhost y configurar únicamente la clave del almacén de pruebas en .env ignorado.

En este entorno en la nube Node 24 debe usar el proxy existente para conexiones HTTP de Blob: arrancar con NODE_USE_ENV_PROXY=1 npm run start -- --port PUERTO y ejecutar la suite con node --use-env-proxy scripts/reports-smoke.mjs. No cambiar destinos ni imprimir valores del proxy. Mantener localhost y 127.0.0.1 excluidos del proxy. Producción Vercel no necesita esta opción local.

La suite exige consitec en localhost y prueba creación de cuenta sin comercial, permisos, agenda automática, varias fechas, transiciones sin duplicar, archivos reales privados, descarga, formatos/tamaño, auditoría y preservación del importe. Crea y elimina solo sus fixtures locales y objetos de prueba. La revisión de Vercel debe usar únicamente la base de Preview comprobada como distinta de Production.

## Revisar la versión

Entra al enlace de Preview con tu administrador. Abre Informes para revisar los servicios disponibles. Desde Usuarios puedes crear una cuenta Encargados de informes, elegir tu contraseña y luego iniciar sesión con ella para comprobar la navegación exclusiva. Para probar la agenda, registra en Preview un servicio y márcalo Ejecutado o Facturado. No uses datos personales o documentos reales en los ejemplos de prueba.
