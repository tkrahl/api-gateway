// Recursos del explorador /admin/modules/{id}
// Solo los 4 módulos de negocio (no gateway ni bot).
// Fuente: controllers GET de colección en cada repo.

export const MODULE_CATALOG = {
  dye: {
    title: "Donadores y Entidades",
    subtitle: "Repo donadores-entidades",
    service: "dye",
    resources: [
      { id: "donadores", label: "Donadores", path: "/donadores" },
      { id: "entidades", label: "Entidades", path: "/entidades" },
      {
        id: "necesidades-por-producto",
        label: "Necesidades (por producto)",
        path: "/necesidades",
        params: [{ name: "productoID", label: "productoID", required: true }],
      },
      { id: "admin-db", label: "Admin DB (estado)", path: "/admin/db" },
    ],
  },
  donaciones: {
    title: "Donaciones",
    subtitle: "Repo donaciones",
    service: "donaciones",
    resources: [
      { id: "donaciones", label: "Donaciones", path: "/donaciones" },
      { id: "productos", label: "Productos", path: "/productos" },
      { id: "categorias", label: "Categorías", path: "/categorias" },
      { id: "identificadores", label: "Identificadores", path: "/identificadores" },
      {
        id: "donaciones-search",
        label: "Donaciones · search",
        path: "/donaciones/search",
        params: [
          { name: "donadorID", label: "donadorID", required: true },
          { name: "fechaInicio", label: "fechaInicio (YYYY-MM-DD)", required: true },
        ],
      },
      { id: "admin-db", label: "Admin DB (estado)", path: "/admin/db" },
    ],
  },
  logistica: {
    title: "Logística",
    subtitle: "Repo logistica",
    service: "logistica",
    resources: [
      { id: "depositos", label: "Depósitos", path: "/depositos", view: "depositos" },
      {
        id: "depositos-stock",
        label: "Stock por producto",
        path: "/depositos/stock",
        params: [{ name: "productoID", label: "productoID", required: true }],
      },
      { id: "asignaciones", label: "Asignaciones", path: "/asignaciones" },
      { id: "paquetes", label: "Paquetes", path: "/paquetes" },
      {
        id: "aud-movimientos",
        label: "Auditoría · movimientos stock",
        path: "/auditoria/movimientos-stock",
      },
      {
        id: "aud-historial",
        label: "Auditoría · historial estados",
        path: "/auditoria/historial-estados-asignacion",
      },
      {
        id: "aud-fraccionamientos",
        label: "Auditoría · fraccionamientos",
        path: "/auditoria/fraccionamientos-paquete",
      },
    ],
  },
  incentivos: {
    title: "Incentivos",
    subtitle: "Repo incentivos",
    service: "incentivos",
    resources: [
      {
        id: "demo-clase",
        label: "Demo de clase",
        path: "precarga local (sin GET)",
        absolute: true,
        view: "incentivos-demo",
      },
      { id: "misiones", label: "Misiones", path: "/misiones" },
      { id: "insignias", label: "Insignias", path: "/insignias" },
      {
        id: "donador-insignias",
        label: "Donador · insignias",
        path: "/donadores/{id}/insignias",
        pathParams: [{ name: "id", label: "donadorID", required: true }],
      },
      {
        id: "donador-mision",
        label: "Donador · misión",
        path: "/donadores/{id}/mision",
        pathParams: [{ name: "id", label: "donadorID", required: true }],
      },
      {
        id: "donador-historial",
        label: "Donador · historial categorías",
        path: "/donadores/{id}/historial-categorias",
        pathParams: [{ name: "id", label: "donadorID", required: true }],
      },
    ],
  },
};

export const MODULE_ORDER = ["dye", "donaciones", "logistica", "incentivos"];
