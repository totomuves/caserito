import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// La llave "publishable" está hecha para ir en la app. Nunca poner aquí la service_role/secret.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mkmcfeezspgjdygustpd.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_GVVUGz3E7NBQ0J37p0IjLA_p3KKNY_y';

// Todo Caserito vive en el schema "caserito".
export const supabase = createClient(url, key, {
  db: { schema: 'caserito' },
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

export function explicar(error) {
  const m = (error && (error.message || String(error))) || 'Error desconocido';
  if (/schema must be one of|Invalid schema/i.test(m)) return 'Falta exponer el schema "caserito" en Supabase (Settings → API → Exposed schemas).';
  if (/Anonymous sign-ins are disabled/i.test(m)) return 'Falta activar el ingreso anónimo en Supabase (Authentication → Sign In / Providers → Allow anonymous sign-ins).';
  if (/Network request failed/i.test(m)) return 'Sin conexión. Revisa internet e inténtalo de nuevo.';
  return m;
}

// Lee un punto PostGIS (EWKB en hex, como lo entrega la API) → { lat, lng }
export function leerPunto(hex) {
  if (!hex || typeof hex !== 'string' || hex.length < 50) return null;
  const bytes = new Uint8Array(hex.match(/../g).map((b) => parseInt(b, 16)));
  const v = new DataView(bytes.buffer);
  const le = bytes[0] === 1;
  const tipo = v.getUint32(1, le);
  let off = 5;
  if (tipo & 0x20000000) off += 4; // trae SRID
  return { lng: v.getFloat64(off, le), lat: v.getFloat64(off + 8, le) };
}
