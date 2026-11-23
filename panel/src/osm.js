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
