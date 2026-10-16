# SCTR mensual compartido

En Catálogos y equipo → SCTR mensual se guarda una sola póliza con fechas Desde y
Hasta. Al guardar SCTR: Sí en la ficha de un instructor, se incorpora automáticamente
a la lista y comparte esas fechas con los demás. SCTR: No lo retira de la lista.

El formulario propone el mes calendario actual. Preparar próximo mes rellena el
siguiente mes calendario, sin guardarlo. Las fechas se pueden ajustar a la cobertura
real. La renovación siempre necesita guardar explícitamente la nueva vigencia.

El estado cambia según la fecha de Perú: Sin fechas registradas, Por iniciar,
Vigente, Por vencer (últimos siete días) o Vencido. Hasta es inclusivo. Al caducar,
los instructores siguen incluidos, pero no se presentan como cubiertos.

Un único aviso aparece en el panel desde siete días antes de vencer y permanece
visible hasta renovar, incluso si no se ingresó el primer día del aviso. Se revisa
al cargar, al volver a la ventana y cada minuto. El aviso se muestra a administradores
y vendedores cuando hay instructores incluidos. Es un recordatorio dentro de la
aplicación, sin correos ni mensajes externos.

`GET /api/sctr` devuelve la póliza y su estado actual; `PATCH /api/sctr` guarda el
período para todo el equipo y registra la acción en el historial. La ruta antigua
por instructor responde 409 para que un cliente anterior no cambie la póliza común
accidentalmente. Los supervisores conservan sus permisos de consulta actuales,
sin acceso a administración del SCTR.

La migración `20261016190001_shared_sctr_policy` crea una tabla de una sola fila.
Solo adopta fechas anteriores si todos los instructores incluidos tienen el mismo
período completo. Si hay diferencias o fechas faltantes, se debe configurar la
póliza compartida. Las fechas anteriores se conservan para evitar pérdida de datos.
Aplicar con `npm run prisma:deploy` antes de ejecutar el nuevo código.

Pruebas: `node --import tsx scripts/check-shared-sctr.ts` verifica los límites de
fechas, y `scripts/sctr-smoke.mjs` recorre las APIs reales con PostgreSQL local aislado.
