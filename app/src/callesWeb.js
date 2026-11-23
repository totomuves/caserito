// Calles en amarillo para el mapa web (estilo Moderno).
// Bajamos las calles de OpenStreetMap (Overpass) por zonas de ~1 km y las dibujamos en un panel
// DEBAJO de las teselas; las teselas se mezclan en "multiply", así lo blanco (las calles) toma el
// amarillo y los nombres de las calles quedan encima, negros y legibles.
const ZONA = 0.01; // grados (~1,1 km)
const cache = {}; // zona → lista de calles
const pidiendo = {};
const SERVIDOR = 'https://overpass-api.de/api/interpreter';
const TIPOS = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|service|footway';

function grosor(tipo, zoom) {
  const base = /motorway|trunk|primary/.test(tipo) ? 11 : /secondary|tertiary/.test(tipo) ? 9 : /residential|unclassified|living_street/.test(tipo) ? 7 : /pedestrian/.test(tipo) ? 6 : 3.5;
  return Math.max(2, base * Math.pow(2, (zoom - 17) * 0.8));
}

async function traerZona(z) {
  if (cache[z]) return cache[z];
  if (pidiendo[z]) return pidiendo[z];
  const [i, j] = z.split(':').map(Number);
  const s = i * ZONA, w = j * ZONA, n = s + ZONA, e = w + ZONA;
  const q = `[out:json][timeout:20];way["highway"~"^(${TIPOS})$"](${s},${w},${n},${e});out geom;`;
  pidiendo[z] = fetch(SERVIDOR, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    .then((r) => (r.ok ? r.json() : { elements: [] }))
    .then((d) => {
      const calles = (d.elements || []).filter((x) => x.geometry && x.geometry.length > 1)
        .map((x) => ({ tipo: x.tags && x.tags.highway || '', puntos: x.geometry.map((p) => [p.lat, p.lon]) }));
      cache[z] = calles;
      delete pidiendo[z];
      return calles;
    })
    .catch(() => { delete pidiendo[z]; return []; });
  return pidiendo[z];
}

// Conecta las calles amarillas a un mapa de Leaflet. Devuelve una función para desconectar.
export function conectarCalles(L, m, { color = '#FFD100' } = {}) {
  if (!m.getPane('calles')) {
    const pane = m.createPane('calles');
    pane.style.zIndex = 150; // debajo de las teselas (200)
    pane.style.pointerEvents = 'none';
  }
  const capa = L.layerGroup().addTo(m);
  const dibujadas = {};
  let vivo = true;

  function estilar() {
    const zoom = m.getZoom();
    capa.eachLayer((l) => l.setStyle({ weight: grosor(l.options.tipo, zoom) }));
  }
  async function cargar() {
    if (!vivo || m.getZoom() < 14) return;
    const b = m.getBounds();
    const i0 = Math.floor(b.getSouth() / ZONA), i1 = Math.floor(b.getNorth() / ZONA);
    const j0 = Math.floor(b.getWest() / ZONA), j1 = Math.floor(b.getEast() / ZONA);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 9) return; // demasiado lejos: no bajamos tanto
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const z = `${i}:${j}`;
      if (dibujadas[z]) continue;
      dibujadas[z] = true;
      traerZona(z).then((calles) => {
        if (!vivo) return;
        const zoom = m.getZoom();
        calles.forEach((c) => L.polyline(c.puntos, { pane: 'calles', tipo: c.tipo, color, weight: grosor(c.tipo, zoom), opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(capa));
      });
    }
  }
  m.on('moveend', cargar);
  m.on('zoomend', estilar);
  cargar();
  return () => { vivo = false; m.off('moveend', cargar); m.off('zoomend', estilar); capa.remove(); };
}

// CSS: teselas en gris claro mezcladas sobre el amarillo de las calles
export const CSS_CALLES = (sel) => `
  ${sel} { background:#FFFFFF; isolation:isolate; }
  ${sel} .leaflet-tile-pane { mix-blend-mode: multiply; filter: grayscale(1) brightness(1.03) contrast(1.12); }
`;
