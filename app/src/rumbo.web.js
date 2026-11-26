import { useEffect, useState } from 'react';

// Rumbo del teléfono (brújula) en el navegador. activo=false → 0.
export async function pedirPermisoRumbo() {
  const D = typeof window !== 'undefined' && window.DeviceOrientationEvent;
  if (!D) return false;
  if (typeof D.requestPermission === 'function') {
    try { return (await D.requestPermission()) === 'granted'; } catch (e) { return false; }
  }
  return true;
}
export function useRumbo(activo) {
  const [rumbo, setRumbo] = useState(0);
  useEffect(() => {
    if (!activo) { setRumbo(0); return; }
    let ultimo = null, mostrado = null, cuadro = 0;
    const leer = (e) => {
      let h = null;
      if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
      else if (e.absolute && typeof e.alpha === 'number') h = 360 - e.alpha;
      if (h == null) return;
      if (ultimo == null) ultimo = h;
      ultimo += (((h - ultimo + 540) % 360) - 180) * 0.12;
      if (mostrado != null && Math.abs(((ultimo - mostrado + 540) % 360) - 180) < 3) return;
      if (cuadro) return;
      cuadro = requestAnimationFrame(() => { cuadro = 0; mostrado = ultimo; setRumbo(ultimo); });
    };
    window.addEventListener('deviceorientationabsolute', leer, true);
    window.addEventListener('deviceorientation', leer, true);
    return () => { if (cuadro) cancelAnimationFrame(cuadro); window.removeEventListener('deviceorientationabsolute', leer, true); window.removeEventListener('deviceorientation', leer, true); };
  }, [activo]);
  return rumbo;
}

// Brújula encendida por defecto (salvo que la apagues: se recuerda)
export function brujulaGuardada() { try { return localStorage.getItem('dropper_brujula') !== 'no'; } catch (e) { return true; } }
export function guardarBrujula(si) { try { localStorage.setItem('dropper_brujula', si ? 'si' : 'no'); } catch (e) { /* nada */ } }
// En iPhone el permiso de la brújula solo se puede pedir con un toque: lo pedimos en el primer toque a la pantalla
if (typeof window !== 'undefined' && window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function' && brujulaGuardada()) {
  const pedir = () => { window.removeEventListener('pointerup', pedir, true); window.DeviceOrientationEvent.requestPermission().catch(() => {}); };
  window.addEventListener('pointerup', pedir, true);
}
