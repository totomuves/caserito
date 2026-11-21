// Barrios de Caserito: cada uno es un polígono (sus calles límite) con su comuna.
// La lista viene de la base de datos (barrios_mapa); aquí solo se calcula en cuál estás.

// ¿El punto está dentro del polígono? (GeoJSON: [lng, lat])
export function dentroDe(lat, lng, geojson) {
  const anillo = geojson && geojson.coordinates && geojson.coordinates[0];
  if (!anillo) return false;
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

export function metros(a, b) {
  const r = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

// { barrio, dentro }: el barrio donde estás, o el más cercano si no estás en ninguno.
// Sin ubicación: el primer barrio lanzado (Barrio Italia).
export function barrioDe(pos, barrios) {
  if (!barrios || !barrios.length) return { barrio: null, dentro: false };
  if (!pos || pos.aprox) return { barrio: barrios.find((b) => b.lanzado) || barrios[0], dentro: false };
  const aqui = barrios.find((b) => dentroDe(pos.lat, pos.lng, b.limite));
  if (aqui) return { barrio: aqui, dentro: true };
  const cerca = [...barrios].sort((a, b) => metros(pos, a) - metros(pos, b))[0];
  return { barrio: cerca, dentro: false };
}

// Polígono como lista de puntos para los mapas
export function puntosDe(geojson) {
  const anillo = (geojson && geojson.coordinates && geojson.coordinates[0]) || [];
  return anillo.map(([lng, lat]) => ({ lat, lng }));
}
