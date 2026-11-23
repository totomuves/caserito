// Traer tiendas desde OpenStreetMap (Overpass). Corre en el navegador del admin.
const SERVIDOR = 'https://overpass-api.de/api/interpreter';
const AMENITY = 'restaurant|cafe|bar|pub|fast_food|ice_cream|food_court|pharmacy|bakery|biergarten';

// zona: { bbox: [s, w, n, e] } o { centro: {lat, lng}, radio }
export async function traerTiendas(zona) {
  const f = zona.bbox ? `(${zona.bbox.join(',')})` : `(around:${zona.radio},${zona.centro.lat},${zona.centro.lng})`;
  const q = `[out:json][timeout:40];(
    nwr["name"]["shop"]${f};
    nwr["name"]["amenity"~"^(${AMENITY})$"]${f};
    nwr["name"]["craft"]${f};
  );out center tags;`;
  const r = await fetch(SERVIDOR, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!r.ok) throw new Error(r.status === 429 || r.status === 504 ? 'OpenStreetMap está ocupado. Prueba de nuevo en un minuto.' : `OpenStreetMap respondió ${r.status}`);
  const d = await r.json();
  const vistos = new Set();
  return (d.elements || []).map((x) => {
    const t = x.tags || {};
    const lat = x.lat != null ? x.lat : x.center && x.center.lat;
    const lng = x.lon != null ? x.lon : x.center && x.center.lon;
    const nivel = parseInt(String(t.level || t['level:ref'] || t['addr:floor'] || '').split(/[;,]/)[0], 10);
    const dir = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
    return {
      osm_id: `${x.type}/${x.id}`,
      nombre: String(t.name).slice(0, 80),
      tipo: t.shop ? `shop=${t.shop}` : t.amenity ? `amenity=${t.amenity}` : t.craft ? `craft=${t.craft}` : null,
      lat, lng,
      nivel: Number.isFinite(nivel) ? nivel : null,
      direccion: dir || null,
      telefono: t.phone || t['contact:phone'] || null,
      web: t.website || t['contact:website'] || t['contact:instagram'] || null,
    };
  }).filter((x) => x.lat != null && x.lng != null && !vistos.has(x.osm_id) && vistos.add(x.osm_id));
}

// Nombre comparable: sin tildes, minúsculas, solo letras y números
export const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function mismoNombre(a, b) {
  const x = normal(a), y = normal(b);
  if (!x || !y) return false;
  return x === y || (Math.min(x.length, y.length) >= 5 && (x.includes(y) || y.includes(x)));
}

export function dentroDe(p, anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
    if ((yi > p.lat) !== (yj > p.lat) && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

const TIPOS = {
  restaurant: 'Restorán', cafe: 'Café', bar: 'Bar', pub: 'Bar', fast_food: 'Comida rápida', ice_cream: 'Heladería', food_court: 'Patio de comida',
  pharmacy: 'Farmacia', bakery: 'Panadería', clothes: 'Ropa', shoes: 'Zapatos', books: 'Libros', florist: 'Flores', furniture: 'Muebles',
  antiques: 'Antigüedades', second_hand: 'Segunda mano', jewelry: 'Joyería', hairdresser: 'Peluquería', beauty: 'Belleza', convenience: 'Almacén',
  supermarket: 'Supermercado', deli: 'Delicatessen', wine: 'Vinos', alcohol: 'Botillería', pet: 'Mascotas', gift: 'Regalos', art: 'Arte',
  music: 'Música', bicycle: 'Bicicletas', optician: 'Óptica', mobile_phone: 'Celulares', electronics: 'Electrónica', sports: 'Deportes', toys: 'Juguetes',
  interior_decoration: 'Deco', variety_store: 'Bazar', bag: 'Carteras', cosmetics: 'Cosmética', tattoo: 'Tatuajes', confectionery: 'Dulces', pastry: 'Pastelería',
};
export const tipoLegible = (t) => { const v = String(t || '').split('=')[1] || ''; return TIPOS[v] || v.replace(/_/g, ' '); };

// Estructura del lugar: contorno de los edificios y, si existen, salas y pasillos por piso (mapeo "indoor")
export async function traerEstructura(centro, radio) {
  const f = `(around:${radio},${centro.lat},${centro.lng})`;
  const q = `[out:json][timeout:40];(
    way["building"]${f}; relation["building"]${f};
    way["shop"="mall"]${f}; relation["shop"="mall"]${f};
    way["indoor"]${f}; way["highway"="corridor"]${f};
  );out geom tags;`;
  const r = await fetch(SERVIDOR, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!r.ok) return { edificios: [], salas: [], pasillos: [] };
  const d = await r.json();
  const anillo = (g) => (g || []).map((p) => [p.lat, p.lon]);
  const edificios = [], salas = [], pasillos = [];
  (d.elements || []).forEach((x) => {
    const t = x.tags || {};
    const nivel = parseInt(String(t.level || '').split(/[;,]/)[0], 10);
    const niv = Number.isFinite(nivel) ? nivel : null;
    if (x.type === 'way' && x.geometry) {
      const pts = anillo(x.geometry);
      if (t.indoor === 'corridor' || t.highway === 'corridor') pasillos.push({ pts, nivel: niv, area: t.indoor === 'corridor' && pts.length > 3 && pts[0][0] === pts[pts.length - 1][0] });
      else if (t.indoor) salas.push({ pts, nivel: niv });
      else if (t.building || t.shop === 'mall') edificios.push({ pts });
    } else if (x.type === 'relation' && x.members) {
      x.members.filter((m) => m.role === 'outer' && m.geometry).forEach((m) => edificios.push({ pts: anillo(m.geometry) }));
    }
  });
  return { edificios, salas, pasillos };
}

// Dibuja el plano de un piso en PNG (para subirlo como imagen del piso)
export function dibujarPlano({ estructura, nivel, caja, ancho = 1200 }) {
  const { s, w, n, e, proporcion, pad } = caja;
  const W = ancho, H = Math.round(ancho / proporcion);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const X = (lng) => (pad + (1 - 2 * pad) * ((lng - w) / (e - w))) * W;
  const Y = (lat) => (pad + (1 - 2 * pad) * ((n - lat) / (n - s))) * H;
  const trazar = (pts) => { g.beginPath(); pts.forEach(([la, lo], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); };
  g.fillStyle = '#EFEFF2'; g.fillRect(0, 0, W, H);
  estructura.edificios.forEach((b) => { trazar(b.pts); g.closePath(); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#111111'; g.stroke(); });
  const deEste = (x) => x.nivel == null || x.nivel === nivel;
  estructura.salas.filter(deEste).forEach((r) => { trazar(r.pts); g.closePath(); g.fillStyle = '#F4F4F6'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#B8B8C0'; g.stroke(); });
  estructura.pasillos.filter(deEste).forEach((c) => {
    trazar(c.pts);
    if (c.area) { g.closePath(); g.fillStyle = '#FFE680'; g.fill(); }
    else { g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFD100'; g.stroke(); }
  });
  return new Promise((ok) => cv.toBlob((b) => ok({ blob: b, proporcion: W / H }), 'image/png'));
}
