import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { C, cuadras, textoCategoria } from './tema';
import { COLOR_TIPO, urgente, etiquetaTag, centroPin, figuraPin, RUTA_PIN, filtrar, useCoordenadas, useLocalesMapa, SelectorBarrios, FiltrosMapa, HojaMapa } from './MapaComun';

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
    .caserito-mapa { background:#FFF3B0; }
    .caserito-mapa .leaflet-tile-pane { filter: sepia(.55) saturate(1.6) hue-rotate(-8deg) brightness(1.04) contrast(1.05); }
    .caserito-pin { background: none; border: none; }
    /* Pin del diseño "pantallas": etiqueta de precio girada sobre una gota del color del tipo */
    .pin-wrap { position:relative; width:110px; height:92px; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; }
    .tag { position:relative; font-family:LuckiestGuy_400Regular, 'Luckiest Guy', sans-serif; font-size:16px; line-height:1; padding:5px 8px 3px; white-space:nowrap;
      background:${C.amarillo}; color:${C.negro}; border:3px solid ${C.negro}; border-radius:0; box-shadow:3px 3px 0 ${C.negro}; }
    .palito { width:3px; height:9px; background:${C.negro}; }
    .figura-pin { position:relative; width:36px; height:36px; }
    .figura-pin svg { position:absolute; inset:0; }
    .figura-pin b { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font:900 12px Archivo, sans-serif; padding-top:var(--bajar,0); }
    .tag::before { content:''; position:absolute; left:6px; top:50%; width:5px; height:5px; margin-top:-2.5px; border-radius:50%; background:${C.negro}; opacity:.0; }
    .tag.sorpresa { background:${C.negro}; color:${C.amarillo}; box-shadow:3px 3px 0 ${C.rojo}; }
    .tag.grupal { background:#FFF6E5; }
    .gota { width:34px; height:34px; border-radius:17px 17px 17px 2px; transform:rotate(-45deg); border:2.5px solid ${C.negro}; box-sizing:border-box;
      display:flex; align-items:center; justify-content:center; box-shadow:2px 2px 0 ${C.negro}; }
    .gota span { transform:rotate(45deg); font:800 14px Archivo, sans-serif; color:#FFF6E5; }
    .aqui-tag { position:absolute; top:-12px; right:-14px; font:800 9px Archivo, sans-serif; background:#1F9D55; color:#fff; border:2px solid ${C.negro}; border-radius:8px; padding:1px 5px; transform:rotate(8deg); }
    @media (prefers-reduced-motion: no-preference) {
      .pin-wrap { animation: caer .5s cubic-bezier(.2,1.6,.4,1) both; }
      .tag.urgente { animation: tiritar 1.6s ease-in-out infinite; }
      .pulso { position:absolute; bottom:-8px; left:50%; width:30px; height:30px; margin-left:-15px; border-radius:50%; border:3px solid var(--color); opacity:0; animation: pulso 2s ease-out infinite; }
    }
    @keyframes caer { from { transform: translateY(-14px); opacity:0 } to { transform:none; opacity:1 } }
    @keyframes tiritar { 0%,80%,100% { transform:rotate(var(--giro,0deg)) } 85% { transform:rotate(calc(var(--giro,0deg) + 6deg)) } 90% { transform:rotate(calc(var(--giro,0deg) - 6deg)) } 95% { transform:rotate(calc(var(--giro,0deg) + 3deg)) } }
    @keyframes pulso { 0% { transform:scale(.4); opacity:.8 } 100% { transform:scale(1.6); opacity:0 } }
    .caserito-barrio { font: 700 12px Archivo, sans-serif; color: #1E5AA8; text-align: center; text-shadow: 0 0 3px #FFF6E5, 0 0 3px #FFF6E5; opacity: .85; white-space: nowrap; }
    .local-sin-drop { width:18px; height:18px; border-radius:9px; background:#FFF6E5; border:3px solid #111; box-sizing:border-box; }
    .caserito-yo { width:20px; height:20px; border-radius:10px; background:#1D4ED8; border:3px solid #fff; box-shadow:0 0 0 2px #111, 0 0 0 10px rgba(29,78,216,.22); box-sizing:border-box; }
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
  const [filtro, setFiltro] = useState('todo');
  const visibles = filtrar(drops, filtro);
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
    visibles.forEach((d) => {
      const p = coords[d.local_id];
      if (!p) return;
      const color = COLOR_TIPO[d.tipo] || C.rojo;
      const giro = [-7, 5, -4, 6][(d.drop_id || '').charCodeAt(0) % 4 || 0];
      const fp = figuraPin(d);
      const clase = `tag${d.tipo === 'sorpresa' ? ' sorpresa' : ''}${d.tipo === 'grupal' ? ' grupal' : ''}${urgente(d) ? ' urgente' : ''}`;
      const html = `<div class="pin-wrap" style="--color:${color}">`
        + `<div class="${clase}" >${escapar(etiquetaTag(d))}`
        + (d.dentro_del_radio ? '<div class="aqui-tag">¡AQUÍ!</div>' : '') + '</div>'
        + `<div class="palito"></div><div class="figura-pin" style="--bajar:${fp.forma === 'triangulo' ? '10px' : fp.forma === 'cuarto' ? '8px' : '0'}"><svg viewBox="0 0 36 36"><path d="${RUTA_PIN[fp.forma]}" fill="${fp.color}" stroke="${C.negro}" stroke-width="3" stroke-linejoin="miter"/></svg><b style="color:${fp.texto}">${escapar(centroPin(d))}</b></div><div class="pulso"></div></div>`;
      const icono = L.divIcon({ className: 'caserito-pin', html, iconSize: [110, 96], iconAnchor: [55, 96] });
      L.marker([p.lat, p.lng], { icon: icono, title: `${d.local_nombre}, ${cuadras(d.cuadras)}`, keyboard: true })
        .on('click', () => setSel(d))
        .addTo(capa.current);
    });
  }, [drops, coords, locales, filtro]);

  return (
    <View style={{ flex: 1, zIndex: 0, isolation: 'isolate' }}>
      <View ref={caja} style={{ flex: 1 }} accessibilityLabel="Mapa de drops del barrio" />
      <SelectorBarrios barrios={barrios} vista={vista} alElegir={irA} />
      <FiltrosMapa drops={drops} filtro={filtro} alElegir={(f) => { setFiltro(f); setSel(null); }} arriba={barrios.length > 1 ? 58 : 10} />
      <HojaMapa drops={visibles} pos={pos} sel={sel} alAbrir={alAbrir} coords={coords} />
    </View>
  );
}
