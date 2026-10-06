# Editar registros y personalizar el ranking

## Ventas y servicios

En **Venta de certificados**, presiona el lápiz junto a la venta. El formulario
muestra los valores actuales. Puedes cambiar cliente, tipo de cliente, curso,
importe, fecha y estado; presiona **Guardar cambios**. Cancelar no
modifica el registro. Cambiar la fecha a otro mes mueve la venta a esa selección.

En **Agenda de servicios**, el lápiz permite editar también cliente, curso,
instructor, ubicación, importe, fechas, horario, modalidad, estado y tipo de servicio.
Los totales y el ranking se actualizan al guardar.

Las ventas y los servicios son registros separados. Las ventas nuevas mayores a
S/700 conservan el comportamiento de crear un servicio en la agenda. Editar una
venta no crea otro servicio ni modifica el que ya existe; edita ese servicio por
separado si corresponde.

## Colores por comercial

Abre **Rendimiento comercial → Colores de comerciales**. Selecciona el color y
presiona **Guardar color**. Se aplica a la barra del ranking y al gráfico de
actividad por comercial. El color se guarda en PostgreSQL y lo comparte todo el
equipo; permanece al recargar y cambiar de equipo o navegador. Solo los
administradores pueden cambiar colores y gestionar el catálogo de comerciales.
Los vendedores pueden consultar el ranking, pero no ven el catálogo en Base de soporte.

La migración `20261006170000_salesperson_color` agrega `Salesperson.color` con un
valor inicial azul. Vercel aplica migraciones antes de compilar; sus variables de
Preview y Production deben apuntar a bases distintas. No se eliminan registros ni
se ejecuta el seed de administrador durante los builds.

## Marca

El logo original, obtenido de la URL proporcionada por el propietario
`https://consitecperu.com/logo.png`, se guarda en `public/consitec-logo.png`.
Se utiliza en inicio de sesión, panel, Usuarios e iconos del sitio. El sitio usa
su copia local; no depende de que esa URL esté disponible durante la navegación.

## Comprobación local

Con PostgreSQL y la aplicación iniciados, usando la base aislada localhost/consitec:

```sh
SMOKE_BASE_URL=http://127.0.0.1:3000 node --env-file=.env scripts/operations-smoke.mjs
```

El smoke comprueba edición, validación, totales, colores compartidos, eliminación
de cuentas, protección de la propia cuenta, revocación inmediata de sesiones,
CSRF y conservación de registros comerciales. Elimina sus datos temporales y
restaura los colores al terminar; rechaza bases remotas.

## Facturación y clientes del mes

**Vista general** muestra la facturación estimada de la agenda y **Total facturado**.
Este segundo total suma solo registros Facturados: servicios que no sean «Solo
certificados» y ventas de certificados con tipo Empresa. Excluye certificados de
personas naturales y los estados Programado y Ejecutado. **Rendimiento comercial**
aplica la misma regla al total facturado de cada comercial.

La **Meta de facturación** mensual es S/200,000 y usa ese Total facturado.
Se alcanza desde S/200,000 inclusive. La **fecha de facturación** determina el mes,
independientemente de las fechas del servicio o de la venta. Al pasar un registro
a Facturado se usa la fecha actual de Perú, salvo que se indique otra fecha en el
formulario. Editar un registro que sigue Facturado conserva su fecha de
facturación. Volver a Programado o Ejecutado elimina su aporte al total facturado;
al facturarlo nuevamente se asigna una nueva fecha.

Ejemplo: un servicio con fechas 31 de octubre, 1 y 2 de noviembre, facturado el
15 de noviembre, aporta su único importe a la meta de noviembre. Aparece en la
agenda de ambos meses. La facturación estimada asigna el importe solo al mes de
su primera fecha; la facturación real usa la fecha de facturación.

Los servicios «Solo certificados» son registros de agenda y no aportan otra vez
al Total facturado: su facturación se registra en Venta de certificados. Esto
permite distinguir empresas de personas naturales y evita duplicar importes.
Si un certificado está únicamente en la agenda, necesita una venta correspondiente
para aportar al nuevo total.

El contador **clientes únicos** reúne los nombres de clientes de servicios y
ventas de certificados del mes seleccionado. Repetir un cliente en diferentes
fechas cuenta una sola vez; se ignoran mayúsculas y espacios repetidos o externos.
La identificación usa nombres, no RUC/DNI. Los filtros de búsqueda y estado no
cambian estos indicadores mensuales.

## Correlativo, viáticos y varias fechas

Crear o editar un servicio requiere un **Código de correlativo** de exactamente
cuatro dígitos, por ejemplo `0042`. Se conservan ceros iniciales. No se exige que
sea único ni se genera automáticamente. Los registros antiguos se muestran como
**Sin código** hasta que se completen al editar; no se inventan correlativos.

**Viáticos** es opcional: No aplica, Avión o Bus. **Agregar fecha** permite repetir
las jornadas de un registro sin copiar su importe. **Cada fecha cuenta como un
servicio** en las metas 45/70, ranking y avance semanal del mes correspondiente.
No repitas una fecha en el formulario. Quitar una fecha elimina esa jornada de la
agenda. El registro conserva un solo estado, instructor, comercial e importe.
El importe total se suma una sola vez, en su mes de facturación cuando corresponde.

Las ventas nuevas de certificados mayores a S/700 requieren un correlativo para
su copia de agenda. La venta y su servicio se guardan juntos en una transacción;
si el código es inválido, no se guarda parcialmente la venta. Editar una venta no
crea ni modifica otro servicio, como antes.

## Disponibilidad de instructores

Al seleccionar fechas, el formulario comprueba todos los instructores y marca
**no disponible** a quienes ya tienen otro servicio en cualquiera de esas fechas.
Editar el propio servicio no genera un conflicto consigo mismo. Si cambias las
fechas y el instructor seleccionado pasa a estar ocupado, aparece una advertencia.

La API vuelve a comprobar disponibilidad al guardar y devuelve un conflicto con
el instructor y la fecha. Las reservas del mismo instructor se serializan en
PostgreSQL para impedir dos asignaciones simultáneas al mismo día. La regla es
por día completo: los horarios calculan duración, pero no permiten reservar
dos servicios del mismo instructor en el mismo día. Instructor sigue
siendo opcional y puedes guardar un servicio sin asignarlo.

## Resumen mensual por comercial

En **Rendimiento comercial → Resumen mensual por comercial**, cada comercial tiene
una tabla desplegable de servicios con estas columnas, en orden: Código de
correlativo, Empresa, Monto y Estado. Un servicio aparece una sola vez en la tabla,
aunque tenga varias fechas. Incluye servicios con actividad en el mes y servicios
facturados ese mes, incluso cuando sus jornadas fueron de otro mes. El subtotal
indica los servicios normales facturados ese mes; las ventas de certificados a
empresas están incluidas en la columna Total facturado del panel superior.

## Fichas de instructores

En **Base de soporte → Instructores**, despliega un nombre para consultar y editar
su ficha. Incluye dirección y DNI como texto libre, selección de cursos del catálogo, fecha de vencimiento
del EMO y SCTR Sí/No. **Auto** despliega modelo y placa. Solo el nombre es
obligatorio; los demás campos se pueden dejar vacíos. **Agregar instructor** abre
la misma ficha para un instructor nuevo. No se modifican cursos ni servicios
existentes al actualizar estos datos.

## Modalidad y duración por jornada

Selecciona **Virtual** o **Presencial** y escribe inicio y fin en formato **HH:mm**
(00:00–23:59) en cada fecha. El fin debe ser posterior al inicio dentro del mismo
día. La duración descuenta **1 hora de descanso solo cuando supera 5 horas**:
09:00–14:00 = 5 h; 09:00–15:00 = 5 h de clase y 1 h de descanso;
08:30–13:31 = 4 h 1 min de clase. El formulario muestra cada duración y el total
sin los descansos. Estos horarios no duplican ni reparten el importe.

Los datos antiguos conservan modalidad y horarios vacíos hasta que se completen
al editar. Los cursos escritos anteriormente se conservan como una nota visible;
selecciona los cursos correspondientes del catálogo para vincularlos correctamente.

## Comercial asignado a la cuenta

Un administrador abre **Usuarios**, elige el comercial de cada cuenta y pulsa
**Guardar comercial**. Las nuevas cuentas requieren asignación. Las cuentas
anteriores siguen accediendo al panel, pero necesitan asignación antes de crear
ventas o servicios. No se adivinan asignaciones a partir de nombres o roles.

El formulario muestra el comercial automáticamente; ya no permite elegirlo.
El servidor utiliza la asignación vigente en PostgreSQL, aunque la sesión se
haya iniciado antes de cambiarla. Editar una venta o servicio conserva su
comercial original. Cambiar la asignación de una cuenta afecta solo registros
nuevos; eliminar una cuenta no elimina sus ventas.

La migración `20261006220000_user_assignment_class_sessions` agrega las relaciones
de usuarios y cursos, modalidad y horarios. Conserva los cursos anteriores como
notas; no inventa cursos, horarios ni comerciales para registros históricos.

## Navegación y temas

Contrae o expande la barra lateral con la flecha o arrastrando su borde. Al
contraerla quedan los iconos con sus nombres accesibles y ayudas al pasar el
cursor. En móvil se mantiene una barra de iconos; el botón de menú o un gesto
horizontal permite abrir la navegación completa. Los iconos permiten cambiar de
apartado sin abrir el menú. La barra permite desplazarse verticalmente cuando
no cabe en la pantalla.

El botón de luna/sol cambia entre tema claro y oscuro. La preferencia de tema y
la barra compacta se guardan en el navegador y permanecen al recargar. Los temas
se aplican también al inicio de sesión y a Usuarios.

## Actualización de datos existentes

Las migraciones `20261006200000_service_workspace` y
`20261006210000_invoice_date` conservan servicios, ventas e instructores, agregan
los campos y fechas y convierten **Pagado → Facturado**, según la decisión del
propietario. Solo quedan Programado, Ejecutado y Facturado en base de datos y
formularios; la API rechaza Pagado.

No se conoce la fecha real de facturación de los registros históricos. La
migración conserva el mes que utilizaba el sistema: asigna la fecha original del
servicio o venta a los que ya están Facturados. Revisa y ajusta esa fecha en el
formulario si corresponde a otro mes. Los nuevos cambios de estado guardan la
fecha de facturación real de forma independiente.

Vercel ejecuta las migraciones antes de compilar. No ejecutes seed de administrador
sobre una base de producción ni conectes Preview a la base de Production.

## Pruebas adicionales

Con la base aislada localhost/consitec y la aplicación iniciada, ejecuta los
smokes uno después de otro para que sus registros temporales no alteren las
comprobaciones de totales de otra prueba:

```sh
SMOKE_BASE_URL=http://127.0.0.1:3000 node --env-file=.env scripts/billing-smoke.mjs
SMOKE_BASE_URL=http://127.0.0.1:3000 node --env-file=.env scripts/workspace-smoke.mjs
SMOKE_BASE_URL=http://127.0.0.1:3000 node --env-file=.env scripts/assignment-sessions-smoke.mjs
```

El segundo prueba fichas, códigos obligatorios, viáticos opcionales, fechas
múltiples, disponibilidad y reservas simultáneas, cambios de mes de facturación,
conservación de la fecha al editar, copias de certificados sin guardado parcial y
rechazo de Pagado. Ambos eliminan sus datos temporales y rechazan bases remotas.
