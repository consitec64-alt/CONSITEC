# Crear cuentas con correo

Inicia sesión con una cuenta Administrador y abre **Usuarios** en el menú del
panel. Completa el correo electrónico, una contraseña de al menos 12 caracteres
(máximo 72 bytes), el rol y el comercial asignado. Presiona **Crear usuario**. La cuenta puede iniciar
sesión inmediatamente con su correo y contraseña. Comparte las credenciales por
un canal privado.

Los correos se guardan sin espacios exteriores y en minúsculas, y no pueden
repetirse. El inicio de sesión acepta diferencias de mayúsculas. El correo es un
identificador de acceso: esta versión no envía mensajes ni verifica su propiedad.
Las contraseñas se guardan con bcrypt y nunca se devuelven en las respuestas.

## Cuentas existentes

Los nombres anteriores, incluido `admin`, siguen funcionando hasta que se les
asigne un correo. En **Cuentas existentes**, escribe la dirección correspondiente
y presiona **Guardar correo**. Después, esa cuenta debe iniciar sesión con el
correo nuevo y su contraseña actual. La sesión abierta se conserva. Verifica el
correo antes de guardarlo; un administrador puede corregirlo desde esta pantalla.

Se utiliza el campo de acceso existente `User.username` para almacenar el correo,
sin cambiar su contraseña ni requerir nuevas variables de entorno. La asignación
de comercial sí requiere la migración de relaciones incluida en esta versión. No vuelvas
a ejecutar el seed de administrador después de cambiar su nombre de acceso: el
seed busca ADMIN_USERNAME (por defecto admin) y podría crear otra cuenta admin.
El build normal de Vercel no ejecuta ese seed.

Solo los administradores pueden listar, crear cuentas, cambiar correos y eliminar usuarios. El
permiso se comprueba contra la base de datos en cada operación. Ambos roles
conservan acceso a la operación comercial; solo Administrador puede ver y
modificar el catálogo de comerciales en Base de soporte. Crear una cuenta no
agrega un registro al catálogo de comerciales; ese catálogo se administra en
Base de soporte. Esta versión no incluye recuperación de contraseñas.

## Asignar un comercial

En **Cuentas existentes**, selecciona el **Comercial** de la cuenta y pulsa
**Guardar comercial**. Puedes hacerlo sin cambiar su correo o contraseña,
incluso para `admin`. Crea primero el comercial en **Base de soporte** si falta.

Cada nueva venta o servicio se guarda automáticamente con esa asignación.
Cambiarla no mueve registros históricos. Las cuentas antiguas sin asignación
pueden consultar y editar, pero no crear ventas hasta recibirla. Varias cuentas
pueden compartir un comercial; cada cuenta tiene como máximo uno asignado.

## Eliminar usuarios

Presiona **Eliminar cuenta** junto al usuario y confirma en el diálogo. La cuenta
pierde el acceso inmediatamente, incluidas sus sesiones abiertas; sus ventas y
servicios se conservan. No puedes eliminar tu propia cuenta y debe quedar al
menos un administrador. La confirmación se puede cancelar antes de eliminar.

## Verificación local

Inicia PostgreSQL y la aplicación y ejecuta contra la base local aislada:

```sh
SMOKE_BASE_URL=http://127.0.0.1:3000 node --env-file=.env scripts/users-smoke.mjs
```

El test verifica creación, normalización e inicio de sesión por correo, cambio
de correo conservando contraseña y sesión, acceso previo, roles, validación,
duplicados, bcrypt y CSRF. Limpia sus cuentas temporales y rechaza bases remotas.

## Si se olvida una contraseña

Actualmente no hay recuperación por correo ni botón de restablecimiento. La
contraseña existente no puede leerse porque está guardada como hash bcrypt.

Para una cuenta de vendedor, un administrador puede anotar su comercial
asignado, eliminar esa cuenta y crearla nuevamente con el mismo correo,
comercial y una nueva contraseña. Los servicios y ventas se conservan;
las sesiones anteriores se revocan. Comparte la nueva contraseña por un canal
privado. Esto crea una cuenta nueva, no recupera la contraseña anterior.

No uses este procedimiento para la propia cuenta ni para el único
administrador: el sistema impide eliminarlos. Ese caso requiere una
intervención técnica autorizada para actualizar el hash, sin ejecutar seed.

La mejora recomendada es añadir Restablecer contraseña para administradores
en Usuarios. Para un flujo Olvidé mi contraseña por correo hacen falta un
proveedor de correo y enlaces con tokens de un solo uso y vencimiento.
