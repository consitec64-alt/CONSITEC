# Crear cuentas de acceso

Inicia sesión con una cuenta Administrador y abre **Usuarios** en el menú del panel.
Completa el nombre de usuario, una contraseña de al menos 12 caracteres (máximo
72 bytes) y el rol. Presiona **Crear usuario**. La cuenta puede iniciar sesión
inmediatamente; comparte sus credenciales por un canal privado.

Los nombres admiten letras sin acentos, números, puntos, guiones y guiones bajos
(3–100 caracteres), y distinguen mayúsculas y minúsculas. No pueden repetirse.
Las contraseñas se guardan con bcrypt y nunca se devuelven en las respuestas.

Solo los administradores pueden listar o crear cuentas. El permiso se comprueba
contra la base de datos en cada operación. Ambos roles conservan acceso a las
funciones comerciales existentes. Crear una cuenta no agrega un registro al
catálogo de comerciales; ese catálogo se administra en Base de soporte.

Esta versión no incluye eliminación de cuentas ni recuperación de contraseñas.
No requiere migraciones ni nuevas variables de entorno. Despliega el código con
la misma base PostgreSQL y las variables de autenticación existentes.

Para verificar la función contra la base local aislada, inicia PostgreSQL y la
aplicación y ejecuta:

```sh
SMOKE_BASE_URL=http://127.0.0.1:3000 node --env-file=.env scripts/users-smoke.mjs
```

El test crea cuentas temporales, verifica roles, validación, duplicados, bcrypt e
inicio de sesión, y las elimina al terminar. Rechaza bases remotas.
