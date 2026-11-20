import React, { useState } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { C, letrista, cuadras } from './tema';
import { COLOR_TIPO, etiquetaPin, useCoordenadas, HojaMapa } from './MapaComun';

// Mapa en el teléfono (Apple Maps / Google Maps). En la web se usa Mapa.web.js
export default function Mapa({ drops, pos, alAbrir }) {
  const coords = useCoordenadas(drops);
  const [sel, setSel] = useState(null);

  return (
    <View style={{ flex: 1, zIndex: 0 }}>
      <MapView style={{ flex: 1 }} showsUserLocation
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
