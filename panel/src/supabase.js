import { createClient } from '@supabase/supabase-js';

// La llave "publishable" está hecha para ir en el cliente. Nunca poner aquí la service_role/secret.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://mkmcfeezspgjdygustpd.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_GVVUGz3E7NBQ0J37p0IjLA_p3KKNY_y';

// Todo Caserito vive en el schema "caserito" (no toca las tablas de la otra app del proyecto).
export const supabase = createClient(url, key, { db: { schema: 'caserito' } });

export function explicar(error) {
  const m = (error && (error.message || String(error))) || 'Error desconocido';
  if (/schema must be one of|Invalid schema/i.test(m)) {
    return 'Falta exponer el schema "caserito": Supabase → Settings → API → Exposed schemas → agregar caserito.';
  }
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisa internet e inténtalo de nuevo.';
  return m;
}
