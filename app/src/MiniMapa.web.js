import React, { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { C, F, R, precio } from './tema';
import { figuraPin, RUTA_PIN, useCoordenadas } from './MapaComun';

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
    .droper-mini { background:#EEF0F3; }
    .droper-mini .leaflet-tile-pane { filter: grayscale(.85) brightness(1.06) contrast(.95); }
    .droper-mini .leaflet-control-attribution { font-size:8px; background:rgba(255,255,255,.7); }
    .mini-yo { width:18px; height:18px; border-radius:9px; background:#1D4ED8; border:3px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.35); box-sizing:border-box; }
    .mini-pin { display:flex; flex-direction:column; align-items:center; cursor:pointer; }
    .mini-pin b { font:800 11px Archivo, sans-serif; background:#fff; color:#111; border:1px solid #E4E4E9; border-radius:10px; padding:2px 7px; box-shadow:0 2px 6px rgba(17,17,17,.15); white-space:nowrap; margin-bottom:2px; }
    .mini-pin svg { width:18px; height:18px; }
  `;
  document.head.appendChild(st);
}

export default function MiniMapa({ pos, yo, drops = [], alAbrir = () => {}, alVerMapa = () => {}, t = (a) => a }) {
  const caja = useRef(null);
  const mapa = useRef(null);
  const capa = useRef(null);
  const coords = useCoordenadas(drops);
  const centro = yo || pos;

  useEffect(() => {
    estilos();
    if (!caja.current || mapa.current || !centro) return;
    caja.current.classList.add('droper-mini');
    const m = L.map(caja.current, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false });
    L.tileLayer(LLAVE_CARTO
      ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${LLAVE_CARTO}`
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
    capa.current = L.layerGroup().addTo(m);
    mapa.current = m;
    setTimeout(() => m.invalidateSize(), 50);
    return () => { m.remove(); mapa.current = null; };
  }, [!!centro]);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !centro) return;
    const g = capa.current; g.clearLayers();
    const circulo = L.circle([centro.lat, centro.lng], { radius: RADIO, color: '#111', weight: 1.5, dashArray: '6 6', fillColor: C.amarillo, fillOpacity: 0.16 }).addTo(g);
    m.fitBounds(circulo.getBounds(), { padding: [8, 8] });
    if (yo) L.marker([yo.lat, yo.lng], { icon: L.divIcon({ className: '', html: '<div class="mini-yo"></div>', iconSize: [18, 18] }), interactive: false, zIndexOffset: 1000 }).addTo(g);
    drops.forEach((d) => {
      const p = coords[d.local_id];
      if (!p) return;
      const fp = figuraPin(d);
      const html = `<div class="mini-pin"><b>${d.tipo === 'sorpresa' ? '¿?' : (precio(d.precio) || '★')}</b><svg viewBox="0 0 36 36"><path d="${RUTA_PIN[fp.forma]}" fill="${fp.color}" stroke="#111" stroke-width="3"/></svg></div>`;
      L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html, iconSize: [70, 40], iconAnchor: [35, 38] }) })
        .on('click', () => alAbrir(d)).addTo(g);
    });
  }, [centro && centro.lat, centro && centro.lng, !!yo, drops, coords, !!mapa.current]);

  return (
    <View style={{ marginHorizontal: 16, marginTop: 14, height: 210, borderRadius: R(20), overflow: 'hidden', borderWidth: 1, borderColor: C.borde, backgroundColor: '#EEF0F3' }}>
      <div ref={caja} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: C.papel, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.borde, zIndex: 500 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>{yo ? t('Tú · 2 cuadras a la redonda', 'You · 2 cuadras around') : t('Activa tu ubicación', 'Turn on location')}</Text>
      </View>
      <Pressable onPress={alVerMapa} accessibilityRole="button" accessibilityLabel={t('Abrir mapa', 'Open map')}
        style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: C.negro, borderRadius: 16, paddingHorizontal: 14, height: 34, justifyContent: 'center', zIndex: 500 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>{t('Ver mapa →', 'Map →')}</Text>
      </Pressable>
    </View>
  );
}
