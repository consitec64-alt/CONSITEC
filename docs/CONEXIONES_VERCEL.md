# Conexiones PostgreSQL en Vercel

Un despliegue puede terminar correctamente y responder «Servicio temporalmente no disponible» al entrar al panel. Revisar los registros de ejecución: `Too many database connections opened` indica que PostgreSQL alcanzó el límite de conexiones del usuario, no un error de migración.

En Vercel, el cliente de ejecución limita el pool a una conexión por instancia y reutiliza el cliente en el mismo proceso. Las consultas concurrentes esperan una conexión disponible (20 segundos por defecto, respetando `pool_timeout` si ya está configurado). El límite es por instancia, no global; middleware y funciones tienen procesos separados. Fuera de Vercel se conserva la configuración existente.

No cambia credenciales, ventas ni usuarios. Las migraciones siguen utilizando `DIRECT_URL`. Para mayor concurrencia, configurar `DATABASE_URL` con la URL agrupada oficial del proveedor (pooler), manteniendo la URL directa en `DIRECT_URL`; no inventar direcciones de conexión.

Después de integrar el cambio, desplegar `main` en producción y comprobar el acceso al panel y los registros. Las instancias de despliegues anteriores pueden conservar conexiones mientras sigan activas; evitar utilizar simultáneamente muchos enlaces antiguos. Si continúa la saturación, revisar con el proveedor el pooler y las conexiones activas antes de aumentar el límite o terminar sesiones.

Prueba local: `VERCEL=1 NODE_ENV=production node --env-file=.env --import tsx scripts/vercel-connections-smoke.ts`. Ejecuta 20 consultas concurrentes y verifica que usan una única conexión. Solo permite base local.
