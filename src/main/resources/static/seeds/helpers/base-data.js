import { makeSuffix } from "../client.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Data base: categorías, productos, donadores, entidades. */
export async function setupBase(ctx, prefix = "demo") {
  const { client, log } = ctx;
  const suffix = makeSuffix(prefix);
  log("info", "Sufijo: " + suffix);

  const cat = await client.post("donaciones", "/categorias", {
    nombre: "Alimentos-" + suffix,
    descripcion: "Categoría demo alimentos",
  });
  log("ok", "Categoría → " + cat.id);

  const idQr = await client.post("donaciones", "/identificadores", {
    tipo: "QR",
    descripcion: "QR demo " + suffix,
  });
  const idBar = await client.post("donaciones", "/identificadores", {
    tipo: "CODIGODEBARRAS",
    descripcion: "Barras demo " + suffix,
  });

  const producto = await client.post("donaciones", "/productos", {
    nombre: "Aceite",
    descripcion: "Aceite de girasol botella grande",
    categoriaID: cat.id,
    identificadorID: idQr.id,
  });
  log("ok", "Producto Aceite → " + producto.id);

  const producto2 = await client.post("donaciones", "/productos", {
    nombre: "Fideos",
    descripcion: "Fideos secos de trigo integral",
    categoriaID: cat.id,
    identificadorID: idBar.id,
  });

  const donador = await client.post("dye", "/donadores", {
    nombre: "Juan",
    apellido: "Pérez",
    edad: 35,
    email: "juan." + suffix + "@example.com",
    nroDocumento: String(Math.floor(Math.random() * 90000000) + 10000000),
    domicilio: "Av. Demo 123",
    estado: "VERIFICADO",
    categoria: "BRONCE",
  });
  log("ok", "Donador → " + donador.id);

  const entidad = await client.post("dye", "/entidades", {
    razonSocial: "Comedor Demo " + suffix,
    domicilio: "Av. Rivadavia 4500",
    telefono: "1145678901",
    correo: "comedor." + suffix + "@example.com",
  });
  log("ok", "Entidad → " + entidad.id);

  return { suffix, cat, idQr, idBar, producto, producto2, donador, entidad };
}

export async function createDeposito(ctx, opts = {}) {
  const { client, log } = ctx;
  const suffix = opts.suffix || "dep";
  const dep = await client.post("logistica", "/depositos", {
    nombre: opts.nombre || "Depósito " + suffix,
    direccion: "Av. Logística 100",
    capacidadMaxima: opts.capacidadMaxima ?? 1000,
    stockActual: [],
  });
  await client.patch("logistica", "/depositos/" + dep.id + "/algoritmoMM", {
    algoritmoMM: opts.algoritmo || "SUB_ATENDIDOS",
  });
  log("ok", "Depósito " + dep.nombre + " → " + dep.id);
  return dep;
}

export async function registerDonacion(ctx, base, deposito, cantidad = 5) {
  const { client, log } = ctx;
  const don = await client.post("donaciones", "/donaciones", {
    donadorID: base.donador.id,
    depositoID: deposito.id,
    descripcion: "Donación demo Entrega 4",
    productoID: base.producto.id,
    cantidad,
  });
  log("ok", "Donación registrada → " + don.id);
  return don;
}

export async function sendToDeposito(ctx, deposito, donacion, productoId, cantidad) {
  const { client, log } = ctx;
  await client.post("logistica", "/depositos/" + deposito.id + "/donaciones", {
    donacionID: donacion.id,
    productoID: productoId,
    cantidad,
  });
  log("ok", "Donación encolada en depósito " + deposito.id);
}

export async function waitAsync(ctx, ms = 3000) {
  ctx.log("info", "Esperando procesamiento async (" + ms / 1000 + "s)…");
  await sleep(ms);
}

export async function getStock(ctx, productoId) {
  const { client } = ctx;
  try {
    return await client.get("logistica", "/depositos/stock?productoID=" + productoId);
  } catch (e) {
    return null;
  }
}

export async function getAsignaciones(ctx) {
  const { client } = ctx;
  try {
    return await client.get("logistica", "/asignaciones");
  } catch (e) {
    return [];
  }
}

export async function createNecesidad(ctx, base, opts = {}) {
  const { client, log } = ctx;
  const nec = await client.post("dye", "/necesidades", {
    entidadID: base.entidad.id,
    nivelDeUrgencia: opts.urgencia ?? 8,
    descripcion: opts.descripcion || "Necesidad demo",
    cantidadObjetivo: opts.cantidadObjetivo ?? 50,
    productoSolicitadoID: opts.productoId || base.producto.id,
    tipo: opts.tipo || "EXTRAORDINARIA",
  });
  log("ok", "Necesidad " + nec.tipo + " → " + nec.id);
  return nec;
}

export function manualSteps(ctx, lines) {
  lines.forEach((line, i) => {
    ctx.log("info", "Paso " + (i + 1) + ": " + line);
  });
}
