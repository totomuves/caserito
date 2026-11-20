import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { C, letrista, cuadras } from './tema';
import { COLOR_TIPO, etiquetaPin, useCoordenadas, HojaMapa } from './MapaComun';

// Skin "papel de feria" para Google Maps (Android): crema, calles blancas, sin negocios de Google
const ESTILO_PAPEL = [
  { elementType: 'geometry', stylers: [{ color: '#F3E6CC' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4A4A4A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFF6E5' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#DCE3B5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFF6E5' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#FFE27A' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#B9D3E8' }] },
];

// Mapa en el teléfono (Apple Maps / Google Maps). En la web se usa Mapa.web.js
export default function Mapa({ drops, pos, alAbrir }) {
  const coords = useCoordenadas(drops);
  const [sel, setSel] = useState(null);

  return (
    <View style={{ flex: 1, zIndex: 0 }}>
      <MapView style={{ flex: 1 }} showsUserLocation mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        customMapStyle={ESTILO_PAPEL} showsPointsOfInterest={false} toolbarEnabled={false}
        initialRegion={{ latitude: pos.lat, longitude: pos.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}>
        {drops.map((d) => coords[d.local_id] && (
          <Marker key={d.drop_id} coordinate={{ latitude: coords[d.local_id].lat, longitude: coords[d.local_id].lng }}
            onPress={() => setSel(d)} accessibilityLabel={`${d.local_nombre}, ${cuadras(d.cuadras)}`}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ backgroundColor: d.tipo === 'sorpresa' ? C.negro : C.amarillo, borderWidth: 2, borderColor: C.negro, borderRadius: 6, paddingHorizontal: 6, paddingTop: 3 }}>
                <Text style={{ ...letrista, fontSize: 14, color: d.tipo === 'sorpresa' ? C.amarillo : C.negro }}>{etiquetaPin(d)}</Text>
              </View>
              <View style={{ width: 14, height: 14, marginTop: 2, borderRadius: 7, backgroundColor: COLOR_TIPO[d.tipo] || C.rojo, borderWidth: 2, borderColor: C.negro }} />
            </View>
          </Marker>
        ))}
      </MapView>
      <HojaMapa drops={drops} pos={pos} sel={sel} alAbrir={alAbrir} />
    </View>
  );
}
