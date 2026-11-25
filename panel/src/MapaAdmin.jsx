import React, { useEffect, useRef, useState } from 'react';

// Mapa simple para el admin (Leaflet desde el CDN, sin instalar nada)
let cargando = null;
export function cargarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (cargando) return cargando;
  cargando = new Promise((ok, mal) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => ok(window.L);
    js.onerror = () => { cargando = null; mal(new Error('No se pudo cargar el mapa')); };
    document.head.appendChild(js);
  });
  return cargando;
}

const esc = (x) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// puntos: [{ lat, lng, nombre, detalle, color, grande }] · poligono: [[lng, lat], …] · circulo: { lat, lng, radio }
export default function MapaAdmin({ puntos = [], poligono = null, circulo = null, alto = 380, alTocar }) {
  const caja = useRef(null);
  const mapa = useRef(null);
  const capa = useRef(null);
  const [error, setError] = useState('');
  const ultimo = useRef({});
  ultimo.current = { puntos, poligono, circulo, alTocar };

  useEffect(() => {
    let vivo = true;
    cargarLeaflet().then((L) => {
      if (!vivo || !caja.current || mapa.current) return;
      const m = L.map(caja.current, { zoomControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
      capa.current = L.layerGroup().addTo(m);
      mapa.current = m;
      dibujar();
    }).catch((e) => setError(e.message));
    return () => { vivo = false; if (mapa.current) { mapa.current.remove(); mapa.current = null; } };
  }, []);

  function dibujar() {
    const { puntos, poligono, circulo, alTocar } = ultimo.current;
    const L = window.L, m = mapa.current, g = capa.current;
    if (!L || !m || !g) return;
    g.clearLayers();
    const limites = [];
    if (poligono && poligono.length > 2) {
      const pts = poligono.map(([lng, lat]) => [lat, lng]);
      L.polygon(pts, { color: '#1E5AA8', weight: 2, dashArray: '6 6', fillColor: '#FFD100', fillOpacity: 0.08 }).addTo(g);
      limites.push(...pts);
    }
    if (circulo) {
      L.circle([circulo.lat, circulo.lng], { radius: circulo.radio, color: '#111', weight: 1.5, dashArray: '5 5', fillOpacity: 0.05 }).addTo(g);
      const d = circulo.radio / 111320;
      limites.push([circulo.lat - d, circulo.lng - d * 1.2], [circulo.lat + d, circulo.lng + d * 1.2]);
    }
    puntos.forEach((p) => {
      const mk = L.circleMarker([p.lat, p.lng], { radius: p.grande ? 8 : 5, color: '#FFFFFF', weight: 1.5, fillColor: p.color || '#8A8A8A', fillOpacity: 1 })
        .bindPopup(`<b>${esc(p.nombre)}</b>${p.detalle ? `<br><span style="color:#555">${esc(p.detalle)}</span>` : ''}`)
        .addTo(g);
      if (alTocar) mk.on('click', () => alTocar(p));
      limites.push([p.lat, p.lng]);
    });
    if (limites.length) m.fitBounds(limites, { padding: [20, 20], maxZoom: 18, animate: false });
    else m.setView([-33.4489, -70.6693], 13);
  }
  useEffect(() => { dibujar(); }, [puntos, poligono, circulo]);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div ref={caja} style={{ height: alto, borderRadius: 12, border: '2px solid #111', overflow: 'hidden', background: '#eee' }} />
      <span className="ayuda">{error || '● Negro = ya en Dropper · ● Gris = aún no está en Dropper. Toca un punto para ver el nombre.'}</span>
    </div>
  );
}
