import React, { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { C, F, R, precio, ESTILO as SKIN } from './tema';
import { useCoordenadas, useLocalesMapa } from './MapaComun';
import { ArteLocal } from './arteLocal';
import { ESTILO as ESTILO_MAPA, ESTILO_MODERNO } from './Mapa';


export default function MiniMapa({ pos, yo, drops = [], alAbrir = () => {}, alVerMapa = () => {}, t = (a) => a, lugares = [], alAbrirLugar = () => {} }) {
  const coords = useCoordenadas(drops);
  const locales = useLocalesMapa();
  const centro = yo || pos;
  const mapa = useRef(null);
  // Te sigue sin cambiar el zoom que elegiste con los dedos
  const ultimoCentro = useRef(null);
  useEffect(() => {
    if (!centro) return;
    const u = ultimoCentro.current;
    if (u && Math.hypot((u.lat - centro.lat) * 111320, (u.lng - centro.lng) * 93000) < 6) return; // el GPS tiembla
    ultimoCentro.current = centro;
    if (mapa.current) mapa.current.animateCamera({ center: { latitude: centro.lat, longitude: centro.lng } }, { duration: 400 });
  }, [centro && centro.lat, centro && centro.lng]);
  // Brújula: el mapa gira con el teléfono
  const [brujula, setBrujula] = useState(false);
  useEffect(() => {
    if (!brujula) { if (mapa.current) mapa.current.animateCamera({ heading: 0 }, { duration: 300 }); return; }
    let sub, mostrado = null;
    Location.watchHeadingAsync((h) => {
      const rumbo = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      if (mostrado != null && Math.abs(((rumbo - mostrado + 540) % 360) - 180) < 3) return; // ignora el temblor del sensor
      mostrado = rumbo;
      if (mapa.current) mapa.current.animateCamera({ heading: rumbo }, { duration: 300 });
    }).then((s) => { sub = s; }).catch(() => setBrujula(false));
    return () => sub && sub.remove();
  }, [brujula]);
  if (!centro) return null;
  const delta = 0.0045; // como el zoom 17 del mapa
  return (
    <View style={{ marginHorizontal: 16, marginTop: 14, height: 300, borderRadius: R(20), overflow: 'hidden', borderWidth: 1, borderColor: C.borde, backgroundColor: SKIN === 'moderno' ? '#FFFFFF' : '#FFF3B0' }}>
      <MapView ref={mapa} style={{ flex: 1 }} scrollEnabled={false} zoomEnabled rotateEnabled={false} pitchEnabled={false}
        showsUserLocation={!!yo} showsPointsOfInterest={false} toolbarEnabled={false} customMapStyle={SKIN === 'moderno' ? ESTILO_MODERNO : ESTILO_MAPA}
        initialRegion={{ latitude: centro.lat, longitude: centro.lng, latitudeDelta: delta, longitudeDelta: delta }}>
        {lugares.map((lg) => (
          <Marker key={'g' + lg.id} coordinate={{ latitude: lg.lat, longitude: lg.lng }} anchor={{ x: 0.5, y: 1 }} onPress={() => alAbrirLugar(lg)} tracksViewChanges={false} zIndex={900}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ backgroundColor: '#111111', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }}>
                <Text style={{ fontFamily: F.negrita, fontSize: 8, letterSpacing: 1.5, color: C.amarillo }}>{lg.tipo === 'mall' ? 'MALL' : 'PATIO'}</Text>
                <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }} numberOfLines={1}>{lg.nombre}</Text>
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#111111' }} />
            </View>
          </Marker>
        ))}
        {(() => {
          const dropDe = {};
          drops.forEach((d) => { if (!dropDe[d.local_id]) dropDe[d.local_id] = d; });
          const puntos = locales.map((l) => ({ l, p: l.punto }));
          drops.forEach((d) => { if (!locales.some((l) => l.id === d.local_id) && coords[d.local_id]) puntos.push({ l: { id: d.local_id, nombre: d.local_nombre, categoria: d.categoria }, p: coords[d.local_id] }); });
          return puntos.map(({ l, p }) => {
            const d = dropDe[l.id];
            return (
              <Marker key={l.id} coordinate={{ latitude: p.lat, longitude: p.lng }} anchor={{ x: 0.5, y: 1 }} onPress={() => (d ? alAbrir(d) : alVerMapa())} tracksViewChanges={false}>
                <View style={{ alignItems: 'center', width: 50 }}>
                  {d ? (
                    <View style={{ backgroundColor: C.amarillo, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginBottom: 2 }}>
                      <Text style={{ fontFamily: F.negrita, fontSize: 10 }}>{d.tipo === 'sorpresa' ? '¿?' : (precio(d.precio) || 'DROP')}</Text>
                    </View>
                  ) : null}
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 2, borderWidth: d ? 2 : 1, borderColor: d ? '#111111' : '#D9D9DF' }}>
                    <ArteLocal id={l.id} categoria={l.categoria} pista={l.nombre} ancho={36} alto={36} borde={false} />
                  </View>
                  <Text numberOfLines={1} style={{ fontFamily: F.negrita, fontSize: 8, maxWidth: 48, marginTop: 1 }}>{l.nombre}</Text>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#111111', marginTop: 2 }} />
                </View>
              </Marker>
            );
          });
        })()}
      </MapView>
      <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: C.papel, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.borde }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>{yo ? t('Tú · 2 cuadras a la redonda', 'You · 2 blocks around') : t('Activa tu ubicación', 'Turn on location')}</Text>
      </View>
      <Pressable onPress={() => setBrujula(!brujula)} accessibilityRole="switch" accessibilityState={{ checked: brujula }} accessibilityLabel={t('Brújula: girar el mapa con el teléfono', 'Compass')}
        style={{ position: 'absolute', left: 10, bottom: 10, height: 34, paddingHorizontal: 12, borderRadius: 16, backgroundColor: brujula ? C.amarillo : C.papel, borderWidth: 1, borderColor: C.borde, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14 }}>🧭</Text>
        <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>{brujula ? t('Brújula activa', 'Compass on') : t('Brújula', 'Compass')}</Text>
      </Pressable>
      <Pressable onPress={alVerMapa} accessibilityRole="button" accessibilityLabel={t('Abrir mapa', 'Open map')}
        style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: C.negro, borderRadius: 16, paddingHorizontal: 14, height: 34, justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>{t('Ver mapa →', 'Map →')}</Text>
      </Pressable>
    </View>
  );
}
