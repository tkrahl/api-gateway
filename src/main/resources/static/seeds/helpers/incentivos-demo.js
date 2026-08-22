import { makeSuffix } from "../client.js";

export const DEMO_STORAGE_KEY = "donatrack.incentivosDemo";

const FECHA_HISTORICA = "2000-01-01";
const RETRY = { retries: 4, retryDelayMs: 800 };

function docRandom() {
  return String(Math.floor(Math.random() * 90000000) + 10000000);
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
  return {
    donador,
    mision,
    insignias: Array.isArray(insignias) ? insignias : [],
    historial: Array.isArray(historial) ? historial : [],
    donaciones: lista,
    aceptadas,
    conQueja,
  };
}

function withRetry(client) {
  return {
    post: (s, p, b, o) => client.post(s, p, b, { ...RETRY, ...o }),
    get: (s, p, o) => client.get(s, p, { ...RETRY, ...o }),
    patch: (s, p, b, o) => client.patch(s, p, b, { ...RETRY, ...o }),
  };
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
  log("ok", etiqueta + " → " + don.id + " · " + (aceptada && aceptada.estado));
  return aceptada || don;
}

export async function seedIncentivosDemo(ctx) {
  const client = withRetry(ctx.client);
  const { log, progress } = ctx;
  ctx = { ...ctx, client };
  const suffix = makeSuffix("inc");
  const totalSteps = 12;
  let step = 0;
  const adv = (label) => progress(++step, totalSteps, label);

  log("info", "Sufijo de esta corrida: " + suffix);
  log(
    "info",
    "El sistema elige la misión más cercana (menor salto de categoría). En Colaborador gana Donaciones Exitosas → Transformador, no Ascendentes → Salvador."
  );

  adv("Categorías de producto (3, para Completitud)");
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

  adv("Identificador QR + productos (nombres de largo par)");
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

  adv("Donador OCASIONAL + depósito");
  const donador = await client.post("dye", "/donadores", {
    nombre: "Ana",
    apellido: "Demo",
    edad: 31,
    email: "ana.demo." + suffix + "@example.com",
    nroDocumento: docRandom(),
    domicilio: "Av. Clase 100",
    estado: "VERIFICADO",
    categoria: "OCASIONAL",
  });
  const deposito = await client.post("logistica", "/depositos", {
    nombre: "Depósito incentivos " + suffix,
    direccion: "Av. Logística 100",
    capacidadMaxima: 5000,
    stockActual: [],
  });
  log("ok", "Donador " + donador.id + " · depósito " + deposito.id);

  const base = { donador, deposito };

  adv("Insignias y catálogo de misiones");
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
  await client.post("incentivos", "/misiones", {
    nombre: "Revolución desde Transformador " + suffix,
    insigniaID: insRevolucionT.id,
    categoriaInicio: "TRANSFORMADOR",
    categoriaFin: "REVOLUCIONARIO",
    tipo: "REVOLUCION_DONADORA",
  });
  await client.post("incentivos", "/misiones", {
    nombre: "Revolución desde Salvador " + suffix,
    insigniaID: insRevolucionS.id,
    categoriaInicio: "SALVADOR",
    categoriaFin: "REVOLUCIONARIO",
    tipo: "REVOLUCION_DONADORA",
  });
  log("ok", "Misiones: Completitud, Exitosas, Ascendentes, Revolución ×2");

  adv("Asignar Completitud (Ocasional → Colaborador)");
  await client.post("incentivos", "/donadores/" + donador.id + "/mision", mCompletitud);
  log("ok", "Misión Completitud asignada a " + donador.id);

  adv("3 donaciones ACEPTADA de categorías distintas");
  const d1 = await crearDonacionAceptada(ctx, base, pAceite, 4, "Donación 1/19 · Aceite (Alimentos)");
  const d2 = await crearDonacionAceptada(ctx, base, pRemera, 4, "Donación 2/19 · Remera (Ropa)");
  const d3 = await crearDonacionAceptada(ctx, base, pToalla, 4, "Donación 3/19 · Toalla (Higiene)");

  adv("Procesar Completitud → Colaborador");
  await client.post("incentivos", "/donadores/" + donador.id + "/procesar", null);
  let snap = await snapshotDonador(client, donador.id);
  log(
    "ok",
    "Categoría DyE: " +
      (snap.donador && snap.donador.categoria) +
      " · misión: " +
      (snap.mision ? snap.mision.nombre + " (" + snap.mision.tipo + ")" : "ninguna")
  );
  if (snap.mision && snap.mision.tipo === "DONACIONES_EXITOSAS") {
    log(
      "ok",
      "Eligió el salto más corto: Colaborador → Transformador (Exitosas), no Salvador (Ascendentes)."
    );
  }

  adv("Completar hasta 19 donaciones ACEPTADA");
  const extras = [];
  for (let i = 4; i <= 19; i++) {
    const don = await crearDonacionAceptada(
      ctx,
      base,
      pAceite,
      5,
      "Donación " + i + "/19 · Aceite"
    );
    extras.push(don);
    if (i % 4 === 0 || i === 19) {
      log("info", "Progreso ACEPTADA: " + i + "/19");
    }
  }

  adv("Verificar estado listo para la prueba en vivo");
  snap = await snapshotDonador(client, donador.id);
  const aceptadas = snap.aceptadas;
  const quejaTarget = aceptadas[0] || d1;
  log(
    "ok",
    "Aceptadas=" +
      aceptadas.length +
      " · conqueja=" +
      snap.conQueja.length +
      " · categoría=" +
      (snap.donador && snap.donador.categoria)
  );

  adv("Listo para el último transpaso");
  const result = {
    suffix,
    donadorId: donador.id,
    depositoId: deposito.id,
    productoId: pAceite.id,
    productos: {
      aceite: pAceite.id,
      remera: pRemera.id,
      toalla: pToalla.id,
    },
    misiones: {
      completitud: mCompletitud.id,
      exitosas: mExitosas.id,
      ascendentes: mAscendentes.id,
    },
    donacionesAceptadasIds: aceptadas.map((d) => d.id),
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
    "Siguiente: registrá la 20ª ACEPTADA y procesá → Transformador. Después, queja sobre " +
      result.quejaTargetId +
      " y procesá → vuelve a Colaborador con 19."
  );
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
      (snap.mision ? snap.mision.nombre : "ninguna")
  );
  log(
    "ok",
    "Insignias: " +
      (snap.insignias.length
        ? snap.insignias.map((i) => i.nombre).join(", ")
        : "(ninguna)")
  );
  log(
    "ok",
    "Historial de categorías: " + (snap.historial.length ? snap.historial.join(" → ") : "—")
  );

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
  const despues = await client.post("donaciones", "/donaciones/" + encodeURIComponent(targetId) + "/queja", {
    descripcion: "Queja de demo: producto en mal estado",
  });
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
  log(
    "ok",
    "Historial de categorías: " + (snap.historial.length ? snap.historial.join(" → ") : "—")
  );
  log(
    "ok",
    "Misión reasignada: " +
      (snap.mision ? snap.mision.nombre + " (" + snap.mision.tipo + ")" : "ninguna")
  );

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

export function loadDemoState() {
  try {
    const raw = sessionStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function saveDemoState(state) {
  try {
    if (state) sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    else sessionStorage.removeItem(DEMO_STORAGE_KEY);
  } catch (_) {
    /* ignore */
  }
}
