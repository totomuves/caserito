import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import { puntosDe } from './barrios';
import { C, letrista, cuadras, textoCategoria } from './tema';
import { figuraDe } from './componentes';
import { paletaLocal, especialidad, COLOR_TIPO, urgente, etiquetaTag, centroPin, figuraPin, RUTA_PIN, filtrar, useCoordenadas, useLocalesMapa, SelectorBarrios, FiltrosMapa, HojaMapa } from './MapaComun';

// Estilo amarillo pálido del diseño "pantallas" (Google Maps en Android)
const ESTILO = [
  { elementType: 'geometry', stylers: [{ color: '#FFF3B0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B6B6B' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFF6E5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFF6E5' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E8D98A' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#BFD8B0' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#A9CBE8' }] },
];

// Mapa en el teléfono (Apple Maps / Google Maps). En la web se usa Mapa.web.js
export default function Mapa({ drops, pos, alAbrir, barrios = [], visita = null, alVisitar = () => {} }) {
  const vista = visita;
  const setVista = alVisitar;
  const mapa = useRef(null);
  function irA(b) {
    setVista(b);
    setSel(null);
    const c = b ? { lat: b.lat, lng: b.lng } : pos;
    if (mapa.current) mapa.current.animateToRegion({ latitude: c.lat, longitude: c.lng, latitudeDelta: b ? 0.018 : 0.012, longitudeDelta: b ? 0.018 : 0.012 }, 700);
  }
  const coords = useCoordenadas(drops);
  const locales = useLocalesMapa();
  const conDrop = new Set(drops.map((d) => d.local_id));
  const [sel, setSel] = useState(null);
  const [filtro, setFiltro] = useState('todo');
  const [cerca, setCerca] = useState(true);
  const visibles = filtrar(drops, filtro);

  return (
    <View style={{ flex: 1, zIndex: 0 }}>
      <MapView ref={mapa} onRegionChangeComplete={(r) => setCerca(r.latitudeDelta < 0.012)} style={{ flex: 1, backgroundColor: '#FFF3B0' }} showsUserLocation customMapStyle={ESTILO} showsPointsOfInterest={false}
        initialRegion={{ latitude: pos.lat, longitude: pos.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}>
        {barrios.map((b) => (
          <Polygon key={b.id} coordinates={puntosDe(b.limite).map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor={C.azul} strokeWidth={2} lineDashPattern={[8, 6]} fillColor="rgba(255,209,0,0.10)" tappable={false} />
        ))}
        {locales.filter((l) => !conDrop.has(l.id)).map((l, k) => (
          <Marker key={'l' + l.id + (cerca ? 'c' : 'l')} coordinate={{ latitude: l.punto.lat, longitude: l.punto.lng }} title={l.nombre}
            description={`${textoCategoria(l.categoria)}${l.producto_estrella ? ' · ★ ' + l.producto_estrella : ''} · sin drop ahora`} tracksViewChanges={false}>
            {cerca ? <LaminaMapa l={l} k={k} /> : <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.papel, borderWidth: 3, borderColor: C.negro }} />}
          </Marker>
        ))}
        {visibles.map((d) => coords[d.local_id] && (
          <Marker key={d.drop_id} coordinate={{ latitude: coords[d.local_id].lat, longitude: coords[d.local_id].lng }}
            onPress={() => setSel(d)} accessibilityLabel={`${d.local_nombre}, ${cuadras(d.cuadras)}`}>
            <Pin d={d} />
          </Marker>
        ))}
      </MapView>
      <SelectorBarrios barrios={barrios} vista={vista} alElegir={irA} />
      <FiltrosMapa drops={drops} filtro={filtro} alElegir={(f) => { setFiltro(f); setSel(null); }} arriba={barrios.length > 1 ? 58 : 10} />
      <HojaMapa drops={visibles} pos={pos} sel={sel} alAbrir={alAbrir} coords={coords} />
    </View>
  );
}

// Mini lámina del local (sin drop ahora): arte del rubro, ojos, nombre y su especialidad
function LaminaMapa({ l, k }) {
  const pal = paletaLocal(l.id);
  return (
    <View style={{ width: 76, padding: 3, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.negro, transform: [{ rotate: `${[-3, 2, -1, 3][k % 4]}deg` }] }}>
      <View style={{ height: 42, backgroundColor: pal.fondo, borderWidth: 2, borderColor: C.negro, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={46} height={46} viewBox="0 0 36 36" style={{ position: 'absolute', left: -10, top: -12 }}><Path d={RUTA_PIN[figuraDe(l.categoria)] || RUTA_PIN.circulo} fill={pal.figura} /></Svg>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {[0, 1].map((i) => <View key={i} style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.negro, alignItems: i ? 'flex-end' : 'flex-start', justifyContent: i ? 'flex-start' : 'flex-end' }}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.negro }} /></View>)}
        </View>
      </View>
      <Text numberOfLines={1} style={{ fontSize: 9.5, fontWeight: '800', marginTop: 2 }}>{l.nombre}</Text>
      <Text numberOfLines={1} style={{ fontSize: 8.5, fontWeight: '800', color: C.rojo }}>★ {especialidad(l)}</Text>
    </View>
  );
}

// Pin del diseño "pantallas": etiqueta girada (precio / ¿Sorpresa? / quedan) sobre una gota del color del tipo
function Pin({ d }) {
  const sorpresa = d.tipo === 'sorpresa';
  const grupal = d.tipo === 'grupal';
  const fp = figuraPin(d);
  return (
    <View style={{ alignItems: 'center', padding: 4 }}>
      <View>
        <View style={{ position: 'absolute', left: 3, top: 3, right: -3, bottom: -3, backgroundColor: sorpresa ? C.rojo : C.negro }} />
        <View style={{ backgroundColor: sorpresa ? C.negro : grupal ? C.papel : C.amarillo, borderWidth: 3, borderColor: urgente(d) ? '#B00020' : C.negro, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 1 }}>
          <Text style={{ ...letrista, fontSize: 15, color: sorpresa ? C.amarillo : C.negro }}>{etiquetaTag(d)}</Text>
        </View>
        {d.dentro_del_radio ? (
          <View style={{ position: 'absolute', top: -10, right: -12, backgroundColor: '#1F9D55', borderWidth: 2, borderColor: C.negro, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>¡AQUÍ!</Text>
          </View>
        ) : null}
      </View>
      <View style={{ width: 3, height: 9, backgroundColor: C.negro }} />
      <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={36} height={36} viewBox="0 0 36 36" style={{ position: 'absolute' }}><Path d={RUTA_PIN[fp.forma]} fill={fp.color} stroke={C.negro} strokeWidth={3} strokeLinejoin="miter" /></Svg>
        <Text style={{ fontSize: 12, fontWeight: '900', color: fp.texto, paddingTop: fp.forma === 'triangulo' ? 10 : fp.forma === 'cuarto' ? 8 : 0 }}>{centroPin(d)}</Text>
      </View>
    </View>
  );
}
