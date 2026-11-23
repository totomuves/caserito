// En la web: avisos con las notificaciones del navegador (Android/computador; en iPhone, solo si Droper
// está agregada a la pantalla de inicio). No hay push con la app cerrada: avisa mientras está abierta.
const CLAVE_DESCARTADO = 'droper_avisos_web_descartado';
const hay = () => typeof window !== 'undefined' && 'Notification' in window;
export const avisosDisponibles = hay();
export async function estadoAvisos() {
  if (!hay()) return 'descartado';
  if (Notification.permission === 'granted') return 'activo';
  if (Notification.permission === 'denied') return 'bloqueado';
  try { if (localStorage.getItem(CLAVE_DESCARTADO)) return 'descartado'; } catch (e) { /* nada */ }
  return 'pendiente';
}
export async function descartarAvisos() { try { localStorage.setItem(CLAVE_DESCARTADO, '1'); } catch (e) { /* nada */ } }
export async function activarAvisos({ preguntar }) {
  if (!hay()) return { ok: false, motivo: 'no_soportado' };
  let p = Notification.permission;
  if (p !== 'granted' && preguntar) { try { p = await Notification.requestPermission(); } catch (e) { p = 'denied'; } }
  if (p !== 'granted') return { ok: false, motivo: p === 'denied' ? 'bloqueado' : 'permiso' };
  return { ok: true };
}
export async function ubicarAviso() {}
export function alTocarAviso() { return () => {}; }
export async function avisarBarrio() {}

function mostrar(titulo, cuerpo) {
  if (!hay() || Notification.permission !== 'granted') return;
  try { new Notification(titulo, { body: cuerpo, icon: '/apple-touch-icon.png' }); } catch (e) {
    // Android Chrome exige pasar por el service worker
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then((r) => r.showNotification(titulo, { body: cuerpo, icon: '/apple-touch-icon.png' })).catch(() => {});
  }
}
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || '') || d; } catch (e) { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } };

export async function avisarPuerta(drops) {
  const vistos = leer('droper_puerta_web', []);
  const nuevo = drops.find((d) => d.dentro_del_radio && d.quedan > 0 && !vistos.includes(d.drop_id));
  if (!nuevo) return;
  guardar('droper_puerta_web', [...vistos, nuevo.drop_id].slice(-200));
  mostrar(`¡Estás en la puerta de ${nuevo.local_nombre}!`, `Tu QR para ${nuevo.titulo} ya está listo · quedan ${nuevo.quedan}.`);
}
export async function avisarNuevos(drops, tur) {
  const e = { vistos: [], dia: '', n: 0, ...leer('droper_nuevos_web', {}) };
  const hoy = new Date().toISOString().slice(0, 10);
  if (e.dia !== hoy) { e.dia = hoy; e.n = 0; }
  const primeraVez = !e.vistos.length;
  const nuevos = drops.filter((d) => !e.vistos.includes(d.drop_id));
  e.vistos = [...e.vistos, ...nuevos.map((d) => d.drop_id)].slice(-300);
  const h = new Date().getHours();
  if (primeraVez || !nuevos.length || h < 9 || h >= 22 || e.n >= 3) { guardar('droper_nuevos_web', e); return; }
  e.n += 1; guardar('droper_nuevos_web', e);
  const d = [...nuevos].sort((a, b) => a.cuadras - b.cuadras)[0];
  mostrar(`🔥 Nuevo drop ${d.cuadras <= 1 ? 'aquí al lado' : `a ${d.cuadras} cuadras`}`, `${d.local_nombre} · ${d.titulo}${d.quedan ? ` · quedan ${d.quedan}` : ''}`);
}
