import React, { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { C, F, R, precio, ESTILO as SKIN } from './tema';
import { useCoordenadas, useLocalesMapa } from './MapaComun';
import { ArteLocal } from './arteLocal';
import { ESTILO as ESTILO_MAPA, ESTILO_MODERNO } from './Mapa';


export default function MiniMapa({ pos, yo, drops = [], alAbrir = () => {}, alVerMapa = () => {}, t = (a) => a }) {
  const coords = useCoordenadas(drops);
  const locales = useLocalesMapa();
  const centro = yo || pos;
  const mapa = useRef(null);
  // Te sigue sin cambiar el zoom que elegiste con los dedos
  useEffect(() => {
    if (mapa.current && centro) mapa.current.animateCamera({ center: { latitude: centro.lat, longitude: centro.lng } }, { duration: 400 });
  }, [centro && centro.lat, centro && centro.lng]);
  if (!centro) return null;
  const delta = 0.0045; // como el zoom 17 del mapa
  return (
    <View style={{ marginHorizontal: 16, marginTop: 14, height: 300, borderRadius: R(20), overflow: 'hidden', borderWidth: 1, borderColor: C.borde, backgroundColor: SKIN === 'moderno' ? '#FFFFFF' : '#FFF3B0' }}>
      <MapView ref={mapa} style={{ flex: 1 }} scrollEnabled={false} zoomEnabled rotateEnabled={false} pitchEnabled={false}
        showsUserLocation={!!yo} showsPointsOfInterest={false} toolbarEnabled={false} customMapStyle={SKIN === 'moderno' ? ESTILO_MODERNO : ESTILO_MAPA}
        initialRegion={{ latitude: centro.lat, longitude: centro.lng, latitudeDelta: delta, longitudeDelta: delta }}>
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
                    <ArteLocal id={l.id} categoria={l.categoria} ancho={36} alto={36} borde={false} />
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
      <Pressable onPress={alVerMapa} accessibilityRole="button" accessibilityLabel={t('Abrir mapa', 'Open map')}
        style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: C.negro, borderRadius: 16, paddingHorizontal: 14, height: 34, justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>{t('Ver mapa →', 'Map →')}</Text>
      </Pressable>
    </View>
  );
}
