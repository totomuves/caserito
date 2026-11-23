import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

// Rumbo del teléfono (brújula) en la app. activo=false → 0.
export async function pedirPermisoRumbo() { return true; }
export function useRumbo(activo) {
  const [rumbo, setRumbo] = useState(0);
  useEffect(() => {
    if (!activo) { setRumbo(0); return; }
    let sub, ultimo = null, mostrado = null;
    Location.watchHeadingAsync((h) => {
      const v = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      if (ultimo == null) ultimo = v;
      ultimo += (((v - ultimo + 540) % 360) - 180) * 0.25;
      if (mostrado != null && Math.abs(((ultimo - mostrado + 540) % 360) - 180) < 3) return;
      mostrado = ultimo; setRumbo(ultimo);
    }).then((s) => { sub = s; }).catch(() => {});
    return () => sub && sub.remove();
  }, [activo]);
  return rumbo;
}
