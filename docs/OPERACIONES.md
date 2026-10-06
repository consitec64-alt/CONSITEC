# Editar registros y personalizar el ranking

## Ventas y servicios

En **Venta de certificados**, presiona el lápiz junto a la venta. El formulario
muestra los valores actuales. Puedes cambiar cliente, tipo de cliente, curso,
comercial, importe, fecha y estado; presiona **Guardar cambios**. Cancelar no
modifica el registro. Cambiar la fecha a otro mes mueve la venta a esa selección.

En **Agenda de servicios**, el lápiz permite editar también cliente, curso,
comercial, instructor, ubicación, importe, fecha, estado y tipo de servicio.
Los totales y el ranking se actualizan al guardar.

Las ventas y los servicios son registros separados. Las ventas nuevas mayores a
S/700 conservan el comportamiento de crear un servicio en la agenda. Editar una
venta no crea otro servicio ni modifica el que ya existe; edita ese servicio por
separado si corresponde.

## Colores por comercial

Abre **Rendimiento comercial → Colores de comerciales**. Selecciona el color y
presiona **Guardar color**. Se aplica a la barra del ranking y al gráfico de
actividad por comercial. El color se guarda en PostgreSQL y lo comparte todo el
equipo; permanece al recargar y cambiar de equipo o navegador. Ambos roles
pueden cambiar colores. Las cuentas de acceso y el catálogo de comerciales son
independientes, por lo que el selector incluye todos los comerciales del catálogo.

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
