// Calles en amarillo para el mapa web (estilo Moderno).
// Bajamos las calles de OpenStreetMap (Overpass) por zonas de ~1 km y las dibujamos en un panel
// DEBAJO de las teselas; las teselas se mezclan en "multiply", así lo blanco (las calles) toma el
// amarillo y los nombres de las calles quedan encima, negros y legibles.
const ZONA = 0.01; // grados (~1,1 km)
const cache = {}; // zona → lista de calles
const pidiendo = {};
// Varios servidores de OpenStreetMap: si uno está ocupado, probamos el siguiente
const SERVIDORES = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const TIPOS = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|service|footway';

function grosor(tipo, zoom) {
  const base = /motorway|trunk|primary/.test(tipo) ? 11 : /secondary|tertiary/.test(tipo) ? 9 : /residential|unclassified|living_street/.test(tipo) ? 7 : /pedestrian/.test(tipo) ? 6 : 3.5;
  return Math.max(2, base * Math.pow(2, (zoom - 17) * 0.8));
}

const GUARDADO = 'droper_calles_v1_';
function leerGuardado(z) {
  try { const v = localStorage.getItem(GUARDADO + z); if (!v) return null; const d = JSON.parse(v); return Date.now() - d.t < 7 * 864e5 ? d.c : null; } catch (e) { return null; }
}
function guardar(z, calles) {
  try { localStorage.setItem(GUARDADO + z, JSON.stringify({ t: Date.now(), c: calles.map((c) => ({ tipo: c.tipo, puntos: c.puntos.map(([a, b]) => [+a.toFixed(5), +b.toFixed(5)]) })) })); } catch (e) { /* sin espacio: no importa */ }
}

async function traerZona(z) {
  if (cache[z]) return cache[z];
  const g = leerGuardado(z); // ya bajadas antes en este teléfono: aparecen al tiro
  if (g) { cache[z] = g; return g; }
  if (pidiendo[z]) return pidiendo[z];
  const [i, j] = z.split(':').map(Number);
  const s = i * ZONA, w = j * ZONA, n = s + ZONA, e = w + ZONA;
  const q = `[out:json][timeout:40];way["highway"~"^(${TIPOS})$"](${s},${w},${n},${e});out geom;`;
  pidiendo[z] = (async () => {
    for (const servidor of SERVIDORES) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 45000);
        const r = await fetch(servidor, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) continue;
        const d = await r.json();
        const calles = (d.elements || []).filter((x) => x.geometry && x.geometry.length > 1)
          .map((x) => ({ tipo: x.tags && x.tags.highway || '', puntos: x.geometry.map((p) => [p.lat, p.lon]) }));
        if (calles.length) { cache[z] = calles; guardar(z, calles); }
        delete pidiendo[z];
        return calles;
      } catch (e) { /* probamos el siguiente servidor */ }
    }
    delete pidiendo[z];
    return [];
  })();
  return pidiendo[z];
}

// Conecta las calles amarillas a un mapa de Leaflet. Devuelve una función para desconectar.
export function conectarCalles(L, m, { color = '#7FA8E6' } = {}) {
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
        if (!calles.length) { dibujadas[z] = false; setTimeout(() => vivo && cargar(), 20000); return; } // falló: reintenta solo en 20 s
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
