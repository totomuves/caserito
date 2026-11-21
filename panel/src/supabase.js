import { createClient } from '@supabase/supabase-js';

// La llave "publishable" está hecha para ir en el cliente. Nunca poner aquí la service_role/secret.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://mkmcfeezspgjdygustpd.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_GVVUGz3E7NBQ0J37p0IjLA_p3KKNY_y';

// Todo Caserito vive en el schema "caserito" (no toca las tablas de la otra app del proyecto).
export const supabase = createClient(url, key, { db: { schema: 'caserito' } });

export function explicar(error) {
  const m = (error && (error.message || String(error))) || 'Error desconocido';
  if (/Could not find the function|function .* does not exist|PGRST202/i.test(m)) {
    return 'Falta actualizar la base de datos: corre en Supabase los SQL pendientes (SQL Editor → Run).';
  }
  if (/schema must be one of|Invalid schema/i.test(m)) {
    return 'Falta exponer el schema "caserito": Supabase → Settings → API → Exposed schemas → agregar caserito.';
  }
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisa internet e inténtalo de nuevo.';
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña no coinciden. Si es tu primera vez, toca "¿Primera vez? Inscribe tu local" para crear la cuenta.';
  if (/Email not confirmed/i.test(m)) return 'Falta confirmar tu correo: abre el mail de confirmación que te llegó y vuelve a entrar.';
  if (/User already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Toca "Ya tengo cuenta" y entra.';
  if (/Password should be/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit/i.test(m)) return 'Muchos intentos seguidos. Espera unos minutos y vuelve a probar.';
  return m;
}

// Código de invitación que viene en el link (?invitacion=XXXX); se guarda hasta que el local se inscribe
const CLAVE_INV = 'caserito_invitacion';
export function leerInvitacion() {
  try {
    const u = new URL(window.location.href);
    const c = u.searchParams.get('invitacion');
    if (c) {
      localStorage.setItem(CLAVE_INV, c.trim().toUpperCase());
      u.searchParams.delete('invitacion');
      window.history.replaceState({}, '', u.pathname + u.search + u.hash);
    }
    return localStorage.getItem(CLAVE_INV);
  } catch { return null; }
}
// Link para sumarse al equipo de un local (?equipo=XXXX)
const CLAVE_EQ = 'caserito_equipo';
export function leerInvitacionEquipo() {
  try {
    const u = new URL(window.location.href);
    const c = u.searchParams.get('equipo');
    if (c) {
      localStorage.setItem(CLAVE_EQ, c.trim().toUpperCase());
      u.searchParams.delete('equipo');
      window.history.replaceState({}, '', u.pathname + u.search + u.hash);
    }
    return localStorage.getItem(CLAVE_EQ);
  } catch { return null; }
}
export function olvidarInvitacionEquipo() {
  try { localStorage.removeItem(CLAVE_EQ); } catch { /* nada */ }
}
export function olvidarInvitacion() {
  try { localStorage.removeItem(CLAVE_INV); } catch { /* nada */ }
}

// Link para recibir un local que creó Caserito (?entrega=XXXX)
const CLAVE_ENT = 'caserito_entrega';
export function leerEntrega() {
  try {
    const u = new URL(window.location.href);
    const c = u.searchParams.get('entrega');
    if (c) {
      localStorage.setItem(CLAVE_ENT, c.trim().toUpperCase());
      u.searchParams.delete('entrega');
      window.history.replaceState({}, '', u.pathname + u.search + u.hash);
    }
    return localStorage.getItem(CLAVE_ENT);
  } catch { return null; }
}
export function olvidarEntrega() {
  try { localStorage.removeItem(CLAVE_ENT); } catch { /* nada */ }
}
