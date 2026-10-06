# Crear cuentas con correo

Inicia sesión con una cuenta Administrador y abre **Usuarios** en el menú del
panel. Completa el correo electrónico, una contraseña de al menos 12 caracteres
(máximo 72 bytes) y el rol. Presiona **Crear usuario**. La cuenta puede iniciar
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
por lo que no se necesitan migraciones ni nuevas variables de entorno. No vuelvas
a ejecutar el seed de administrador después de cambiar su nombre de acceso: el
seed busca ADMIN_USERNAME (por defecto admin) y podría crear otra cuenta admin.
El build normal de Vercel no ejecuta ese seed.

Solo los administradores pueden listar, crear cuentas y cambiar correos. El
permiso se comprueba contra la base de datos en cada operación. Ambos roles
conservan acceso a las funciones comerciales existentes. Crear una cuenta no
agrega un registro al catálogo de comerciales; ese catálogo se administra en
Base de soporte. Esta versión no incluye eliminación ni recuperación de
contraseñas.

## Verificación local

Inicia PostgreSQL y la aplicación y ejecuta contra la base local aislada:

```sh
SMOKE_BASE_URL=http://127.0.0.1:3000 node --env-file=.env scripts/users-smoke.mjs
```

El test verifica creación, normalización e inicio de sesión por correo, cambio
de correo conservando contraseña y sesión, acceso previo, roles, validación,
duplicados, bcrypt y CSRF. Limpia sus cuentas temporales y rechaza bases remotas.
