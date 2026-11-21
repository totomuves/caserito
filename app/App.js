import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
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
import Cuenta from './src/Cuenta';
import { barrioDe } from './src/barrios';
import { estadoAvisos, activarAvisos, descartarAvisos, ubicarAviso, alTocarAviso, avisarPuerta } from './src/avisos';

export default function App() {
  return <IdiomaProvider><Caserito /></IdiomaProvider>;
}

function Caserito() {
  const { t, tur } = useIdioma();
  const [fuentes] = useFonts({ LuckiestGuy_400Regular, Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold });
  const [usuario, setUsuario] = useState(null);
  const [pos, setPos] = useState(null);
  const [drops, setDrops] = useState([]);
  const [pestana, setPestana] = useState('inicio');
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [lejos, setLejos] = useState(false);
  const [centroLejos, setCentroLejos] = useState(null);
  // Barrio que el caserito va a visitar (null = donde está ahora)
  const [visita, setVisita] = useState(null);
  const [avisos, setAvisos] = useState(null);
  const [avisoMotivo, setAvisoMotivo] = useState('');

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
    // Cambios de cuenta: guardó su correo, entró a otra cuenta o cerró sesión
    const { data: escucha } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'SIGNED_OUT') {
        setTimeout(async () => { await supabase.auth.signInAnonymously(); await supabase.rpc('mi_perfil'); }, 0);
        return;
      }
      const u = sesion && sesion.user;
      if (!u) return;
      setUsuario((antes) => (antes && antes.id === u.id && antes.email === u.email && antes.is_anonymous === u.is_anonymous ? antes : u));
      if (evento === 'SIGNED_IN') setTimeout(() => supabase.rpc('mi_perfil'), 0);
    });
    return () => escucha.subscription.unsubscribe();
  }, []);

  // 1b) Barrios con sus límites (si el SQL 015 no está, se sigue como antes: solo Barrio Italia)
  const [barrios, setBarrios] = useState([]);
  useEffect(() => {
    if (!usuario) return;
    supabase.rpc('barrios_mapa').then(({ data, error }) => { if (!error && data) setBarrios(data); });
  }, [usuario]);

  // 2) Ubicación (si no la da, usamos el centro de Barrio Italia)
  useEffect(() => {
    let sub;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setPos({ ...BARRIO_ITALIA, aprox: true }); return; }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (q) => setPos({ lat: q.coords.latitude, lng: q.coords.longitude }));
    })().catch(() => setPos({ ...BARRIO_ITALIA, aprox: true }));
    return () => sub && sub.remove();
  }, []);

  // 3) Drops vigentes cerca
  const cargar = useCallback(async () => {
    if (!usuario || !pos) return;
    // Visitando otro barrio: sus drops, medidos desde el centro del barrio
    if (visita) {
      const r = await supabase.rpc('drops_cerca', { lat: visita.lat, lng: visita.lng, radio_m: 2000 });
      if (r.error) setError(explicar(r.error));
      else { setError(''); setDrops((r.data || []).map((d) => ({ ...d, dentro_del_radio: false, cuadras: Math.max(d.cuadras, 99) }))); setLejos(false); setCentroLejos(null); }
      setCargando(false);
      return;
    }
    let { data, error } = await supabase.rpc('drops_cerca', { lat: pos.lat, lng: pos.lng, radio_m: 3000 });
    // Sin drops cerca: mostramos los del barrio más cercano que tenga, para que cualquiera pueda mirar
    let lejos = false, mostrado = null;
    if (!error && (!data || data.length === 0) && !pos.aprox) {
      const { barrio } = barrioDe(pos, barrios);
      const candidatos = [barrio, ...barrios.filter((b) => b.lanzado && b !== barrio)].filter(Boolean)
        .map((b) => ({ lat: b.lat, lng: b.lng, nombre: b.nombre }));
      if (!candidatos.length) candidatos.push({ ...BARRIO_ITALIA, nombre: 'Barrio Italia' });
      for (const c of candidatos) {
        const r = await supabase.rpc('drops_cerca', { lat: c.lat, lng: c.lng, radio_m: 2000 });
        if (!r.error && r.data && r.data.length) {
          lejos = true; mostrado = c;
          data = r.data.map((d) => ({ ...d, dentro_del_radio: false, cuadras: Math.max(d.cuadras, 99) }));
          break;
        }
      }
    }
    if (error) setError(explicar(error)); else { setError(''); setDrops(data || []); setLejos(lejos); setCentroLejos(mostrado); }
    setCargando(false);
  }, [usuario, pos, barrios, visita]);

  // Si llegaste al barrio que ibas a visitar, la app vuelve sola a "Aquí" (para que se active tu QR)
  useEffect(() => {
    if (!visita || !pos || pos.aprox) return;
    const { barrio, dentro } = barrioDe(pos, barrios);
    if (dentro && barrio && barrio.id === visita.id) setVisita(null);
  }, [pos, visita, barrios]);

  useEffect(() => { cargar(); const t = setInterval(cargar, 30000); return () => clearInterval(t); }, [cargar]);

  // 5) Llegó desde el QR o el NFC de un local (?local=ID): abrimos su drop en vivo, sin pasos extra
  const localQr = useRef(Platform.OS === 'web' ? leerLocalQr() : null);
  const [avisoQr, setAvisoQr] = useState('');
  useEffect(() => {
    if (!localQr.current || cargando) return;
    const id = localQr.current;
    localQr.current = null;
    const suyos = drops.filter((d) => d.local_id === id);
    if (suyos.length) { setAbierto(suyos[0].drop_id); setPestana('inicio'); }
    else setAvisoQr('sin_drops');
  }, [cargando, drops]);

  // 4) Avisos push: si ya dio permiso, renovamos el token y el idioma al abrir
  const idioma = tur ? 'sp' : 'es';
  const hayPos = !!pos;
  useEffect(() => {
    if (!usuario || !hayPos) return;
    estadoAvisos().then((e) => {
      setAvisos(e);
      if (e === 'activo') activarAvisos({ idioma, pos, preguntar: false }).catch(() => {});
    });
  }, [usuario, hayPos, idioma]);
  useEffect(() => { if (avisos === 'activo' && usuario) ubicarAviso(pos); }, [pos, avisos, usuario]);
  // Llegó a la puerta de un local con drop: aviso con su QR listo
  useEffect(() => { if (avisos === 'activo' && !lejos) avisarPuerta(drops, tur); }, [drops, avisos, lejos, tur]);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;
  useEffect(() => alTocarAviso((id) => { setAbierto(id); setPestana('inicio'); cargarRef.current(); }), []);

  async function prenderAvisos() {
    const r = await activarAvisos({ idioma, pos, preguntar: true }).catch(() => ({ ok: false, motivo: 'error' }));
    if (r.ok) { setAvisos('activo'); setAvisoMotivo(''); }
    else { setAvisoMotivo(r.motivo); if (r.motivo === 'bloqueado') setAvisos('bloqueado'); }
  }
  function cerrarAvisos() { descartarAvisos(); setAvisos('descartado'); }

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
              <Pressable onPress={cargar}><Text style={{ fontFamily: F.negrita, color: C.azul }}>{t('Reintentar', "Intenta de nuevo · Try again")}</Text></Pressable>
            </View>
          ) : cargando ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.rojo} size="large" /></View>
          ) : dropAbierto ? (
            <Drop drop={dropAbierto} usuario={usuario} alCerrar={() => { setAbierto(null); cargar(); }} />
          ) : pestana === 'ayuda' ? (
            <Ayuda alCerrar={() => setPestana('inicio')} />
          ) : pestana === 'inicio' ? (
            <Inicio drops={drops} usuario={usuario} pos={pos} lejos={lejos} alAbrir={abrir} alRefrescar={cargar} alAyuda={() => setPestana('ayuda')}
              avisoQr={avisoQr} alCerrarAvisoQr={() => setAvisoQr('')} barrioActual={barrioDe(pos, barrios)} barrioLejos={centroLejos && centroLejos.nombre}
              barrios={barrios} visita={visita} alVisitar={setVisita}
              avisos={avisos} avisoMotivo={avisoMotivo} alPrenderAvisos={prenderAvisos} alCerrarAvisos={cerrarAvisos} />
          ) : pestana === 'tu' ? (
            <Cuenta key={usuario.id} usuario={usuario} alAyuda={() => setPestana('ayuda')} />
          ) : pestana === 'mapa' ? (
            <Mapa drops={drops} pos={visita ? { lat: visita.lat, lng: visita.lng } : lejos ? (centroLejos || { ...BARRIO_ITALIA }) : pos} alAbrir={abrir} barrios={barrios} visita={visita} alVisitar={setVisita} />
          ) : (
            <Album usuario={usuario} alIrAlMapa={() => setPestana('mapa')} barrios={barrios} barrioInicial={(visita || barrioDe(pos, barrios).barrio || {}).id} />
          )}

          {!dropAbierto && (
            <View style={{ position: 'absolute', left: 12, right: 12, bottom: 14, height: 64, backgroundColor: C.negro, borderRadius: 22, flexDirection: 'row', zIndex: 5000, elevation: 20 }}>
              <Tab id="inicio" texto={t("Inicio", "Inicio")} actual={pestana} setear={setPestana} d="M3 10l9-6 9 6M5 10v10h14V10M10 20v-5h4v5" />
              <Tab id="mapa" texto={t("Mapa", "Mapa")} actual={pestana} setear={setPestana} d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />
              <Tab id="album" texto={t("Álbum", "Álbum")} actual={pestana} setear={setPestana} d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 12h16M12 3v18" />
              <Tab id="tu" texto={t("Tú", "Tú")} actual={pestana} setear={setPestana} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
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

// Lee ?local=ID de la dirección (QR o NFC del local) y lo saca para que no se repita al recargar
function leerLocalQr() {
  try {
    const u = new URL(window.location.href);
    const id = u.searchParams.get('local');
    if (!id) return null;
    u.searchParams.delete('local');
    window.history.replaceState({}, '', u.pathname + u.search + u.hash);
    return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  } catch { return null; }
}
