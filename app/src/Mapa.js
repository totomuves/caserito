import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import { puntosDe } from './barrios';
import { C, letrista, cuadras, textoCategoria, ESTILO as SKIN } from './tema';
import { figuraDe } from './componentes';
import { ArteLocal } from './arteLocal';
import { LaminaPin, PosterPin } from './pinesNativo';
import { paletaLocal, especialidad, COLOR_TIPO, urgente, etiquetaTag, centroPin, figuraPin, RUTA_PIN, filtrar, useCoordenadas, useLocalesMapa, SelectorBarrios, FiltrosMapa, HojaMapa } from './MapaComun';

// Estilo amarillo pálido del diseño "pantallas" (Google Maps en Android)
// Moderno: fondo gris muy claro, calles blancas con borde marcado y nombres oscuros
export const ESTILO_MODERNO = [
  { elementType: 'geometry', stylers: [{ color: '#F4F4F4' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#222222' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }, { weight: 3 }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#FFD100' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#8A8A8A' }, { weight: 1.2 }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#FFD100' }, { weight: 3 }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#FFC400' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CFE3F3' }] },
];
export const ESTILO = [
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
export default function Mapa({ drops, pos, alAbrir, barrios = [], visita = null, alVisitar = () => {}, lugares = [], alAbrirLugar = () => {} }) {
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
      <MapView ref={mapa} onRegionChangeComplete={(r) => setCerca(r.latitudeDelta < 0.012)} style={{ flex: 1, backgroundColor: SKIN === 'moderno' ? '#FFFFFF' : '#FFF3B0' }} showsUserLocation customMapStyle={SKIN === 'moderno' ? ESTILO_MODERNO : ESTILO} showsPointsOfInterest={false}
        initialRegion={{ latitude: pos.lat, longitude: pos.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}>
        {barrios.map((b) => (
          <Polygon key={b.id} coordinates={puntosDe(b.limite).map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor={C.azul} strokeWidth={2} lineDashPattern={[8, 6]} fillColor="rgba(255,209,0,0.10)" tappable={false} />
        ))}
        {lugares.map((lg) => (
          <Marker key={'g' + lg.id} coordinate={{ latitude: lg.lat, longitude: lg.lng }} anchor={{ x: 0.5, y: 1 }} onPress={() => alAbrirLugar(lg)} tracksViewChanges={false} zIndex={800}>
            <PosterPin g={lg} />
          </Marker>
        ))}
        {(() => {
          // Igual que en el inicio: cada local es su lámina chica; los que tienen drop, con borde y precio
          const dropDe = {};
          visibles.forEach((d) => { if (!dropDe[d.local_id]) dropDe[d.local_id] = d; });
          const puntos = locales.map((l) => ({ l, p: l.punto }));
          visibles.forEach((d) => { if (!locales.some((l) => l.id === d.local_id) && coords[d.local_id]) puntos.push({ l: { id: d.local_id, nombre: d.local_nombre, categoria: d.categoria }, p: coords[d.local_id] }); });
          return puntos.map(({ l, p }) => {
            const d = dropDe[l.id];
            if (!cerca && !d) {
              return <Marker key={'p' + l.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={l.nombre} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#111111', borderWidth: 2, borderColor: '#FFFFFF' }} />
              </Marker>;
            }
            return (
              <Marker key={'l' + l.id} coordinate={{ latitude: p.lat, longitude: p.lng }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false} zIndex={d ? 500 : 0}
                title={d ? undefined : l.nombre} description={d ? undefined : `${textoCategoria(l.categoria)} · sin drop ahora`}
                onPress={d ? () => setSel(d) : undefined} accessibilityLabel={d ? `${d.local_nombre}, ${cuadras(d.cuadras)}` : l.nombre}>
                <LaminaPin l={l} d={d} />
              </Marker>
            );
          });
        })()}
      </MapView>
      <SelectorBarrios barrios={barrios} vista={vista} alElegir={irA} />
      <FiltrosMapa drops={drops} filtro={filtro} alElegir={(f) => { setFiltro(f); setSel(null); }} arriba={barrios.length > 1 ? 58 : 10} />
      <HojaMapa drops={visibles} pos={pos} sel={sel} alAbrir={alAbrir} coords={coords} />
    </View>
  );
}

// Mini lámina del local (sin drop ahora): arte del rubro, ojos, nombre y su especialidad
function LaminaMapa({ l, k }) {
  // La lámina flota sobre el pin de ubicación, inclinada en 3D, con su sombra en el suelo
  return (
    <View style={{ width: 96, height: 156, alignItems: 'center' }}>
      <View style={{ transform: [{ perspective: 320 }, { rotateX: '16deg' }, { rotateY: '-14deg' }, { rotate: `${[-3, 2, -1, 3][k % 4]}deg` }] }}>
        <View style={{ position: 'absolute', left: 4, top: 6, right: -4, bottom: -6, backgroundColor: C.negro }} />
        <TarjetaLamina l={l} />
      </View>
      <View style={{ flex: 1, width: 2, marginTop: 4, borderLeftWidth: 2, borderColor: C.borde, borderStyle: 'dashed' }} />
      <View style={{ width: 22, height: 22, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderBottomRightRadius: 11, borderBottomLeftRadius: 2, transform: [{ rotate: '-45deg' }], backgroundColor: C.negro, borderWidth: 2, borderColor: C.papel, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.amarillo }} />
      </View>
      <View style={{ width: 44, height: 10, borderRadius: 22, backgroundColor: 'rgba(17,17,17,0.25)', marginBottom: 2 }} />
    </View>
  );
}
function TarjetaLamina({ l }) {
  return (
    <View style={{ width: 88, padding: 3, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.borde }}>
      <View style={{ height: 44, borderWidth: 2, borderColor: C.borde, overflow: 'hidden' }}>
        <ArteLocal id={l.id} categoria={l.categoria} pista={l.nombre} ancho="100%" alto={44} borde={false} />
      </View>
      <Text numberOfLines={1} style={{ fontSize: 9.5, fontWeight: '800', marginTop: 2 }}>{l.nombre}</Text>
      <Text numberOfLines={2} style={{ fontSize: 8.5, lineHeight: 10, fontWeight: '800', color: C.rojo }}>★ {especialidad(l)}</Text>
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
          <View style={{ position: 'absolute', top: -10, right: -12, backgroundColor: '#1F9D55', borderWidth: 2, borderColor: C.borde, paddingHorizontal: 4 }}>
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
