import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { C, cuadras, textoCategoria } from './tema';
import { COLOR_TIPO, CINTA_TIPO, urgente, etiquetaPin, useCoordenadas, useLocalesMapa, SelectorBarrios, HojaMapa } from './MapaComun';

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
    /* Cartel de feria: cinta con el tipo, precio grande a pincel, palito y sombra dura */
    .cartel-wrap { position:relative; width:92px; height:96px; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; }
    .cartel { position:relative; min-width:64px; max-width:92px; background:${C.amarillo}; border:2.5px solid ${C.negro}; border-radius:8px; box-shadow:3px 3px 0 ${C.negro};
      overflow:hidden; text-align:center; transform:rotate(var(--giro, -4deg)); transform-origin:50% 100%; }
    .cartel .cinta { font:800 9px Archivo, sans-serif; letter-spacing:.6px; color:#FFF6E5; padding:2px 5px 1px; white-space:nowrap; }
    .cartel .precio { font-family:LuckiestGuy_400Regular, 'Luckiest Guy', sans-serif; font-style:italic; font-size:19px; line-height:1; color:${C.negro}; padding:4px 6px 1px; white-space:nowrap; }
    .cartel .quedan { font:800 10px Archivo, sans-serif; color:${C.negro}; padding:0 5px 3px; white-space:nowrap; }
    .cartel.sorpresa { background:${C.negro}; } .cartel.sorpresa .precio, .cartel.sorpresa .quedan { color:${C.amarillo}; }
    .cartel.urgente .quedan { color:#B00020; }
    .palo { width:3px; height:12px; background:${C.negro}; }
    .base { width:12px; height:12px; border-radius:6px; border:2.5px solid ${C.negro}; box-sizing:border-box; margin-top:-1px; }
    .aqui-tag { position:absolute; top:-10px; right:-12px; font:800 9px Archivo, sans-serif; background:#1F9D55; color:#fff; border:2px solid ${C.negro}; border-radius:8px; padding:1px 5px; transform:rotate(8deg); }
    @media (prefers-reduced-motion: no-preference) {
      .cartel-wrap { animation: caer .5s cubic-bezier(.2,1.6,.4,1) both; }
      .cartel.urgente { animation: tiritar 1.6s ease-in-out infinite; }
      .pulso { position:absolute; bottom:-6px; left:50%; width:28px; height:28px; margin-left:-14px; border-radius:50%; border:3px solid var(--color); opacity:0; animation: pulso 2s ease-out infinite; }
    }
    @keyframes caer { from { transform: translateY(-14px); opacity:0 } to { transform:none; opacity:1 } }
    @keyframes tiritar { 0%,80%,100% { transform:rotate(var(--giro, -4deg)) } 85% { transform:rotate(calc(var(--giro, -4deg) + 6deg)) } 90% { transform:rotate(calc(var(--giro, -4deg) - 6deg)) } 95% { transform:rotate(calc(var(--giro, -4deg) + 3deg)) } }
    @keyframes pulso { 0% { transform:scale(.4); opacity:.8 } 100% { transform:scale(1.6); opacity:0 } }
    .caserito-barrio { font: 700 12px Archivo, sans-serif; color: #1E5AA8; text-align: center; text-shadow: 0 0 3px #FFF6E5, 0 0 3px #FFF6E5; opacity: .85; white-space: nowrap; }
    .local-sin-drop { width:18px; height:18px; border-radius:9px; background:#FFF6E5; border:3px solid #111; box-sizing:border-box; }
    .caserito-yo { width:18px; height:18px; border-radius:9px; background:#1D4ED8; border:3px solid #fff; box-shadow:0 0 0 6px rgba(29,78,216,.25); box-sizing:border-box; }
  `;
  document.head.appendChild(st);
}

function escapar(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default function Mapa({ drops, pos, alAbrir, barrios = [], visita = null, alVisitar = () => {} }) {
  const vista = visita;
  const setVista = alVisitar;
  const coords = useCoordenadas(drops);
  const locales = useLocalesMapa();
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

  // Ir a un barrio (o volver a "Aquí")
  function irA(b) {
    setVista(b);
    setSel(null);
    if (mapa.current) mapa.current.flyTo(b ? [b.lat, b.lng] : [pos.lat, pos.lng], b ? 15 : 16, { duration: 0.8 });
  }

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

  // Pines: locales sin drop ahora (chicos, color papel) y drops en vivo encima
  useEffect(() => {
    if (!capa.current) return;
    capa.current.clearLayers();
    const conDrop = new Set(drops.map((d) => d.local_id));
    locales.filter((l) => !conDrop.has(l.id)).forEach((l) => {
      const icono = L.divIcon({ className: 'caserito-pin', html: '<div class="local-sin-drop"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
      L.marker([l.punto.lat, l.punto.lng], { icon: icono, title: l.nombre, keyboard: true, zIndexOffset: -100 })
        .bindPopup(`<b>${escapar(l.nombre)}</b><br>${escapar(textoCategoria(l.categoria))}<br><span style="color:#4A4A4A">Sin drop ahora · vuelve más rato</span>`)
        .addTo(capa.current);
    });
    drops.forEach((d) => {
      const p = coords[d.local_id];
      if (!p) return;
      const color = COLOR_TIPO[d.tipo] || C.rojo;
      const giro = [-5, 3, -2, 4][(d.drop_id || '').charCodeAt(0) % 4 || 0];
      const quedan = d.tipo === 'recien_llegado' ? '' : `<div class="quedan">${d.quedan <= 3 ? '¡quedan ' + d.quedan + '!' : 'quedan ' + d.quedan}</div>`;
      const html = `<div class="cartel-wrap" style="--color:${color}">`
        + `<div style="position:relative"><div class="cartel${d.tipo === 'sorpresa' ? ' sorpresa' : ''}${urgente(d) ? ' urgente' : ''}" style="--giro:${giro}deg">`
        + `<div class="cinta" style="background:${color}">${escapar(CINTA_TIPO[d.tipo] || 'DROP')}</div>`
        + `<div class="precio">${escapar(etiquetaPin(d))}</div>${quedan}</div>`
        + (d.dentro_del_radio ? '<div class="aqui-tag">¡AQUÍ!</div>' : '') + '</div>'
        + `<div class="palo"></div><div class="base" style="background:${color}"></div><div class="pulso"></div></div>`;
      const icono = L.divIcon({ className: 'caserito-pin', html, iconSize: [92, 96], iconAnchor: [46, 96] });
      L.marker([p.lat, p.lng], { icon: icono, title: `${d.local_nombre}, ${cuadras(d.cuadras)}`, keyboard: true })
        .on('click', () => setSel(d))
        .addTo(capa.current);
    });
  }, [drops, coords, locales]);

  return (
    <View style={{ flex: 1, zIndex: 0, isolation: 'isolate' }}>
      <View ref={caja} style={{ flex: 1 }} accessibilityLabel="Mapa de drops del barrio" />
      <SelectorBarrios barrios={barrios} vista={vista} alElegir={irA} />
      <HojaMapa drops={drops} pos={pos} sel={sel} alAbrir={alAbrir} />
    </View>
  );
}
