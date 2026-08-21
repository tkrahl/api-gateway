import { makeSuffix } from "./client.js";

export const meta = {
  id: "01",
  title: "Setup base",
  description:
    "Precondición común para todos los escenarios de demo (data base B1 + B2).",
  totalSteps: 11,
  tags: ["B1", "B2"],
  guide: {
    objective:
      "Verificar que las APIs públicas de Donaciones y Donadores y Entidades permiten crear la data mínima de E4: categorías, identificadores con reglas de validación (QR / CODIGODEBARRAS), productos válidos, donadores verificados y entidades benéficas.",
    method:
      "1) Borrar toda la data con el botón de arriba. 2) Ejecutar este escenario y revisar que el log llegue a 11/11 en verde. 3) Opcional: abrir «Ver resultado JSON» o consultar los GET listados abajo para confirmar que los recursos existen con los IDs generados.",
    creates: [
      "2 categorías (Alimentos, Ropa) — Donaciones",
      "2 identificadores (QR + CODIGODEBARRAS) — Donaciones",
      "3 productos válidos: Aceite (QR, nombre par), Fideos (BARRAS, desc. ≥ 3 palabras), Remera (QR) — Donaciones",
      "2 donadores verificados en categoría BRONCE (Juan Pérez, María González) — DyE",
      "2 entidades benéficas (Comedor Los Ángeles, Hogar Renacer) — DyE",
    ],
    manualSteps: [
      "Este escenario no deja listo ningún flujo de negocio de E4 por sí solo.",
      "Para demo Parte A (matchmaking en Logística): correr el escenario 02 o crear manualmente un depósito (L1) + una necesidad extraordinaria insatisfecha (D1).",
      "Para demo «DyE asigna desde stock»: agregar depósito con stock precargado (L3) y luego dar de alta una necesidad.",
      "Para demo Incentivos (19→20 ACEPTADAS o pérdida de progreso): correr escenarios I1/I2/I3 después de este setup.",
      "Verificación manual opcional tras ejecutar:",
      "GET /api/donaciones/categorias → 2 categorías con el sufijo del seed",
      "GET /api/donaciones/productos → 3 productos (Aceite, Fideos, Remera)",
      "GET /api/dye/donadores → 2 donadores VERIFICADO",
      "GET /api/dye/entidades → 2 entidades benéficas",
    ],
    expected: [
      "Donaciones (E1/E2): existen categorías e identificadores (QR y CODIGODEBARRAS) cargados previamente; los productos cumplen las reglas de validación — QR: cantidad par de letras en el nombre; CODIGODEBARRAS: descripción con ≥ 3 palabras — y pueden usarse al registrar donaciones.",
      "Donaciones (E1): cada producto tiene nombre, descripción y categoría; son consultables por ID para referenciarlos en donaciones y necesidades.",
      "DyE (E1): hay donadores registrados (nombre, apellido, edad, email, documento, domicilio) en estado Verificado, por lo que pueden donar sin restricciones al registrar una donación.",
      "DyE (E1): hay entidades benéficas con razón social, domicilio, teléfono y correo, listas para registrar necesidades materiales (producto, urgencia, cantidad objetivo).",
      "Integración (E3/E4): quedan cumplidas las precondiciones que pide la cátedra para la corrección presencial — donadores, productos y entidades precargados — de modo que los escenarios posteriores (depósito, necesidad, donación, matchmaking, incentivos) puedan ejecutarse sin crear esta data base a mano.",
      "E4 — DyE: al dar de alta una necesidad con alguno de estos productos, Donaciones debe corroborar que el producto es válido (requisito de integración entre módulos).",
    ],
  },
};

export async function run(ctx) {
  const { client, log, progress, saveResult } = ctx;
  const suffix = makeSuffix("s01");
  log("info", "Sufijo único: " + suffix);
  const result = {
    suffix,
    categorias: [],
    identificadores: [],
    productos: [],
    donadores: [],
    entidades: [],
  };

  let step = 0;
  const advance = (label) => progress(++step, meta.totalSteps, label);

  // ---- Donaciones: categorías + identificadores + productos ----

  advance("Creando categoría: Alimentos");
  const cat1 = await client.post("donaciones", "/categorias", {
    nombre: "Alimentos-" + suffix,
    descripcion: "Categoría de alimentos no perecederos",
  });
  result.categorias.push(cat1);
  log("ok", "Categoría 1 → id=" + cat1.id);

  advance("Creando categoría: Ropa");
  const cat2 = await client.post("donaciones", "/categorias", {
    nombre: "Ropa-" + suffix,
    descripcion: "Ropa de todas las estaciones",
  });
  result.categorias.push(cat2);
  log("ok", "Categoría 2 → id=" + cat2.id);

  advance("Creando identificador QR");
  const idQr = await client.post("donaciones", "/identificadores", {
    tipo: "QR",
    descripcion: "Identificador QR para alimentos " + suffix,
  });
  result.identificadores.push(idQr);
  log("ok", "Identificador QR → id=" + idQr.id);

  advance("Creando identificador CODIGODEBARRAS");
  const idBar = await client.post("donaciones", "/identificadores", {
    tipo: "CODIGODEBARRAS",
    descripcion: "Identificador de código de barras " + suffix,
  });
  result.identificadores.push(idBar);
  log("ok", "Identificador BARRAS → id=" + idBar.id);

  // Nombre con cantidad de letras PAR (regla de QR: "Aceite" = 6 letras)
  advance("Creando producto con QR (nombre par)");
  const p1 = await client.post("donaciones", "/productos", {
    nombre: "Aceite",
    descripcion: "Aceite de girasol botella grande",
    categoriaID: cat1.id,
    identificadorID: idQr.id,
  });
  result.productos.push(p1);
  log("ok", "Producto 1 (Aceite, QR) → id=" + p1.id);

  advance("Creando producto con CODIGODEBARRAS (descripción ≥ 3 palabras)");
  const p2 = await client.post("donaciones", "/productos", {
    nombre: "Fideos",
    descripcion: "Fideos secos de trigo integral",
    categoriaID: cat1.id,
    identificadorID: idBar.id,
  });
  result.productos.push(p2);
  log("ok", "Producto 2 (Fideos, BARRAS) → id=" + p2.id);

  advance("Creando producto extra con QR (nombre par)");
  const p3 = await client.post("donaciones", "/productos", {
    nombre: "Remera",
    descripcion: "Remera manga corta talle M",
    categoriaID: cat2.id,
    identificadorID: idQr.id,
  });
  result.productos.push(p3);
  log("ok", "Producto 3 (Remera, QR) → id=" + p3.id);

  // ---- DyE: donadores + entidades ----

  advance("Creando donador 1 (verificado)");
  const donador1 = await client.post("dye", "/donadores", {
    nombre: "Juan",
    apellido: "Pérez",
    edad: 35,
    email: "juan.perez." + suffix + "@example.com",
    nroDocumento: "12345678",
    domicilio: "Av. Siempre Viva 123",
    estado: "VERIFICADO",
    categoria: "BRONCE",
  });
  result.donadores.push(donador1);
  log("ok", "Donador 1 → id=" + donador1.id);

  advance("Creando donador 2 (verificado)");
  const donador2 = await client.post("dye", "/donadores", {
    nombre: "María",
    apellido: "González",
    edad: 42,
    email: "maria.gonzalez." + suffix + "@example.com",
    nroDocumento: "23456789",
    domicilio: "Calle Falsa 456",
    estado: "VERIFICADO",
    categoria: "BRONCE",
  });
  result.donadores.push(donador2);
  log("ok", "Donador 2 → id=" + donador2.id);

  advance("Creando entidad benéfica: Comedor");
  const entidad1 = await client.post("dye", "/entidades", {
    razonSocial: "Comedor Los Ángeles " + suffix,
    domicilio: "Av. Rivadavia 4500",
    telefono: "1145678901",
    correo: "comedor." + suffix + "@example.com",
  });
  result.entidades.push(entidad1);
  log("ok", "Entidad 1 (comedor) → id=" + entidad1.id);

  advance("Creando entidad benéfica: Hogar");
  const entidad2 = await client.post("dye", "/entidades", {
    razonSocial: "Hogar Renacer " + suffix,
    domicilio: "Calle Corrientes 8900",
    telefono: "1156789012",
    correo: "hogar." + suffix + "@example.com",
  });
  result.entidades.push(entidad2);
  log("ok", "Entidad 2 (hogar) → id=" + entidad2.id);

  saveResult(result);
  log(
    "ok",
    "Setup base completo: " +
      result.categorias.length +
      " categorías, " +
      result.identificadores.length +
      " identificadores, " +
      result.productos.length +
      " productos, " +
      result.donadores.length +
      " donadores, " +
      result.entidades.length +
      " entidades."
  );
  return result;
}
