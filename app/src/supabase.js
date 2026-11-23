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

// Errores de conexión (Safari: "Load failed", Chrome: "Failed to fetch", app: "Network request failed")
export function esDeRed(error) {
  const m = (error && (error.message || String(error))) || '';
  return /Load failed|Failed to fetch|Network request failed|NetworkError|network connection was lost|The Internet connection appears to be offline|fetch failed|aborted/i.test(m);
}

export function explicar(error) {
  const m = (error && (error.message || String(error))) || 'Error desconocido';
  if (/Could not find the function|function .* does not exist|PGRST202/i.test(m)) return 'Esta parte de Dropper se está actualizando. Prueba en un rato.';
  if (/schema must be one of|Invalid schema/i.test(m)) return 'Falta exponer el schema "caserito" en Supabase (Settings → API → Exposed schemas).';
  if (/Anonymous sign-ins are disabled/i.test(m)) return 'Falta activar el ingreso anónimo en Supabase (Authentication → Sign In / Providers → Allow anonymous sign-ins).';
  if (/rate limit|over_email_send_rate_limit|you can only request this/i.test(m)) return 'Mandamos varios correos seguidos. Espera unos minutos e inténtalo de nuevo.';
  if (/Token has expired or is invalid|otp_expired|invalid.*otp/i.test(m)) return 'El código no es válido o ya venció. Pide uno nuevo.';
  if (/already been registered|email_exists|already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Usa "¿Ya tienes cuenta? Entra aquí".';
  if (/Signups not allowed for otp|otp_disabled|User not found/i.test(m)) return 'No hay una cuenta con ese correo. Usa "Guardar mi cuenta".';
  if (/Email address .* is invalid|invalid email/i.test(m)) return 'Ese correo no parece válido.';
  if (/Error sending|sending (confirmation|magic link|email change)/i.test(m)) return 'No pudimos mandar el correo. Inténtalo en un rato.';
  if (esDeRed(error)) return 'Sin conexión. Revisa internet e inténtalo de nuevo.';
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
