import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { C, cuadras } from './tema';
import { COLOR_TIPO, etiquetaPin, useCoordenadas, HojaMapa } from './MapaComun';

const L = require('leaflet');

// Llave pública de mapas de CARTO (va en la app, como la publishable de Supabase)
const LLAVE_CARTO = process.env.EXPO_PUBLIC_CARTO_KEY || '';

// Estilo "mapa de barrio": base clara de CARTO con un tono cálido de papel
function prepararEstilos() {
  if (document.getElementById('caserito-leaflet')) return;
  const css = document.createElement('link');
  css.id = 'caserito-leaflet';
  css.rel = 'stylesheet';
  css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(css);
  const st = document.createElement('style');
  st.textContent = `
    .caserito-mapa .leaflet-tile-pane { filter: sepia(.35) saturate(1.15) brightness(1.02); }
    .caserito-pin { background: none; border: none; }
    .caserito-pin .tag { display:inline-block; background:${C.amarillo}; color:${C.negro}; border:2px solid ${C.negro}; border-radius:6px;
      padding:3px 6px 0; font-family:LuckiestGuy_400Regular, sans-serif; font-style:italic; font-size:14px; white-space:nowrap; transform:rotate(-4deg); }
    .caserito-pin .tag.sorpresa { background:${C.negro}; color:${C.amarillo}; }
    .caserito-pin .punto { width:14px; height:14px; margin:2px auto 0; border-radius:7px; border:2px solid ${C.negro}; box-sizing:border-box; }
    .caserito-barrio { font: 700 12px Archivo, sans-serif; color: #1E5AA8; text-align: center; text-shadow: 0 0 3px #FFF6E5, 0 0 3px #FFF6E5; opacity: .85; white-space: nowrap; }
    .caserito-yo { width:18px; height:18px; border-radius:9px; background:#1D4ED8; border:3px solid #fff; box-shadow:0 0 0 6px rgba(29,78,216,.25); box-sizing:border-box; }
  `;
  document.head.appendChild(st);
}

function escapar(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default function Mapa({ drops, pos, alAbrir, barrios = [] }) {
  const coords = useCoordenadas(drops);
  const [sel, setSel] = useState(null);
  const caja = useRef(null);
  const mapa = useRef(null);
  const capa = useRef(null);
  const capaBarrios = useRef(null);

  // Crear el mapa una vez
  useEffect(() => {
    prepararEstilos();
    const nodo = caja.current;
    if (!nodo || mapa.current) return;
    nodo.classList.add('caserito-mapa');
    const m = L.map(nodo, { zoomControl: false, attributionControl: true }).setView([pos.lat, pos.lng], 16);
    // CARTO ahora pide una llave gratis (carto.com/basemaps/apikey). Sin llave, usamos OpenStreetMap.
    if (LLAVE_CARTO) {
      L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${LLAVE_CARTO}`, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      }).addTo(m);
    } else {
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
    }
    if (!pos.aprox) {
      L.marker([pos.lat, pos.lng], { icon: L.divIcon({ className: '', html: '<div class="caserito-yo"></div>', iconSize: [18, 18] }), interactive: false }).addTo(m);
    }
    capaBarrios.current = L.layerGroup().addTo(m);
    capa.current = L.layerGroup().addTo(m);
    mapa.current = m;
    setTimeout(() => m.invalidateSize(), 50);
    return () => { m.remove(); mapa.current = null; };
  }, []);

  // Límites de los barrios (línea azul punteada y el nombre al medio)
  useEffect(() => {
    const g = capaBarrios.current;
    if (!g) return;
    g.clearLayers();
    barrios.forEach((b) => {
      if (!b.limite) return;
      L.geoJSON(b.limite, { interactive: false, style: { color: '#1E5AA8', weight: 2, dashArray: '8 6', fillColor: '#FFD100', fillOpacity: 0.08 } }).addTo(g);
      L.marker([b.lat, b.lng], { interactive: false, icon: L.divIcon({ className: '', html: `<div class="caserito-barrio">${String(b.nombre).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</div>`, iconSize: [140, 22], iconAnchor: [70, 11] }) }).addTo(g);
    });
  }, [barrios]);

  // Pines de los drops
  useEffect(() => {
    if (!capa.current) return;
    capa.current.clearLayers();
    drops.forEach((d) => {
      const p = coords[d.local_id];
      if (!p) return;
      const html = `<div style="text-align:center"><span class="tag${d.tipo === 'sorpresa' ? ' sorpresa' : ''}">${escapar(etiquetaPin(d))}</span>`
        + `<div class="punto" style="background:${COLOR_TIPO[d.tipo] || C.rojo}"></div></div>`;
      const icono = L.divIcon({ className: 'caserito-pin', html, iconSize: [70, 44], iconAnchor: [35, 44] });
      L.marker([p.lat, p.lng], { icon: icono, title: `${d.local_nombre}, ${cuadras(d.cuadras)}`, keyboard: true })
        .on('click', () => setSel(d))
        .addTo(capa.current);
    });
  }, [drops, coords]);

  return (
    <View style={{ flex: 1, zIndex: 0, isolation: 'isolate' }}>
      <View ref={caja} style={{ flex: 1 }} accessibilityLabel="Mapa de drops del barrio" />
      <HojaMapa drops={drops} pos={pos} sel={sel} alAbrir={alAbrir} />
    </View>
  );
}
