# Importación de servicios desde Excel

En **Agenda de servicios**, el panel **Importar Excel** reemplaza a Servicio rápido debajo del calendario. Está disponible para administradores y comerciales.

1. Selecciona un `.xlsx` o `.xlsm` de hasta 5 MB. Las macros no se ejecutan; el archivo se lee en el navegador.
2. Elige la hoja y el año para las fechas que solo contienen día y mes. Las fechas completas conservan su año.
3. Revisa las coincidencias de cursos e instructores. Los nombres sin coincidencia requieren seleccionar un registro o crear uno explícitamente en el catálogo.
4. Corrige las filas y selecciona las que deseas importar. Cargar el archivo no registra servicios automáticamente.

Se reconocen las columnas **EMPRESA, CURSO, INSTRUCTOR y DÍA - MES/FECHA**, además de MES, MODALIDAD, LUGAR y HORAS. Se omiten las hojas auxiliares; el límite es de 500 servicios por hoja. Varios cursos o instructores en una celda se separan por saltos de línea o punto y coma. Cada fila crea un servicio con todos esos cursos e instructores.

## Fechas, duración e importe

- Cada servicio comienza con **importe S/0** y se puede editar después desde la agenda. Las fechas pasadas siguen la regla habitual de estado Ejecutado.
- HORAS representa duración, no una hora de inicio. Se conserva en el registro de instructores, los resúmenes y las exportaciones. Se admiten decimales como `0,75` (45 minutos).
- Sin inicio y fin se reserva el día completo. Para varias clases del mismo instructor en un día, completa horarios que no se crucen. Un horario real sustituye la duración declarada y aplica el descanso habitual.
- Una fecha que no coincide con el mes de la hoja muestra una advertencia y queda sin seleccionar inicialmente. Las filas incompletas deben corregirse antes de importarlas.
- LUGAR se conserva como texto original sin inventar una ubicación del catálogo. Si luego se elige una ubicación del catálogo, se usa esta en el registro y la exportación.

## Guardado y reintentos

La importación guarda una fila a la vez y muestra el resultado individual. Se puede detener después de la fila en curso; las filas ya guardadas permanecen. Continúan aplicándose los controles de disponibilidad, posibles duplicados, meses cerrados y permisos del sistema. Un posible duplicado requiere confirmación explícita por fila.

Repetir **el mismo archivo, hoja, fila y año** devuelve el servicio existente y conserva sus cambios posteriores, incluido el importe. Si el archivo cambia, se considera una nueva fuente y se aplican los controles habituales de duplicados. Una fila cuyo servicio está en la papelera requiere restaurarlo, no se recrea silenciosamente.

Los comerciales importan con su comercial asignado; un administrador puede elegirlo o dejarlo sin asignar. Los supervisores no pueden importar.

## Despliegue y validación

Aplicar `prisma migrate deploy` antes de usar la nueva versión. La migración `20261016210000_service_excel_import` añade campos opcionales para la clave de importación, el lugar original y la duración declarada; los registros existentes mantienen valores nulos.

Validaciones realizadas: build de producción, TypeScript, pruebas de transformación/exportación, 31 solicitudes de API sobre PostgreSQL local aislado y pruebas de navegador con el archivo de referencia (58/76/99 filas en sus tres hojas). Se comprobaron permisos, importes cero, duración, edición, reintentos, concurrencia, duplicados, disponibilidad, papelera, meses cerrados, desplazamiento de la vista previa y diseño móvil. Los datos del archivo de referencia solo se importaron en la base local de pruebas.

Pruebas reproducibles:

```sh
npx tsx scripts/check-service-import.ts
npx tsx scripts/check-services-excel.ts
```

`scripts/service-import-smoke.ts` necesita un servidor con la migración aplicada y variables `TEST_DATABASE_URL`, `TEST_BASE_URL` y `AUTH_SECRET` coincidentes. Por seguridad exige destinos locales y crea sus propios datos de prueba; usar exclusivamente una base desechable.
