import { useCallback, useEffect, useState } from 'react';
import { Platform, Share, Linking } from 'react-native';
import { supabase } from './supabase';

// Lo que pasa con cada drop (para las estadísticas del local). Una vez por persona: la base no repite.
const enviados = new Set();
export function registrar(dropId, tipo) {
  if (!dropId) return;
  const k = `${dropId}:${tipo}`;
  if (enviados.has(k)) return;
  enviados.add(k);
  supabase.rpc('registrar_evento', { p_drop: dropId, p_tipo: tipo }).then(() => {}, () => {});
}

// Locales que sigues (♥): te avisamos cuando suelten un drop
export function useSeguidos(usuario) {
  const [seguidos, setSeguidos] = useState(() => new Set());
  useEffect(() => {
    if (!usuario) return;
    supabase.from('seguidos').select('local_id').then(({ data, error }) => {
      if (!error && data) setSeguidos(new Set(data.map((x) => x.local_id)));
    });
  }, [usuario && usuario.id]);
  const alternar = useCallback((localId) => {
    setSeguidos((s) => {
      const n = new Set(s);
      const seguir = !n.has(localId);
      if (seguir) n.add(localId); else n.delete(localId);
      supabase.rpc('seguir_local', { p_local: localId, p_seguir: seguir }).then(({ error }) => {
        if (error) setSeguidos((x) => { const y = new Set(x); if (seguir) y.delete(localId); else y.add(localId); return y; });
      });
      return n;
    });
  }, []);
  return { seguidos, alternar };
}

// Link que abre el drop directo (o la app web si no la tiene)
export const linkDrop = (d) => `https://dropper.site/?d=${d.drop_id}`;

// Compartir: menú del teléfono; en el computador, WhatsApp directo
export async function compartirDrop(d, t = (a) => a) {
  const texto = t(`${d.local_nombre} soltó un drop en Dropper: ${d.frase || d.titulo}`, `${d.local_nombre} dropped a deal on Dropper: ${d.frase || d.titulo}`);
  const url = linkDrop(d);
  registrar(d.drop_id, 'compartir');
  if (Platform.OS === 'web') {
    try {
      if (navigator.share) { await navigator.share({ text: texto, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`).catch(() => {});
    return;
  }
  Share.share({ message: `${texto} ${url}` }).catch(() => {});
}
