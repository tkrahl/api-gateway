// Seeds enlazados a requisitos de la Entrega 4 (ids internos — no se muestran en UI).

export async function loadAllSeeds() {
  const mod = await import("./all-runners.js?v=" + Date.now());
  const byId = {};
  for (const [id, runner] of Object.entries(mod.RUNNERS)) {
    byId[id] = {
      id,
      meta: { id, totalSteps: runner.meta.totalSteps, manualOnly: Boolean(runner.meta.manualOnly) },
      run: runner.run,
    };
  }
  return { list: Object.values(byId), byId };
}
