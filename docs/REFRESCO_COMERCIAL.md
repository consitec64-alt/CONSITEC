# Formularios comerciales y presentación

El panel conserva su navegación y su identidad azul y naranja. La vista general incorpora accesos rápidos; los formularios se dividen en secciones numeradas. Los catálogos de cursos e instructores se despliegan con búsqueda, casillas y etiquetas para quitar selecciones. Las selecciones se conservan aunque se filtre el catálogo.

## Venta de certificados

- Tipo **Operador** (persona natural o empresa) o **Inspección** (solo empresa). Inspección selecciona Empresa y bloquea Persona natural; el servidor también valida la regla.
- Empresa activa un correlativo obligatorio de cuatro dígitos, independientemente del importe, al crear y editar. Personas naturales no guardan correlativo.
- Uno o varios cursos del catálogo comparten un único importe. La tabla muestra todos los cursos, el tipo de certificado y el correlativo; la búsqueda encuentra cursos adicionales.
- Las ventas nuevas mayores a S/700 mantienen una copia en agenda con todos sus cursos y un único importe. Personas naturales no necesitan correlativo para esta copia. Editar la venta no crea copias nuevas; la agenda se edita por separado.
- Solo certificados de empresas facturados cuentan para los totales facturados. Ni los cursos adicionales ni las copias en agenda duplican el ingreso.

## Servicios

Permiten uno o varios instructores para todas las fechas, o dejarlos sin asignar. Todos aparecen en las tarjetas. Se verifica la disponibilidad de cada instructor, incluidas asignaciones históricas, al crear, editar y restaurar. Las reservas simultáneas se serializan en un orden consistente.

El Registro de instructores genera una fila por fecha e instructor; permite filtrar por cualquiera y exportar las filas a Excel. Las horas corresponden a cada instructor. La cantidad mensual de servicios sigue siendo una por fecha y el importe es único para el conjunto.

Los catálogos utilizados por cualquier curso o instructor adicional no se pueden eliminar, incluso cuando el registro está en la papelera. El historial incluye el tipo de certificado, correlativo y selecciones múltiples.

## Registros anteriores y despliegue

La migración `20261010100000_certificates_and_instructors` crea las relaciones y copia a ellas el curso y el instructor originales. Conserva los campos individuales para compatibilidad. Las ventas anteriores reciben Operador como valor inicial, editable; sus correlativos se conservan sin inventar números y se solicitan al editar ventas de empresa.

No requiere variables de entorno ni dependencias nuevas. Vercel ejecuta `npm run prisma:deploy` antes del build. Aplicar primero en Preview; no cambiar producción antes de revisar el PR.

El tutorial mantiene la distinción entre administradores y vendedores, incorpora los accesos rápidos y las nuevas opciones, y explica búsqueda y eliminación genéricas una sola vez.

Validación local: `SMOKE_BASE_URL=http://127.0.0.1:3065 node --env-file=.env scripts/certificates-instructors-smoke.mjs`. Utiliza únicamente la base local y limpia sus fixtures.
