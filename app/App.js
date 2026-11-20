import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import Svg, { Path } from 'react-native-svg';
import { useFonts, LuckiestGuy_400Regular } from '@expo-google-fonts/luckiest-guy';
import { Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { supabase, explicar } from './src/supabase';
import { C, F, BARRIO_ITALIA } from './src/tema';
import { IdiomaProvider, useIdioma } from './src/idioma';
import Inicio from './src/Inicio';
import Mapa from './src/Mapa';
import Album from './src/Album';
import Drop from './src/Drop';
import Ayuda from './src/Ayuda';

export default function App() {
  return <IdiomaProvider><Caserito /></IdiomaProvider>;
}

function Caserito() {
  const { t } = useIdioma();
  const [fuentes] = useFonts({ LuckiestGuy_400Regular, Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold });
  const [usuario, setUsuario] = useState(null);
  const [pos, setPos] = useState(null);
  const [drops, setDrops] = useState([]);
  const [pestana, setPestana] = useState('inicio');
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [lejos, setLejos] = useState(false);

  // 1) Sesión: los caseritos entran sin registrarse (ingreso anónimo)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      let u = data.session && data.session.user;
      if (!u) {
        const r = await supabase.auth.signInAnonymously();
        if (r.error) { setError(explicar(r.error)); setCargando(false); return; }
        u = r.data.user;
      }
      await supabase.rpc('mi_perfil');
      setUsuario(u);
    })();
  }, []);

  // 2) Ubicación (si no la da, usamos el centro de Barrio Italia)
  useEffect(() => {
    let sub;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setPos({ ...BARRIO_ITALIA, aprox: true }); return; }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 40 },
        (q) => setPos({ lat: q.coords.latitude, lng: q.coords.longitude }));
    })().catch(() => setPos({ ...BARRIO_ITALIA, aprox: true }));
    return () => sub && sub.remove();
  }, []);

  // 3) Drops vigentes cerca
  const cargar = useCallback(async () => {
    if (!usuario || !pos) return;
    let { data, error } = await supabase.rpc('drops_cerca', { lat: pos.lat, lng: pos.lng, radio_m: 3000 });
    // Lejos de Barrio Italia (o sin drops cerca): mostramos los del barrio, para que cualquiera pueda mirar
    let lejos = false;
    if (!error && (!data || data.length === 0) && !pos.aprox) {
      const r = await supabase.rpc('drops_cerca', { lat: BARRIO_ITALIA.lat, lng: BARRIO_ITALIA.lng, radio_m: 3000 });
      if (!r.error && r.data && r.data.length) {
        lejos = true;
        data = r.data.map((d) => ({ ...d, dentro_del_radio: false, cuadras: Math.max(d.cuadras, 99) }));
      }
    }
    if (error) setError(explicar(error)); else { setError(''); setDrops(data || []); setLejos(lejos); }
    setCargando(false);
  }, [usuario, pos]);

  useEffect(() => { cargar(); const t = setInterval(cargar, 30000); return () => clearInterval(t); }, [cargar]);

  if (!fuentes) return <View style={{ flex: 1, backgroundColor: C.crema }} />;

  const abrir = (d) => setAbierto(d.drop_id);
  const dropAbierto = drops.find((d) => d.drop_id === abierto);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={C.amarillo} />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.amarillo }} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: C.crema }}>
          {error ? (
            <View style={{ padding: 20, gap: 12 }}>
              <Text style={{ fontFamily: F.negrita, fontSize: 16 }}>{t('Algo falló', 'Oops, algo falló')}</Text>
              <Text style={{ fontFamily: F.normal, fontSize: 15 }}>{error}</Text>
              <Pressable onPress={cargar}><Text style={{ fontFamily: F.negrita, color: C.azul }}>{t('Reintentar', 'Try again')}</Text></Pressable>
            </View>
          ) : cargando ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.rojo} size="large" /></View>
          ) : dropAbierto ? (
            <Drop drop={dropAbierto} usuario={usuario} alCerrar={() => { setAbierto(null); cargar(); }} />
          ) : pestana === 'ayuda' ? (
            <Ayuda alCerrar={() => setPestana('inicio')} />
          ) : pestana === 'inicio' ? (
            <Inicio drops={drops} usuario={usuario} pos={pos} lejos={lejos} alAbrir={abrir} alRefrescar={cargar} alAyuda={() => setPestana('ayuda')} />
          ) : pestana === 'mapa' ? (
            <Mapa drops={drops} pos={lejos ? { ...BARRIO_ITALIA } : pos} alAbrir={abrir} />
          ) : (
            <Album usuario={usuario} alIrAlMapa={() => setPestana('mapa')} />
          )}

          {!dropAbierto && (
            <View style={{ position: 'absolute', left: 12, right: 12, bottom: 14, height: 64, backgroundColor: C.negro, borderRadius: 22, flexDirection: 'row' }}>
              <Tab id="inicio" texto={t("Inicio", "Home")} actual={pestana} setear={setPestana} d="M3 10l9-6 9 6M5 10v10h14V10M10 20v-5h4v5" />
              <Tab id="mapa" texto={t("Mapa", "Map")} actual={pestana} setear={setPestana} d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />
              <Tab id="album" texto={t("Álbum", "Album")} actual={pestana} setear={setPestana} d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 12h16M12 3v18" />
            </View>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Tab({ id, texto, actual, setear, d }) {
  const activa = id === actual;
  const color = activa ? C.amarillo : C.papel;
  return (
    <Pressable onPress={() => setear(id)} accessibilityRole="tab" accessibilityState={{ selected: activa }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d={d} /></Svg>
      <Text style={{ color, fontFamily: activa ? F.negrita : F.media, fontSize: 11 }}>{texto}</Text>
    </Pressable>
  );
}
