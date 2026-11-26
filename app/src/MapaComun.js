import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { supabase, leerPunto } from './supabase';
import { C, F, letrista, precio, cuadras, textoCategoria, R, ESTILO, sobrio } from './tema';
import { caminar } from './Drop';
import { figuraDe, colorDe, Figura, PuntosPop, GloboPop, Estallido } from './componentes';
import { useIdioma, FraseGlosario, CATEGORIA_TUR, categoriaTur } from './idioma';

export const COLOR_TIPO = { normal: C.rojo, grupal: C.azul, sorpresa: '#B45309', recien_llegado: C.negro };

// Cinta de arriba del cartel según el tipo de drop
export const CINTA_TIPO = { normal: 'DROP', grupal: 'ENTRE TODOS', sorpresa: '¿SORPRESA?', recien_llegado: 'RECIÉN LLEGÓ' };
// Se está acabando: quedan pocos o termina pronto
export function urgente(d) {
  const min = d.termina_at ? (new Date(d.termina_at).getTime() - Date.now()) / 60000 : 999;
  return (d.tipo !== 'recien_llegado' && d.quedan != null && d.quedan <= 3) || min < 20;
}

// Filtros del mapa (como en el diseño "Caserito — pantallas")
const COMIDA = ['comer', 'tomar', 'dulce', 'almacen'];
export const FILTROS = [
  { id: 'todo', es: 'Todo', en: 'All', pasa: () => true },
  { id: 'comida', es: 'Comida', en: 'Food', figura: 'circulo', color: C.rojo, pasa: (d) => COMIDA.includes(d.categoria) || (d.categorias || []).some((c) => COMIDA.includes(c)) },
  { id: 'cafe', es: 'Café', en: 'Coffee', figura: 'cuadrado', color: C.azul, pasa: (d) => d.categoria === 'cafe' || (d.categorias || []).includes('cafe') },
  { id: 'musica', es: 'Música', en: 'Music', figura: 'circulo', color: C.amarillo, pasa: (d) => ['musica', 'envivo'].includes(d.categoria) || (d.categorias || []).some((c) => c === 'musica' || c === 'envivo') },
  { id: 'grupal', es: 'Grupales', en: 'Group', figura: 'triangulo', color: C.negro, pasa: (d) => d.tipo === 'grupal' },
];
export function filtrar(drops, id) {
  const f = FILTROS.find((x) => x.id === id) || FILTROS[0];
  return drops.filter(f.pasa);
}

// Chips de filtro bajo los barrios
export function FiltrosMapa({ drops, filtro, alElegir, arriba = 60 }) {
  const { t } = useIdioma();
  return (
    <View style={{ position: 'absolute', top: arriba, left: 0, right: 0, zIndex: 900 }} pointerEvents="box-none">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
        {FILTROS.map((f) => {
          const activo = filtro === f.id;
          const n = filtrar(drops, f.id).length;
          if (f.id !== 'todo' && !n) return null;
          return (
            <Pressable key={f.id} onPress={() => alElegir(f.id)} accessibilityRole="button" accessibilityState={{ selected: activo }}
              style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, backgroundColor: activo ? C.amarillo : C.papel, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {f.figura ? <Figura forma={f.figura} color={f.color} tam={11} /> : null}
              <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.negro }}>{t(f.es, f.en)}{f.id === 'todo' ? ` · ${n}` : ''}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Lo que va en la etiqueta girada sobre el pin
export function etiquetaTag(d) {
  if (d.tipo === 'sorpresa') return '¿Sorpresa?';
  if (d.tipo === 'grupal') return `Quedan ${d.quedan}`;
  return precio(d.precio) || '¡Nuevo!';
}
// Lo que va dentro de la gota
export function centroPin(d) {
  if (d.tipo === 'sorpresa') return '?';
  if (d.tipo === 'grupal') return String(d.quedan);
  return d.quedan != null && d.tipo !== 'recien_llegado' ? String(d.quedan) : '★';
}
// Figura y color del pin (Bauhaus): sorpresa = rombo amarillo, grupal = triángulo negro, el resto según el rubro
export function figuraPin(d) {
  if (d.tipo === 'sorpresa') return { forma: 'rombo', color: C.amarillo, texto: C.negro };
  if (d.tipo === 'grupal') return { forma: 'triangulo', color: C.negro, texto: C.amarillo };
  const forma = figuraDe(d.categoria);
  const color = colorDe(d.categoria);
  return { forma, color, texto: color === C.amarillo ? C.negro : C.papel };
}
export const RUTA_PIN = {
  circulo: 'M18 3a15 15 0 1 0 0 30a15 15 0 1 0 0-30z',
  cuadrado: 'M4 4h28v28H4z',
  triangulo: 'M18 2L34 33H2z',
  cuarto: 'M3 33A30 30 0 0 1 33 3V33z',
  rombo: 'M18 1L35 18L18 35L1 18z',
};

// Mini lámina de cada local en el mapa: colores por local, figura del rubro, ojos y su especialidad
const PALETAS_MAPA = [
  { fondo: C.amarillo, figura: C.rojo }, { fondo: C.azul, figura: C.amarillo }, { fondo: C.rojo, figura: C.amarillo },
  { fondo: C.papel, figura: C.azul }, { fondo: C.negro, figura: C.amarillo },
];
export function paletaLocal(id) {
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETAS_MAPA[h % PALETAS_MAPA.length];
}
export function especialidad(l) {
  return (l.producto_estrella || '').trim() || textoCategoria(l.categoria);
}

// Minutos caminando (cuadras de 100 m a 80 m/min)
export function minutos(d) { return Math.max(1, Math.round((d.cuadras || 1) * 1.25)); }
// Qué tan cerca estás de desbloquearlo (0 a 1)
export function avance(d) { return d.dentro_del_radio ? 1 : Math.max(0.06, Math.min(0.95, 1 - (d.cuadras - 0.5) / 15)); }

export function etiquetaPin(d) {
  return d.tipo === 'sorpresa' ? '¿?' : d.tipo === 'grupal' ? `${d.quedan}` : precio(d.precio) || '¡NUEVO!';
}

// Coordenadas de los locales que tienen drops
export function useCoordenadas(drops) {
  const [coords, setCoords] = useState({});
  useEffect(() => {
    const ids = [...new Set(drops.map((d) => d.local_id))];
    if (!ids.length) return;
    supabase.from('locales').select('id, ubicacion').in('id', ids).then(({ data }) => {
      const m = {};
      (data || []).forEach((l) => { const p = leerPunto(l.ubicacion); if (p) m[l.id] = p; });
      setCoords(m);
    });
  }, [drops]);
  return coords;
}

// Ir a otro barrio desde el mapa: trae los drops de ese barrio (o vuelve a "Aquí")
export function useVistaBarrio(dropsPropios) {
  const [vista, setVista] = useState(null);
  const [dropsVista, setDropsVista] = useState([]);
  useEffect(() => {
    if (!vista) return;
    let vivo = true;
    supabase.rpc('drops_cerca', { lat: vista.lat, lng: vista.lng, radio_m: 2000 }).then(({ data }) => {
      if (vivo) setDropsVista((data || []).map((d) => ({ ...d, dentro_del_radio: false, cuadras: Math.max(d.cuadras, 99) })));
    });
    return () => { vivo = false; };
  }, [vista]);
  return { vista, setVista, drops: vista ? dropsVista : dropsPropios };
}

// Botones de barrios arriba del mapa
export function SelectorBarrios({ barrios, vista, alElegir, flotante = true, titulo }) {
  const { t } = useIdioma();
  if (!barrios || barrios.length < 2) return null;
  const chip = (activo) => ({ minHeight: 40, paddingHorizontal: 12, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, backgroundColor: activo ? C.negro : C.papel, justifyContent: 'center' });
  const texto = (activo) => ({ fontFamily: F.negrita, fontSize: 13, color: activo ? C.amarillo : C.negro });
  return (
    <View style={flotante ? { position: 'absolute', top: 10, left: 0, right: 0, zIndex: 900 } : { marginTop: 10, gap: 6 }} pointerEvents="box-none">
      {titulo ? <Text style={{ fontFamily: F.negrita, fontSize: 13, paddingHorizontal: 16 }}>{titulo}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
        <Pressable onPress={() => alElegir(null)} accessibilityRole="button" accessibilityState={{ selected: !vista }} style={chip(!vista)}>
          <Text style={texto(!vista)}>{t('📍 Aquí', '📍 Here')}</Text>
        </Pressable>
        {barrios.map((b) => {
          const activo = vista && vista.id === b.id;
          return (
            <Pressable key={b.id} onPress={() => alElegir(b)} accessibilityRole="button" accessibilityState={{ selected: !!activo }} style={chip(activo)}>
              <Text style={texto(activo)}>{b.nombre.replace(/^Barrio /, '')}{!b.lanzado ? t(' · pronto', ' · soon') : ''}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Todos los locales de Caserito (aprobados y activos), tengan o no un drop ahora
export function useLocalesMapa() {
  const [locales, setLocales] = useState([]);
  useEffect(() => {
    supabase.from('locales').select('id, nombre, categoria, ubicacion, producto_estrella, logo_url').eq('activo', true).eq('aprobado', true)
      .then(({ data }) => {
        setLocales((data || []).map((l) => ({ ...l, punto: leerPunto(l.ubicacion) })).filter((l) => l.punto));
      });
  }, []);
  return locales;
}

// Aviso sin ubicación + hoja de abajo con el drop elegido o el más cercano
export function HojaMapa({ drops, pos, sel, alAbrir, coords = {}, alComoLlegar = null }) {
  const cercano = sel || [...drops].sort((a, b) => a.cuadras - b.cuadras)[0];
  const { tur, lang, t, cuad } = useIdioma();
  const destino = cercano && coords[cercano.local_id];
  return (
    <>
      {pos.aprox && (
        <View style={{ position: 'absolute', top: 112, left: 16, right: 16, backgroundColor: C.papel, borderWidth: 2, borderColor: C.borde, borderRadius: R(16), padding: 10, zIndex: 1000 }}>
          <Text style={{ fontFamily: F.media, fontSize: 13 }}>{t('Sin tu ubicación te mostramos Barrio Italia. Actívala para ver a cuántas cuadras está cada drop.', "Activa tu ubicación to see a cuántas cuadras está cada drop. Por ahora: Barrio Italia.")}</Text>
        </View>
      )}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: C.papel, borderTopLeftRadius: R(26), borderTopRightRadius: R(26), borderTopWidth: 2.5, borderColor: C.borde, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 92, gap: 10 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: C.negro, opacity: 0.25 }} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ ...letrista, fontSize: 20 }}>{sel ? t('ESTE DROP', 'ESTE DROP') : t('MÁS CERCA DE TI', 'MÁS CERCA · CLOSEST')}</Text>
          <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.gris }}>{drops.length} {drops.length === 1 ? t('drop activo', 'drop live') : t('drops activos', 'drops live')}</Text>
        </View>
        {cercano ? (
          <Pressable onPress={() => alAbrir(cercano)} style={{ backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.borde, borderRadius: R(16), padding: 14, gap: 7, shadowColor: C.sombra, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontFamily: F.negrita, fontSize: 12, color: COLOR_TIPO[cercano.tipo] || C.rojoTexto, textTransform: 'uppercase', flexShrink: 1 }}>{tur ? categoriaTur(cercano.categoria, lang) || textoCategoria(cercano.categoria) : textoCategoria(cercano.categoria)} · {t('quedan', 'quedan')} {cercano.quedan}</Text>
            </View>
            <Text style={{ ...letrista, fontSize: 19 }}>{cercano.local_nombre}</Text>
            {sobrio() ? (
              <FraseGlosario texto={`“${cercano.frase || cercano.titulo}”`} colorAyuda={C.rojoTexto} numberOfLines={2} style={{ fontFamily: F.media, fontSize: 15, fontStyle: 'italic' }} />
            ) : (
            <View style={{ height: 86, borderWidth: 2.5, borderColor: C.borde, overflow: 'hidden', padding: 8 }}>
              <PuntosPop color={C.rojo} fondo="#FFE3E3" tam={2.6} sep={8} />
              <GloboPop style={{ maxWidth: '76%' }}>
                <FraseGlosario texto={cercano.frase || cercano.titulo} colorAyuda={C.rojoTexto} numberOfLines={2} style={{ fontFamily: F.negrita, fontSize: 12, lineHeight: 15, textTransform: 'uppercase' }} />
              </GloboPop>
              <Estallido texto={cercano.tipo === 'sorpresa' ? '¿?' : precio(cercano.precio) || '¡YA!'} tam={64} style={{ position: 'absolute', right: 2, bottom: 2 }} />
            </View>
            )}
            <Text style={{ fontFamily: F.negrita, fontSize: 13 }}>
              {cercano.dentro_del_radio ? t('¡Estás aquí! Ya puedes canjearlo.', '¡Llegaste! Listo pa’ canjear.') : t(`Estás ${cuad(cercano.cuadras)} · se desbloquea al llegar`, `Estás a ${cuad(cercano.cuadras)} · se activa al llegar`)}
            </Text>
            <View style={{ height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.borde, backgroundColor: C.amarilloSuave, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(avance(cercano) * 100)}%`, height: '100%', backgroundColor: cercano.dentro_del_radio ? '#1F9D55' : C.amarillo }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {cercano.dentro_del_radio || !destino ? (
                <Pressable onPress={() => alAbrir(cercano)} accessibilityRole="button" style={{ flex: 1, minHeight: 48, borderRadius: R(16), backgroundColor: C.negro, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.negrita, fontSize: 15, color: C.amarillo }}>{cercano.dentro_del_radio ? t('Canjear ahora', 'Canjear now') : t('Ver drop', 'Ver drop')}</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable onPress={() => (alComoLlegar ? alComoLlegar({ ...destino, nombre: cercano.local_nombre }) : caminar(destino))} accessibilityRole="button" style={{ flex: 1, minHeight: 48, borderRadius: R(16), backgroundColor: C.negro, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.negrita, fontSize: 15, color: C.amarillo }}>{t(`Cómo llegar · ${minutos(cercano)} min`, `Cómo llegar · ${minutos(cercano)} min walk`)}</Text>
                  </Pressable>
                  <Pressable onPress={() => alAbrir(cercano)} accessibilityRole="button" style={{ minHeight: 48, paddingHorizontal: 16, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.negrita, fontSize: 15 }}>{t('Ver', 'Ver')}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        ) : (
          <Text style={{ fontFamily: F.media, fontSize: 14 }}>{t('No hay drops activos con este filtro ahora.', 'No drops con este filtro right now.')}</Text>
        )}
      </View>
    </>
  );
}

// Patios y malls (lugares con plano propio). Si el SQL 026 no está corrido, simplemente no hay.
export function useLugares() {
  const [lugares, setLugares] = useState([]);
  useEffect(() => {
    const traer = () => supabase.rpc('lugares_mapa').then(({ data, error }) => { if (!error && data) setLugares(data); });
    traer();
    const x = setInterval(traer, 60000); // si el admin crea uno nuevo, aparece solo
    return () => clearInterval(x);
  }, []);
  return lugares;
}
// El patio o mall donde estás parado (o null)
export function lugarDe(pos, lugares) {
  if (!pos || pos.aprox || !lugares || !lugares.length) return null;
  const dentro = lugares.filter((g) => metrosEntre(pos, g) <= (g.radio_m || 60));
  return dentro.sort((a, b) => metrosEntre(pos, a) - metrosEntre(pos, b))[0] || null;
}
function metrosEntre(a, b) {
  const r = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

// Tiendas del barrio traídas de OpenStreetMap que aún no están en Dropper (puntos grises en el mapa)
export function useTiendasOsm() {
  const [tiendas, setTiendas] = useState([]);
  useEffect(() => {
    // Solo si el admin las activó (Admin → Estilo de la app → Tiendas de OpenStreetMap)
    supabase.from('ajustes').select('valor').eq('clave', 'tiendas_osm').maybeSingle().then(({ data: a }) => {
      if (!a || a.valor !== 'si') return;
      supabase.from('tiendas_osm').select('osm_id, nombre, tipo, lat, lng').is('local_id', null).is('lugar_id', null).eq('oculta', false).limit(3000)
        .then(({ data, error }) => { if (!error && data) setTiendas(data); });
    });
  }, []);
  return tiendas;
}

// Ruta caminando (OpenStreetMap / OSRM): puntos, metros, minutos y pasos ("gira a la derecha en …")
const GIRO = { left: 'a la izquierda', right: 'a la derecha', 'slight left': 'levemente a la izquierda', 'slight right': 'levemente a la derecha', 'sharp left': 'a la izquierda', 'sharp right': 'a la derecha', straight: 'derecho', uturn: 'en U' };
function textoPaso(p) {
  const calle = p.name ? ` por ${p.name}` : '';
  const m = p.maneuver || {};
  const giro = GIRO[m.modifier] || '';
  if (m.type === 'depart') return `Sal${calle}`;
  if (m.type === 'arrive') return 'Llegaste al local';
  if (m.type === 'roundabout' || m.type === 'rotary') return `En la rotonda, toma la salida ${m.exit || ''}${calle}`;
  if (giro === 'derecho' || m.type === 'continue' || m.type === 'new name') return `Sigue derecho${calle}`;
  return `Dobla ${giro}${calle}`.replace('Dobla ', giro ? 'Dobla ' : 'Sigue ');
}
export async function traerRuta(desde, hasta) {
  // Paseo de drops: varias paradas en una sola ruta
  const puntos = [desde, ...(hasta.paradas && hasta.paradas.length ? hasta.paradas : [hasta])];
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${puntos.map((p) => `${p.lng},${p.lat}`).join(';')}?overview=full&geometries=geojson&steps=true`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    const ruta = d.routes && d.routes[0];
    if (!ruta) return null;
    const paradas = puntos.slice(1);
    const pasos = (ruta.legs || []).flatMap((leg, k) => (leg.steps || [])
      .filter((p) => p.maneuver && p.maneuver.type !== 'depart' || p.distance > 5)
      .map((p) => ({
        texto: p.maneuver.type === 'arrive' && paradas.length > 1 ? `Llegaste a ${paradas[k].nombre || `la parada ${k + 1}`}` : textoPaso(p),
        metros: Math.round(p.distance), lat: p.maneuver.location[1], lng: p.maneuver.location[0],
      })));
    return { puntos: ruta.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })), metros: Math.round(ruta.distance), minutos: Math.max(1, Math.round(ruta.distance / 75)), pasos };
  } catch (e) { return null; }
}
// El próximo paso según dónde estás
export function proximoPaso(ruta, yo) {
  if (!ruta || !ruta.pasos || !ruta.pasos.length || !yo) return null;
  const dist = (p) => Math.hypot((p.lat - yo.lat) * 111320, (p.lng - yo.lng) * 93000);
  // el primer paso que todavía está a más de 12 m (los anteriores ya los hiciste)
  let i = 0, mejor = Infinity;
  ruta.pasos.forEach((p, k) => { const d = dist(p); if (d < mejor) { mejor = d; i = k; } });
  const p = mejor < 12 && ruta.pasos[i + 1] ? ruta.pasos[i + 1] : ruta.pasos[i];
  return { ...p, a: Math.round(dist(p)) };
}

// El paso que viene y el siguiente (para el panel del mapa chico)
export function pasosQueVienen(ruta, yo) {
  const ahora = proximoPaso(ruta, yo);
  if (!ahora) return { ahora: null, despues: null };
  const i = ruta.pasos.findIndex((p) => p.lat === ahora.lat && p.lng === ahora.lng);
  return { ahora, despues: i >= 0 ? ruta.pasos[i + 1] || null : null };
}

// Panel de indicaciones a la izquierda del mapa chico (un tercio del ancho)
export const ANCHO_PANEL = 1 / 3;
export function PanelRuta({ destino, ruta, alCerrar, alExterno, yo = null }) {
  const { t } = useIdioma();
  const { ahora, despues } = pasosQueVienen(ruta, yo);
  const gris = { fontFamily: F.negrita, fontSize: 10, color: '#9A9A9A', letterSpacing: 0.5 };
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${ANCHO_PANEL * 100}%`, zIndex: 950, backgroundColor: C.negro, paddingHorizontal: 12, paddingVertical: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18 }}>🚶</Text>
        <Pressable onPress={alCerrar} accessibilityRole="button" accessibilityLabel={t('Cerrar ruta', 'Close route')} hitSlop={10}
          style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: '#333333', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 14, color: '#FFFFFF' }}>✕</Text>
        </Pressable>
      </View>
      <View>
        <Text style={{ fontFamily: F.negrita, fontSize: 14, color: '#FFFFFF', lineHeight: 17 }} numberOfLines={2}>{destino.nombre}</Text>
        <Text style={{ fontFamily: F.negrita, fontSize: 11, color: C.amarillo, marginTop: 2 }}>
          {ruta ? `${ruta.minutos} min · ${ruta.metros < 1000 ? `${ruta.metros} m` : `${(ruta.metros / 1000).toFixed(1)} km`}` : t('Calculando…', 'Finding…')}
        </Text>
      </View>
      <View style={{ height: 1, backgroundColor: '#333333' }} />
      {ahora ? (
        <View style={{ gap: 2 }}>
          <Text style={gris}>{t('AHORA', 'NOW')}</Text>
          <Text style={{ fontFamily: F.negrita, fontSize: 14, color: '#FFFFFF', lineHeight: 17 }} numberOfLines={4}>{ahora.texto}</Text>
          {ahora.a > 15 ? <Text style={{ fontFamily: F.negrita, fontSize: 11, color: C.amarillo }}>{t(`en ${ahora.a} m`, `in ${ahora.a} m`)}</Text> : null}
        </View>
      ) : null}
      {despues ? (
        <View style={{ gap: 2 }}>
          <Text style={gris}>{t('DESPUÉS', 'THEN')}</Text>
          <Text style={{ fontFamily: F.media, fontSize: 11, color: '#DDDDDD', lineHeight: 14 }} numberOfLines={2}>{despues.texto}</Text>
        </View>
      ) : null}
      {destino.paradas && destino.paradas.length > 1 ? (
        <Text style={{ fontFamily: F.media, fontSize: 11, color: '#DDDDDD', lineHeight: 14 }} numberOfLines={3}>{destino.paradas.map((p, k) => `${k + 1} ${p.nombre}`).join(' · ')}</Text>
      ) : null}
      <Pressable onPress={alExterno} accessibilityRole="button" accessibilityLabel={t('Abrir en Google Maps o Apple Maps', 'Open in maps app')}
        style={{ marginTop: 'auto', height: 32, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 11 }}>{t('Abrir en Maps', 'Maps')}</Text>
      </Pressable>
    </View>
  );
}

// Indicaciones abajo (mapa grande): el paso que viene en grande, después el local, los minutos y cerrar
export function BarraRuta({ destino, ruta, alCerrar, alExterno, yo = null }) {
  const { t } = useIdioma();
  const { ahora, despues } = pasosQueVienen(ruta, yo);
  const tiempo = ruta ? `${ruta.minutos} min · ${ruta.metros < 1000 ? `${ruta.metros} m` : `${(ruta.metros / 1000).toFixed(1)} km`}` : t('Calculando la ruta…', 'Finding route…');
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1001, backgroundColor: C.negro, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 92, gap: 12 }}>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#444444', alignSelf: 'center' }} />
      {ahora ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 26, color: '#FFFFFF' }}>➜</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 18, lineHeight: 22, color: '#FFFFFF' }} numberOfLines={2}>{ahora.texto}</Text>
            {ahora.a > 15 ? <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.amarillo }}>{t(`en ${ahora.a} m`, `in ${ahora.a} m`)}</Text> : null}
          </View>
        </View>
      ) : null}
      {ahora ? <View style={{ height: 1, backgroundColor: '#333333' }} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 14, color: '#FFFFFF' }} numberOfLines={1}>{destino.nombre}</Text>
          <Text style={{ fontFamily: F.media, fontSize: 12, color: '#BBBBBB' }} numberOfLines={1}>{tiempo}{despues ? t(` · después: ${despues.texto.toLowerCase()}`, ` · then: ${despues.texto.toLowerCase()}`) : ''}</Text>
        </View>
        <Pressable onPress={alExterno} accessibilityRole="button" accessibilityLabel={t('Abrir en Google Maps o Apple Maps', 'Open in maps app')}
          style={{ height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>Maps</Text>
        </Pressable>
        <Pressable onPress={alCerrar} accessibilityRole="button" accessibilityLabel={t('Cerrar ruta', 'Close route')} hitSlop={8}
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#333333', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 15, color: '#FFFFFF' }}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Locales pegados: si dos láminas quedan a menos de `umbral` px, se abren en abanico alrededor
// de su centro para que ninguna tape a la otra. Recibe puntos en píxeles {x, y} y devuelve los nuevos.
export function separarPuntos(pts, umbral = 46) {
  const out = pts.map((p) => ({ x: p.x, y: p.y }));
  const usado = new Array(pts.length).fill(false);
  for (let i = 0; i < pts.length; i++) {
    if (usado[i]) continue;
    const grupo = [i];
    usado[i] = true;
    for (let k = 0; k < grupo.length; k++) {
      for (let j = 0; j < pts.length; j++) {
        if (!usado[j] && Math.hypot(pts[j].x - pts[grupo[k]].x, pts[j].y - pts[grupo[k]].y) < umbral) { usado[j] = true; grupo.push(j); }
      }
    }
    if (grupo.length < 2) continue;
    const cx = grupo.reduce((s, g) => s + pts[g].x, 0) / grupo.length;
    const cy = grupo.reduce((s, g) => s + pts[g].y, 0) / grupo.length;
    const radio = 32 / Math.sin(Math.PI / grupo.length); // separación justa para que las láminas (58 px) no se toquen
    grupo.forEach((g, n) => {
      const ang = (grupo.length === 2 ? Math.PI : -Math.PI / 2) + (2 * Math.PI * n) / grupo.length;
      out[g] = { x: cx + radio * Math.cos(ang), y: cy + radio * Math.sin(ang) };
    });
  }
  return out;
}

// Lo mismo para los mapas del teléfono (react-native-maps): de grados a píxeles con la región visible y de vuelta
export function separarCoords(puntos, region, tam) {
  if (!region || !tam || !tam.w || !tam.h || puntos.length < 2) return puntos;
  const px = puntos.map((p) => ({ x: ((p.lng - region.longitude) / region.longitudeDelta) * tam.w, y: ((region.latitude - p.lat) / region.latitudeDelta) * tam.h }));
  const nuevos = separarPuntos(px, 50);
  return nuevos.map((n, i) => (n.x === px[i].x && n.y === px[i].y ? puntos[i] : { lat: region.latitude - (n.y / tam.h) * region.latitudeDelta, lng: region.longitude + (n.x / tam.w) * region.longitudeDelta }));
}
