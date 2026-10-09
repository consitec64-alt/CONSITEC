# Semanas comerciales por mes

En **Rendimiento comercial → Semanas del mes**, todos los usuarios pueden consultar los rangos vigentes. Solo los administradores ven **Configurar semanas** y pueden guardar sus fechas.

Selecciona primero el mes y año del panel. Define entre una y seis semanas, con fechas de inicio y fin inclusivas. Los rangos deben cubrir todos los días del mes en orden, sin huecos ni solapamientos y sin cruzar a otro mes. Agregar una semana divide el último rango; quitar una integra sus días en el rango vecino. Guarda para aplicar los cambios a todo el equipo.

La distribución semanal y las columnas de rendimiento usan estos mismos rangos. Cada fecha de un servicio cuenta en su semana; el importe y los totales mensuales conservan sus reglas actuales, sin duplicaciones.

Mientras no exista una configuración, se usan los bloques habituales: 1–7, 8–14, 15–21 y 22–fin de mes. **Restaurar semanas habituales** elimina la configuración del mes seleccionado. Los cambios se registran en el historial. Los meses cerrados requieren reapertura antes de modificarlos.

Si otro administrador modifica la configuración mientras editas, el sistema rechaza el guardado para evitar sobrescribirlo. Actualiza el panel y pulsa **Descartar borrador y usar semanas actuales** para cargar las fechas vigentes.

El tutorial de vendedores explica la consulta; el de administradores incluye los campos y acciones de configuración.

## Despliegue

Aplicar la migración aditiva `20261010050000_commercial_weeks` con `npm run prisma:deploy`, como las migraciones existentes. Crea `CommercialWeekPlan`; no modifica ventas ni requiere variables de entorno o dependencias nuevas.

Validación local: `SMOKE_BASE_URL=http://127.0.0.1:3063 node --env-file=.env scripts/commercial-weeks-smoke.mjs` (solo base local; crea y elimina sus fixtures).
