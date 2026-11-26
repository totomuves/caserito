import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { C, F, R, precio, ESTILO } from './tema';
import { useCoordenadas, useLocalesMapa, useTiendasOsm, especialidad, traerRuta, PanelRuta, ANCHO_PANEL } from './MapaComun';
import { caminar } from './Drop';
import { arteHtml } from './arteLocal';
import { brujulaGuardada, guardarBrujula } from './rumbo';
import { conectarCalles, CSS_CALLES } from './callesWeb';
import { CSS_PINES, laminaPinHtml, tamLamina, posterPinHtml, tamPoster } from './pinesWeb';

const L = require('leaflet');
const LLAVE_CARTO = process.env.EXPO_PUBLIC_CARTO_KEY || '';
const RADIO = 200; // 2 cuadras a la redonda

function estilos() {
  if (!document.getElementById('caserito-leaflet')) {
    const css = document.createElement('link');
    css.id = 'caserito-leaflet'; css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
  }
  if (document.getElementById('droper-mini')) return;
  const st = document.createElement('style');
  st.id = 'droper-mini';
  st.textContent = `
    .droper-mini { background:#FFF3B0; }
    .droper-mini .leaflet-tile-pane { filter: sepia(.5) saturate(1.5) hue-rotate(-8deg) brightness(1.02) contrast(1.3); }
    ${CSS_CALLES('.droper-mini.moderno')}
    .droper-mini .leaflet-control-attribution { font-size:8px; background:rgba(255,255,255,.7); }
    .mini-yo { width:18px; height:18px; border-radius:9px; background:#1D4ED8; border:3px solid #fff; box-shadow:0 0 0 8px rgba(29,78,216,.18), 0 1px 4px rgba(0,0,0,.35); box-sizing:border-box; }
  ${CSS_PINES}
  `;
  document.head.appendChild(st);
}

// Centra el mapa en ti; con ruta activa, te corre a la derecha (al centro de lo que no tapa el panel)
function centrarEn(m, punto, zoom, conPanel, rumbo) {
  const z = zoom || m.getZoom() || 17;
  if (!conPanel) { m.setView(punto, z, { animate: false }); return; }
  const visible = m.getSize().x / 1.5; // la caja del mapa mide 150% para poder girar
  const dx = (visible * ANCHO_PANEL) / 2;
  const r = (rumbo * Math.PI) / 180;
  const p = m.project(punto, z).subtract([dx * Math.cos(r), dx * Math.sin(r)]);
  m.setView(m.unproject(p, z), z, { animate: false });
}

export default function MiniMapa({ pos, yo, drops = [], alAbrir = () => {}, alVerMapa = () => {}, t = (a) => a, lugares = [], alAbrirLugar = () => {}, destino = null, alCerrarRuta = () => {}, radio = 200, textoRadio = '2 cuadras', visitando = null }) {
  const [ruta, setRuta] = useState(null);
  const vibrados = useRef(new Set());
  const encuadre = useRef(null);
  const capaRadio = useRef(null);
  const ultimoCentro = useRef(null);
  const rumboRef = useRef(0);
  const ultimaVista = useRef('');
  const capaRuta = useRef(null);
  const caja = useRef(null);
  const mapa = useRef(null);
  const capa = useRef(null);
  const coords = useCoordenadas(drops);
  const locales = useLocalesMapa();
  const tiendas = useTiendasOsm();
  const centro = yo || pos;

  // Brújula: el mapa gira según hacia dónde apunta el teléfono (lo de adelante queda arriba)
  const [brujula, setBrujula] = useState(() => brujulaGuardada());
  const [rumbo, setRumbo] = useState(0);
  const [avisoBrujula, setAvisoBrujula] = useState('');
  rumboRef.current = rumbo;
  useEffect(() => {
    if (!brujula) { setRumbo(0); return; }
    let ultimo = null, mostrado = null, cuadro = 0;
    const leer = (e) => {
      let h = null;
      if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading; // iPhone
      else if (e.absolute && typeof e.alpha === 'number') h = 360 - e.alpha; // Android
      if (h == null) return;
      // Suavizado fuerte (los sensores tiemblan) y sin saltos al cruzar el norte
      if (ultimo == null) ultimo = h;
      const d = ((h - ultimo + 540) % 360) - 180;
      ultimo = ultimo + d * 0.12;
      // Solo movemos el mapa si cambió más de 3°, y como máximo una vez por cuadro
      if (mostrado != null && Math.abs(((ultimo - mostrado + 540) % 360) - 180) < 3) return;
      if (cuadro) return;
      cuadro = requestAnimationFrame(() => { cuadro = 0; mostrado = ultimo; setRumbo(ultimo); });
    };
    window.addEventListener('deviceorientationabsolute', leer, true);
    window.addEventListener('deviceorientation', leer, true);
    return () => { if (cuadro) cancelAnimationFrame(cuadro); window.removeEventListener('deviceorientationabsolute', leer, true); window.removeEventListener('deviceorientation', leer, true); };
  }, [brujula]);
  async function alternarBrujula() {
    setAvisoBrujula('');
    if (brujula) { setBrujula(false); guardarBrujula(false); return; }
    try {
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === 'function') {
        const r = await D.requestPermission(); // iPhone pide permiso
        if (r !== 'granted') { setAvisoBrujula(t('Sin permiso para la brújula', 'No compass permission')); return; }
      } else if (!D) { setAvisoBrujula(t('Este equipo no tiene brújula', 'No compass here')); return; }
      setBrujula(true); guardarBrujula(true);
    } catch (e) { setAvisoBrujula(t('No se pudo activar la brújula', 'Compass failed')); }
  }

  useEffect(() => {
    estilos();
    if (!caja.current || mapa.current || !centro) return;
    caja.current.classList.add('droper-mini');
    if (ESTILO === 'moderno') caja.current.classList.add('moderno');
    const m = L.map(caja.current, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: 'center', touchZoom: 'center', minZoom: 9, maxZoom: 19, zoomSnap: 0, zoomDelta: 0.5, boxZoom: false, keyboard: false, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false });
    L.tileLayer(LLAVE_CARTO
      ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${LLAVE_CARTO}`
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
    m.setView([centro.lat, centro.lng], 17, { animate: false });
    capa.current = L.layerGroup().addTo(m);
    capaRuta.current = L.layerGroup().addTo(m);
    capaRadio.current = L.layerGroup().addTo(m);
    const soltarCalles = ESTILO === 'moderno' ? conectarCalles(L, m) : null;
    mapa.current = m;
    setTimeout(() => m.invalidateSize(), 50);
    return () => { if (soltarCalles) soltarCalles(); m.remove(); mapa.current = null; capa.current = null; };
  }, [!!centro]);

  // La distancia elegida manda: 2 cuadras muestra 2 cuadras a la redonda, 1 km muestra 1 km, etc.
  useEffect(() => {
    const g = capaRadio.current;
    if (!g) return;
    g.clearLayers();
    if (destino || !centro) return;
    L.circle([centro.lat, centro.lng], { radius: radio, color: '#1D4ED8', weight: 1.5, opacity: 0.5, dashArray: '6 6', fill: true, fillOpacity: 0.04, interactive: false }).addTo(g);
  }, [radio, !!mapa.current, !!destino, centro && Math.round(centro.lat * 11132), centro && Math.round(centro.lng * 9300)]);
  useEffect(() => {
    const m = mapa.current;
    if (!m || !centro || destino) return; // con ruta, el zoom lo pone la ruta
    const tam = m.getSize();
    const px = Math.min(tam.x, tam.y) / 1.5 - 24; // lo que se ve de la caja (mide 150% para girar)
    const mPorPx = (2 * radio) / Math.max(px, 60);
    const z = Math.log2((156543.03 * Math.cos((centro.lat * Math.PI) / 180)) / mPorPx);
    const zoom = Math.max(9, Math.min(18, z));
    ultimoCentro.current = [centro.lat, centro.lng];
    // zoom in / zoom out suave hasta que se vea justo la distancia elegida
    const desde = m.getZoom() || 17;
    if (Math.abs(desde - zoom) < 0.05) { centrarEn(m, [centro.lat, centro.lng], zoom, false, 0); return; }
    const inicio = Date.now();
    const dura = Math.min(900, 250 + Math.abs(desde - zoom) * 120);
    let cuadro = 0;
    const paso = () => {
      const k = Math.min(1, (Date.now() - inicio) / dura);
      const suave = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      try { centrarEn(m, [centro.lat, centro.lng], desde + (zoom - desde) * suave, false, 0); } catch (e) { return; }
      if (k < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [radio, !!mapa.current, !!destino, !!centro]);

  // Con ruta el mapa crece un poco: Leaflet tiene que volver a medir
  useEffect(() => { const id = setTimeout(() => { try { mapa.current && mapa.current.invalidateSize(); } catch (e) { /* nada */ } }, 30); return () => clearTimeout(id); }, [!!destino]);

  // Tú siempre al centro: el mapa se mueve contigo (2 cuadras a cada lado)
  // Ruta de "Cómo llegar" también en el mapa del inicio
  useEffect(() => {
    const g = capaRuta.current;
    if (!g) return;
    g.clearLayers();
    if (!destino || !centro) { setRuta(null); encuadre.current = null; return; }
    let vivo = true;
    traerRuta(centro, destino).then((r) => {
      if (!vivo) return;
      setRuta(r);
      const puntos = r ? r.puntos.map((p) => [p.lat, p.lng]) : [[centro.lat, centro.lng], [destino.lat, destino.lng]];
      L.polyline(puntos, { color: '#111111', weight: 9, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(g);
      L.polyline(puntos, { color: '#E30A2F', weight: 5, lineCap: 'round', lineJoin: 'round', dashArray: r ? null : '8 10' }).addTo(g);
      // la primera vez, se aleja para mostrar la ruta completa (después te sigue con ese zoom)
      const clave = `${destino.lat},${destino.lng}`;
      if (encuadre.current !== clave && mapa.current) {
        encuadre.current = clave;
        try {
          const m = mapa.current;
          const tam = m.getSize();
          const radio = Math.min((tam.x / 1.5) * (1 - ANCHO_PANEL) / 2, tam.y / 1.5 / 2) - 18;
          let zoom = 13;
          for (let z = 18; z >= 13; z--) {
            const yoPx = m.project([centro.lat, centro.lng], z);
            if (puntos.every((pt) => m.project(pt, z).distanceTo(yoPx) <= radio)) { zoom = z; break; }
          }
          centrarEn(m, [centro.lat, centro.lng], zoom, true, rumboRef.current);
          ultimoCentro.current = [centro.lat, centro.lng];
        } catch (e) { /* nada */ }
      }
    });
    return () => { vivo = false; };
  }, [destino && destino.lat, destino && destino.lng, centro && Math.round(centro.lat * 3700), centro && Math.round(centro.lng * 3100), !!mapa.current]);
  useEffect(() => {
    const m = mapa.current;
    if (!m || !centro) return;
    // El GPS tiembla unos metros aunque estés quieto: solo recentramos si te moviste de verdad (> 6 m)
    const vista = `${destino ? 'ruta' : 'libre'}:${destino ? Math.round(rumbo / 5) : 0}`;
    const u = ultimoCentro.current;
    if (u && vista === ultimaVista.current && L.latLng(u).distanceTo([centro.lat, centro.lng]) < 6) return;
    ultimoCentro.current = [centro.lat, centro.lng];
    ultimaVista.current = vista;
    centrarEn(m, [centro.lat, centro.lng], null, !!destino, rumbo); // mantiene el zoom que elegiste con los dedos
  }, [centro && centro.lat, centro && centro.lng, !!mapa.current, !!destino, destino ? Math.round(rumbo / 5) : 0]);

  useEffect(() => {
    const m = mapa.current;
    const g = capa.current;
    if (!m || !g || !m.hasLayer(g)) return;
    g.clearLayers();
    tiendas.forEach((t) => L.circleMarker([t.lat, t.lng], { radius: 4, color: '#FFFFFF', weight: 1.5, fillColor: '#8A8A8A', fillOpacity: 1 }).bindTooltip(t.nombre, { direction: 'top' }).addTo(g));
    lugares.forEach((lg) => L.marker([lg.lat, lg.lng], { icon: L.divIcon({ className: '', html: posterPinHtml(lg), ...tamPoster }), zIndexOffset: 900, title: lg.nombre }).on('click', () => alAbrirLugar(lg)).addTo(g));
    const dropDe = {};
    drops.forEach((d) => { if (!dropDe[d.local_id]) dropDe[d.local_id] = d; });
    const puntos = locales.map((l) => ({ l, p: l.punto }));
    drops.forEach((d) => { if (!locales.some((l) => l.id === d.local_id) && coords[d.local_id]) puntos.push({ l: { id: d.local_id, nombre: d.local_nombre, categoria: d.categoria }, p: coords[d.local_id] }); });
    puntos.forEach(({ l, p }) => {
      const d = dropDe[l.id];
      const tintinea = !!(d && yo && Math.hypot((p.lat - yo.lat) * 111320, (p.lng - yo.lng) * 93000) <= 20);
      if (tintinea && !vibrados.current.has(d.drop_id)) { vibrados.current.add(d.drop_id); try { navigator.vibrate && navigator.vibrate([120, 80, 120, 80, 200]); } catch (e) { /* sin vibración */ } }
      L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: laminaPinHtml(l, d, tintinea), ...tamLamina(d) }), zIndexOffset: d ? (tintinea ? 900 : 500) : 0 })
        .on('click', () => (d ? alAbrir(d) : alVerMapa())).addTo(g);
    });
  }, [drops, coords, locales, tiendas, lugares, !!mapa.current, yo && Math.round(yo.lat * 11132), yo && Math.round(yo.lng * 9300)]);

  return (
    <View style={{ marginHorizontal: 16, marginTop: 14, height: destino ? 330 : 300, borderRadius: R(20), overflow: 'hidden', borderWidth: 1, borderColor: C.borde, backgroundColor: ESTILO === 'moderno' ? '#FFFFFF' : '#FFF3B0' }}>
      <div ref={caja} style={{ position: 'absolute', left: '-25%', top: '-25%', width: '150%', height: '150%', transform: `rotate(${-rumbo}deg)`, transition: 'transform .3s ease-out', '--contra': `${rumbo}deg` }} />
      <Pressable onPress={alternarBrujula} accessibilityRole="switch" accessibilityState={{ checked: brujula }} accessibilityLabel={t('Brújula: girar el mapa con el teléfono', 'Compass: rotate the map')}
        style={{ position: 'absolute', left: destino ? `${ANCHO_PANEL * 100 + 3}%` : 10, bottom: 10, height: 34, paddingHorizontal: 12, borderRadius: 16, backgroundColor: brujula ? C.amarillo : C.papel, borderWidth: 1, borderColor: C.borde, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 500 }}>
        <Text style={{ fontSize: 14, transform: [{ rotate: `${-rumbo}deg` }] }}>🧭</Text>
        {destino && !avisoBrujula ? null : <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>{avisoBrujula || (brujula ? t('Brújula activa', 'Compass on') : t('Brújula', 'Compass'))}</Text>}
      </Pressable>
      {yo ? <div className="mini-yo" style={{ position: 'absolute', left: destino ? `${50 + ANCHO_PANEL * 50}%` : '50%', top: '50%', marginLeft: -9, marginTop: -9, zIndex: 450, pointerEvents: 'none' }} /> : null}
      {destino ? null : <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: C.papel, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.borde, zIndex: 500 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>{yo ? (yo.precision > 80 ? t(`Ubicación aproximada (±${yo.precision} m)`, `Approx. location (±${yo.precision} m)`) : t(`Tú · ${textoRadio}${yo.precision ? ` · ±${yo.precision} m` : ''}`, `You · ${textoRadio}`)) : visitando ? t(`Mirando ${visitando}`, `Viewing ${visitando}`) : t('Activa tu ubicación', 'Turn on location')}</Text>
      </View>}
      {destino ? <PanelRuta destino={destino} ruta={ruta} yo={centro} alCerrar={alCerrarRuta} alExterno={() => caminar(destino)} /> : null}
      <Pressable onPress={alVerMapa} accessibilityRole="button" accessibilityLabel={t('Abrir mapa', 'Open map')}
        style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: C.negro, borderRadius: 16, paddingHorizontal: 14, height: 34, justifyContent: 'center', zIndex: 500 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>{t('Ver mapa →', 'Map →')}</Text>
      </Pressable>
    </View>
  );
}
