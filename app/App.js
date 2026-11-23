import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import Svg, { Path } from 'react-native-svg';
import { useFonts, LuckiestGuy_400Regular } from '@expo-google-fonts/luckiest-guy';
import { Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { Jost_700Bold } from '@expo-google-fonts/jost/700Bold';
import { Jost_800ExtraBold } from '@expo-google-fonts/jost/800ExtraBold';
import { Anton_400Regular } from '@expo-google-fonts/anton/400Regular';
import { ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow/700Bold';
import { Gelasio_400Regular } from '@expo-google-fonts/gelasio/400Regular';
import { EstiloProvider, useEstilo } from './src/estilo';
import Cargando from './src/Cargando';
import { supabase, explicar, esDeRed } from './src/supabase';
import { C, F, BARRIO_ITALIA, R } from './src/tema';
import { IdiomaProvider, useIdioma } from './src/idioma';
import Inicio from './src/Inicio';
import Mapa from './src/Mapa';
import Album from './src/Album';
import Drop from './src/Drop';
import Plano from './src/Plano';
import { useLugares } from './src/MapaComun';
import Ayuda from './src/Ayuda';
import Cuenta from './src/Cuenta';
import { barrioDe } from './src/barrios';
import { estadoAvisos, activarAvisos, descartarAvisos, ubicarAviso, alTocarAviso, avisarPuerta, avisarBarrio } from './src/avisos';

export default function App() {
  return <Atajo><IdiomaProvider><EstiloProvider><Caserito /></EstiloProvider></IdiomaProvider></Atajo>;
}

// Si algo se cae, mostramos el error en vez de una pantalla vacía (y se puede reintentar)
class Atajo extends React.Component {
  constructor(p) { super(p); this.state = { error: null, n: 0 }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { this.pila = (info && info.componentStack || '').split('\n').filter(Boolean).slice(0, 6).join('\n'); }
  render() {
    if (!this.state.error) return <React.Fragment key={this.state.n}>{this.props.children}</React.Fragment>;
    return (
      <View style={{ flex: 1, backgroundColor: '#FFD100', padding: 24, paddingTop: 70, gap: 12 }}>
        <Text style={{ fontWeight: '800', fontSize: 22 }}>Uy, algo falló</Text>
        <Text selectable style={{ fontSize: 14 }}>{String(this.state.error && (this.state.error.message || this.state.error))}</Text>
        <Text selectable style={{ fontSize: 11, color: '#4A4A4A' }}>{this.pila}</Text>
        <Pressable onPress={() => this.setState({ error: null, n: this.state.n + 1 })} style={{ backgroundColor: '#111', borderRadius: 12, padding: 14, alignItems: 'center' }}>
          <Text style={{ color: '#FFF', fontWeight: '800' }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }
}

function Caserito() {
  const { t, tur } = useIdioma();
  const [paciencia, setPaciencia] = useState(false);
  useEffect(() => { const x = setTimeout(() => setPaciencia(true), 4000); return () => clearTimeout(x); }, []);
  const [fuentes, errorFuentes] = useFonts({ LuckiestGuy_400Regular, Jost_700Bold, Jost_800ExtraBold, Anton_400Regular, ArchivoNarrow_700Bold, Gelasio_400Regular, Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold });
  const [usuario, setUsuario] = useState(null);
  const [pos, setPos] = useState(null);
  const [drops, setDrops] = useState([]);
  const [pestana, setPestana] = useState('inicio');
  const [abierto, setAbierto] = useState(null);
  const [lugarAbierto, setLugarAbierto] = useState(null);
  const lugares = useLugares();
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
        let r = await supabase.auth.signInAnonymously();
        for (let i = 0; i < 5 && r.error && esDeRed(r.error); i++) { await new Promise((ok) => setTimeout(ok, 2000)); r = await supabase.auth.signInAnonymously(); }
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
    // Solo cambiamos la posición si te moviste de verdad (> 8 m): el GPS tiembla y no queremos recargar por nada
    const mover = (c) => {
      const nueva = { lat: c.latitude, lng: c.longitude, precision: Math.round(c.accuracy || 0) };
      setPos((x) => {
        if (!x || x.aprox) return nueva;
        const m = Math.hypot((x.lat - nueva.lat) * 111320, (x.lng - nueva.lng) * 93000);
        return m > 8 ? nueva : x;
      });
    };
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setPos({ ...BARRIO_ITALIA, aprox: true }); return; }
      // Nunca quedarse pegado esperando el GPS: primero la última conocida, y si nada llega en 8 s, Barrio Italia (aprox)
      setTimeout(() => setPos((x) => x || { ...BARRIO_ITALIA, aprox: true }), 8000);
      // Seguimiento continuo desde el principio: aunque la primera lectura falle, la ubicación real llega igual
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        // En el navegador vamos directo al GPS del teléfono (más confiable para seguirte mientras caminas)
        const id = navigator.geolocation.watchPosition(
          (q) => mover(q.coords),
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
        sub = { remove: () => navigator.geolocation.clearWatch(id) };
      } else {
        Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
          (q) => mover(q.coords)).then((s) => { sub = s; }).catch(() => {});
      }
      const u = await Location.getLastKnownPositionAsync().catch(() => null);
      if (u) setPos((x) => (x && !x.aprox ? x : { lat: u.coords.latitude, lng: u.coords.longitude, precision: Math.round(u.coords.accuracy || 0) }));
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (p) mover(p.coords);
    })().catch(() => setPos({ ...BARRIO_ITALIA, aprox: true }));
    return () => sub && sub.remove();
  }, []);

  // 3) Drops vigentes cerca
  // La búsqueda de drops solo se rehace si te moviste más de 40 m (o cada 30 s)
  const [posBusqueda, setPosBusqueda] = useState(null);
  useEffect(() => {
    if (!pos) return;
    setPosBusqueda((b) => {
      if (!b || b.aprox !== pos.aprox) return pos;
      return Math.hypot((b.lat - pos.lat) * 111320, (b.lng - pos.lng) * 93000) > 40 ? pos : b;
    });
  }, [pos]);
  // Mapa: TODOS los drops vigentes de la ciudad (no solo los cercanos); el inicio sigue mostrando lo de cerca
  const [dropsMapa, setDropsMapa] = useState([]);
  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    const base = posBusqueda && !posBusqueda.aprox ? posBusqueda : BARRIO_ITALIA;
    const traer = () => supabase.rpc('drops_cerca', { lat: base.lat, lng: base.lng, radio_m: 60000 }).then(({ data, error }) => {
      if (vivo && !error && data) setDropsMapa(data);
    });
    traer();
    const t = setInterval(traer, 60000);
    return () => { vivo = false; clearInterval(t); };
  }, [usuario, posBusqueda && Math.round(posBusqueda.lat * 100), posBusqueda && Math.round(posBusqueda.lng * 100)]);
  const dropsDelMapa = React.useMemo(() => { const m = new Map(dropsMapa.map((d) => [d.drop_id, d])); drops.forEach((d) => m.set(d.drop_id, d)); return [...m.values()]; }, [dropsMapa, drops]);
  const turno = useRef(0);
  const dropsRef = useRef([]);
  dropsRef.current = drops; // si llegan respuestas desordenadas, solo vale la última pedida
  const cargar = useCallback(async () => {
    if (!usuario || !posBusqueda) return;
    const pos = posBusqueda;
    const mio = ++turno.current;
    const vigente = () => mio === turno.current;
    // Visitando otro barrio: sus drops, medidos desde el centro del barrio
    if (visita) {
      const r = await supabase.rpc('drops_cerca', { lat: visita.lat, lng: visita.lng, radio_m: 2000 });
      if (!vigente()) return;
      if (r.error) { if (esDeRed(r.error)) { setTimeout(() => cargarRef2.current && cargarRef2.current(), 3000); return; } setError(explicar(r.error)); }
      else { setError(''); setDrops((r.data || []).map((d) => ({ ...d, dentro_del_radio: false, cuadras: Math.max(d.cuadras, 99) }))); setLejos(false); setCentroLejos(null); }
      setCargando(false);
      return;
    }
    let data = [], error = null;
    if (!pos.aprox) {
      let r = await supabase.rpc('drops_cerca', { lat: pos.lat, lng: pos.lng, radio_m: 3000 });
      // Si viene vacío pero ya estabas viendo drops cerca, confirmamos una vez más antes de borrarlos
      if (!r.error && !(r.data || []).length && dropsRef.current.some((d) => !d.lejos_marca && new Date(d.termina_at) > new Date())) {
        await new Promise((ok) => setTimeout(ok, 1500));
        r = await supabase.rpc('drops_cerca', { lat: pos.lat, lng: pos.lng, radio_m: 3000 });
      }
      data = r.data || []; error = r.error;
    }
    // Sin drops cerca (o sin tu ubicación): los del barrio más cercano que tenga, para que cualquiera pueda mirar
    let lejos = false, mostrado = null;
    if (!error && data.length === 0) {
      const lista = barrios.length ? barrios : [{ ...BARRIO_ITALIA, nombre: 'Barrio Italia' }];
      const cerca = (b) => (pos.aprox ? (b.lanzado ? 0 : 1) : Math.hypot(b.lat - pos.lat, b.lng - pos.lng));
      const candidatos = [...lista].sort((a, b) => cerca(a) - cerca(b)).map((b) => ({ lat: b.lat, lng: b.lng, nombre: b.nombre }));
      for (const c of candidatos) {
        const r = await supabase.rpc('drops_cerca', { lat: c.lat, lng: c.lng, radio_m: 2000 });
        if (!r.error && r.data && r.data.length) {
          lejos = true; mostrado = c;
          data = r.data.map((d) => ({ ...d, dentro_del_radio: false, cuadras: Math.max(d.cuadras, 99), lejos_marca: true }));
          break;
        }
      }
    }
    if (!vigente()) return;
    if (error) {
      // Sin conexión (o el teléfono volvió de segundo plano): no mostramos error, reintentamos solos en 3 s
      if (esDeRed(error)) { setTimeout(() => cargarRef2.current && cargarRef2.current(), 3000); return; }
      if (!dropsRef.current.length) setError(explicar(error));
    }
    else { setError(''); setDrops(data || []); setLejos(lejos); setCentroLejos(mostrado); }
    setCargando(false);
  }, [usuario, posBusqueda, barrios, visita]);
  const cargarRef2 = useRef(null);
  cargarRef2.current = cargar;
  // Al volver a la app o recuperar internet, se actualiza al tiro
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const otraVez = () => { if (document.visibilityState !== 'hidden') { setError(''); cargarRef2.current && cargarRef2.current(); } };
    window.addEventListener('online', otraVez);
    document.addEventListener('visibilitychange', otraVez);
    return () => { window.removeEventListener('online', otraVez); document.removeEventListener('visibilitychange', otraVez); };
  }, []);

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
  // Al entrar al perímetro de un barrio: aviso tipo "red disponible" (una vez al día por barrio)
  const dentroDeBarrio = (() => { const r = barrioDe(pos, barrios); return r && r.dentro ? r.barrio : null; })();
  useEffect(() => { if (avisos === 'activo' && dentroDeBarrio) avisarBarrio(dentroDeBarrio, drops.length, tur); }, [dentroDeBarrio && dentroDeBarrio.id, avisos]);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;
  useEffect(() => alTocarAviso((id) => { setAbierto(id); setPestana('inicio'); cargarRef.current(); }), []);

  async function prenderAvisos() {
    const r = await activarAvisos({ idioma, pos, preguntar: true }).catch(() => ({ ok: false, motivo: 'error' }));
    if (r.ok) { setAvisos('activo'); setAvisoMotivo(''); }
    else { setAvisoMotivo(r.motivo); if (r.motivo === 'bloqueado') setAvisos('bloqueado'); }
  }
  function cerrarAvisos() { descartarAvisos(); setAvisos('descartado'); }

  // Estilo del barrio donde estás o al que vas (si el admin le asignó uno)
  const { estilo, setEstiloBarrio } = useEstilo();
  const barrioAhora = visita || (barrioDe(pos, barrios) || {}).barrio;
  const estiloBarrio = (barrioAhora && barrioAhora.estilo) || null;
  useEffect(() => { setEstiloBarrio(estiloBarrio); }, [estiloBarrio]);

  // Si las fuentes fallan o se demoran, seguimos con las del sistema (nunca quedarse pegado)
  if (!fuentes && !errorFuentes && !paciencia) return <Cargando texto="Droper" />;

  const abrir = (d) => setAbierto(d.drop_id);
  const dropAbierto = drops.find((d) => d.drop_id === abierto);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={C.amarillo} />
      <SafeAreaView key={estilo} style={{ flex: 1, backgroundColor: C.amarillo }} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: C.crema }}>
          {error ? (
            <View style={{ padding: 20, gap: 12 }}>
              <Text style={{ fontFamily: F.negrita, fontSize: 16 }}>{t('Algo falló', 'Oops, algo falló')}</Text>
              <Text style={{ fontFamily: F.normal, fontSize: 15 }}>{error}</Text>
              <Pressable onPress={cargar}><Text style={{ fontFamily: F.negrita, color: C.azul }}>{t('Reintentar', "Intenta de nuevo · Try again")}</Text></Pressable>
            </View>
          ) : cargando ? (
            <Cargando fuente={F.negrita} texto={t('Buscando drops cerca…', 'Buscando drops cerca… · Finding drops')} />
          ) : dropAbierto ? (
            <Drop drop={dropAbierto} usuario={usuario} alCerrar={() => { setAbierto(null); cargar(); }} />
          ) : lugarAbierto ? (
            <Plano lugar={lugarAbierto} drops={drops} alAbrir={abrir} alCerrar={() => setLugarAbierto(null)} />
          ) : pestana === 'ayuda' ? (
            <Ayuda alCerrar={() => setPestana('inicio')} />
          ) : pestana === 'inicio' ? (
            <Inicio drops={drops} usuario={usuario} pos={pos} alVerMapa={() => setPestana('mapa')} lejos={lejos} alAbrir={abrir} alRefrescar={cargar} alAyuda={() => setPestana('ayuda')}
              avisoQr={avisoQr} alCerrarAvisoQr={() => setAvisoQr('')} barrioActual={barrioDe(pos, barrios)} barrioLejos={centroLejos && centroLejos.nombre}
              barrios={barrios} visita={visita} alVisitar={setVisita} lugares={lugares} alAbrirLugar={setLugarAbierto}
              avisos={avisos} avisoMotivo={avisoMotivo} alPrenderAvisos={prenderAvisos} alCerrarAvisos={cerrarAvisos} />
          ) : pestana === 'tu' ? (
            <Cuenta key={usuario.id} usuario={usuario} alAyuda={() => setPestana('ayuda')} />
          ) : pestana === 'mapa' ? (
            <Mapa drops={dropsDelMapa} pos={visita ? { lat: visita.lat, lng: visita.lng } : lejos ? (centroLejos || { ...BARRIO_ITALIA }) : pos} yo={pos && !pos.aprox ? pos : null} alAbrir={abrir} barrios={barrios} visita={visita} alVisitar={setVisita} lugares={lugares} alAbrirLugar={setLugarAbierto} />
          ) : (
            <Album usuario={usuario} alIrAlMapa={() => setPestana('mapa')} barrios={barrios} barrioInicial={(visita || barrioDe(pos, barrios).barrio || {}).id} />
          )}

          {!dropAbierto && (
            <View style={{ position: 'absolute', left: 12, right: 12, bottom: 14, height: 64, backgroundColor: C.papel, borderWidth: estilo === 'moderno' ? 1 : 3, borderColor: C.borde, borderRadius: R(22), overflow: 'hidden', flexDirection: 'row', zIndex: 5000, elevation: 20, shadowColor: C.sombra, shadowOffset: estilo === 'moderno' ? { width: 0, height: 6 } : { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: estilo === 'moderno' ? 14 : 0 }}>
              <Tab id="inicio" texto={t("Inicio", "Inicio")} actual={pestana} setear={(p) => { setLugarAbierto(null); setPestana(p); }} figura="cuadrado" fondo={C.amarillo} />
              <Tab id="mapa" texto={t("Mapa", "Mapa")} actual={pestana} setear={(p) => { setLugarAbierto(null); setPestana(p); }} figura="circulo" fondo={C.rojo} />
              <Tab id="album" texto={t("Álbum", "Álbum")} actual={pestana} setear={(p) => { setLugarAbierto(null); setPestana(p); }} figura="triangulo" fondo={C.azul} />
              <Tab id="tu" texto={t("Tú", "Tú")} actual={pestana} setear={(p) => { setLugarAbierto(null); setPestana(p); }} figura="cuarto" fondo={C.negro} />
            </View>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// Pestañas Bauhaus: cada una con su figura (cuadrado, círculo, triángulo, cuarto de círculo)
const ICONOS_CLASICOS = {
  inicio: 'M3 10l9-6 9 6M5 10v10h14V10M10 20v-5h4v5',
  mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  album: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 12h16M12 3v18',
  tu: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
};
const FIGURAS = {
  cuadrado: 'M3 3h18v18H3z',
  circulo: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z',
  triangulo: 'M12 3L21 21H3z',
  cuarto: 'M3 21A18 18 0 0 1 21 3V21z',
};
function Tab({ id, texto, actual, setear, figura, fondo }) {
  const activa = id === actual;
  const { estilo } = useEstilo();
  if (estilo === 'moderno') {
    return (
      <Pressable onPress={() => setear(id)} accessibilityRole="tab" accessibilityState={{ selected: activa }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 16, backgroundColor: activa ? C.amarillo : 'transparent' }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.negro} strokeWidth={activa ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round"><Path d={ICONOS_CLASICOS[id]} /></Svg>
        </View>
        <Text style={{ color: activa ? C.negro : C.gris, fontFamily: activa ? F.negrita : F.media, fontSize: 11 }}>{texto}</Text>
      </Pressable>
    );
  }
  if (estilo === 'clasico') {
    const color = activa ? C.amarillo : C.papel;
    return (
      <Pressable onPress={() => setear(id)} accessibilityRole="tab" accessibilityState={{ selected: activa }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: C.negro }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d={ICONOS_CLASICOS[id]} /></Svg>
        <Text style={{ color, fontFamily: activa ? F.negrita : F.media, fontSize: 11 }}>{texto}</Text>
      </Pressable>
    );
  }
  if (estilo === 'diario') {
    return (
      <Pressable onPress={() => setear(id)} accessibilityRole="tab" accessibilityState={{ selected: activa }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: activa ? '#D7261E' : C.negro }}>
        <Text style={{ color: '#FFFFFF', fontFamily: F.titular, fontSize: 15 }}>{id === 'inicio' ? 'PORTADA' : texto.toUpperCase()}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={() => setear(id)} accessibilityRole="tab" accessibilityState={{ selected: activa }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: activa ? C.amarillo : 'transparent', borderRightWidth: id === 'tu' ? 0 : 3, borderColor: C.borde }}>
      <Svg width={22} height={22} viewBox="0 0 24 24"><Path d={FIGURAS[figura]} fill={activa ? fondo : C.papel} stroke={C.negro} strokeWidth={2.5} strokeLinejoin="miter" /></Svg>
      <Text style={{ color: C.negro, fontFamily: activa ? F.negrita : F.media, fontSize: 11 }}>{texto}</Text>
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
