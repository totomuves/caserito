import React, { useState } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { puntosDe } from './barrios';
import { C, letrista, cuadras, textoCategoria } from './tema';
import { COLOR_TIPO, CINTA_TIPO, urgente, etiquetaPin, useCoordenadas, useLocalesMapa, HojaMapa } from './MapaComun';

// Mapa en el teléfono (Apple Maps / Google Maps). En la web se usa Mapa.web.js
export default function Mapa({ drops, pos, alAbrir, barrios = [] }) {
  const coords = useCoordenadas(drops);
  const locales = useLocalesMapa();
  const conDrop = new Set(drops.map((d) => d.local_id));
  const [sel, setSel] = useState(null);

  return (
    <View style={{ flex: 1, zIndex: 0 }}>
      <MapView style={{ flex: 1 }} showsUserLocation
        initialRegion={{ latitude: pos.lat, longitude: pos.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}>
        {barrios.map((b) => (
          <Polygon key={b.id} coordinates={puntosDe(b.limite).map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor={C.azul} strokeWidth={2} lineDashPattern={[8, 6]} fillColor="rgba(255,209,0,0.10)" tappable={false} />
        ))}
        {locales.filter((l) => !conDrop.has(l.id)).map((l) => (
          <Marker key={'l' + l.id} coordinate={{ latitude: l.punto.lat, longitude: l.punto.lng }} title={l.nombre}
            description={`${textoCategoria(l.categoria)} · sin drop ahora`} tracksViewChanges={false}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.papel, borderWidth: 3, borderColor: C.negro }} />
          </Marker>
        ))}
        {drops.map((d) => coords[d.local_id] && (
          <Marker key={d.drop_id} coordinate={{ latitude: coords[d.local_id].lat, longitude: coords[d.local_id].lng }}
            onPress={() => setSel(d)} accessibilityLabel={`${d.local_nombre}, ${cuadras(d.cuadras)}`}>
            <Cartel d={d} />
          </Marker>
        ))}
      </MapView>
      <HojaMapa drops={drops} pos={pos} sel={sel} alAbrir={alAbrir} />
    </View>
  );
}

// Cartel de feria para cada drop: cinta con el tipo, precio a pincel, sombra dura y palito
function Cartel({ d }) {
  const color = COLOR_TIPO[d.tipo] || C.rojo;
  const sorpresa = d.tipo === 'sorpresa';
  const giro = [-5, 3, -2, 4][(d.drop_id || '').charCodeAt(0) % 4 || 0];
  return (
    <View style={{ alignItems: 'center', paddingRight: 3, paddingBottom: 3 }}>
      <View style={{ transform: [{ rotate: `${giro}deg` }] }}>
        <View style={{ position: 'absolute', left: 3, top: 3, right: -3, bottom: -3, backgroundColor: C.negro, borderRadius: 8 }} />
        <View style={{ backgroundColor: sorpresa ? C.negro : C.amarillo, borderWidth: 2.5, borderColor: C.negro, borderRadius: 8, overflow: 'hidden', alignItems: 'center', minWidth: 62 }}>
          <View style={{ backgroundColor: color, alignSelf: 'stretch', paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFF6E5', textAlign: 'center', letterSpacing: 0.6 }}>{CINTA_TIPO[d.tipo] || 'DROP'}</Text>
          </View>
          <Text style={{ ...letrista, fontSize: 18, color: sorpresa ? C.amarillo : C.negro, paddingHorizontal: 6, paddingTop: 3 }}>{etiquetaPin(d)}</Text>
          {d.tipo !== 'recien_llegado' ? (
            <Text style={{ fontSize: 10, fontWeight: '800', color: urgente(d) ? '#B00020' : sorpresa ? C.amarillo : C.negro, paddingBottom: 3 }}>
              {d.quedan <= 3 ? `¡quedan ${d.quedan}!` : `quedan ${d.quedan}`}
            </Text>
          ) : <View style={{ height: 4 }} />}
        </View>
        {d.dentro_del_radio ? (
          <View style={{ position: 'absolute', top: -8, right: -6, backgroundColor: '#1F9D55', borderWidth: 2, borderColor: C.negro, borderRadius: 8, paddingHorizontal: 4, transform: [{ rotate: '8deg' }] }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>¡AQUÍ!</Text>
          </View>
        ) : null}
      </View>
      <View style={{ width: 3, height: 10, backgroundColor: C.negro }} />
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, borderWidth: 2.5, borderColor: C.negro, marginTop: -1 }} />
    </View>
  );
}

