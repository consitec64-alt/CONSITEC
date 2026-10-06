# Desplegar CONSITEC en Vercel

El repositorio incluye `vercel.json`, Node 24 y generación automática del cliente Prisma al instalar y compilar. Las rutas API usan funciones Node.js y PostgreSQL externo; no necesitan un servidor PostgreSQL dentro de Vercel.

## 1. Crear PostgreSQL

En Vercel Marketplace busca **Neon**, crea una base PostgreSQL y conéctala al proyecto. También puedes crearla en Neon e introducir las variables manualmente. Selecciona una región próxima a las funciones del proyecto.

Obtén dos cadenas de conexión del proveedor:

- **DATABASE_URL**: conexión con pooling para las funciones. En Neon el hostname suele incluir `-pooler`; conserva los parámetros TLS del proveedor y añade `connection_limit=1` para limitar conexiones por instancia Prisma.
- **DIRECT_URL**: conexión directa, sin pooling, para las migraciones. Conserva `sslmode=require` y los demás parámetros de seguridad indicados por Neon.

Si la integración crea variables con prefijos distintos, copia sus valores a estos nombres. No uses las direcciones de localhost del archivo de ejemplo. No compartas las URLs ni las subas a GitHub.

## 2. Configurar Vercel

Importa `consitec64-alt/CONSITEC` desde GitHub, selecciona la rama que contiene estos cambios y deja la raíz del proyecto en la raíz del repositorio. Configura:

| Ajuste | Valor |
| --- | --- |
| Framework | Next.js |
| Node.js | 24.x |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Predeterminado de Next.js |

Añade en **Settings → Environment Variables**:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL con pooling |
| `DIRECT_URL` | PostgreSQL directo para Prisma |
| `AUTH_SECRET` | Clave aleatoria de al menos 32 bytes para firmar sesiones |

Genera `AUTH_SECRET` con `openssl rand -hex 32` y guárdalo como secreto. No definas `NODE_ENV`: Vercel lo administra. Usa una base distinta y otro `AUTH_SECRET` para Preview; evita que una vista previa escriba en producción. Las sesiones duran ocho horas y utilizan cookies HttpOnly, SameSite=Lax y Secure en producción.

## 3. Inicializar la base antes de abrir el sitio

Las migraciones no se ejecutan automáticamente durante cada build: una Preview no debe modificar la base de producción. Desde un checkout local de **esta misma rama**, usa un archivo `.env` ignorado con `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `ADMIN_USERNAME` y `ADMIN_PASSWORD`. No reutilices la base de desarrollo si estás inicializando producción.

`ADMIN_PASSWORD` debe tener al menos 12 caracteres y como máximo 72 bytes. Elige una contraseña exclusiva; ya no existe una contraseña predeterminada. Ejecuta:

```bash
npm ci
npm run prisma:deploy
npm run prisma:seed
```

El seed crea el administrador con bcrypt y los catálogos iniciales. Repetirlo no duplica catálogos ni cambia la contraseña de un administrador que ya tiene un hash. Si existía un administrador con contraseña en texto plano, el seed exige `ADMIN_PASSWORD` y reemplaza esa contraseña por un hash. Otros usuarios antiguos con contraseñas en texto plano no podrán iniciar sesión hasta que se les provisionen hashes; no se aceptan contraseñas en texto plano en el login.

`ADMIN_PASSWORD` solo se necesita para esta inicialización, no en las funciones de Vercel. Retírala de tu entorno cuando termines. No ejecutes `prisma migrate dev`, `db push`, `--force-reset` o `--accept-data-loss` sobre producción. Una base existente que haya sido creada con `db push` requiere revisar y establecer su historial de migraciones antes de `prisma:deploy`; no la borres para corregirlo.

## 4. Desplegar y comprobar

Después de configurar variables e inicializar PostgreSQL, despliega en Vercel. Comprueba:

1. Abrir `/dashboard` sin sesión redirige a `/login`; la API sin sesión devuelve 401.
2. Credenciales incorrectas se rechazan y el administrador provisionado puede entrar.
3. Los catálogos, el dashboard, los servicios y las ventas se cargan.
4. Registrar y eliminar datos de prueba funciona, y cerrar sesión bloquea nuevamente el acceso.

`npm run build` valida la compilación, pero no prueba la disponibilidad de la base externa. Para repetir la comprobación funcional automatizada usa una base aislada de prueba, arranca la aplicación y ejecuta:

```bash
npm run build
npm start
# En otra terminal, usando el .env de prueba con ADMIN_PASSWORD:
node --env-file=.env scripts/smoke.mjs
```

El smoke crea y elimina un servicio y una venta; no lo ejecutes sobre datos reales. Para un Preview aislado configura `SMOKE_BASE_URL`, `SMOKE_USERNAME` y `SMOKE_PASSWORD` de forma segura. Si el Preview tiene protección de acceso de Vercel, esa protección debe permitir el runner antes de probar la aplicación.

Los roles ADMIN y SALES se almacenan y firman en la sesión; el panel mantiene las mismas operaciones para ambos roles. No hay administración de usuarios ni restricciones distintas por rol. Para revocar todas las sesiones, rota `AUTH_SECRET` y vuelve a desplegar. Configura protección de intentos de login mediante las reglas de firewall/rate limiting disponibles en tu plan de Vercel antes de publicar el panel para uso real.

## Problemas frecuentes

- Error de Prisma al instalar: permite acceso a `binaries.prisma.sh` sin desactivar TLS ni la comprobación de checksums.
- Login devuelve 503: revisa `AUTH_SECRET`, las conexiones y las tablas; consulta los logs de funciones.
- Login devuelve 401: comprueba usuario y contraseña, y que el seed haya provisionado bcrypt.
- Prisma indica que no encuentra tablas: ejecuta `npm run prisma:deploy` contra la base correcta.
- Timeout o demasiadas conexiones: revisa pooling, `connection_limit=1`, SSL y región.
- Cambiaste variables en Vercel: vuelve a desplegar para que se apliquen.
