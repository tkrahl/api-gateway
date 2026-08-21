// Catálogo de requisitos Entrega 4 — fuente: docs/requerimientos/entrega4.md

export const E4_MODULES = [
  {
    id: "logistica-a",
    title: "Logística — Parte A · Stock",
    requirements: [
      {
        id: "A1",
        required: true,
        shortTitle: "Stock sin necesidad",
        requirement:
          "Al recibir una donación sin necesidades insatisfechas para el producto, guardar las unidades en el stock del depósito.",
        guide: {
          steps: [
            "Borrá toda la data con el botón de arriba para arrancar de cero.",
            "Prepará el escenario con el botón de abajo, o desde Postman: creá un depósito vacío, un producto y un donador.",
            "Registrá una donación de ese producto y enviala al depósito. No debe existir ninguna necesidad insatisfecha para ese producto.",
            "Consultá el stock del depósito y mostráselo al profesor.",
          ],
          expected:
            "Las unidades donadas quedan guardadas en el stock. No se crea ninguna asignación a una entidad.",
        },
      },
      {
        id: "A2",
        required: true,
        shortTitle: "MM sin stock",
        requirement:
          "Con necesidad insatisfecha: el matchmaking asigna a una entidad y esa porción no pasa por el stock.",
        guide: {
          steps: [
            "Borrá toda la data para arrancar limpio.",
            "Prepará un depósito con algoritmo de matchmaking configurado, un producto, un donador y una entidad con necesidad insatisfecha de ese producto.",
            "Registrá una donación y enviala al depósito.",
            "Revisá que se haya creado una asignación y que esa cantidad no haya entrado al stock.",
          ],
          expected:
            "El matchmaking asigna la donación a una entidad. La parte asignada no pasa por el stock del depósito.",
        },
      },
      {
        id: "A3",
        required: true,
        shortTitle: "Sobrante al stock",
        requirement:
          "Si la donación supera lo asignado a la necesidad, el sobrante va al stock al momento.",
        guide: {
          steps: [
            "Borrá toda la data.",
            "Creá una necesidad cuya cantidad objetivo sea menor que lo que vas a donar (por ejemplo, necesidad de 5 y donación de 12).",
            "Registrá la donación y enviala al depósito.",
            "Mostrá al profesor la asignación creada y cuánto quedó en stock como sobrante.",
          ],
          expected:
            "Se asigna lo necesario para la necesidad elegida por matchmaking y el excedente queda en stock al momento.",
        },
      },
      {
        id: "A4",
        required: true,
        shortTitle: "Extraord. parcial",
        requirement:
          "Donación menor que una necesidad extraordinaria: asignar igualmente lo donado a esa necesidad.",
        guide: {
          steps: [
            "Borrá toda la data.",
            "Creá una necesidad extraordinaria con cantidad objetivo alta (por ejemplo 100 unidades).",
            "Doná una cantidad menor (por ejemplo 8 unidades) y enviala al depósito.",
            "Mostrá la asignación parcial sobre esa necesidad extraordinaria.",
          ],
          expected:
            "Aunque la donación no alcanza para completar la necesidad, se asigna igualmente lo donado a la necesidad extraordinaria.",
        },
      },
      {
        id: "A5",
        required: true,
        shortTitle: "Recurrente redirige",
        requirement:
          "Donación menor que una necesidad recurrente: asignar la donación a otra necesidad (no a la recurrente).",
        guide: {
          steps: [
            "Borrá toda la data.",
            "Creá una necesidad recurrente y otra necesidad insatisfecha para el mismo producto.",
            "Doná una cantidad insuficiente para cubrir la necesidad recurrente.",
            "Verificá a qué necesidad se asignó la donación y explicáselo al profesor.",
          ],
          expected:
            "La donación no se asigna parcialmente a la recurrente; se dirige a otra necesidad elegible.",
        },
      },
      {
        id: "A6",
        required: true,
        shortTitle: "Mismo donacionID",
        requirement: "Pueden existir 2 paquetes con el mismo donacionID.",
        guide: {
          steps: [
            "Borrá toda la data.",
            "Armá un caso donde parte de la donación va a una asignación y otra parte queda en stock (como en el punto de sobrante).",
            "Listá los paquetes o asignaciones generadas.",
            "Mostrá al profesor dos paquetes distintos que comparten el mismo identificador de donación.",
          ],
          expected:
            "El sistema permite dos paquetes diferentes con el mismo donacionID.",
        },
      },
      {
        id: "A7",
        required: true,
        shortTitle: "Capacidad/unidad",
        requirement:
          "Capacidad máxima entera del depósito; cada unidad de producto ocupa 1 lugar.",
        guide: {
          steps: [
            "Borrá toda la data.",
            "Creá un depósito con capacidad baja (por ejemplo 3 lugares).",
            "Ingresá donaciones hasta llenar la capacidad.",
            "Intentá ingresar una donación más y mostrá que el sistema la rechaza o no la acepta.",
          ],
          expected:
            "Cada unidad ocupa un lugar sin importar el tipo de producto. Al superar la capacidad máxima, no se aceptan más unidades.",
        },
      },
      {
        id: "A8",
        required: true,
        shortTitle: "Reportar entrega",
        requirement:
          "Al reportar entrega: cambia la asignación, satisface la necesidad en DyE y actualiza el estado de la donación en Donaciones.",
        guide: {
          steps: [
            "Borrá toda la data y prepará el escenario hasta tener una asignación en estado asignada.",
            "Reportá la entrega en Logística (en vivo con el profesor o desde Postman).",
            "Consultá el estado de la asignación en Logística.",
            "Consultá la necesidad en Donadores y Entidades y el estado de la donación en Donaciones.",
          ],
          expected:
            "La asignación queda entregada, la necesidad refleja la satisfacción acumulada y la donación pasa a estado aceptada.",
        },
      },
    ],
  },
  {
    id: "logistica-b",
    title: "Logística — Parte B · Cola async",
    requirements: [
      {
        id: "B1",
        required: true,
        shortTitle: "Validar espacio",
        requirement:
          "Al recibir una donación, primero validar que hay espacio en el depósito.",
        guide: {
          steps: [
            "Borrá toda la data.",
            "Creá un depósito casi lleno, dejando muy poco espacio libre.",
            "Intentá registrar una donación que supere ese espacio disponible.",
            "Mostrá al profesor que se rechaza por falta de lugar antes de procesar la asignación.",
          ],
          expected:
            "Si no hay espacio en el depósito, la donación no se procesa ni se encola.",
        },
      },
      {
        id: "B2",
        interaction: "manual",
        required: true,
        shortTitle: "Cola async",
        requirement:
          "Si hay espacio, publicar a cola de trabajo (no procesar la asignación de forma sincrónica en el request).",
        guide: {
          steps: [
            "Borrá toda la data y prepará un depósito con espacio disponible.",
            "Enviá una donación al depósito y fijate en la respuesta inmediata del endpoint.",
            "Esperá unos segundos y consultá si la asignación apareció después.",
            "Mostrá en logs o en RabbitMQ que el procesamiento fue asíncrono.",
          ],
          expected:
            "El endpoint responde rápido sin esperar la asignación final. El worker procesa el mensaje de la cola por separado.",
        },
      },
      {
        id: "B3",
        interaction: "manual",
        required: true,
        shortTitle: "Worker sin DB",
        requirement:
          "El worker es stateless (sin DB): consulta necesidades y calcula la asignación al recibir el mensaje.",
        guide: {
          steps: [
            "Levantá el worker sin base de datos propia.",
            "Encolá una donación desde Logística.",
            "Revisá los logs del worker mientras procesa el mensaje.",
            "Mostrá al profesor que consulta las APIs externas y calcula en memoria, sin persistir localmente.",
          ],
          expected:
            "El worker no tiene base de datos; obtiene necesidades por HTTP y calcula la asignación al vuelo.",
        },
      },
      {
        id: "B4",
        interaction: "manual",
        required: true,
        shortTitle: "Worker POST",
        requirement:
          "El worker hace POST a Logística para dar de alta la asignación.",
        guide: {
          steps: [
            "Encolá una donación con el worker corriendo.",
            "Monitoreá las asignaciones en Logística o los logs del worker.",
            "Verificá que la asignación aparece por un POST del worker.",
            "Aclará al profesor que no la crea el request original de la donación.",
          ],
          expected:
            "La asignación se registra en Logística mediante un POST hecho por el worker.",
        },
      },
      {
        id: "B5",
        interaction: "manual",
        required: true,
        shortTitle: "Multi worker",
        requirement: "Soportar más de un worker suscripto a la misma cola.",
        guide: {
          steps: [
            "Levantá dos instancias del worker conectadas a la misma cola.",
            "Encolá varias donaciones seguidas.",
            "Observá en los logs que ambos workers procesan mensajes.",
            "Confirmá que las asignaciones se crean correctamente en Logística.",
          ],
          expected:
            "Varios workers pueden consumir la misma cola y crear asignaciones en paralelo.",
        },
      },
      {
        id: "B6",
        interaction: "manual",
        required: true,
        shortTitle: "Rabbit en cloud",
        requirement: "Mensajería (RabbitMQ) desplegada en la nube.",
        guide: {
          steps: [
            "Abrí el panel de tu broker en la nube (Render, CloudAMQP u otro).",
            "Mostrá que la cola existe y está activa.",
            "Verificá que Logística y los workers apuntan a esa instancia y no solo a localhost.",
          ],
          expected:
            "La mensajería está desplegada en la nube y los servicios se conectan a ella.",
        },
      },
    ],
  },
  {
    id: "dye",
    title: "Donadores y Entidades",
    requirements: [
      {
        id: "D1",
        required: true,
        shortTitle: "Validar producto",
        requirement:
          "Al crear necesidad: corroborar con Donaciones que el producto solicitado es válido.",
        guide: {
          steps: [
            "Borrá toda la data.",
            "Intentá crear una necesidad con un producto que no existe: debe fallar.",
            "Creá un producto válido en Donaciones.",
            "Volvé a crear la necesidad con ese producto: ahora debe funcionar.",
          ],
          expected:
            "Producto inválido o inexistente da error. Producto válido registrado en Donaciones permite crear la necesidad.",
        },
      },
      {
        id: "D2",
        required: true,
        shortTitle: "Consultar stock",
        requirement:
          "Al crear necesidad: consultar a Logística si hay stock disponible del producto.",
        guide: {
          steps: [
            "Borrá toda la data.",
            "Dejá stock del producto en un depósito (donación sin necesidad insatisfecha).",
            "Creá una necesidad para ese mismo producto.",
            "Mostrá en logs o trazas que Donadores y Entidades consultó el stock en Logística.",
          ],
          expected:
            "Al crear la necesidad, el sistema consulta a Logística si hay stock disponible.",
        },
      },
      {
        id: "D3",
        required: true,
        shortTitle: "Stock cubre todo",
        requirement:
          "Si stock ≥ necesidad → asignar al momento la cantidad necesaria.",
        guide: {
          steps: [
            "Borrá toda la data.",
            "Dejá stock suficiente para cubrir toda la necesidad (por ejemplo 20 unidades en stock, necesidad de 8).",
            "Creá la necesidad.",
            "Mostrá que se generó una asignación inmediata por la cantidad requerida.",
          ],
          expected:
            "Con stock suficiente, se asigna al momento la cantidad que pide la necesidad.",
        },
      },
      {
        id: "D4",
        required: true,
        shortTitle: "Stock parcial",
        requirement:
          "Si stock < necesidad → asignar al momento solo lo disponible.",
        guide: {
          steps: [
            "Borrá toda la data.",
            "Dejá poco stock (por ejemplo 3 unidades) y creá una necesidad mayor (por ejemplo 10).",
            "Creá la necesidad y revisá la asignación generada.",
            "Explicá al profesor que solo se asignó lo que había disponible.",
          ],
          expected:
            "Se asigna de inmediato solo el stock existente. La necesidad queda parcialmente cubierta.",
        },
      },
      {
        id: "D5",
        interaction: "manual",
        required: true,
        shortTitle: "Origen asignación",
        requirement:
          "Diferenciar asignación por matchmaking vs asignación por solicitud de DyE (misiones Incentivos).",
        guide: {
          steps: [
            "Prepará un caso donde la asignación nace de una donación procesada por matchmaking en Logística.",
            "Prepará otro caso donde la asignación nace al crear una necesidad desde Donadores y Entidades con stock disponible.",
            "Compará el origen o tipo de cada asignación.",
            "Mostrá al profesor que el sistema distingue ambos caminos.",
          ],
          expected:
            "Se puede identificar si la asignación vino del algoritmo de matchmaking o de una solicitud de Donadores y Entidades.",
        },
      },
    ],
  },
  {
    id: "incentivos",
    title: "Incentivos",
    requirements: [
      {
        id: "I1",
        interaction: "manual",
        required: true,
        shortTitle: "Cron misiones",
        requirement:
          "Existe un Cron-Job que procesa donadores con misiones asignadas.",
        guide: {
          steps: [
            "Mostrá al profesor dónde está configurado el cron en Incentivos.",
            "Explicá cada cuánto corre (intervalo que eligió el grupo).",
            "Tené un donador con misión asignada listo para procesar.",
            "Ejecutalo manualmente o esperá la próxima corrida y mostrá el efecto.",
          ],
          expected:
            "Existe un job periódico que procesa donadores con misión activa.",
        },
      },
      {
        id: "I2",
        interaction: "manual",
        required: false,
        shortTitle: "Intervalo cron",
        requirement:
          "El cron corre periódicamente (intervalo definido por el grupo).",
        guide: {
          steps: [
            "Mostrá el intervalo configurado en código o variables de entorno.",
            "Mostrá evidencia de ejecución: logs, métricas o timestamp de la última corrida.",
            "Explicá al profesor con qué frecuencia se dispara.",
          ],
          expected:
            "El cron se ejecuta repetidamente según el intervalo elegido por el grupo.",
        },
      },
      {
        id: "I3",
        interaction: "manual",
        required: false,
        shortTitle: "20ª donación demo",
        requirement:
          'Donador con ≥20 donaciones ACEPTADAS y misión "Donaciones Exitosas" → completa misión.',
        guide: {
          steps: [
            "Borrá toda la data y prepará un donador con 19 donaciones aceptadas y la misión Donaciones Exitosas asignada (Postman ayuda acá).",
            "En vivo con el profesor, completá la vigésima donación aceptada.",
            "Ejecutá el procesamiento de misiones del donador.",
            "Mostrá que ganó la insignia y avanzó de categoría.",
          ],
          expected:
            "Al llegar a 20 donaciones aceptadas, la misión se completa y se otorga la insignia correspondiente.",
        },
      },
      {
        id: "I4",
        interaction: "manual",
        required: true,
        shortTitle: "Perder progreso",
        requirement:
          "Si baja a <20 ACEPTADAS por quejas → pierde progreso, vuelve a categoría previa y pierde insignia.",
        guide: {
          steps: [
            "Prepará un donador con 20 donaciones aceptadas, misión completada e insignia ganada.",
            "En vivo, registrá una queja que baje el contador a 19 aceptadas.",
            "Procesá al donador con el cron o el endpoint de procesamiento.",
            "Mostrá que perdió la insignia y retrocedió de categoría.",
          ],
          expected:
            "Con menos de 20 aceptadas pierde todo el progreso de la misión, vuelve a la categoría anterior y se le quita la insignia.",
        },
      },
    ],
  },
  {
    id: "bot",
    title: "Bot Telegram",
    interaction: "bot",
    requirements: [
      {
        id: "U0",
        required: true,
        shortTitle: "Rol inicial",
        requirement:
          "Mensaje inicial pregunta tipo de usuario (donador / admin) y muestra opciones según rol.",
        guide: {
          steps: [
            "Usá el botón «Abrir bot en Telegram» de esta tarjeta y enviá /start.",
            "Elegí rol donador y mostrá las opciones que aparecen.",
            "Volvé a /start, elegí rol admin y mostrá que el menú es distinto.",
          ],
          expected:
            "El bot pregunta el tipo de usuario al inicio y muestra comandos diferentes según el rol.",
        },
      },
      {
        id: "U1",
        required: true,
        shortTitle: "Registro",
        requirement: "Donador: registrarse.",
        guide: {
          steps: [
            "Abrí el bot con el botón de la tarjeta y entrá como donador.",
            "Ejecutá el comando de registro y completá los datos pedidos.",
            "Verificá que el bot confirma el alta.",
          ],
          expected: "El donador queda registrado en el sistema y el bot lo confirma.",
        },
      },
      {
        id: "U2",
        required: true,
        shortTitle: "Estadísticas",
        requirement: "Donador: consultar sus estadísticas.",
        guide: {
          steps: [
            "Entrá con un donador ya registrado.",
            "Pedí consultar sus estadísticas.",
            "Mostrá al profesor categoría, insignias y misión actual.",
          ],
          expected: "El bot devuelve las estadísticas del donador.",
        },
      },
      {
        id: "U3",
        required: true,
        shortTitle: "Ver donadores",
        requirement: "Donador: consultar donadores (por ID y todos).",
        guide: {
          steps: [
            "Pedí el listado de todos los donadores.",
            "Elegí uno y consultalo por su identificador.",
            "Mostrá que ambas respuestas son correctas.",
          ],
          expected: "El bot lista donadores y también devuelve el detalle por ID.",
        },
      },
      {
        id: "U4",
        required: true,
        shortTitle: "Crear entidad",
        requirement: "Admin: crear entidad.",
        guide: {
          steps: [
            "Entrá como admin en el bot.",
            "Creá una entidad con los datos que pide el formulario o comando.",
            "Verificá que el bot confirma la creación.",
          ],
          expected: "La entidad se crea en Donadores y Entidades y el bot lo confirma.",
        },
      },
      {
        id: "U5",
        required: true,
        shortTitle: "Editar entidad",
        requirement: "Admin: editar entidad.",
        guide: {
          steps: [
            "Elegí una entidad existente.",
            "Modificá algún dato (domicilio, teléfono, etc.).",
            "Consultala de nuevo y mostrá que el cambio quedó guardado.",
          ],
          expected: "Los cambios persisten y el bot confirma la edición.",
        },
      },
      {
        id: "U6",
        required: true,
        shortTitle: "Ver entidades",
        requirement: "Admin: consultar entidades (por ID y todas).",
        guide: {
          steps: [
            "Pedí el listado de todas las entidades.",
            "Consultá una entidad específica por su identificador.",
            "Mostrá ambas respuestas al profesor.",
          ],
          expected: "El bot lista entidades y devuelve el detalle por ID.",
        },
      },
      {
        id: "U7",
        required: true,
        shortTitle: "Alta necesidad",
        requirement: "Admin: alta de necesidad.",
        guide: {
          steps: [
            "Elegí una entidad existente.",
            "Creá una necesidad con un producto válido.",
            "Verificá que el bot confirma el alta.",
          ],
          expected: "La necesidad se crea correctamente desde el bot.",
        },
      },
      {
        id: "U8",
        required: true,
        shortTitle: "Borrar necesidad",
        requirement: "Admin: borrar necesidad por ID.",
        guide: {
          steps: [
            "Creá una necesidad de prueba.",
            "Borrala por identificador desde el bot.",
            "Intentá consultarla y mostrá que ya no existe.",
          ],
          expected: "La necesidad eliminada no aparece al consultarla.",
        },
      },
      {
        id: "U9",
        required: true,
        shortTitle: "Modificar necesidad",
        requirement: "Admin: modificar necesidad por ID.",
        guide: {
          steps: [
            "Creá una necesidad de prueba.",
            "Modificá urgencia, cantidad o descripción desde el bot.",
            "Consultala y mostrá que los cambios se guardaron.",
          ],
          expected: "Los cambios en la necesidad se reflejan al consultarla.",
        },
      },
      {
        id: "U10",
        required: true,
        shortTitle: "Ver necesidad",
        requirement: "Admin: consultar necesidad por ID.",
        guide: {
          steps: [
            "Creá una necesidad de prueba.",
            "Consultala por identificador desde el bot.",
            "Mostrá al profesor los datos actuales de esa necesidad.",
          ],
          expected: "El bot devuelve la información completa de la necesidad consultada.",
        },
      },
    ],
  },
];
