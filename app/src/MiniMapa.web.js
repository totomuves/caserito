import React, { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { C, F, R, precio, ESTILO } from './tema';
import { useCoordenadas, useLocalesMapa, useTiendasOsm, especialidad } from './MapaComun';
import { arteHtml } from './arteLocal';
import { conectarCalles, CSS_CALLES } from './callesWeb';

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
    .mini-lam { display:flex; flex-direction:column; align-items:center; cursor:pointer; }
    .mini-lam .carta { position:relative; width:40px; height:40px; box-sizing:border-box; overflow:hidden; background:#fff; border:1px solid #D9D9DF; border-radius:8px; padding:2px; box-shadow:0 3px 8px rgba(17,17,17,.18); }
    .mini-lam.con-drop .carta { border:2px solid #111; }
    .mini-lam .nom { font:800 8px Archivo, sans-serif; color:#111; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:40px; margin-top:1px; }
    .mini-lam .precio { font:800 10px Archivo, sans-serif; background:#FFD100; color:#111; border-radius:8px; padding:1px 6px; margin-bottom:2px; box-shadow:0 2px 5px rgba(17,17,17,.2); white-space:nowrap; }
    .mini-lam .punta { width:6px; height:6px; border-radius:3px; background:#111; margin-top:2px; }
  `;
  document.head.appendChild(st);
}

export default function MiniMapa({ pos, yo, drops = [], alAbrir = () => {}, alVerMapa = () => {}, t = (a) => a }) {
  const caja = useRef(null);
  const mapa = useRef(null);
  const capa = useRef(null);
  const coords = useCoordenadas(drops);
  const locales = useLocalesMapa();
  const tiendas = useTiendasOsm();
  const centro = yo || pos;

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
  useEffect(() => {
    const m = mapa.current;
    if (!m || !centro) return;
    m.setView([centro.lat, centro.lng], m.getZoom() || 17, { animate: false }); // mantiene el zoom que elegiste con los dedos
  }, [centro && centro.lat, centro && centro.lng, !!mapa.current]);

  useEffect(() => {
    const m = mapa.current;
    const g = capa.current;
    if (!m || !g || !m.hasLayer(g)) return;
    g.clearLayers();
    tiendas.forEach((t) => L.circleMarker([t.lat, t.lng], { radius: 4, color: '#FFFFFF', weight: 1.5, fillColor: '#8A8A8A', fillOpacity: 1 }).bindTooltip(t.nombre, { direction: 'top' }).addTo(g));
    const dropDe = {};
    drops.forEach((d) => { if (!dropDe[d.local_id]) dropDe[d.local_id] = d; });
    const puntos = locales.map((l) => ({ l, p: l.punto }));
    drops.forEach((d) => { if (!locales.some((l) => l.id === d.local_id) && coords[d.local_id]) puntos.push({ l: { id: d.local_id, nombre: d.local_nombre, categoria: d.categoria }, p: coords[d.local_id] }); });
    puntos.forEach(({ l, p }) => {
      const d = dropDe[l.id];
      const esc = (x) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const html = `<div class="mini-lam${d ? ' con-drop' : ''}" title="${esc(l.nombre)} · ${esc(especialidad(l))}">`
        + (d ? `<div class="precio">${d.tipo === 'sorpresa' ? '¿?' : esc(precio(d.precio) || 'DROP')}</div>` : '')
        + `<div class="carta">${arteHtml(l.id, l.categoria)}</div><div class="nom">${esc(l.nombre)}</div><div class="punta"></div></div>`;
      L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html, iconSize: [46, d ? 78 : 62], iconAnchor: [23, d ? 76 : 60] }), zIndexOffset: d ? 500 : 0 })
        .on('click', () => (d ? alAbrir(d) : alVerMapa())).addTo(g);
    });
  }, [drops, coords, locales, tiendas, !!mapa.current]);

  return (
    <View style={{ marginHorizontal: 16, marginTop: 14, height: 300, borderRadius: R(20), overflow: 'hidden', borderWidth: 1, borderColor: C.borde, backgroundColor: ESTILO === 'moderno' ? '#FFFFFF' : '#FFF3B0' }}>
      <div ref={caja} style={{ position: 'absolute', inset: 0 }} />
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
