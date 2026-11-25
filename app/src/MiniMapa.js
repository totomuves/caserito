import React, { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';
import { C, F, R, precio, ESTILO as SKIN } from './tema';
import { useCoordenadas, useLocalesMapa, traerRuta, PanelRuta, ANCHO_PANEL } from './MapaComun';
import { caminar } from './Drop';
import { ArteLocal } from './arteLocal';
import { LaminaPin, PosterPin } from './pinesNativo';
import { ESTILO as ESTILO_MAPA, ESTILO_MODERNO } from './Mapa';


export default function MiniMapa({ pos, yo, drops = [], alAbrir = () => {}, alVerMapa = () => {}, t = (a) => a, lugares = [], alAbrirLugar = () => {}, destino = null, alCerrarRuta = () => {}, radio = 200, textoRadio = '2 cuadras' }) {
  const coords = useCoordenadas(drops);
  const locales = useLocalesMapa();
  const centro = yo || pos;
  const mapa = useRef(null);
  const [ancho, setAncho] = useState(0);
  const [ruta, setRuta] = useState(null);
  const encuadre = useRef(null);
  // Ruta de "Cómo llegar" en el mapa chico, con las indicaciones en un panel a la izquierda
  useEffect(() => {
    if (!destino || !centro) { setRuta(null); encuadre.current = null; return; }
    let vivo = true;
    traerRuta(centro, destino).then((r) => {
      if (!vivo) return;
      setRuta(r);
      const clave = `${destino.lat},${destino.lng}`;
      if (encuadre.current !== clave && mapa.current) {
        encuadre.current = clave;
        const pts = (r ? r.puntos : [centro, destino]).map((p) => ({ latitude: p.lat, longitude: p.lng }));
        // te deja al centro de lo que no tapa el panel, con la ruta entera a la vista
        const lejos = Math.max(...pts.map((p) => Math.max(Math.abs(p.latitude - centro.lat), Math.abs(p.longitude - centro.lng))));
        const d = Math.max(0.0025, lejos * 2.4);
        mapa.current.animateToRegion({ latitude: centro.lat, longitude: centro.lng, latitudeDelta: d, longitudeDelta: d }, 400);
      }
    });
    return () => { vivo = false; };
  }, [destino && destino.lat, destino && destino.lng, centro && Math.round(centro.lat * 3700), centro && Math.round(centro.lng * 3100)]);
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
  // La distancia elegida manda: 2 cuadras muestra 2 cuadras a la redonda, 1 km muestra 1 km, etc.
  const deltaDe = (r) => (2 * r * 1.25) / 111320;
  useEffect(() => {
    if (!centro || destino || !mapa.current) return;
    const d = deltaDe(radio);
    mapa.current.animateToRegion({ latitude: centro.lat, longitude: centro.lng, latitudeDelta: d, longitudeDelta: d }, 400);
  }, [radio, !!destino]);
  if (!centro) return null;
  const delta = deltaDe(radio);
  return (
    <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)} style={{ marginHorizontal: 16, marginTop: 14, height: destino ? 330 : 300, borderRadius: R(20), overflow: 'hidden', borderWidth: 1, borderColor: C.borde, backgroundColor: SKIN === 'moderno' ? '#FFFFFF' : '#FFF3B0' }}>
      <MapView ref={mapa} style={{ flex: 1 }} mapPadding={{ top: 0, right: 0, bottom: 0, left: destino ? Math.round(ancho * ANCHO_PANEL) : 0 }} scrollEnabled={false} zoomEnabled rotateEnabled={false} pitchEnabled={false}
        showsUserLocation={!!yo} showsPointsOfInterest={false} toolbarEnabled={false} customMapStyle={SKIN === 'moderno' ? ESTILO_MODERNO : ESTILO_MAPA}
        initialRegion={{ latitude: centro.lat, longitude: centro.lng, latitudeDelta: delta, longitudeDelta: delta }}>
        {!destino ? <Circle center={{ latitude: centro.lat, longitude: centro.lng }} radius={radio} strokeColor="rgba(29,78,216,0.5)" strokeWidth={1.5} fillColor="rgba(29,78,216,0.05)" lineDashPattern={[6, 6]} /> : null}
        {ruta ? <Polyline coordinates={ruta.puntos.map((p) => ({ latitude: p.lat, longitude: p.lng }))} strokeColor="#111111" strokeWidth={9} lineCap="round" lineJoin="round" /> : null}
        {ruta ? <Polyline coordinates={ruta.puntos.map((p) => ({ latitude: p.lat, longitude: p.lng }))} strokeColor="#E30A2F" strokeWidth={5} lineCap="round" lineJoin="round" /> : null}
        {lugares.map((lg) => (
          <Marker key={'g' + lg.id} coordinate={{ latitude: lg.lat, longitude: lg.lng }} anchor={{ x: 0.5, y: 1 }} onPress={() => alAbrirLugar(lg)} tracksViewChanges={false} zIndex={900}>
            <PosterPin g={lg} />
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
                <LaminaPin l={l} d={d} />
              </Marker>
            );
          });
        })()}
      </MapView>
      {destino ? null : <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: C.papel, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.borde }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>{yo ? (yo.precision > 80 ? t(`Ubicación aproximada (±${yo.precision} m)`, `Approx. location (±${yo.precision} m)`) : t(`Tú · ${textoRadio}${yo.precision ? ` · ±${yo.precision} m` : ''}`, `You · ${textoRadio}`)) : t('Activa tu ubicación', 'Turn on location')}</Text>
      </View>}
      <Pressable onPress={() => setBrujula(!brujula)} accessibilityRole="switch" accessibilityState={{ checked: brujula }} accessibilityLabel={t('Brújula: girar el mapa con el teléfono', 'Compass')}
        style={{ position: 'absolute', left: destino ? Math.round(ancho * ANCHO_PANEL) + 10 : 10, bottom: 10, height: 34, paddingHorizontal: 12, borderRadius: 16, backgroundColor: brujula ? C.amarillo : C.papel, borderWidth: 1, borderColor: C.borde, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14 }}>🧭</Text>
        {destino ? null : <Text style={{ fontFamily: F.negrita, fontSize: 12 }}>{brujula ? t('Brújula activa', 'Compass on') : t('Brújula', 'Compass')}</Text>}
      </Pressable>
      {destino ? <PanelRuta destino={destino} ruta={ruta} yo={centro} alCerrar={alCerrarRuta} alExterno={() => caminar(destino)} /> : null}
      <Pressable onPress={alVerMapa} accessibilityRole="button" accessibilityLabel={t('Abrir mapa', 'Open map')}
        style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: C.negro, borderRadius: 16, paddingHorizontal: 14, height: 34, justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>{t('Ver mapa →', 'Map →')}</Text>
      </Pressable>
    </View>
  );
}
