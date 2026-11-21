// En la web no hay notificaciones push (solo en la app del teléfono)
export const avisosDisponibles = false;
export async function estadoAvisos() { return 'descartado'; }
export async function descartarAvisos() {}
export async function activarAvisos() { return { ok: false, motivo: 'no_soportado' }; }
export async function ubicarAviso() {}
export function alTocarAviso() { return () => {}; }
export async function avisarPuerta() {}
export async function avisarBarrio() {}
