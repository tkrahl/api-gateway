import {
  setupBase,
  createDeposito,
  registerDonacion,
  sendToDeposito,
  waitAsync,
  getStock,
  getAsignaciones,
  createNecesidad,
  manualSteps,
} from "./helpers/base-data.js";

function counter(total, ctx) {
  let n = 0;
  return (label) => ctx.progress(++n, total, label);
}

function manualSeed(totalSteps, steps, manual) {
  return {
    meta: { totalSteps, manualOnly: true },
    async run(ctx) {
      const adv = counter(totalSteps, ctx);
      for (const s of steps) {
        adv(s);
        ctx.log("info", s);
      }
      manualSteps(ctx, manual);
      const result = { manual: true };
      ctx.saveResult(result);
      return result;
    },
  };
}

export const RUNNERS = {
  A1: {
    meta: { totalSteps: 6 },
    async run(ctx) {
      const adv = counter(6, ctx);
      adv("Data base");
      const base = await setupBase(ctx, "a1");
      adv("Depósito vacío");
      const dep = await createDeposito(ctx, { suffix: base.suffix, capacidadMaxima: 100 });
      adv("Registrar donación (sin necesidad insatisfecha)");
      const don = await registerDonacion(ctx, base, dep, 4);
      adv("Enviar al depósito");
      await sendToDeposito(ctx, dep, don, base.producto.id, 4);
      await waitAsync(ctx, 4000);
      adv("Consultar stock");
      const stock = await getStock(ctx, base.producto.id);
      ctx.log("ok", "Stock: " + JSON.stringify(stock));
      manualSteps(ctx, [
        "Consultá el stock del depósito y mostráselo al profesor.",
        "Verificá que no se creó ninguna asignación a una entidad.",
      ]);
      const result = { base, dep, don, stock };
      ctx.saveResult(result);
      return result;
    },
  },

  A2: {
    meta: { totalSteps: 7 },
    async run(ctx) {
      const adv = counter(7, ctx);
      adv("Data base");
      const base = await setupBase(ctx, "a2");
      adv("Depósito + algoritmo MM");
      const dep = await createDeposito(ctx, { suffix: base.suffix });
      adv("Necesidad insatisfecha");
      await createNecesidad(ctx, base, { cantidadObjetivo: 30 });
      adv("Donación + envío al depósito");
      const don = await registerDonacion(ctx, base, dep, 10);
      await sendToDeposito(ctx, dep, don, base.producto.id, 10);
      await waitAsync(ctx, 5000);
      adv("Verificar asignación y stock");
      const asignaciones = await getAsignaciones(ctx);
      const stock = await getStock(ctx, base.producto.id);
      ctx.log("ok", "Asignaciones: " + (Array.isArray(asignaciones) ? asignaciones.length : "?"));
      ctx.log("ok", "Stock: " + JSON.stringify(stock));
      manualSteps(ctx, [
        "Confirmá con el profesor que se creó una asignación por matchmaking.",
        "Verificá que esa cantidad no entró al stock del depósito.",
      ]);
      const result = { base, dep, don, asignaciones, stock };
      ctx.saveResult(result);
      return result;
    },
  },

  A3: {
    meta: { totalSteps: 6 },
    async run(ctx) {
      const adv = counter(6, ctx);
      adv("Data base");
      const base = await setupBase(ctx, "a3");
      const dep = await createDeposito(ctx, { suffix: base.suffix });
      await createNecesidad(ctx, base, { cantidadObjetivo: 5 });
      adv("Donación mayor que la necesidad (sobrante)");
      const don = await registerDonacion(ctx, base, dep, 12);
      await sendToDeposito(ctx, dep, don, base.producto.id, 12);
      await waitAsync(ctx, 5000);
      adv("Revisar asignación + stock");
      const stock = await getStock(ctx, base.producto.id);
      ctx.log("ok", "Stock post-asignación: " + JSON.stringify(stock));
      manualSteps(ctx, [
        "Verificar que lo asignado cubre la necesidad y el sobrante quedó en stock al momento.",
      ]);
      const result = { base, dep, don, stock };
      ctx.saveResult(result);
      return result;
    },
  },

  A4: {
    meta: { totalSteps: 6 },
    async run(ctx) {
      const adv = counter(6, ctx);
      const base = await setupBase(ctx, "a4");
      const dep = await createDeposito(ctx, { suffix: base.suffix });
      adv("Necesidad EXTRAORDINARIA grande");
      await createNecesidad(ctx, base, { tipo: "EXTRAORDINARIA", cantidadObjetivo: 100 });
      adv("Donación parcial");
      const don = await registerDonacion(ctx, base, dep, 8);
      await sendToDeposito(ctx, dep, don, base.producto.id, 8);
      await waitAsync(ctx, 5000);
      manualSteps(ctx, [
        "Mostrar asignación parcial a la necesidad extraordinaria (8 de 100).",
      ]);
      const result = { base, dep, don };
      ctx.saveResult(result);
      return result;
    },
  },

  A5: {
    meta: { totalSteps: 7 },
    async run(ctx) {
      const adv = counter(7, ctx);
      const base = await setupBase(ctx, "a5");
      const dep = await createDeposito(ctx, { suffix: base.suffix });
      adv("Necesidad RECURRENTE + otra insatisfecha");
      await createNecesidad(ctx, base, {
        tipo: "RECURRENTE",
        cantidadObjetivo: 50,
        descripcion: "Recurrente demo",
      });
      await createNecesidad(ctx, base, {
        tipo: "EXTRAORDINARIA",
        cantidadObjetivo: 20,
        descripcion: "Extraordinaria demo",
      });
      adv("Donación insuficiente para la recurrente");
      const don = await registerDonacion(ctx, base, dep, 6);
      await sendToDeposito(ctx, dep, don, base.producto.id, 6);
      await waitAsync(ctx, 5000);
      manualSteps(ctx, [
        "Verificar que la donación se asignó a otra necesidad, no a la recurrente parcialmente.",
      ]);
      const result = { base, dep, don, asignaciones: await getAsignaciones(ctx) };
      ctx.saveResult(result);
      return result;
    },
  },

  A6: {
    meta: { totalSteps: 5 },
    async run(ctx) {
      const adv = counter(5, ctx);
      const base = await setupBase(ctx, "a6");
      const dep = await createDeposito(ctx, { suffix: base.suffix });
      await createNecesidad(ctx, base, { cantidadObjetivo: 3 });
      adv("Donación que genera asignación + sobrante");
      const don = await registerDonacion(ctx, base, dep, 10);
      await sendToDeposito(ctx, dep, don, base.producto.id, 10);
      await waitAsync(ctx, 5000);
      manualSteps(ctx, [
        "Listar paquetes/asignaciones y mostrar 2 paquetes con el mismo donacionID.",
      ]);
      const result = { base, don };
      ctx.saveResult(result);
      return result;
    },
  },

  A7: {
    meta: { totalSteps: 6 },
    async run(ctx) {
      const adv = counter(6, ctx);
      const base = await setupBase(ctx, "a7");
      adv("Depósito capacidad 3");
      const dep = await createDeposito(ctx, { suffix: base.suffix, capacidadMaxima: 3 });
      adv("Donaciones hasta llenar capacidad");
      for (let i = 0; i < 3; i++) {
        const don = await registerDonacion(ctx, base, dep, 1);
        await sendToDeposito(ctx, dep, don, base.producto.id, 1);
        await waitAsync(ctx, 2500);
      }
      manualSteps(ctx, [
        "Intentar una donación más — debe rechazarse por falta de espacio.",
        "Cada unidad ocupa 1 lugar independientemente del producto.",
      ]);
      const result = { base, dep };
      ctx.saveResult(result);
      return result;
    },
  },

  A8: {
    meta: { totalSteps: 6 },
    async run(ctx) {
      const adv = counter(6, ctx);
      const base = await setupBase(ctx, "a8");
      const dep = await createDeposito(ctx, { suffix: base.suffix });
      await createNecesidad(ctx, base, { cantidadObjetivo: 10 });
      const don = await registerDonacion(ctx, base, dep, 10);
      await sendToDeposito(ctx, dep, don, base.producto.id, 10);
      await waitAsync(ctx, 5000);
      manualSteps(ctx, [
        "Buscar asignación ASIGNADA en Logística.",
        "En vivo: POST /entregas para reportar la entrega.",
        "Verificar necesidad satisfecha en DyE y donación ACEPTADA en Donaciones.",
      ]);
      const result = { base, dep, don, asignaciones: await getAsignaciones(ctx) };
      ctx.saveResult(result);
      return result;
    },
  },

  B1: {
    meta: { totalSteps: 5 },
    async run(ctx) {
      const adv = counter(5, ctx);
      const base = await setupBase(ctx, "b1");
      adv("Depósito casi lleno (cap. 2)");
      const dep = await createDeposito(ctx, { suffix: base.suffix, capacidadMaxima: 2 });
      const don1 = await registerDonacion(ctx, base, dep, 2);
      await sendToDeposito(ctx, dep, don1, base.producto.id, 2);
      await waitAsync(ctx, 4000);
      adv("Intentar donación que excede espacio");
      try {
        const don2 = await registerDonacion(ctx, base, dep, 5);
        await sendToDeposito(ctx, dep, don2, base.producto.id, 5);
        ctx.log("info", "La API aceptó el request — verificar rechazo en respuesta async");
      } catch (e) {
        ctx.log("ok", "Rechazada por capacidad: " + e.message);
      }
      manualSteps(ctx, ["Confirmar que no se procesa por falta de espacio en el depósito."]);
      ctx.saveResult({ base, dep });
      return { base, dep };
    },
  },

  B2: manualSeed(
    4,
    [
      "Preparar data base y un depósito con espacio libre",
      "Registrar la donación y enviarla al depósito",
    ],
    [
      "Fijate que el endpoint responde al toque, sin esperar la asignación final.",
      "Después de unos segundos, revisá logs o la cola para ver el procesamiento async.",
    ]
  ),

  B3: manualSeed(3, ["Levantar el worker sin base de datos propia"], [
    "Mostrá en los logs que consulta necesidades por HTTP y calcula en memoria.",
  ]),

  B4: manualSeed(3, ["Encolar una donación con el worker activo"], [
    "Verificá que la asignación aparece en Logística por un POST del worker.",
  ]),

  B5: manualSeed(3, ["Levantar dos workers en la misma cola"], [
    "Encolá varias donaciones y mostrá que ambos workers procesan mensajes.",
  ]),

  B6: manualSeed(2, ["Abrir el panel del broker en la nube"], [
    "Mostrá que RabbitMQ está desplegado en cloud y conectado a tus servicios.",
  ]),

  D1: {
    meta: { totalSteps: 5 },
    async run(ctx) {
      const adv = counter(5, ctx);
      const base = await setupBase(ctx, "d1");
      adv("Intentar necesidad con producto inexistente");
      try {
        await ctx.client.post("dye", "/necesidades", {
          entidadID: base.entidad.id,
          nivelDeUrgencia: 5,
          descripcion: "Test inválido",
          cantidadObjetivo: 10,
          productoSolicitadoID: "00000000-0000-0000-0000-000000000000",
          tipo: "EXTRAORDINARIA",
        });
        ctx.log("error", "Debería haber fallado con producto inexistente");
      } catch (e) {
        ctx.log("ok", "Rechazado producto inválido ✓");
      }
      adv("Necesidad con producto válido");
      const nec = await createNecesidad(ctx, base, { cantidadObjetivo: 15 });
      manualSteps(ctx, ["El producto válido debe permitir crear la necesidad."]);
      ctx.saveResult({ base, nec });
      return { base, nec };
    },
  },

  D2: {
    meta: { totalSteps: 5 },
    async run(ctx) {
      const adv = counter(5, ctx);
      const base = await setupBase(ctx, "d2");
      const dep = await createDeposito(ctx, { suffix: base.suffix });
      adv("Generar stock previo vía donación sin necesidad");
      const don = await registerDonacion(ctx, base, dep, 5);
      await sendToDeposito(ctx, dep, don, base.producto.id, 5);
      await waitAsync(ctx, 5000);
      adv("Crear necesidad — debe consultar stock");
      const nec = await createNecesidad(ctx, base, { cantidadObjetivo: 10 });
      manualSteps(ctx, ["Verificar en logs que DyE consultó stock en Logística."]);
      ctx.saveResult({ base, nec, stock: await getStock(ctx, base.producto.id) });
      return { base, nec };
    },
  },

  D3: {
    meta: { totalSteps: 5 },
    async run(ctx) {
      const adv = counter(5, ctx);
      const base = await setupBase(ctx, "d3");
      const dep = await createDeposito(ctx, { suffix: base.suffix });
      const don = await registerDonacion(ctx, base, dep, 20);
      await sendToDeposito(ctx, dep, don, base.producto.id, 20);
      await waitAsync(ctx, 5000);
      adv("Necesidad menor al stock");
      const nec = await createNecesidad(ctx, base, { cantidadObjetivo: 8 });
      manualSteps(ctx, ["Debe asignarse al momento la cantidad necesaria (8 unidades)."]);
      ctx.saveResult({ base, nec });
      return { base, nec };
    },
  },

  D4: {
    meta: { totalSteps: 5 },
    async run(ctx) {
      const adv = counter(5, ctx);
      const base = await setupBase(ctx, "d4");
      const dep = await createDeposito(ctx, { suffix: base.suffix });
      const don = await registerDonacion(ctx, base, dep, 3);
      await sendToDeposito(ctx, dep, don, base.producto.id, 3);
      await waitAsync(ctx, 5000);
      adv("Necesidad mayor al stock (3 disponibles, 10 objetivo)");
      const nec = await createNecesidad(ctx, base, { cantidadObjetivo: 10 });
      manualSteps(ctx, ["Asignación inmediata solo por el stock existente (3)."]);
      ctx.saveResult({ base, nec });
      return { base, nec };
    },
  },

  D5: manualSeed(3, ["Preparar 2 flujos distintos"], [
    "Comparar origen MM (vía donación) vs origen DyE (vía alta de necesidad con stock).",
    "Mostrar que el sistema distingue el origen de la asignación.",
  ]),

  I1: manualSeed(2, ["Mostrar código/config del cron en Incentivos"], [
    "Explicar intervalo y que procesa donadores con misión asignada.",
  ]),

  I2: manualSeed(2, ["Mostrar intervalo configurado y logs de ejecución"], [
    "Evidencia de corridas periódicas del cron.",
  ]),

  I3: {
    meta: { totalSteps: 4, manualOnly: true },
    async run(ctx) {
      const adv = counter(4, ctx);
      adv("Preparar donador con misiones (usar Postman si hace falta)");
      manualSteps(ctx, [
        "Pre-cargar 19 donaciones ACEPTADAS + misión Donaciones Exitosas asignada.",
        "En vivo: completar la 20ª donación aceptada.",
        "Ejecutar POST /donadores/{id}/procesar en Incentivos.",
        "Verificar misión completada e insignia otorgada.",
      ]);
      ctx.saveResult({ manual: true });
      return { manual: true };
    },
  },

  I4: {
    meta: { totalSteps: 4, manualOnly: true },
    async run(ctx) {
      const adv = counter(4, ctx);
      adv("Preparar donador con 20 ACEPTADAS + insignia");
      manualSteps(ctx, [
        "Pre-cargar donador con 20 ACEPTADAS e insignia ganada.",
        "En vivo: registrar queja → baja a 19 ACEPTADAS.",
        "Procesar donador → pierde progreso, categoría e insignia.",
      ]);
      ctx.saveResult({ manual: true });
      return { manual: true };
    },
  },

  U0: manualSeed(3, ["Abrir el bot y enviar /start"], [
    "Elegí rol donador y mostrá las opciones del menú.",
    "Repetí con rol admin y mostrá que el menú cambia.",
  ]),

  U1: manualSeed(2, ["Entrar como donador y ejecutar el registro"], [
    "Completá los datos y verificá que el bot confirma el alta.",
  ]),
  U2: manualSeed(2, ["Consultar estadísticas del donador"], [
    "Mostrá categoría, insignias y misión al profesor.",
  ]),
  U3: manualSeed(2, ["Listar todos los donadores y consultar uno por ID"], [
    "Verificá que ambas respuestas son correctas.",
  ]),
  U4: manualSeed(2, ["Como admin, crear una entidad nueva"], [
    "Verificá que el bot confirma la creación.",
  ]),
  U5: manualSeed(2, ["Editar una entidad existente"], [
    "Consultala de nuevo y mostrá que el cambio quedó guardado.",
  ]),
  U6: manualSeed(2, ["Listar entidades y consultar una por ID"], [
    "Mostrá ambas respuestas al profesor.",
  ]),
  U7: manualSeed(2, ["Como admin, dar de alta una necesidad"], [
    "Verificá que el bot confirma la creación.",
  ]),
  U8: manualSeed(2, ["Crear una necesidad y borrarla por ID"], [
    "Intentá consultarla y mostrá que ya no existe.",
  ]),
  U9: manualSeed(2, ["Crear una necesidad y modificarla"], [
    "Consultala y mostrá que los cambios se guardaron.",
  ]),
  U10: manualSeed(2, ["Crear una necesidad y consultarla por ID"], [
    "Mostrá los datos actuales al profesor.",
  ]),
};
