import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { C, F, R, precio, ESTILO } from './tema';
import { useCoordenadas, useLocalesMapa, useTiendasOsm, especialidad } from './MapaComun';
import { arteHtml } from './arteLocal';
import { conectarCalles, CSS_CALLES } from './callesWeb';
import { lugarHtml } from './Plano';

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
    .droper-mini .mini-lam { transform: rotate(var(--contra, 0deg)); transition: transform .3s ease-out; will-change: transform; }
    .lugar-pin { display:flex; flex-direction:column; align-items:center; cursor:pointer; }
    .lugar-carta { background:#111; color:#fff; border-radius:12px; padding:5px 9px; box-shadow:0 6px 14px rgba(17,17,17,.3); font-family:Archivo, sans-serif; }
    .lugar-carta i { display:block; font-style:normal; font:800 8px Archivo, sans-serif; letter-spacing:1.5px; color:#FFD100; }
    .lugar-carta b { display:block; font:800 12px Archivo, sans-serif; white-space:nowrap; }
    .lugar-carta span { display:block; font:600 9px Archivo, sans-serif; color:#ddd; white-space:nowrap; }
    .lugar-punta { width:0; height:0; border-left:7px solid transparent; border-right:7px solid transparent; border-top:9px solid #111; }
    .mini-lam { display:flex; flex-direction:column; align-items:center; cursor:pointer; }
    .mini-lam .carta { position:relative; width:40px; height:40px; box-sizing:border-box; overflow:hidden; background:#fff; border:1px solid #D9D9DF; border-radius:8px; padding:2px; box-shadow:0 3px 8px rgba(17,17,17,.18); }
    .mini-lam.con-drop .carta { border:2px solid #111; }
    .mini-lam .nom { font:800 8px Archivo, sans-serif; color:#111; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:40px; margin-top:1px; }
    .mini-lam .precio { font:800 10px Archivo, sans-serif; background:#FFD100; color:#111; border-radius:8px; padding:1px 6px; margin-bottom:2px; box-shadow:0 2px 5px rgba(17,17,17,.2); white-space:nowrap; }
    .mini-lam .punta { width:6px; height:6px; border-radius:3px; background:#111; margin-top:2px; }
  `;
  document.head.appendChild(st);
}

export default function MiniMapa({ pos, yo, drops = [], alAbrir = () => {}, alVerMapa = () => {}, t = (a) => a, lugares = [], alAbrirLugar = () => {} }) {
  const caja = useRef(null);
  const mapa = useRef(null);
  const capa = useRef(null);
  const coords = useCoordenadas(drops);
  const locales = useLocalesMapa();
  const tiendas = useTiendasOsm();
  const centro = yo || pos;

  // Brújula: el mapa gira según hacia dónde apunta el teléfono (lo de adelante queda arriba)
  const [brujula, setBrujula] = useState(false);
  const [rumbo, setRumbo] = useState(0);
  const [avisoBrujula, setAvisoBrujula] = useState('');
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
    if (brujula) { setBrujula(false); return; }
    try {
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === 'function') {
        const r = await D.requestPermission(); // iPhone pide permiso
        if (r !== 'granted') { setAvisoBrujula(t('Sin permiso para la brújula', 'No compass permission')); return; }
      } else if (!D) { setAvisoBrujula(t('Este equipo no tiene brújula', 'No compass here')); return; }
      setBrujula(true);
    } catch (e) { setAvisoBrujula(t('No se pudo activar la brújula', 'Compass failed')); }
  }

  useEffect(() => {
    estilos();
    if (!caja.current || mapa.current || !centro) return;
    caja.current.classList.add('droper-mini');
    if (ESTILO === 'moderno') caja.current.classList.add('moderno');
    const m = L.map(caja.current, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: 'center', touchZoom: 'center', minZoom: 14, maxZoom: 19, boxZoom: false, keyboard: false, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false });
    L.tileLayer(LLAVE_CARTO
      ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${LLAVE_CARTO}`
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
    m.setView([centro.lat, centro.lng], 17, { animate: false });
    capa.current = L.layerGroup().addTo(m);
    const soltarCalles = ESTILO === 'moderno' ? conectarCalles(L, m) : null;
    mapa.current = m;
    setTimeout(() => m.invalidateSize(), 50);
    return () => { if (soltarCalles) soltarCalles(); m.remove(); mapa.current = null; capa.current = null; };
  }, [!!centro]);

  // Tú siempre al centro: el mapa se mueve contigo (2 cuadras a cada lado)
  const ultimoCentro = useRef(null);
  useEffect(() => {
    const m = mapa.current;
    if (!m || !centro) return;
    // El GPS tiembla unos metros aunque estés quieto: solo recentramos si te moviste de verdad (> 6 m)
    const u = ultimoCentro.current;
    if (u && L.latLng(u).distanceTo([centro.lat, centro.lng]) < 6) return;
    ultimoCentro.current = [centro.lat, centro.lng];
    m.setView([centro.lat, centro.lng], m.getZoom() || 17, { animate: false }); // mantiene el zoom que elegiste con los dedos
  }, [centro && centro.lat, centro && centro.lng, !!mapa.current]);

  useEffect(() => {
    const m = mapa.current;
    const g = capa.current;
    if (!m || !g || !m.hasLayer(g)) return;
    g.clearLayers();
    tiendas.forEach((t) => L.circleMarker([t.lat, t.lng], { radius: 4, color: '#FFFFFF', weight: 1.5, fillColor: '#8A8A8A', fillOpacity: 1 }).bindTooltip(t.nombre, { direction: 'top' }).addTo(g));
    lugares.forEach((lg) => L.marker([lg.lat, lg.lng], { icon: L.divIcon({ className: '', html: `<div style="transform:rotate(var(--contra,0deg))">${lugarHtml(lg)}</div>`, iconSize: [150, 70], iconAnchor: [75, 68] }), zIndexOffset: 900 }).on('click', () => alAbrirLugar(lg)).addTo(g));
    const dropDe = {};
    drops.forEach((d) => { if (!dropDe[d.local_id]) dropDe[d.local_id] = d; });
    const puntos = locales.map((l) => ({ l, p: l.punto }));
    drops.forEach((d) => { if (!locales.some((l) => l.id === d.local_id) && coords[d.local_id]) puntos.push({ l: { id: d.local_id, nombre: d.local_nombre, categoria: d.categoria }, p: coords[d.local_id] }); });
    puntos.forEach(({ l, p }) => {
      const d = dropDe[l.id];
      const esc = (x) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const html = `<div class="mini-lam${d ? ' con-drop' : ''}" title="${esc(l.nombre)} · ${esc(especialidad(l))}">`
        + (d ? `<div class="precio">${d.tipo === 'sorpresa' ? '¿?' : esc(precio(d.precio) || 'DROP')}</div>` : '')
        + `<div class="carta">${arteHtml(l.id, l.categoria, l.nombre)}</div><div class="nom">${esc(l.nombre)}</div><div class="punta"></div></div>`;
      L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html, iconSize: [46, d ? 78 : 62], iconAnchor: [23, d ? 76 : 60] }), zIndexOffset: d ? 500 : 0 })
        .on('click', () => (d ? alAbrir(d) : alVerMapa())).addTo(g);
    });
  }, [drops, coords, locales, tiendas, lugares, !!mapa.current]);

  return (
    <View style={{ marginHorizontal: 16, marginTop: 14, height: 300, borderRadius: R(20), overflow: 'hidden', borderWidth: 1, borderColor: C.borde, backgroundColor: ESTILO === 'moderno' ? '#FFFFFF' : '#FFF3B0' }}>
      <div ref={caja} style={{ position: 'absolute', left: '-25%', top: '-25%', width: '150%', height: '150%', transform: `rotate(${-rumbo}deg)`, transition: 'transform .3s ease-out', '--contra': `${rumbo}deg` }} />
      <Pressable onPress={alternarBrujula} accessibilityRole="switch" accessibilityState={{ checked: brujula }} accessibilityLabel={t('Brújula: girar el mapa con el teléfono', 'Compass: rotate the map')}
        style={{ position: 'absolute', left: 10, bottom: 10, height: 34, paddingHorizontal: 12, borderRadius: 16, backgroundColor: brujula ? C.amarillo : C.papel, borderWidth: 1, borderColor: C.borde, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 500 }}>
        <Text style={{ fontSize: 14, transform: [{ rotate: `${-rumbo}deg` }] }}>🧭</Text>
        <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>{avisoBrujula || (brujula ? t('Brújula activa', 'Compass on') : t('Brújula', 'Compass'))}</Text>
      </Pressable>
      {yo ? <div className="mini-yo" style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -9, marginTop: -9, zIndex: 450, pointerEvents: 'none' }} /> : null}
      <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: C.papel, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.borde, zIndex: 500 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>{yo ? t('Tú · 2 cuadras a la redonda', 'You · 2 blocks around') : t('Activa tu ubicación', 'Turn on location')}</Text>
      </View>
      <Pressable onPress={alVerMapa} accessibilityRole="button" accessibilityLabel={t('Abrir mapa', 'Open map')}
        style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: C.negro, borderRadius: 16, paddingHorizontal: 14, height: 34, justifyContent: 'center', zIndex: 500 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>{t('Ver mapa →', 'Map →')}</Text>
      </Pressable>
    </View>
  );
}
