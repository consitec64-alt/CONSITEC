export type TutorialStep = { tab: string; target: string; title: string; text: string; form?: "service" | "sale"; admin?: boolean; detail?: boolean; confirmation?: boolean; preview?: "duplicate" | "monthly-close" };
const field = (name: string) => `.modal-overlay [name="${name}"]`;
const step = (tab: string, target: string, title: string, text: string, extra: Partial<TutorialStep> = {}): TutorialStep => ({ tab, target, title, text, ...extra });
const service = (target: string, title: string, text: string) => step("services", target, title, text, { form: "service" });
const sale = (target: string, title: string, text: string) => step("certificates", target, title, text, { form: "sale" });
const instructor = (target: string, title: string, text: string) => step("support", `.instructor-card > .instructor-details:last-child ${target}`, title, text, { detail: true });
export function tutorialSteps(isAdmin: boolean): TutorialStep[] {
  const items = [
    step("summary", "nav", "Tu espacio de trabajo", "Al iniciar sesión, la bienvenida muestra el comercial asignado a tu cuenta y abre el panel automáticamente; también puedes pulsar Entrar al panel. Los iconos del menú abren cada apartado. El tutorial irá mostrando las vistas y sus controles. Los formularios se abren como demostración: este recorrido no guarda ventas ni modifica datos."),
    step("summary", ".period-picker", "Mes y año", "Elige el mes y el año o usa las flechas para consultar el período anterior o siguiente. Los indicadores y tablas se actualizan para esa selección."),
    step("summary", ".billing-metrics", "Indicadores del mes", "Consulta jornadas, facturación estimada, total facturado, comercial destacado y curso más vendido. Los clientes únicos aparecen junto al contador de servicios y certificados, aunque repitan compras."),
    step("summary", ".period-hint", "Servicios, certificados y clientes", "Cada fecha de clase cuenta como un servicio. Los certificados tienen su propio contador; un mismo cliente cuenta una sola vez dentro del mes."),
    step("summary", ".chart-grid", "Gráficos de actividad", "Compara servicios por comercial y su distribución semanal. Las barras muestran cantidad de servicios, no importes."),
    step("summary", ".goals-panel, .goal-grid, .goal", "Metas mensuales", "Consulta el avance de las metas de servicios y de S/200,000. La meta de facturación cuenta únicamente servicios y certificados de empresas en estado Facturado, en su mes de facturación."),
    step("services", ".period-picker", "Agenda de servicios", "La agenda reúne las clases del mes. Los servicios con varias fechas aparecen en cada jornada, pero conservan un único importe."),
    step("services", ".filter-bar", "Búsqueda y filtros", "Este es el funcionamiento común de las barras de búsqueda y filtros: escribe parte del nombre, combina las opciones disponibles y usa Limpiar para volver a ver todos. En el Registro de instructores, pulsa Aplicar filtros para ejecutar la selección. Lo explicaremos una sola vez."),
    step("services", ".calendar, .calendar-grid", "Calendario y registros", "Las tarjetas muestran cliente, cursos, instructor, horario, importe y estado. El lápiz abre la edición; la papelera permite retirar el registro de la vista activa. Si hay varias tarjetas en un día, abre el día para verlas."),
    step("services", ".page-heading > button", "Abrir Nuevo servicio", "Este botón abre el formulario de servicios. Ahora lo recorreremos campo por campo, sin guardar ningún registro."),
    service(field("company"), "Empresa / cliente", "Escribe el nombre o razón social del cliente. Usa una escritura consistente para que el contador de clientes únicos reconozca al mismo cliente."),
    service(field("correlativeCode"), "Código de correlativo", "Es obligatorio y debe contener exactamente cuatro dígitos numéricos. Por ejemplo, 0042. Se muestra en el registro y en el resumen mensual."),
    service(field("modality"), "Modalidad", "Despliega esta lista para elegir Virtual o Presencial. La modalidad también se muestra en el Registro de instructores."),
    service(".modal-overlay .service-dates", "Fechas de las clases", "Agrega una fecha por jornada. Agregar fecha crea otra fila y la papelera la retira; siempre debe quedar al menos una. Todas las fechas comparten el mismo importe."),
    service(".modal-overlay .service-dates > button", "Agregar otra fecha", "Este botón incorpora otra jornada al mismo servicio. El importe sigue siendo único para el conjunto de fechas."),
    service(".modal-overlay .class-session-fields > button", "Quitar una fecha", "La papelera retira esa jornada del formulario. Se deshabilita cuando queda una sola fecha, porque todo servicio necesita al menos una."),
    service(field("startTime"), "Hora de inicio", "Ingresa la hora en formato de 24 horas, por ejemplo 09:00. Cada fecha tiene su propio horario."),
    service(field("endTime"), "Hora de fin y descanso", "La hora de fin debe ser posterior al inicio dentro del mismo día. Si transcurren más de cinco horas, se descuenta una hora de descanso: 09:00–15:00 cuenta como cinco horas de clase."),
    service(field("instructorChoice"), "Instructor disponible", "El instructor es opcional. La lista comprueba todas las fechas: un instructor ocupado aparece como no disponible. Puedes cambiar las fechas o elegir otro."),
    service(field("invoiceDate"), "Fecha de facturación", "Al pasar a Facturado, el importe suma en este mes, aunque las clases hayan ocurrido en otro. Si dejas la fecha vacía al facturar, se usa la fecha actual."),
    service(field("travelMode"), "Viáticos", "Es opcional: No aplica, Avión o Bus. Selecciona la alternativa correspondiente al traslado del instructor."),
    service(".modal-overlay .instructor-courses", "Uno o varios cursos", "Marca todos los cursos impartidos. Debes elegir al menos uno del catálogo; varios cursos no multiplican el precio del servicio."),
    service(".modal-overlay .assigned-commercial", "Comercial automático", "Las nuevas ventas usan el comercial asignado a tu cuenta por un administrador. Editar un registro conserva el comercial original."),
    service(field("locationId"), "Ubicación", "Selecciona departamento y distrito para indicar el lugar, especialmente en clases presenciales. Las ubicaciones se administran en Base de soporte."),
    service(field("amount"), "Importe único", "Ingresa el importe total en soles de todo el servicio. Aunque tenga varias fechas y cursos, el importe se cuenta una sola vez."),
    service(field("status"), "Estado del servicio", "Elige Programado, Ejecutado o Facturado. Solo Facturado suma para la meta mensual y los totales facturados."),
    service(field("certificatesOnly"), "Solo certificados", "Marca esta opción únicamente para registros de agenda correspondientes a certificados. Estas copias se excluyen del Registro de instructores y evitan duplicar la facturación."),
    service(".modal-overlay .dialog-actions", "Guardar, cancelar y editar", "Guardar registro valida los campos; Cancelar cierra la ventana. Después, el lápiz de una tarjeta permite editar y Guardar cambios. En esta demostración no se envía el formulario."),
    step("services", ".tour-delete-preview", "Eliminar y recuperar registros", "Las papeleras piden confirmación antes de eliminar. Cancelar conserva el registro. Servicios y certificados pasan a Papelera durante siete días; cuentas y catálogos no se recuperan allí. Los catálogos vinculados a registros no se pueden eliminar para proteger sus datos. Explicaremos la eliminación una sola vez.", { confirmation: true }),
    step("certificates", ".sale-summary", "Totales de certificados", "Consulta los importes separados entre personas naturales y empresas, y el total de los registros filtrados."),
    step("certificates", ".content-area .table-scroll", "Tabla de certificados", "La tabla reúne cliente, tipo, comercial, importe, fecha y estado. El lápiz permite corregir una venta existente."),
    step("certificates", ".page-heading > button", "Nueva venta", "Abre el formulario de certificados. Ahora mostraremos sus campos sin crear una venta."),
    sale(field("customerName"), "Nombre del cliente", "Escribe el nombre de la persona o la razón social de la empresa que compra los certificados."),
    sale(field("customerType"), "Tipo de cliente", "Elige Persona natural o Empresa. Únicamente certificados de empresas facturados cuentan para la meta mensual de facturación."),
    sale(field("courseId"), "Curso del certificado", "Selecciona un curso del catálogo. Las ventas de certificados tienen un curso por registro."),
    sale(".modal-overlay .assigned-commercial", "Comercial asignado", "La venta queda a nombre del comercial asociado a tu cuenta. Si está Sin asignar, un administrador debe completar la asignación en Usuarios."),
    sale(field("saleDate"), "Fecha de venta", "Indica cuándo se realizó la venta. Esta fecha determina en qué mes aparece la venta registrada."),
    sale(field("invoiceDate"), "Fecha de facturación del certificado", "La fecha de facturación determina el mes del total facturado; no necesariamente coincide con la fecha de venta. Al facturar con este campo vacío, se usa hoy."),
    sale(field("amount"), "Importe y copia en agenda", "Ingresa el importe en soles. Las nuevas ventas mayores a S/700 también se agregan a la agenda y requieren un correlativo de cuatro dígitos. La copia no duplica el total facturado."),
    sale(field("correlativeCode"), "Correlativo para la agenda", "Este campo aparece al crear una venta mayor a S/700. Ingresa cuatro dígitos numéricos para identificar su copia en la agenda. Se muestra aquí como demostración."),
    sale(field("status"), "Estado de la venta", "Selecciona Programado, Ejecutado o Facturado. Cambiar el estado a Facturado activa el cómputo de facturación cuando el cliente es una empresa."),
    sale(".modal-overlay .dialog-actions", "Guardar o cancelar la venta", "Guarda cuando los datos estén completos. Para corregir una venta existente, usa el lápiz y Guarda cambios. La agenda se edita por separado. El tutorial cierra esta demostración sin guardar."),
    step("performance", ".bottom-grid > .panel:first-child", "Avance semanal", "Compara servicios y facturación por comercial. El distintivo semanal aparece al superar cinco servicios."),
    step("performance", ".bottom-grid > .panel:nth-child(2)", "Ranking mensual", "El ranking ordena a los comerciales por cantidad de servicios. El color de cada barra se conserva para todo el equipo."),
    step("performance", ".commercial-colors", "Colores del ranking", "Elige el color junto al nombre y pulsa Guardar color. Este control está disponible únicamente para administradores.", { admin: true }),
    step("performance", ".monthly-summary", "Resumen por comercial", "Despliega el comercial para consultar correlativo, empresa, monto y estado. Cada fila agrupa las fechas del servicio y muestra su precio una sola vez."),
    ...[
      ["Instructor", "Elige un instructor o deja Todos los instructores."],
      ["Empresa", "Escribe parte del nombre de la empresa para buscar sus clases."],
      ["Curso", "Selecciona cualquiera de los cursos impartidos; también encuentra servicios con varios cursos."],
      ["Modalidad", "Elige Virtual, Presencial o todas las modalidades."],
      ["Desde", "Selecciona la primera fecha del rango que quieres consultar dentro del mes."],
      ["Hasta", "Selecciona la última fecha del rango. Luego pulsa Aplicar filtros."]
    ].map(([title, text], i) => step("instructors", `.register-filters > label:nth-child(${i+1})`, title, text)),
    step("instructors", ".instructor-register .table-scroll", "Clases y horas netas", "Cada fecha de la agenda genera una fila con mes, fecha, instructor, empresa, cursos, modalidad, lugar y horas netas. Los horarios históricos incompletos se muestran como Sin horario."),
    step("instructors", ".register-confirmation, .instructor-register th:last-child", "Confirmación", "Marca o desmarca la casilla de cada jornada manualmente. Es temporal: se borra al salir, cambiar de mes o recargar, y no cambia el servicio."),
    step("instructors", ".instructor-register .section-heading > button", "Exportar a Excel", "Descarga las filas filtradas en un archivo Excel, con las horas y confirmaciones actuales. El botón se habilita cuando hay filas cargadas y no existe un error."),
    instructor("summary", "Desplegar la ficha del instructor", "Esta ficha reúne información personal, cursos, EMO, SCTR y vehículo. Abrimos Agregar instructor como demostración para mostrar todos sus campos."),
    instructor('[name="name"]', "Nombre del instructor", "Indica el nombre del instructor. Al editar una ficha existente, se mantienen sus vínculos con los servicios."),
    instructor('[name="address"]', "Dirección", "Campo opcional de escritura libre para la dirección del instructor."),
    instructor('[name="dni"]', "DNI", "Campo opcional de escritura libre para el documento del instructor."),
    instructor('[name="emoExpiresAt"]', "Vencimiento del EMO", "Selecciona la fecha de vencimiento del examen médico ocupacional. La ficha muestra esa fecha para facilitar su consulta."),
    instructor(".instructor-courses", "Cursos que imparte", "Marca los cursos que el instructor imparte. Se vinculan a los cursos existentes del catálogo, no se escriben como texto libre."),
    instructor('[name="sctr"]', "SCTR: Sí o No", "Marca Sí cuando el instructor tenga SCTR. Esto lo incorpora al apartado separado de vigencias SCTR; No lo retira de esa lista."),
    instructor(".car-details", "Desplegar Auto", "El apartado Auto es opcional. Despliega el cuadro para registrar modelo y placa."),
    instructor('[name="carModel"]', "Modelo del auto", "Escribe el modelo del vehículo del instructor. Puedes dejarlo vacío."),
    instructor('[name="carPlate"]', "Placa del auto", "Registra la placa del vehículo. Es un campo opcional de escritura libre."),
    instructor("form > button", "Guardar la ficha", "Agregar instructor crea la ficha; en una ficha existente verás Guardar ficha y Eliminar instructor. Aquí no guardamos la demostración."),
    step("support", ".sctr-card", "Vigencias SCTR", "Solo aparecen instructores con SCTR marcado como Sí. Completa Desde y Hasta y pulsa Guardar vigencia. El apartado indica Vigente, Por iniciar, Vencido o Sin fechas registradas."),
    step("support", '.sctr-card [name=sctrStartsAt], .sctr-card', "Inicio del SCTR", "Desde indica el primer día de cobertura. El instructor debe tener SCTR marcado como Sí para que aparezcan estos campos."),
    step("support", '.sctr-card [name=sctrEndsAt], .sctr-card', "Fin del SCTR", "Hasta indica el último día de cobertura y no puede ser anterior al inicio."),
    step("support", '.sctr-card form > button, .sctr-card', "Guardar vigencia SCTR", "Guardar vigencia actualiza únicamente estas fechas. El estado se calcula según la fecha actual en Perú."),
    step("support", '[data-tour="support-courses"]', "Catálogo de cursos", "Busca cursos, escribe un nombre y pulsa Agregar. Los cursos alimentan servicios, certificados y fichas de instructores. Los cursos vinculados a registros se conservan para proteger los datos."),
    step("support", '[data-tour="support-locations"]', "Ubicaciones", "Busca ubicaciones y agrega departamento y distrito. Las ubicaciones vinculadas a servicios no se pueden eliminar."),
    ...["courses", "locations", ...(isAdmin ? ["salespeople"] : [])].flatMap(key => {
      const base = `[data-tour="support-${key}"]`;
      const title = key === "courses" ? "cursos" : key === "locations" ? "ubicaciones" : "comerciales";
      return [
        ...(key === "locations" ? [
          step("support", `${base} [name=department]`, "Departamento", "Escribe el departamento de la ubicación que vas a agregar."),
          step("support", `${base} [name=district]`, "Distrito", "Escribe el distrito correspondiente al departamento.")
        ] : [step("support", `${base} [name=name]`, `Nombre de ${key === "courses" ? "curso" : "comercial"}`, "Escribe el nombre del nuevo registro. El catálogo lo pondrá a disposición en los apartados correspondientes.")]),
        step("support", `${base} .support-form > button`, `Agregar ${key === "courses" ? "curso" : key === "locations" ? "ubicación" : "comercial"}`, "Agregar valida y guarda los datos del formulario. El tutorial únicamente lo muestra, sin crear registros."),
      ];
    }),
    step("support", '[data-tour="support-salespeople"]', "Comerciales", "Solo administradores pueden ver y gestionar este catálogo. Crear un comercial no crea una cuenta: la cuenta se configura en Usuarios. Los comerciales vinculados a ventas o cuentas no se pueden eliminar del catálogo.", { admin: true }),
    step("users", ".users-page h1", "Usuarios", "Esta página está disponible solo para administradores. Aquí se crean accesos, se asignan comerciales y se gestionan las cuentas.", { admin: true }),
    step("users", '.users-form [name="email"]', "Correo de acceso", "Escribe un correo válido: será el identificador usado para iniciar sesión.", { admin: true }),
    step("users", '.users-form [name="password"]', "Contraseña inicial", "La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes. Comunícala al titular por un canal privado.", { admin: true }),
    step("users", '.users-form [name="role"]', "Rol de la cuenta", "Vendedor accede a la operación comercial. Administrador también gestiona usuarios y revisa Informes. Encargados de informes entra a su agenda exclusiva y no necesita comercial asignado.", { admin: true }),
    step("users", '.users-form [name="salespersonId"]', "Asignar un comercial", "Selecciona el comercial al que pertenecerán las nuevas ventas y servicios de esta cuenta. Es obligatoria para cuentas comerciales; Encargados de informes no requiere esta asignación.", { admin: true }),
    step("users", ".users-form-footer", "Crear usuario", "Crear usuario valida los datos y habilita el acceso. No creamos una cuenta de ejemplo durante este recorrido.", { admin: true }),
    step("users", ".user-account-list, .users-page > .panel:nth-of-type(2)", "Cuentas existentes", "Cada cuenta muestra su rol y permite guardar un correo nuevo o cambiar el comercial asignado. Cambiar la asignación no mueve las ventas históricas.", { admin: true }),
    step("users", ".user-email-form [name=email], .user-account-list", "Cambiar correo", "Escribe el nuevo correo y pulsa Guardar correo. La contraseña actual se conserva y el siguiente ingreso usa el correo nuevo.", { admin: true }),
    step("users", ".user-email-form [name=salespersonId], .user-account-list", "Cambiar el comercial asignado", "Selecciona el comercial y pulsa Guardar comercial. Solo las nuevas ventas usan la nueva asignación.", { admin: true }),
    step("summary", ".sidebar-toggle, .mobile-menu", "Contraer el menú", "La flecha reduce la barra lateral a iconos. También puedes deslizarla. En móvil el botón de menú despliega la navegación."),
    step("summary", ".logout-button", "Cerrar sesión", "El botón está abajo en la barra lateral y finaliza tu sesión en este dispositivo."),
    step("services", ".tour-duplicate-preview", "Aviso de posible duplicado", "Si el cliente, un curso y una fecha coinciden con otro registro, verás este aviso antes de guardar. Volver y revisar conserva el formulario; Guardar de todos modos permite una venta distinta. El aviso también se aplica al editar y a los certificados. Este es solo un ejemplo.", { preview: "duplicate" }),
    step("history", ".history-panel", "Historial de cambios", "Consulta quién creó, editó, envió a papelera o restauró un registro y cuándo. También se registran cambios en catálogos y cuentas, sin contraseñas. Comienza desde que se activa esta función; no reconstruye cambios antiguos."),
    step("history", ".history-entry, .history-panel", "Ver qué cambió", "Despliega un cambio para comparar Antes y Después. Usa las páginas para consultar eventos anteriores. Los administradores ven todo; los vendedores ven su comercial y sus propias acciones."),
    step("trash", ".trash-panel", "Papelera durante siete días", "Los servicios y ventas eliminados dejan de contar en los reportes y permanecen recuperables durante siete días. La tabla indica el vencimiento exacto. Después de ese límite ya no se pueden restaurar."),
    step("trash", ".trash-panel .table-scroll", "Restaurar un registro", "Restaurar conserva el importe, fechas, cursos y estado originales. Se vuelve a comprobar la disponibilidad del instructor. Los vendedores recuperan registros de su comercial; los administradores pueden recuperar todos. Las cuentas y los catálogos no se recuperan aquí."),
    step("summary", '[data-tour="monthly-close"]', "Cierre mensual", "Solo administradores pueden cerrar un mes desde su último día, según la hora de Perú. Aparece un aviso para revisar el cierre y puedes posponerlo. Revisa la agenda y los reportes antes de confirmar.", {admin:true}),
    step("summary", ".tour-close-preview", "Confirmar o reabrir el mes", "Cerrar bloquea altas, ediciones, eliminaciones y restauraciones que afecten al mes, incluidas sus fechas de facturación. Solo un administrador puede reabrirlo; ambas acciones quedan en el historial. Un servicio de varios meses requiere que todos estén abiertos. Este ejemplo no cierra ningún mes.", {admin:true,preview:"monthly-close"}),
    step("summary", '[data-tour="monthly-close"]', "Consultar un mes cerrado", "Puedes consultar los reportes de un mes cerrado. Si necesitas corregir un servicio o venta que lo afecte, solicita a un administrador que reabra el mes.", {admin:false}),
    ...reportTutorialSteps().filter(s=>!["Tu espacio de informes","Búsqueda y filtros de informes","Cerrar sesión","Actualizar","Tema claro y oscuro","Repetir el tutorial"].includes(s.title)).map(s=>({...s,admin:true})),
  ].filter(s => (!s.admin || isAdmin) && !(isAdmin && s.title === "Consultar un mes cerrado"));
  const order = ["summary", "services", "certificates", "performance", "instructors", "support", "history", "trash", "reports", "users"];
  const common = new Set(["Contraer el menú", "Cerrar sesión"]);
  const main = items.filter(s=>!common.has(s.title)).sort((a,b)=>order.indexOf(a.tab)-order.indexOf(b.tab));
  // Shared warnings belong with the service form, before leaving the agenda.
  const duplicate = main.findIndex(s=>s.preview==="duplicate");
  const [warning] = main.splice(duplicate,1);
  const deletion = main.findIndex(s=>s.confirmation);
  main.splice(deletion,0,warning);
  return [...main,...items.filter(s=>common.has(s.title)),
    step("summary", '[data-tour="refresh"]', "Actualizar", "Actualiza los datos y el estado del cierre mensual. Si otro usuario hizo cambios, este botón permite consultarlos sin cerrar tu sesión."),
    step("summary", ".theme-toggle", "Tema claro y oscuro", "El botón de sol o luna cambia el tema. Tu elección se conserva en este dispositivo."),
    step("summary", '[data-tour="replay"]', "Repetir el tutorial", "Puedes repetir el recorrido con Ver tutorial o el icono de ayuda en móvil. Finalizar u Omitir evita que se abra automáticamente. Tu avance se guarda en la cuenta.")];
}

export function reportTutorialSteps(): TutorialStep[] {
 return [
  step("reports", ".reports-sidebar", "Tu espacio de informes", "Tu cuenta entra directamente a este departamento sin comercial asignado. Solo encargados de informes y administradores pueden acceder. La bienvenida de CONSITEC aparece después de iniciar sesión."),
  step("reports", ".reports-agenda", "Agenda automática de informes", "Aquí aparecen servicios Ejecutados o Facturados, fuera de papelera. Pasar de Ejecutado a Facturado no duplica la ficha; todas las jornadas de un servicio comparten un informe. Las copias de solo certificados no requieren informe de capacitación."),
  step("reports", ".reports-filters", "Búsqueda y filtros de informes", "Elige mes y año; busca por empresa, correlativo, curso o instructor. Combina estado del informe y responsable. Limpiar restablece los filtros. La búsqueda se actualiza automáticamente."),
  step("reports", ".reports-agenda .table-scroll", "Abrir la ficha", "Cada fila muestra fechas, instructor, cursos, estado del informe, plazo y documentos. Abrir ficha reúne la información del servicio y su documentación."),
  step("reports", ".report-detail .report-service-days", "Una ficha, varias jornadas", "Las fechas, horarios, horas netas, modalidad y lugar vienen de la agenda comercial. Los encargados no modifican esos datos ni los importes. Mostramos una ficha de ejemplo sin guardar nada."),
  step("reports", '.report-detail [name="reportAssignee"]', "Responsable del informe", "Asigna un encargado de informes o un administrador. La asignación es independiente de los comerciales."),
  step("reports", '.report-detail [name="reportStatus"]', "Estado del informe", "Pendiente, En elaboración, En revisión y Entregado son estados de este departamento, independientes de Ejecutado o Facturado. Para marcar Entregado, adjunta un informe final o su enlace."),
  step("reports", '.report-detail [name="reportDueDate"]', "Fecha límite", "Registra el plazo acordado para preparar y entregar la documentación."),
  step("reports", '.report-detail [name="reportDeliveredAt"]', "Fecha de entrega", "Se habilita al marcar Entregado. Si la dejas vacía, se registra la fecha actual de Perú."),
  step("reports", '.report-detail [name="reportNotes"]', "Observaciones del informe", "Anota información faltante, correcciones y avances. El cierre mensual comercial no bloquea estas actualizaciones de informes."),
  step("reports", '.report-detail [name="reportFolderUrl"]', "Carpeta de Drive", "Puedes añadir un enlace HTTPS a la carpeta de evidencias. Sus permisos se administran en Drive; los archivos subidos directamente se protegen en CONSITEC."),
  step("reports", '.report-detail [name="reportFinalUrl"]', "Enlace del informe final", "Este enlace es opcional si adjuntas el archivo final. La ficha permite abrir el informe y la carpeta en una nueva pestaña."),
  step("reports", '.report-detail .report-form .dialog-actions', "Guardar ficha", "Guarda responsable, estado, plazo, enlaces y observaciones. Los cambios quedan registrados. Esta demostración no modifica registros."),
  step("reports", '.report-detail [name="documentCategory"]', "Clasificar documentos", "Clasifica cada archivo como Informe final, Asistencia, Evaluaciones o Evidencias."),
  step("reports", '.report-detail [name="documentSession"]', "Documentos por jornada", "General del servicio conserva el informe completo. Elegir una fecha vincula asistencia o evidencias a esa jornada, sin crear otra ficha."),
  step("reports", '.report-detail [name="reportFiles"]', "Subir y consultar archivos", "Selecciona uno o varios PDF, Word, Excel, JPG, PNG o WebP, de hasta 10 MB por archivo. Podrás abrirlos y descargarlos dentro de la sesión. Solo su autor o un administrador puede retirarlos; no se recuperan desde Papelera. Aquí la carga está deshabilitada por ser un ejemplo."),
  step("reports", ".reports-sidebar .logout-button", "Cerrar sesión", "Finaliza tu acceso a este departamento con Cerrar sesión."),
  step("reports", '[data-tour="refresh"]', "Actualizar", "Recarga la agenda y la ficha para consultar cambios hechos por otros encargados."),
  step("reports", ".theme-toggle", "Tema claro y oscuro", "El botón de sol o luna cambia el tema y conserva tu elección en este dispositivo."),
  step("reports", '[data-tour="replay"]', "Repetir el tutorial", "Ver tutorial repite esta guía del departamento. Finalizar u Omitir evita que se abra automáticamente; tu avance queda guardado en la cuenta.")
 ];
}
