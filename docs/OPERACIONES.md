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

## Facturación y clientes del mes

**Vista general** muestra la facturación estimada (todos los importes de la
agenda) y, a su lado, **Total facturado** (solo servicios cuyo estado actual es
Facturado). Programado, Ejecutado y Pagado no se incluyen en este segundo total.
En **Rendimiento comercial**, la columna **Total facturado** usa esa misma regla
para cada comercial, incluyendo los que tienen cero.

La **Meta de facturación** es S/200,000 y usa la facturación estimada del mes.
Se alcanza desde S/200,000 inclusive y se actualiza al editar, eliminar o cambiar
el mes de los servicios. Las ventas de certificados no se suman por segunda vez
al importe de la agenda: algunas ya aparecen allí como servicios.

El contador **clientes únicos**, junto a servicios y ventas de certificados,
une los nombres de clientes de ambos apartados dentro del mes seleccionado.
Repetir un cliente en diferentes fechas cuenta una sola vez. Se ignoran
mayúsculas, espacios iniciales/finales y espacios repetidos. El sistema usa
nombres, no RUC/DNI: personas diferentes con el mismo nombre contarán como una;
variantes de razón social o errores ortográficos pueden contar como diferentes.
Los filtros de búsqueda y estado no cambian estos indicadores mensuales.

Para comprobar límites del mes, céntimos, estados, totales por comercial, meta
y clientes repetidos con datos temporales que se eliminan al terminar:

```sh
SMOKE_BASE_URL=http://127.0.0.1:3000 node --env-file=.env scripts/billing-smoke.mjs
```
