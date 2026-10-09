# Certificados, Supervisor y preferencias personales

Todas las ventas de certificados, incluidas las de empresa de S/700 o menos, suman al total de certificados. Solo empresas con importe estrictamente mayor a S/700 aparecen en la agenda; solo esas ventas, en estado Facturado, suman a la facturación mensual por su fecha de facturación. La copia de agenda no duplica ingresos. Personas naturales: Pendiente/Pagado; empresas: Pendiente/Facturado.

La venta y su copia automática están vinculadas por `Service.certificateSaleId` único. Crear, editar, cambiar de cliente o cruzar S/700 sincroniza cliente, importe, cursos, correlativo, fecha y estado en una transacción. Bajar el importe retira la copia durante su ventana de papelera; volver a superar S/700 reutiliza la copia mientras exista. Eliminar/recuperar la venta elimina/recupera su copia. La agenda abre la venta vinculada al pulsar Editar; no permite eliminar o restaurar la copia de manera independiente. Se respetan los meses cerrados de ambos registros.

Las migraciones son aditivas. Solo vinculan copias históricas que coinciden inequívocamente en empresa, importe, fecha, curso original y comercial. También se recupera el vínculo de copias ya editadas mediante los dos registros de creación del mismo actor y transacción, cuando coinciden sus datos originales. Esa reparación actualiza la copia elegible o la retira si corresponde; no modifica meses cerrados ni copias con instructores asignados. Los casos ambiguos o sin evidencia requieren revisión: no se vinculan ni eliminan por suposición. Los estados históricos se conservan: no se infiere un pago a partir de Ejecutado o Facturado. Al editar una venta con un estado anterior que ya no corresponde a su tipo de cliente, se exige seleccionar uno de los dos estados actuales.

Supervisor no necesita un comercial asignado. Consulta todo el equipo: servicios, certificados, cotizaciones y PDF, rendimiento, registro de instructores, fichas de soporte, historial y papelera. No gestiona usuarios, cierres, semanas ni registros; la API verifica el rol actual en la base y bloquea escrituras, además de los controles de interfaz. Puede guardar sus preferencias y progreso del tutorial.

Mi perfil permite subir/quitar una foto y elegir texto Normal, Grande o Muy grande. PNG/JPEG/WebP de hasta 5 MB se ajustan en el navegador a 256 × 256; el servidor admite únicamente imágenes de hasta 150 KB, guardadas en la cuenta. No se necesita almacenamiento externo ni variables nuevas. Se aplica el tamaño de texto en todas las herramientas y persiste entre dispositivos/sesiones. Inicio y fin por fecha tienen un desplegable compacto con horas completas (00:00 a 23:00) en formato de 24 horas. Los horarios históricos con minutos se conservan mientras no se elija otra hora; no se redondean automáticamente. El pie muestra Versión 0.30; el descuento de una hora si el horario supera cinco horas se mantiene.

El administrador restablece una contraseña temporal desde Usuarios; el usuario debe reemplazarla al ingresar y confirmar la temporal. Las contraseñas siguen almacenadas con bcrypt; no aparecen en listados ni auditoría. Un contador de sesión revoca las sesiones antiguas al restablecer o cambiar la contraseña. Comunicar la temporal por un canal privado. La cuenta propia cambia su contraseña desde Mi perfil.

Tutoriales separados para administrador, vendedor y supervisor; incluyen reglas de certificados, reloj, foto, tamaño de texto y restablecimiento administrativo. Los últimos controles siguen siendo Actualizar, Tema y Repetir tutorial.

## Comprobación local

Con la base aislada de desarrollo y la aplicación iniciada:

```sh
npx prisma migrate deploy
npm run build
npm run start -- --port 3070
SMOKE_BASE_URL=http://127.0.0.1:3070 node scripts/smoke-certificates-profile.mjs
```

La prueba rechaza bases/aplicaciones remotas, crea fixtures propios y los elimina. Comprueba sincronización, umbral S/700, estados, facturación única, papelera, permisos de supervisor, perfil, restablecimiento y revocación de sesiones. Preview y producción mantienen bases separadas; no aplicar estas migraciones a producción antes de la revisión.
