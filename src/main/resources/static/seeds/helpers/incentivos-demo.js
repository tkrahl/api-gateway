import { makeSuffix } from "../client.js";

export const DEMO_STORAGE_KEY = "donatrack.incentivosDemo.v2";
export const DEMO_TABS = ["exitosas", "creciente", "revolucion"];

const FECHA_HISTORICA = "2000-01-01";
const RETRY = { retries: 4, retryDelayMs: 800 };

function docRandom() {
  return String(Math.floor(Math.random() * 90000000) + 10000000);
}

function withRetry(client) {
  return {
    post: (s, p, b, o) => client.post(s, p, b, { ...RETRY, ...o }),
    get: (s, p, o) => client.get(s, p, { ...RETRY, ...o }),
    patch: (s, p, b, o) => client.patch(s, p, b, { ...RETRY, ...o }),
  };
}

async function safeGet(client, service, path) {
  try {
    return await client.get(service, path);
  } catch (err) {
    if (err && err.status === 404) return null;
    throw err;
  }
}

async function snapshotDonador(client, donadorId) {
  const [donador, mision, insignias, historial, donaciones] = await Promise.all([
    client.get("dye", "/donadores/" + encodeURIComponent(donadorId)),
    safeGet(client, "incentivos", "/donadores/" + encodeURIComponent(donadorId) + "/mision"),
    safeGet(client, "incentivos", "/donadores/" + encodeURIComponent(donadorId) + "/insignias").then(
      (v) => v || []
    ),
    safeGet(
      client,
      "incentivos",
      "/donadores/" + encodeURIComponent(donadorId) + "/historial-categorias"
    ).then((v) => v || []),
    safeGet(
      client,
      "donaciones",
      "/donaciones/search?donadorID=" +
        encodeURIComponent(donadorId) +
        "&fechaInicio=" +
        FECHA_HISTORICA
    ),
  ]);
  const lista = Array.isArray(donaciones) ? donaciones : [];
  const aceptadas = lista.filter((d) => d && d.estado === "ACEPTADA");
  const conQueja = lista.filter((d) => d && d.estado === "CONQUEJA");
  const grandes = lista.filter((d) => Number(d && d.cantidad) > 50);
  return {
    donador,
    mision,
    insignias: Array.isArray(insignias) ? insignias : [],
    historial: Array.isArray(historial) ? historial : [],
    donaciones: lista,
    aceptadas,
    conQueja,
    grandes,
  };
}

function misionLabel(mision) {
  if (!mision) return "—";
  return (mision.nombre || "") + (mision.tipo ? " · " + mision.tipo : "");
}

async function crearDonacionAceptada(ctx, base, producto, cantidad, etiqueta) {
  const { client, log } = ctx;
  const don = await client.post("donaciones", "/donaciones", {
    donadorID: base.donador.id,
    depositoID: base.deposito.id,
    descripcion: etiqueta,
    productoID: producto.id,
    cantidad,
  });
  const aceptada = await client.patch(
    "donaciones",
    "/donaciones/" + don.id + "/estado",
    "ACEPTADA"
  );
  log("ok", etiqueta + " → " + don.id + " · " + (aceptada && aceptada.estado) + " · qty " + cantidad);
  return aceptada || don;
}

async function crearCatalogoBase(ctx, prefix, persona) {
  const client = withRetry(ctx.client);
  const runCtx = { ...ctx, client };
  const { log } = runCtx;
  const suffix = makeSuffix(prefix);

  log("info", "Sufijo de esta corrida: " + suffix);

  const catAlimentos = await client.post("donaciones", "/categorias", {
    nombre: "Alimentos-" + suffix,
    descripcion: "Alimentos no perecederos",
  });
  const catRopa = await client.post("donaciones", "/categorias", {
    nombre: "Ropa-" + suffix,
    descripcion: "Indumentaria",
  });
  const catHigiene = await client.post("donaciones", "/categorias", {
    nombre: "Higiene-" + suffix,
    descripcion: "Higiene personal",
  });
  log("ok", "Categorías → " + [catAlimentos.id, catRopa.id, catHigiene.id].join(", "));

  const idQr = await client.post("donaciones", "/identificadores", {
    tipo: "QR",
    descripcion: "QR demo incentivos " + suffix,
  });
  const pAceite = await client.post("donaciones", "/productos", {
    nombre: "Aceite",
    descripcion: "Aceite de girasol botella grande",
    categoriaID: catAlimentos.id,
    identificadorID: idQr.id,
  });
  const pRemera = await client.post("donaciones", "/productos", {
    nombre: "Remera",
    descripcion: "Remera manga corta talle M",
    categoriaID: catRopa.id,
    identificadorID: idQr.id,
  });
  const pToalla = await client.post("donaciones", "/productos", {
    nombre: "Toalla",
    descripcion: "Toalla de algodon grande",
    categoriaID: catHigiene.id,
    identificadorID: idQr.id,
  });
  log("ok", "Productos Aceite / Remera / Toalla");

  const donador = await client.post("dye", "/donadores", {
    nombre: persona.nombre,
    apellido: persona.apellido,
    edad: 31,
    email: persona.emailPrefix + "." + suffix + "@example.com",
    nroDocumento: docRandom(),
    domicilio: "Av. Clase 100",
    estado: "VERIFICADO",
    categoria: "OCASIONAL",
  });
  const deposito = await client.post("logistica", "/depositos", {
    nombre: "Depósito incentivos " + suffix,
    direccion: "Av. Logística 100",
    capacidadMaxima: 8000,
    stockActual: [],
  });
  await client.patch("logistica", "/depositos/" + deposito.id + "/algoritmoMM", {
    algoritmoMM: "SUB_ATENDIDOS",
  });
  log("ok", "Donador " + donador.id + " · depósito " + deposito.id + " (algoritmo SUB_ATENDIDOS)");

  const insCompletitud = await client.post("incentivos", "/insignias", {
    nombre: "Variedad " + suffix,
    descripcion: "Donó en 3 categorías distintas",
  });
  const insExitosas = await client.post("incentivos", "/insignias", {
    nombre: "Constante " + suffix,
    descripcion: "20 donaciones aceptadas",
  });
  const insAscendentes = await client.post("incentivos", "/insignias", {
    nombre: "Creciente " + suffix,
    descripcion: "5 donaciones seguidas cada vez más grandes",
  });
  const insRevolucionT = await client.post("incentivos", "/insignias", {
    nombre: "Revolución T " + suffix,
    descripcion: "Más de 10 donaciones de más de 50 unidades",
  });
  const insRevolucionS = await client.post("incentivos", "/insignias", {
    nombre: "Revolución S " + suffix,
    descripcion: "Más de 10 donaciones de más de 50 unidades",
  });

  const mCompletitud = await client.post("incentivos", "/misiones", {
    nombre: "Completitud " + suffix,
    insigniaID: insCompletitud.id,
    categoriaInicio: "OCASIONAL",
    categoriaFin: "COLABORADOR",
    tipo: "COMPLETITUD",
  });
  const mExitosas = await client.post("incentivos", "/misiones", {
    nombre: "Donaciones Exitosas " + suffix,
    insigniaID: insExitosas.id,
    categoriaInicio: "COLABORADOR",
    categoriaFin: "TRANSFORMADOR",
    tipo: "DONACIONES_EXITOSAS",
  });
  const mAscendentes = await client.post("incentivos", "/misiones", {
    nombre: "Donaciones Ascendentes " + suffix,
    insigniaID: insAscendentes.id,
    categoriaInicio: "COLABORADOR",
    categoriaFin: "SALVADOR",
    tipo: "DONACIONES_ASCENDENTES",
  });
  const mRevolucionT = await client.post("incentivos", "/misiones", {
    nombre: "Revolución desde Transformador " + suffix,
    insigniaID: insRevolucionT.id,
    categoriaInicio: "TRANSFORMADOR",
    categoriaFin: "REVOLUCIONARIO",
    tipo: "REVOLUCION_DONADORA",
  });
  const mRevolucionS = await client.post("incentivos", "/misiones", {
    nombre: "Revolución desde Salvador " + suffix,
    insigniaID: insRevolucionS.id,
    categoriaInicio: "SALVADOR",
    categoriaFin: "REVOLUCIONARIO",
    tipo: "REVOLUCION_DONADORA",
  });
  log("ok", "Misiones: Completitud, Exitosas, Ascendentes, Revolución ×2");

  return {
    client,
    ctx: runCtx,
    suffix,
    donador,
    deposito,
    productos: { aceite: pAceite, remera: pRemera, toalla: pToalla },
    misiones: {
      completitud: mCompletitud,
      exitosas: mExitosas,
      ascendentes: mAscendentes,
      revolucionT: mRevolucionT,
      revolucionS: mRevolucionS,
    },
  };
}

function baseDe(catalogo) {
  return { donador: catalogo.donador, deposito: catalogo.deposito };
}

function idsMisiones(misiones) {
  return {
    completitud: misiones.completitud.id,
    exitosas: misiones.exitosas.id,
    ascendentes: misiones.ascendentes.id,
    revolucionT: misiones.revolucionT.id,
    revolucionS: misiones.revolucionS.id,
  };
}

export async function seedIncentivosDemo(ctx) {
  const { log, progress } = ctx;
  const totalSteps = 7;
  let step = 0;
  const adv = (label) => progress(++step, totalSteps, label);

  log(
    "info",
    "Camino constante: 20 ACEPTADA → Transformador. En Colaborador el sistema elige este salto por ser el más corto."
  );

  adv("Catálogo (categorías, donador, depósito, misiones)");
  const catalogo = await crearCatalogoBase(ctx, "inc-exi", {
    nombre: "Ana",
    apellido: "Constante",
    emailPrefix: "ana.constante",
  });
  const { client, ctx: runCtx, suffix, donador, deposito, productos, misiones } = catalogo;
  const base = baseDe(catalogo);

  adv("Asignar Completitud (Ocasional → Colaborador)");
  await client.post("incentivos", "/donadores/" + donador.id + "/mision", misiones.completitud);
  log("ok", "Misión Completitud asignada a " + donador.id);

  adv("3 donaciones ACEPTADA de categorías distintas");
  const d1 = await crearDonacionAceptada(
    runCtx,
    base,
    productos.aceite,
    4,
    "Donación 1/19 · Aceite (Alimentos)"
  );
  await crearDonacionAceptada(runCtx, base, productos.remera, 4, "Donación 2/19 · Remera (Ropa)");
  await crearDonacionAceptada(runCtx, base, productos.toalla, 4, "Donación 3/19 · Toalla (Higiene)");

  adv("Procesar Completitud → Colaborador");
  await client.post("incentivos", "/donadores/" + donador.id + "/procesar", null);
  let snap = await snapshotDonador(client, donador.id);
  log(
    "ok",
    "Categoría DyE: " +
      (snap.donador && snap.donador.categoria) +
      " · misión: " +
      misionLabel(snap.mision)
  );
  if (snap.mision && snap.mision.tipo === "DONACIONES_EXITOSAS") {
    log(
      "ok",
      "Eligió el salto más corto: Colaborador → Transformador (Exitosas), no Salvador (Ascendentes)."
    );
  }

  adv("Completar hasta 19 donaciones ACEPTADA");
  for (let i = 4; i <= 19; i++) {
    await crearDonacionAceptada(runCtx, base, productos.aceite, 5, "Donación " + i + "/19 · Aceite");
    if (i % 4 === 0 || i === 19) log("info", "Progreso ACEPTADA: " + i + "/19");
  }

  adv("Verificar estado listo para la prueba en vivo");
  snap = await snapshotDonador(client, donador.id);
  const quejaTarget = snap.aceptadas[0] || d1;
  log(
    "ok",
    "Aceptadas=" +
      snap.aceptadas.length +
      " · categoría=" +
      (snap.donador && snap.donador.categoria)
  );

  adv("Listo para el último transpaso");
  const result = {
    scenario: "exitosas",
    suffix,
    donadorId: donador.id,
    depositoId: deposito.id,
    productoId: productos.aceite.id,
    misiones: idsMisiones(misiones),
    donacionesAceptadasIds: snap.aceptadas.map((d) => d.id),
    quejaTargetId: quejaTarget && quejaTarget.id,
    categoria: snap.donador && snap.donador.categoria,
    mision: snap.mision,
    insignias: snap.insignias,
    historial: snap.historial,
    vigesimaHecha: false,
    quejaHecha: false,
    donacionVigesimaId: null,
  };
  log(
    "info",
    "Siguiente: 20ª ACEPTADA + procesar → Transformador. Después, queja sobre " +
      result.quejaTargetId +
      " → vuelve a Colaborador con 19."
  );
  return result;
}

export async function seedCrecienteDemo(ctx) {
  const { log, progress } = ctx;
  const totalSteps = 4;
  let step = 0;
  const adv = (label) => progress(++step, totalSteps, label);

  log(
    "info",
    "Camino creciente: últimas 5 donaciones con cantidad estrictamente mayor. Colaborador → Salvador."
  );
  log(
    "info",
    "Se asigna Donaciones Ascendentes a mano: si dejáramos el auto-assign, Incentivos elegiría Exitosas por ser el salto más corto."
  );

  adv("Catálogo");
  const catalogo = await crearCatalogoBase(ctx, "inc-cre", {
    nombre: "Luis",
    apellido: "Creciente",
    emailPrefix: "luis.creciente",
  });
  const { client, ctx: runCtx, suffix, donador, deposito, productos, misiones } = catalogo;
  const base = baseDe(catalogo);

  adv("Pasar a COLABORADOR y asignar Ascendentes");
  await client.patch("dye", "/donadores/" + donador.id + "/categoria", {
    categoria: "COLABORADOR",
  });
  await client.post("incentivos", "/donadores/" + donador.id + "/mision", misiones.ascendentes);
  log("ok", "Categoría COLABORADOR · misión Ascendentes asignada");

  adv("4 donaciones crecientes (2, 4, 6, 8)");
  const cantidades = [2, 4, 6, 8];
  for (let i = 0; i < cantidades.length; i++) {
    await crearDonacionAceptada(
      runCtx,
      base,
      productos.aceite,
      cantidades[i],
      "Creciente " + (i + 1) + "/4 · qty " + cantidades[i]
    );
  }

  adv("Verificar: todavía no son 5 seguidas");
  const snap = await snapshotDonador(client, donador.id);
  log(
    "ok",
    "Donaciones=" +
      snap.donaciones.length +
      " · cantidades=[" +
      snap.donaciones.map((d) => d.cantidad).join(", ") +
      "] · falta una mayor que 8"
  );

  const result = {
    scenario: "creciente",
    suffix,
    donadorId: donador.id,
    depositoId: deposito.id,
    productoId: productos.aceite.id,
    misiones: idsMisiones(misiones),
    donacionesAceptadasIds: snap.aceptadas.map((d) => d.id),
    cantidades: snap.donaciones.map((d) => d.cantidad),
    ultimaCantidad: 8,
    quintaHecha: false,
    quintaDonacionId: null,
    categoria: snap.donador && snap.donador.categoria,
    mision: snap.mision,
    insignias: snap.insignias,
    historial: snap.historial,
  };
  log("info", "Siguiente: donación ACEPTADA con cantidad > 8 (ej. 10) + procesar → SALVADOR.");
  return result;
}

export async function seedRevolucionDemo(ctx) {
  const { log, progress } = ctx;
  const totalSteps = 4;
  let step = 0;
  const adv = (label) => progress(++step, totalSteps, label);

  log(
    "info",
    "Camino Revolución: más de 10 donaciones con cantidad > 50. Salvador → Revolucionario."
  );

  adv("Catálogo");
  const catalogo = await crearCatalogoBase(ctx, "inc-rev", {
    nombre: "Mora",
    apellido: "Revolucion",
    emailPrefix: "mora.revolucion",
  });
  const { client, ctx: runCtx, suffix, donador, deposito, productos, misiones } = catalogo;
  const base = baseDe(catalogo);

  adv("Pasar a SALVADOR y asignar Revolución");
  await client.patch("dye", "/donadores/" + donador.id + "/categoria", {
    categoria: "SALVADOR",
  });
  await client.post("incentivos", "/donadores/" + donador.id + "/mision", misiones.revolucionS);
  log("ok", "Categoría SALVADOR · misión Revolución Donadora asignada");

  adv("10 donaciones grandes (qty 51)");
  for (let i = 1; i <= 10; i++) {
    await crearDonacionAceptada(
      runCtx,
      base,
      productos.aceite,
      51,
      "Grande " + i + "/10 · qty 51"
    );
    if (i % 5 === 0 || i === 10) log("info", "Progreso grandes: " + i + "/10");
  }

  adv("Verificar: hay 10 grandes, hace falta más de 10");
  const snap = await snapshotDonador(client, donador.id);
  log(
    "ok",
    "Grandes (>50)=" +
      snap.grandes.length +
      " · categoría=" +
      (snap.donador && snap.donador.categoria) +
      " · umbral: count > 10"
  );

  const result = {
    scenario: "revolucion",
    suffix,
    donadorId: donador.id,
    depositoId: deposito.id,
    productoId: productos.aceite.id,
    misiones: idsMisiones(misiones),
    donacionesAceptadasIds: snap.aceptadas.map((d) => d.id),
    grandesCount: snap.grandes.length,
    undecimaHecha: false,
    undecimaDonacionId: null,
    categoria: snap.donador && snap.donador.categoria,
    mision: snap.mision,
    insignias: snap.insignias,
    historial: snap.historial,
  };
  log("info", "Siguiente: donación ACEPTADA con cantidad > 50 (ej. 60) + procesar → REVOLUCIONARIO.");
  return result;
}

export async function completarVigesimaDonacion(ctx, state) {
  const client = withRetry(ctx.client);
  const { log, progress } = ctx;
  if (!state || !state.donadorId) {
    throw new Error("No hay escenario precargado. Primero pulsá Precargar.");
  }
  progress(1, 3, "Registrar 20ª donación");
  const don = await client.post("donaciones", "/donaciones", {
    donadorID: state.donadorId,
    depositoID: state.depositoId,
    descripcion: "20ª donación demo clase — Donaciones Exitosas",
    productoID: state.productoId,
    cantidad: 6,
  });
  log("ok", "20ª donación INGRESADA → " + don.id);

  progress(2, 3, "Pasar a ACEPTADA");
  const aceptada = await client.patch(
    "donaciones",
    "/donaciones/" + don.id + "/estado",
    "ACEPTADA"
  );
  log("ok", "Estado " + don.id + " → " + (aceptada && aceptada.estado));

  progress(3, 3, "Procesar donador en Incentivos");
  await client.post("incentivos", "/donadores/" + state.donadorId + "/procesar", null);
  const snap = await snapshotDonador(client, state.donadorId);
  log(
    "ok",
    "Después de procesar: categoría=" +
      (snap.donador && snap.donador.categoria) +
      " · aceptadas=" +
      snap.aceptadas.length +
      " · misión=" +
      misionLabel(snap.mision)
  );
  log(
    "ok",
    "Insignias: " +
      (snap.insignias.length ? snap.insignias.map((i) => i.nombre).join(", ") : "(ninguna)")
  );
  log("ok", "Historial: " + (snap.historial.length ? snap.historial.join(" → ") : "—"));

  return {
    ...state,
    vigesimaHecha: true,
    donacionVigesimaId: don.id,
    categoria: snap.donador && snap.donador.categoria,
    mision: snap.mision,
    insignias: snap.insignias,
    historial: snap.historial,
    donacionesAceptadasIds: snap.aceptadas.map((d) => d.id),
  };
}

export async function registrarQuejaYProcesar(ctx, state) {
  const client = withRetry(ctx.client);
  const { log, progress } = ctx;
  if (!state || !state.donadorId) {
    throw new Error("No hay escenario precargado. Primero pulsá Precargar.");
  }
  const targetId = state.quejaTargetId;
  if (!targetId) {
    throw new Error("No hay donación ACEPTADA para quejar.");
  }

  progress(1, 3, "Consultar donación objetivo");
  const antes = await client.get("donaciones", "/donaciones/" + encodeURIComponent(targetId));
  log("info", "Donación " + targetId + " está en " + (antes && antes.estado));
  if (antes && antes.estado !== "ACEPTADA") {
    throw new Error("La donación " + targetId + " no está ACEPTADA (está " + antes.estado + ").");
  }

  progress(2, 3, "Registrar queja → CONQUEJA");
  const despues = await client.post(
    "donaciones",
    "/donaciones/" + encodeURIComponent(targetId) + "/queja",
    { descripcion: "Queja de demo: producto en mal estado" }
  );
  log("ok", "Donación " + targetId + " → " + (despues && despues.estado));

  progress(3, 3, "Procesar donador (pérdida de progreso)");
  await client.post("incentivos", "/donadores/" + state.donadorId + "/procesar", null);
  const snap = await snapshotDonador(client, state.donadorId);
  log(
    "ok",
    "Después de la queja: aceptadas=" +
      snap.aceptadas.length +
      " · conqueja=" +
      snap.conQueja.length +
      " · categoría=" +
      (snap.donador && snap.donador.categoria)
  );
  log(
    "ok",
    "Insignias: " +
      (snap.insignias.length
        ? snap.insignias.map((i) => i.nombre).join(", ")
        : "(se quitó la de Donaciones Exitosas)")
  );
  log("ok", "Historial: " + (snap.historial.length ? snap.historial.join(" → ") : "—"));
  log("ok", "Misión reasignada: " + misionLabel(snap.mision));

  return {
    ...state,
    quejaHecha: true,
    categoria: snap.donador && snap.donador.categoria,
    mision: snap.mision,
    insignias: snap.insignias,
    historial: snap.historial,
    donacionesAceptadasIds: snap.aceptadas.map((d) => d.id),
  };
}

export async function completarQuintaCreciente(ctx, state) {
  const client = withRetry(ctx.client);
  const { log, progress } = ctx;
  if (!state || !state.donadorId) {
    throw new Error("No hay escenario precargado. Primero pulsá Precargar.");
  }
  const cantidad = (Number(state.ultimaCantidad) || 8) + 2;
  progress(1, 3, "Registrar 5ª donación creciente (qty " + cantidad + ")");
  const don = await client.post("donaciones", "/donaciones", {
    donadorID: state.donadorId,
    depositoID: state.depositoId,
    descripcion: "5ª donación creciente demo clase",
    productoID: state.productoId,
    cantidad,
  });
  log("ok", "5ª INGRESADA → " + don.id + " · qty " + cantidad);

  progress(2, 3, "Pasar a ACEPTADA");
  await client.patch("donaciones", "/donaciones/" + don.id + "/estado", "ACEPTADA");

  progress(3, 3, "Procesar → Salvador");
  await client.post("incentivos", "/donadores/" + state.donadorId + "/procesar", null);
  const snap = await snapshotDonador(client, state.donadorId);
  log(
    "ok",
    "Categoría=" +
      (snap.donador && snap.donador.categoria) +
      " · cantidades=[" +
      snap.donaciones.map((d) => d.cantidad).join(", ") +
      "]"
  );
  log("ok", "Insignias: " + (snap.insignias.length ? snap.insignias.map((i) => i.nombre).join(", ") : "(ninguna)"));
  log("ok", "Historial: " + (snap.historial.length ? snap.historial.join(" → ") : "—"));
  log("ok", "Misión siguiente: " + misionLabel(snap.mision));

  return {
    ...state,
    quintaHecha: true,
    quintaDonacionId: don.id,
    ultimaCantidad: cantidad,
    categoria: snap.donador && snap.donador.categoria,
    mision: snap.mision,
    insignias: snap.insignias,
    historial: snap.historial,
    donacionesAceptadasIds: snap.aceptadas.map((d) => d.id),
  };
}

export async function completarUndecimaGrande(ctx, state) {
  const client = withRetry(ctx.client);
  const { log, progress } = ctx;
  if (!state || !state.donadorId) {
    throw new Error("No hay escenario precargado. Primero pulsá Precargar.");
  }
  progress(1, 3, "Registrar 11ª donación grande (qty 60)");
  const don = await client.post("donaciones", "/donaciones", {
    donadorID: state.donadorId,
    depositoID: state.depositoId,
    descripcion: "11ª donación grande demo clase",
    productoID: state.productoId,
    cantidad: 60,
  });
  log("ok", "11ª INGRESADA → " + don.id + " · qty 60");

  progress(2, 3, "Pasar a ACEPTADA");
  await client.patch("donaciones", "/donaciones/" + don.id + "/estado", "ACEPTADA");

  progress(3, 3, "Procesar → Revolucionario");
  await client.post("incentivos", "/donadores/" + state.donadorId + "/procesar", null);
  const snap = await snapshotDonador(client, state.donadorId);
  log(
    "ok",
    "Categoría=" +
      (snap.donador && snap.donador.categoria) +
      " · grandes (>50)=" +
      snap.grandes.length
  );
  log("ok", "Insignias: " + (snap.insignias.length ? snap.insignias.map((i) => i.nombre).join(", ") : "(ninguna)"));
  log("ok", "Historial: " + (snap.historial.length ? snap.historial.join(" → ") : "—"));
  log("ok", "Misión: " + misionLabel(snap.mision));

  return {
    ...state,
    undecimaHecha: true,
    undecimaDonacionId: don.id,
    grandesCount: snap.grandes.length,
    categoria: snap.donador && snap.donador.categoria,
    mision: snap.mision,
    insignias: snap.insignias,
    historial: snap.historial,
    donacionesAceptadasIds: snap.aceptadas.map((d) => d.id),
  };
}

export function emptyDemoBundle() {
  return { tab: "exitosas", byTab: { exitosas: null, creciente: null, revolucion: null } };
}

export function loadDemoBundle() {
  try {
    const raw = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return emptyDemoBundle();
    const parsed = JSON.parse(raw);
    if (parsed && parsed.byTab) return parsed;
    if (parsed && parsed.donadorId) {
      return { tab: "exitosas", byTab: { exitosas: parsed, creciente: null, revolucion: null } };
    }
    return emptyDemoBundle();
  } catch (_) {
    return emptyDemoBundle();
  }
}

export function saveDemoBundle(bundle) {
  try {
    sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(bundle));
  } catch (_) {
    /* ignore */
  }
}
