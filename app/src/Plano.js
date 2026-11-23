import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from './supabase';
import { C, F, R, letrista, precio, textoCategoria } from './tema';
import { ArteLocal } from './arteLocal';
import { useIdioma } from './idioma';
import { PosterLugar } from './Poster';
import { useRumbo, pedirPermisoRumbo } from './rumbo';

// Locales ubicados en los pisos de un patio o mall
function useLocalesDelLugar(lugar) {
  const [locales, setLocales] = useState([]);
  const ids = (lugar && lugar.pisos || []).map((p) => p.id);
  useEffect(() => {
    if (!ids.length) { setLocales([]); return; }
    supabase.from('locales').select('id, nombre, categoria, producto_estrella, piso_id, plano_x, plano_y')
      .in('piso_id', ids).eq('activo', true)
      .then(({ data }) => setLocales(data || []));
  }, [ids.join(',')]);
  return locales;
}
function useTiendasDelLugar(lugar) {
  const [tiendas, setTiendas] = useState([]);
  useEffect(() => {
    if (!lugar || !lugar.id) return;
    supabase.from('tiendas_osm').select('osm_id, nombre, piso_id, plano_x, plano_y').eq('lugar_id', lugar.id).is('local_id', null).eq('oculta', false)
      .then(({ data, error }) => { if (!error) setTiendas(data || []); });
  }, [lugar && lugar.id]);
  return tiendas;
}

const TIPO = { patio: 'PATIO', mall: 'MALL' };

// El plano de un piso con las láminas encima. compacto = tarjeta del inicio.
export function PlanoLugar({ lugar, drops = [], alAbrir = () => {}, compacto = false, alVerTodo }) {
  const { t } = useIdioma();
  const pisos = lugar.pisos || [];
  const [pisoId, setPisoId] = useState(pisos[0] && pisos[0].id);
  const piso = pisos.find((p) => p.id === pisoId) || pisos[0];
  const locales = useLocalesDelLugar(lugar);
  const tiendas = useTiendasDelLugar(lugar);
  const grises = tiendas.filter((x) => piso && x.piso_id === piso.id && x.plano_x != null);
  const [tocada, setTocada] = useState(null);
  const conNombres = !compacto && grises.length <= 20;
  const [ancho, setAncho] = useState(0);
  const dropDe = useMemo(() => { const m = {}; drops.forEach((d) => { if (!m[d.local_id]) m[d.local_id] = d; }); return m; }, [drops]);
  const aca = locales.filter((l) => piso && l.piso_id === piso.id && l.plano_x != null);
  const conDrop = aca.filter((l) => dropDe[l.id]);
  const alto = ancho && piso ? ancho / (piso.proporcion || 1.4) : 0;
  const lam = compacto ? 30 : 40;
  // Zoom (botones) y brújula: el plano sale con el norte arriba, así que puede girar con el teléfono
  const [zoom, setZoom] = useState(1);
  const [brujula, setBrujula] = useState(false);
  const rumbo = useRumbo(brujula && !compacto);
  const W = ancho * zoom, H = alto * zoom;
  const derecho = { transform: [{ rotate: `${rumbo}deg` }] }; // las láminas no se dan vuelta

  return (
    <View style={{ gap: 10 }}>
      {pisos.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {pisos.map((p) => {
            const on = piso && p.id === piso.id;
            return (
              <Pressable key={p.id} onPress={() => setPisoId(p.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: R(16), borderWidth: 1.5, borderColor: on ? C.negro : C.borde, backgroundColor: on ? C.negro : C.papel, justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.negrita, fontSize: 13, color: on ? C.amarillo : C.negro }}>{p.nombre}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        style={{ width: '100%', height: alto || 220, borderRadius: R(18), overflow: 'hidden', borderWidth: 1, borderColor: C.borde, backgroundColor: '#FFF3B0' }}>
        <ScrollView horizontal scrollEnabled={zoom > 1} showsHorizontalScrollIndicator={false} nestedScrollEnabled style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
          <ScrollView scrollEnabled={zoom > 1} showsVerticalScrollIndicator={false} nestedScrollEnabled style={{ width: ancho, height: alto || 220 }}>
            <View style={{ width: W || ancho, height: H || 220, transform: [{ rotate: `${-rumbo}deg` }] }}>
        {piso && !piso.plano_url && grises.length ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 6, bottom: 4 }}>
            <Text style={{ fontFamily: F.media, fontSize: 9, color: '#777' }}>{t('Tiendas: © OpenStreetMap', 'Shops: © OpenStreetMap')}</Text>
          </View>
        ) : null}
        {piso && piso.plano_url ? (
          <Image source={{ uri: piso.plano_url }} resizeMode="stretch" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} accessibilityLabel={t(`Plano de ${lugar.nombre}`, `Map of ${lugar.nombre}`)} />
        ) : (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            {grises.length ? null : <Text style={{ fontFamily: F.media, fontSize: 13, color: C.gris }}>{t('Plano en preparación', 'Map coming soon')}</Text>}
          </View>
        )}
        {alto ? grises.map((x) => (
          <Pressable key={x.osm_id} onPress={() => setTocada(tocada && tocada.osm_id === x.osm_id ? null : x)} hitSlop={8} accessibilityLabel={x.nombre}
            style={{ position: 'absolute', left: x.plano_x * W - 4, top: x.plano_y * H - 4, flexDirection: 'row', alignItems: 'center', gap: 3, ...derecho }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tocada && tocada.osm_id === x.osm_id ? C.negro : '#9A9A9A', borderWidth: 1, borderColor: '#FFFFFF' }} />
            {conNombres ? <Text numberOfLines={1} style={{ fontFamily: F.media, fontSize: 8, color: '#666', maxWidth: 70 }}>{x.nombre}</Text> : null}
          </Pressable>
        )) : null}
        {tocada && alto ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: Math.min(Math.max(tocada.plano_x * W - 70, 6), W - 146), top: Math.max(tocada.plano_y * H - 40, 4), width: 140, backgroundColor: C.negro, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, zIndex: 5 }}>
            <Text numberOfLines={2} style={{ fontFamily: F.negrita, fontSize: 11, color: '#FFFFFF' }}>{tocada.nombre}</Text>
            <Text style={{ fontFamily: F.media, fontSize: 9, color: '#CCCCCC' }}>{t('Aún no está en Dropper', 'Not on Dropper yet')}</Text>
          </View>
        ) : null}
        {alto ? aca.map((l) => {
          const d = dropDe[l.id];
          return (
            <Pressable key={l.id} onPress={() => (d ? alAbrir(d) : null)} accessibilityLabel={`${l.nombre}${d ? ' · drop' : ''}`}
              style={{ position: 'absolute', left: l.plano_x * W - (lam + 6) / 2, top: l.plano_y * H - (lam + (d ? 34 : 20)), width: lam + 6, alignItems: 'center', zIndex: d ? 2 : 1, ...derecho }}>
              {d ? (
                <View style={{ backgroundColor: C.amarillo, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, marginBottom: 2 }}>
                  <Text style={{ fontFamily: F.negrita, fontSize: 10 }}>{d.tipo === 'sorpresa' ? '¿?' : (precio(d.precio) || 'DROP')}</Text>
                </View>
              ) : null}
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 7, padding: 2, borderWidth: d ? 2 : 1, borderColor: d ? '#111111' : '#D9D9DF' }}>
                <ArteLocal id={l.id} categoria={l.categoria} pista={l.nombre} ancho={lam} alto={lam} borde={false} />
              </View>
              <Text numberOfLines={1} style={{ fontFamily: F.negrita, fontSize: 8, maxWidth: lam + 10, marginTop: 1 }}>{l.nombre}</Text>
            </Pressable>
          );
        }) : null}
            </View>
          </ScrollView>
        </ScrollView>
        {!compacto && alto ? (
          <View style={{ position: 'absolute', right: 8, top: 8, gap: 6 }}>
            <Pressable onPress={() => setZoom(Math.min(4, zoom * 1.5))} accessibilityRole="button" accessibilityLabel={t('Acercar', 'Zoom in')}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.borde, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.negrita, fontSize: 20 }}>+</Text>
            </Pressable>
            <Pressable onPress={() => setZoom(Math.max(1, zoom / 1.5))} accessibilityRole="button" accessibilityLabel={t('Alejar', 'Zoom out')}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.borde, alignItems: 'center', justifyContent: 'center', opacity: zoom > 1 ? 1 : 0.4 }}>
              <Text style={{ fontFamily: F.negrita, fontSize: 20 }}>−</Text>
            </Pressable>
            <Pressable onPress={async () => { if (brujula) setBrujula(false); else if (await pedirPermisoRumbo()) setBrujula(true); }} accessibilityRole="switch" accessibilityState={{ checked: brujula }} accessibilityLabel={t('Brújula', 'Compass')}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: brujula ? C.amarillo : '#FFFFFF', borderWidth: 1, borderColor: C.borde, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, transform: [{ rotate: `${-rumbo}deg` }] }}>🧭</Text>
            </Pressable>
          </View>
        ) : null}
        {alVerTodo ? (
          <Pressable onPress={alVerTodo} accessibilityRole="button"
            style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: C.negro, borderRadius: 16, paddingHorizontal: 14, height: 34, justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>{t('Ver plano →', 'Open map →')}</Text>
          </Pressable>
        ) : null}
      </View>

      {!compacto ? (
        <View style={{ gap: 8 }}>
          <Text style={{ ...letrista, fontSize: 18 }}>{conDrop.length ? t(`${conDrop.length} con drop en este piso`, `${conDrop.length} with a drop on this floor`) : t('Sin drops en este piso ahora', 'No drops on this floor right now')}</Text>
          {aca.map((l) => {
            const d = dropDe[l.id];
            return (
              <Pressable key={l.id} onPress={() => (d ? alAbrir(d) : null)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.papel, borderRadius: R(14), borderWidth: 1, borderColor: C.borde, padding: 10 }}>
                <ArteLocal id={l.id} categoria={l.categoria} pista={l.nombre} ancho={40} alto={40} borde={false} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.negrita, fontSize: 15 }} numberOfLines={1}>{l.nombre}</Text>
                  <Text style={{ fontFamily: F.media, fontSize: 12, color: C.gris }} numberOfLines={1}>{l.producto_estrella ? `★ ${l.producto_estrella}` : textoCategoria(l.categoria)}</Text>
                </View>
                {d ? <Text style={{ fontFamily: F.negrita, fontSize: 14, backgroundColor: C.amarillo, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' }}>{d.tipo === 'sorpresa' ? '¿?' : (precio(d.precio) || 'DROP')}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

// Pantalla completa del patio o mall
export default function Plano({ lugar, drops, alAbrir, alCerrar }) {
  const { t } = useIdioma();
  const n = Number(lugar.locales || 0);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={alCerrar} accessibilityRole="button" accessibilityLabel={t('Volver', 'Back')}
          style={{ width: 44, height: 44, borderRadius: R(16), backgroundColor: C.papel, borderWidth: 2, borderColor: C.borde, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 20 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 11, letterSpacing: 1.5 }}>{TIPO[lugar.tipo] || 'PATIO'} · {n} {n === 1 ? 'local' : 'locales'}</Text>
          <Text style={{ ...letrista, fontSize: 24 }} numberOfLines={1}>{lugar.nombre}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'center', paddingTop: 16 }}>
        <PosterLugar lugar={lugar} ancho={170} />
      </View>
      <View style={{ padding: 16 }}>
        <PlanoLugar lugar={lugar} drops={drops} alAbrir={alAbrir} />
      </View>
    </ScrollView>
  );
}

// Para el mapa: la tarjeta del lugar en HTML (web)
export function lugarHtml(g) {
  const esc = (x) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const n = Number(g.locales || 0);
  return `<div class="lugar-pin"><div class="lugar-carta"><i>${TIPO[g.tipo] || 'PATIO'}</i><b>${esc(g.nombre)}</b><span>${n} ${n === 1 ? 'local' : 'locales'} · ver plano</span></div><div class="lugar-punta"></div></div>`;
}
