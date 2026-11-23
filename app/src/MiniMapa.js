import React from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import { C, F, R, precio } from './tema';
import { figuraPin, RUTA_PIN, useCoordenadas } from './MapaComun';

const RADIO = 200; // 2 cuadras a la redonda

export default function MiniMapa({ pos, yo, drops = [], alAbrir = () => {}, alVerMapa = () => {}, t = (a) => a }) {
  const coords = useCoordenadas(drops);
  const centro = yo || pos;
  if (!centro) return null;
  const delta = 0.0058; // ~ 2 cuadras por lado
  return (
    <View style={{ marginHorizontal: 16, marginTop: 14, height: 210, borderRadius: R(20), overflow: 'hidden', borderWidth: 1, borderColor: C.borde, backgroundColor: '#EEF0F3' }}>
      <MapView style={{ flex: 1 }} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
        showsUserLocation={!!yo} showsPointsOfInterest={false} toolbarEnabled={false}
        region={{ latitude: centro.lat, longitude: centro.lng, latitudeDelta: delta, longitudeDelta: delta }}>
        <Circle center={{ latitude: centro.lat, longitude: centro.lng }} radius={RADIO} strokeColor="#111111" strokeWidth={1.5} lineDashPattern={[6, 6]} fillColor="rgba(255,209,0,0.16)" />
        {drops.map((d) => {
          const p = coords[d.local_id];
          if (!p) return null;
          const fp = figuraPin(d);
          return (
            <Marker key={d.drop_id} coordinate={{ latitude: p.lat, longitude: p.lng }} anchor={{ x: 0.5, y: 0.95 }} onPress={() => alAbrir(d)} tracksViewChanges={false}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ backgroundColor: C.papel, borderRadius: 10, borderWidth: 1, borderColor: C.borde, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 2 }}>
                  <Text style={{ fontFamily: F.negrita, fontSize: 11 }}>{d.tipo === 'sorpresa' ? '¿?' : (precio(d.precio) || '★')}</Text>
                </View>
                <Svg width={18} height={18} viewBox="0 0 36 36"><Path d={RUTA_PIN[fp.forma]} fill={fp.color} stroke="#111" strokeWidth={3} /></Svg>
              </View>
            </Marker>
          );
        })}
      </MapView>
      <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: C.papel, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.borde }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>{yo ? t('Tú · 2 cuadras a la redonda', 'You · 2 cuadras around') : t('Activa tu ubicación', 'Turn on location')}</Text>
      </View>
      <Pressable onPress={alVerMapa} accessibilityRole="button" accessibilityLabel={t('Abrir mapa', 'Open map')}
        style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: C.negro, borderRadius: 16, paddingHorizontal: 14, height: 34, justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>{t('Ver mapa →', 'Map →')}</Text>
      </Pressable>
    </View>
  );
}
