import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { supabase } from './supabase';
import { C, F, letrista, CATEGORIAS, textoCategoria, tieneCategoria, precio, cuadras, R, ESTILO, sobrio, fondoBanner, tintaBanner, acentoBanner, bannerClaro } from './tema';
import { Ola, Brillo, Pildora, EtiquetaPrecio, Boton, FondoBauhaus, PuntosPop, GloboPop, Estallido, ONOMATOPEYAS, Seguro, Tintineo } from './componentes';
import { useIdioma, FraseGlosario, CATEGORIA_TUR, categoriaTur, SelectorIdioma } from './idioma';
import Logo from './Logo';
import { SelectorBarrios, useCoordenadas, lugarDe } from './MapaComun';
import { useEstilo } from './estilo';
import Portada from './Portada';
import MiniMapa from './MiniMapa';
import { PlanoLugar } from './Plano';
import { marcarVisitado } from './Poster';
import { ArteLocal } from './arteLocal';
import { caminar } from './Drop';
import { registrar } from './seguir';
import Svg, { Path } from 'react-native-svg';

function etiquetaPara(d, hora, t, cuad) {
  if (d.tipo === 'grupal') return t('¡ENTRE TODOS!', "¡ENTRE TODOS! GROUP DROP");
  if (d.tipo === 'recien_llegado') return t('¡RECIÉN LLEGADO!', "¡RECIÉN LLEGADO! JUST IN");
  if (d.tipo === 'sorpresa') return t('¿UNA SORPRESA?', "¿SORPRESA? MYSTERY DROP");
  if (d.categoria === 'comer' && hora >= 12 && hora < 15) return t('HORA DE ALMUERZO', "HORA DE ALMUERZO · LUNCH");
  if (d.categoria === 'cafe' && hora >= 15 && hora < 19) return t('TU CAFÉ DE LA TARDE', "CAFECITO DE LA TARDE · COFFEE");
  return cuad(d.cuadras).toUpperCase();
}

export default function Inicio({ drops, usuario, lejos, alAbrir, alRefrescar, alAyuda, avisos, avisoMotivo, alPrenderAvisos, alCerrarAvisos, avisoQr, alCerrarAvisoQr, barrioActual, barrioLejos, barrios = [], visita = null, alVisitar = () => {}, pos = null, alVerMapa = () => {}, lugares = [], alAbrirLugar = () => {}, dropsMapa = null, diag = {}, alRecargar = () => {}, radio = 3000, alCambiarRadio = () => {}, alComoLlegar = null, destino = null, alCerrarRuta = () => {}, alVerAlbum = () => {}, seguidos = null }) {
  const b = barrioActual && barrioActual.barrio;
  const nombreBarrio = (b && b.nombre) || 'Barrio Italia';
  const lugar = b ? (barrioActual.dentro ? `${b.nombre} · ${b.comuna}` : b.nombre) : 'Barrio Italia';
  const [filtro, setFiltro] = useState('todo');
  const [gustos, setGustos] = useState([]);
  const [i, setI] = useState(0);
  const [refrescando, setRefrescando] = useState(false);
  const { tur, lang, t, cuad, setTur } = useIdioma();
  const [verIdiomas, setVerIdiomas] = useState(false);
  const { estilo } = useEstilo();
  const coords = useCoordenadas(estilo === 'diario' || estilo === 'moderno' ? drops : []);
  const [apodo, setApodo] = useState('');
  useEffect(() => {
    if (estilo !== 'moderno') return;
    supabase.rpc('mi_perfil').then(({ data }) => setApodo(((data && data.nombre) || '').trim().slice(0, 20)));
  }, [estilo, usuario.id]);

  useEffect(() => {
    supabase.from('gustos').select('*').eq('usuario_id', usuario.id).order('creado_at')
      .then(({ data }) => setGustos(data || []));
  }, [usuario.id, drops.length]);

  const activos = gustos.filter((g) => g.activo && g.categoria).map((g) => g.categoria);
  const hora = new Date().getHours();

  // La pizarra: primero lo que calza con tus gustos
  const frases = useMemo(() => {
    const calza = (d) => (activos.some((c) => tieneCategoria(d, c)) ? 1 : 0);
    const orden = [...drops].sort((a, b) => calza(b) - calza(a));
    const lista = orden.map((d) => ({
      tag: etiquetaPara(d, hora, t, cuad),
      texto: (d.frase || `${d.titulo} ${precio(d.precio)} en ${d.local_nombre}, ${cuad(d.cuadras)}.`).toUpperCase(),
      drop: d,
    }));
    return lista.length ? lista : [{ tag: nombreBarrio.toUpperCase(), texto: t('TODAVÍA NO HAY DROPS CERCA. DATE UNA VUELTA, QUE LOS LOCALES SUELTAN SORPRESAS DURANTE EL DÍA.', "NO DROPS CERCA YET. ¡DATE UNA VUELTA! LOS LOCALES SUELTAN SORPRESAS ALL DAY."), drop: null }];
  }, [drops, gustos, tur, nombreBarrio]);

  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);
  const f = frases[i % frases.length];

  // Distancia real a cada drop (si sabemos dónde está el local); si no, las cuadras que manda la base
  const metrosA = (d) => {
    const p = coords[d.local_id];
    if (p && pos && !pos.aprox) return Math.hypot((p.lat - pos.lat) * 111320, (p.lng - pos.lng) * 93000);
    return (d.cuadras || 0) * 100;
  };
  // Siempre el más cercano primero
  const visibles = (filtro === 'todo' ? drops : drops.filter((d) => tieneCategoria(d, filtro))).slice().sort((a, b) => metrosA(a) - metrosA(b));
  // Con muchos drops: una fila con lo más cerca y después una fila por categoría (la que tiene el drop más cercano, arriba)
  const filasPorCategoria = (() => {
    if (filtro !== 'todo' || visibles.length <= 4) return null;
    const grupos = {};
    visibles.forEach((d) => { const c = d.categoria || 'otros'; (grupos[c] = grupos[c] || []).push(d); });
    const cats = Object.keys(grupos);
    if (cats.length < 2) return null;
    return cats.map((c) => ({ id: c, drops: grupos[c] })); // ya vienen ordenadas: la categoría del drop más cercano primero
  })();
  // Los drops que aparecen en tu lista cuentan como "vistos" para las estadísticas del local
  const idsVistos = visibles.slice(0, 12).map((d) => d.drop_id).join(',');
  useEffect(() => { visibles.slice(0, 12).forEach((d) => registrar(d.drop_id, 'vista')); }, [idsVistos]);
  // Premio del barrio (el arte que se gana juntando láminas)
  const [premio, setPremio] = useState(null);
  const idBarrio = b && barrioActual.dentro ? b.id : null;
  useEffect(() => {
    if (!idBarrio) { setPremio(null); return; }
    supabase.rpc('mi_arte', { p_barrio: idBarrio }).then((r) => setPremio(!r.error && r.data && r.data[0] && !r.data[0].canjeado_at ? r.data[0] : null), () => {});
  }, [idBarrio, usuario && usuario.id]);
  // Paseo de drops: une los más cercanos en una sola caminata (el siguiente siempre es el más cerca del anterior)
  const paseo = (() => {
    if (!pos || pos.aprox) return null;
    const libres = visibles.filter((d) => coords[d.local_id]).map((d) => ({ d, p: coords[d.local_id] }));
    const vistos = new Set();
    const paradas = [];
    let aqui = pos;
    while (paradas.length < 4) {
      let mejor = null, dm = Infinity;
      libres.forEach((x) => {
        if (vistos.has(x.d.local_id)) return;
        const m = Math.hypot((x.p.lat - aqui.lat) * 111320, (x.p.lng - aqui.lng) * 93000);
        if (m < dm) { dm = m; mejor = x; }
      });
      if (!mejor || dm > 1500) break;
      vistos.add(mejor.d.local_id);
      paradas.push({ lat: mejor.p.lat, lng: mejor.p.lng, nombre: mejor.d.local_nombre });
      aqui = mejor.p;
    }
    return paradas.length >= 2 ? paradas : null;
  })();
  const minutosQuedan = (d) => Math.round((new Date(d.termina_at).getTime() - Date.now()) / 60000);

  async function alternar(g) {
    setGustos(gustos.map((x) => (x.id === g.id ? { ...x, activo: !x.activo } : x)));
    await supabase.from('gustos').update({ activo: !g.activo }).eq('id', g.id);
  }

  if (estilo === 'diario') {
    return <Portada drops={drops} nombreBarrio={nombreBarrio} barrios={barrios} visita={visita} alVisitar={alVisitar} alAbrir={alAbrir} alRefrescar={alRefrescar} coords={coords} t={t} cuad={cuad} alComoLlegar={alComoLlegar} />;
  }

  const moderno = estilo === 'moderno';
  const scroll = React.useRef(null);
  const comoLlegar = alComoLlegar ? (x) => { alComoLlegar(x); try { scroll.current && scroll.current.scrollTo({ y: 0, animated: true }); } catch (e) { /* nada */ } } : null;
  // Desde qué distancia aparecen los drops (y siempre del más cercano al más lejano)
  const DISTANCIAS = [{ m: 200, es: '2 cuadras', en: '2 blocks' }, { m: 500, es: '5 cuadras', en: '5 blocks' }, { m: 1000, es: '1 km', en: '1 km' }, { m: 3000, es: '3 km', en: '3 km' }, { m: 10000, es: '10 km', en: '10 km' }];
  const textoRadio = (DISTANCIAS.find((x) => x.m === radio) || { es: `${radio} m` }).es;
  const selectorDistancia = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingTop: 8, alignItems: 'center' }}>
      <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.gris, marginRight: 2 }}>{t('Hasta', 'Up to')}</Text>
      {DISTANCIAS.map((x) => {
        const on = x.m === radio;
        return (
          <Pressable key={x.m} onPress={() => alCambiarRadio(x.m)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: R(14), borderWidth: 1, borderColor: on ? C.negro : C.borde, backgroundColor: on ? C.negro : C.papel, justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 12, color: on ? C.amarillo : C.negro }}>{t(x.es, x.en)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
  // Patios y malls: acceso directo a su plano (los más cercanos primero)
  const distancia = (g) => (pos ? Math.hypot((g.lat - pos.lat) * 111320, (g.lng - pos.lng) * 93000) : 0);
  const filaLugares = lugares.length ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
      {[...lugares].sort((a, b) => distancia(a) - distancia(b)).map((g) => (
        <Pressable key={g.id} onPress={() => alAbrirLugar(g)} accessibilityRole="button" accessibilityLabel={`${g.tipo === 'mall' ? 'Mall' : 'Patio'} ${g.nombre}: ver plano`}
          style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: R(16), backgroundColor: C.negro, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 10, letterSpacing: 1.2, color: C.amarillo }}>{g.tipo === 'mall' ? 'MALL' : 'PATIO'}</Text>
          <Text style={{ fontFamily: F.negrita, fontSize: 13, color: '#FFFFFF' }}>{g.nombre} →</Text>
        </Pressable>
      ))}
    </ScrollView>
  ) : null;
  const hora12 = (d) => new Date(d.termina_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const cercanos = drops.filter((d) => d.dentro_del_radio || d.cuadras <= 2).length;
  const cabeceraModerna = (
    <View style={{ backgroundColor: fondoBanner('cabecera'), paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo ancho={132} claro={!bannerClaro('cabecera')} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setVerIdiomas(!verIdiomas)} accessibilityRole="button" accessibilityLabel="Idioma · Language"
            style={{ height: 36, paddingHorizontal: 12, borderRadius: 14, backgroundColor: tur ? C.negro : '#FFFFFF', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 12, color: tur ? C.amarillo : C.negro }}>{tur ? `🌍 ${lang.toUpperCase()}` : 'Tourist?'}</Text>
          </Pressable>
          <Pressable onPress={alAyuda} accessibilityRole="button" accessibilityLabel={t('¿Cómo funciona Dropper?', '¿Cómo funciona Dropper?')}
            style={{ width: 36, height: 36, borderRadius: 14, backgroundColor: C.negro, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 16, color: C.amarillo }}>?</Text>
          </Pressable>
        </View>
      </View>
      {verIdiomas ? <SelectorIdioma alElegir={() => setVerIdiomas(false)} style={{ paddingTop: 10 }} /> : null}
      <Text style={{ fontFamily: F.negrita, fontSize: 26, lineHeight: 28, letterSpacing: -0.8, marginTop: 12, color: tintaBanner('cabecera') }}>
        {apodo ? t(`Hola, ${apodo}.`, `Hi, ${apodo}.`) : t('Hola.', 'Hi.')}{'\n'}
        {pos && pos.aprox ? t('Activa tu ubicación para ver lo que tienes cerca.', 'Turn on location to see what’s near.') : lejos ? t(barrioLejos ? `Nada a ${textoRadio}: mira lo de ${barrioLejos}.` : `Nada a ${textoRadio}: mira lo más cercano.`, `Nothing within ${textoRadio}: mira lo más cercano.`) : drops.length ? t(`${drops.length} ${drops.length === 1 ? 'drop' : 'drops'} a menos de ${textoRadio}.`, `${drops.length} drops within ${textoRadio}.`) : t('Hoy el barrio está tranquilo.', 'El barrio está tranqui today.')}
      </Text>
      <Text style={{ fontFamily: F.negrita, fontSize: 13, marginTop: 6, color: tintaBanner('cabecera') }}>
        📍 {visita ? t(`Vas a ${visita.nombre} · ${visita.comuna}`, `Going to ${visita.nombre}`) : lugar}
      </Text>
    </View>
  );
  const tarjetaDrop = (d) => {
            const p = coords[d.local_id];
            return (
              <Tintineo key={d.drop_id} activo={!!(p && pos && !pos.aprox && Math.hypot((p.lat - pos.lat) * 111320, (p.lng - pos.lng) * 93000) <= 20)}
                style={{ width: 240, backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: C.borde, shadowColor: '#111111', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
                <Pressable onPress={() => alAbrir(d)} accessibilityRole="button" accessibilityLabel={`${d.local_nombre}, ${d.frase || d.titulo}`}>
                  <View style={{ height: 120, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: C.crema }}>
                    <ArteLocal id={d.local_id} categoria={d.categoria} pista={d.local_nombre} ancho={240} alto={(d.tipo !== 'sorpresa' && d.foto_url) || d.lamina_url ? 120 : 240} borde={false} imagen={(d.tipo !== 'sorpresa' && d.foto_url) || d.lamina_url} />
                    <View style={{ position: 'absolute', left: 12, top: 12, backgroundColor: C.negro, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 }}>
                      <Text style={{ fontFamily: F.negrita, fontSize: 11, color: C.amarillo }}>{t('QUEDAN', 'QUEDAN')} {d.quedan}</Text>
                    </View>
                  </View>
                  <View style={{ position: 'absolute', right: 12, top: 102, backgroundColor: C.amarillo, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, shadowColor: '#111111', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}>
                    <Text style={{ fontFamily: F.negrita, fontSize: 20, color: C.negro }}>{d.tipo === 'sorpresa' ? '¿?' : precio(d.precio) || 'DROP'}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 14, paddingTop: 14, gap: 2 }}>
                    <Text style={{ fontFamily: F.negrita, fontSize: 11, letterSpacing: 1, color: C.rojoTexto, textTransform: 'uppercase' }}>
                      {tur ? categoriaTur(d.categoria, lang) || textoCategoria(d.categoria) : textoCategoria(d.categoria)} · {cuad(d.cuadras)}
                    </Text>
                    <Text style={{ fontFamily: F.negrita, fontSize: 18, letterSpacing: -0.4 }} numberOfLines={1}>{seguidos && seguidos.has(d.local_id) ? <Text style={{ color: C.rojo }}>♥ </Text> : null}{d.local_nombre}</Text>
                    <FraseGlosario texto={d.frase || d.titulo} colorAyuda={C.rojoTexto} numberOfLines={2} style={{ fontFamily: F.media, fontSize: 14, lineHeight: 18, color: '#444444' }} />
                    {minutosQuedan(d) <= 60
                      ? <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.rojoTexto }}>⚡ {t(`Se acaba en ${Math.max(1, minutosQuedan(d))} min`, `Ends in ${Math.max(1, minutosQuedan(d))} min`)}</Text>
                      : <Text style={{ fontFamily: F.media, fontSize: 12, color: C.gris }}>{t('Hasta las', 'Hasta')} {hora12(d)}</Text>}
                  </View>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8, padding: 14, paddingTop: 10 }}>
                  <Pressable onPress={() => alAbrir(d)} accessibilityRole="button" style={{ flex: 1, height: 42, borderRadius: 14, backgroundColor: C.negro, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.negrita, fontSize: 13, color: '#FFFFFF' }}>{t('Lo quiero', 'Lo quiero · I want it')}</Text>
                  </Pressable>
                  {p ? (
                    <Pressable onPress={() => { registrar(d.drop_id, 'como_llegar'); comoLlegar ? comoLlegar({ ...p, nombre: d.local_nombre }) : caminar(p); }} accessibilityRole="button" style={{ height: 42, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.crema, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.negrita, fontSize: 13 }}>{t('Cómo llegar', 'Directions')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Tintineo>
            );
  };
  const filaDrops = (lista) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
      {lista.map(tarjetaDrop)}
    </ScrollView>
  );
  const dropsModernos = (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 18, paddingTop: 20 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 22, letterSpacing: -0.6 }}>{t('Cerca de ti', 'Cerca · Near you')}</Text>
        <Pressable onPress={alVerMapa} accessibilityRole="button"><Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.gris }}>{t('Ver en el mapa', 'Ver mapa')}</Text></Pressable>
      </View>
      {selectorDistancia}
      {paseo && comoLlegar ? (
        <Pressable onPress={() => comoLlegar({ ...paseo[paseo.length - 1], nombre: t(`Paseo: ${paseo.length} drops`, `Walk: ${paseo.length} drops`), paradas: paseo })} accessibilityRole="button"
          style={{ marginHorizontal: 16, marginTop: 10, minHeight: 44, borderRadius: R(14), backgroundColor: C.negro, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 16 }}>🚶</Text>
          <Text style={{ fontFamily: F.negrita, fontSize: 14, color: '#FFFFFF' }}>{t(`Arma mi paseo · ${paseo.length} drops`, `Plan my walk · ${paseo.length} drops`)}</Text>
        </Pressable>
      ) : null}
      {premio ? (
        <Pressable onPress={alVerAlbum} accessibilityRole="button"
          style={{ marginHorizontal: 16, marginTop: 10, borderRadius: R(14), borderWidth: 1.5, borderColor: C.azul, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10, gap: 6 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 13 }}>🎁 {t(`Premio del barrio: ${premio.nombre}`, `Neighborhood prize: ${premio.nombre}`)}</Text>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: '#E8EEF8', overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (premio.tengo / premio.necesarias) * 100)}%`, height: '100%', backgroundColor: C.azul }} />
          </View>
          <Text style={{ fontFamily: F.media, fontSize: 12, color: C.gris }}>
            {premio.codigo ? t('¡Lo ganaste! Toca para ver tu QR.', 'You won! Tap for your QR.') : premio.tengo >= premio.necesarias ? t('¡Ya puedes cambiarlo! Toca aquí.', 'Ready to claim! Tap here.') : t(`${premio.tengo} de ${premio.necesarias} láminas · el primero que las junte se lo lleva`, `${premio.tengo} of ${premio.necesarias} stickers`)}
          </Text>
        </Pressable>
      ) : null}
      {lejos && visibles.length ? <Text style={{ fontFamily: F.media, fontSize: 13, color: C.gris, paddingHorizontal: 18, paddingTop: 6 }}>{t(`Nada a menos de ${textoRadio}: estos son los más cercanos.`, `Nothing within ${textoRadio}: these are the closest.`)}</Text> : null}
      {visibles.length === 0 ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 8, gap: 6 }}>
          <Text style={{ fontFamily: F.media, fontSize: 14, color: C.gris }}>{t('No hay drops por aquí ahora. Vuelve más rato: los locales sueltan sorpresas durante el día.', 'No drops right now. Vuelve más rato.')}</Text>
          {/* Diagnóstico corto (para saber qué pasa si debería haber drops) */}
          <Pressable onPress={alRecargar} accessibilityRole="button">
            <Text style={{ fontFamily: F.media, fontSize: 11, color: '#8A8A8A' }}>
              {diag.aprox ? 'Sin ubicación exacta' : diag.lat ? `Buscando en ${diag.lat.toFixed(4)}, ${diag.lng.toFixed(4)}${diag.precision ? ` (±${diag.precision} m)` : ''}` : 'Esperando ubicación'}
              {` · ${diag.cerca ?? '–'} a 3 km · ${diag.ciudad ?? '–'} en la ciudad`}
              {diag.errorCerca || diag.errorCiudad ? ` · error: ${diag.errorCerca || diag.errorCiudad}` : ''}
              {diag.hora ? ` · ${diag.hora}` : ''} · tocar para recargar
            </Text>
          </Pressable>
        </View>
      ) : filasPorCategoria ? (
        <>
          {filaDrops(visibles.slice(0, 6))}
          {filasPorCategoria.map((g) => (
            <View key={g.id}>
              <Text style={{ fontFamily: F.negrita, fontSize: 17, letterSpacing: -0.3, paddingHorizontal: 18, paddingTop: 4 }}>
                {tur ? categoriaTur(g.id, lang) || textoCategoria(g.id) : textoCategoria(g.id)} <Text style={{ color: C.gris, fontSize: 13 }}>· {g.drops.length}</Text>
              </Text>
              {filaDrops(g.drops)}
            </View>
          ))}
        </>
      ) : filaDrops(visibles)}
    </>
  );
  // ¿Estás dentro de un patio o mall? Se muestra su plano en vez del mapa de calles
  const enLugar = visita ? null : lugarDe(pos, lugares);
  if (enLugar) marcarVisitado(enLugar.id);
  const bloqueLugar = enLugar ? (
    <View style={{ marginHorizontal: 16, marginTop: 14, gap: 8 }}>
      <Text style={{ fontFamily: F.negrita, fontSize: 12, letterSpacing: 1.2, color: C.gris }}>{t(`ESTÁS EN ${enLugar.nombre.toUpperCase()}`, `YOU'RE AT ${enLugar.nombre.toUpperCase()}`)}</Text>
      <Seguro><PlanoLugar lugar={enLugar} drops={drops} alAbrir={alAbrir} compacto alVerTodo={() => alAbrirLugar(enLugar)} /></Seguro>
    </View>
  ) : null;
  const bloqueBarrios = (
    <>
      <SelectorBarrios barrios={barrios} vista={visita} alElegir={alVisitar} flotante={false} titulo={t('¿A qué barrio vas?', '¿A qué barrio vas? Pick a barrio')} />
      {visita ? (
        <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: C.papel, borderWidth: 2, borderColor: C.azul, borderRadius: R(16), padding: 10 }}>
          <Text style={{ fontFamily: F.media, fontSize: 13 }}>
            {t(`Estás viendo los drops de ${visita.nombre}. Cuando llegues, la app vuelve sola a "Aquí" y se activa tu QR en cada local.`,
               `Estás viendo los drops de ${visita.nombre}. When you get there, la app vuelve a "Aquí" y tu QR se activa.`)}
          </Text>
        </View>
      ) : null}

    </>
  );
  const bloqueFrase = (
    <>
      <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: fondoBanner('frase'), borderRadius: R(16), padding: 16, gap: 10, borderWidth: bannerClaro('frase') ? 1 : 0, borderColor: C.borde }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <FraseGlosario texto={f.tag} style={{ ...letrista, fontSize: 16, color: acentoBanner('frase') }} />
          <Pressable onPress={() => setI(i + 1)} accessibilityRole="button" accessibilityLabel="Otra sugerencia"
            style={{ height: 32, paddingHorizontal: 12, borderRadius: R(16), borderWidth: 1.5, borderColor: bannerClaro('frase') ? '#11111166' : '#FFFFFF66', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 12, color: tintaBanner('frase') }}>{t('Otra', "Siguiente")}</Text>
          </Pressable>
        </View>
        <FraseGlosario texto={f.texto} style={{ ...letrista, fontSize: 20, lineHeight: 26, color: tintaBanner('frase'), minHeight: 78 }} />
        {f.drop && (
          <Pressable onPress={() => alAbrir(f.drop)} style={{ alignSelf: 'flex-start', height: 40, paddingHorizontal: 16, borderRadius: R(16), backgroundColor: bannerClaro('frase') ? C.negro : C.amarillo, justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 14, color: bannerClaro('frase') ? C.amarillo : C.negro }}>{t('Ir al drop →', "Ver drop →")}</Text>
          </Pressable>
        )}
      </View>

    </>
  );
  const bloqueDrops = (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 18 }}>
        {CATEGORIAS.map((c) => <Pildora key={c.id} texto={tur ? categoriaTur(c.id, lang) || c.texto : c.texto} categoria={c.id} activa={filtro === c.id} onPress={() => setFiltro(c.id)} />)}
      </ScrollView>
      {selectorDistancia}

      <View style={{ marginTop: 14 }}>
        <Ola color={fondoBanner('cerca')} abajo={false} />
        <View style={{ backgroundColor: fondoBanner('cerca'), paddingTop: 4, paddingBottom: 18, gap: 12 }}>
          <Text style={{ ...letrista, fontSize: 24, color: acentoBanner('cerca'), paddingHorizontal: 20 }}>{t('CERCA DE TI', "CERCA · NEAR YOU")}</Text>
          {visibles.length === 0 && (
            <Text style={{ fontFamily: F.media, color: tintaBanner('cerca'), paddingHorizontal: 20 }}>{t(`No hay drops de ${textoCategoria(filtro).toLowerCase()} ahora. Vuelve más rato.`, "No drops acá right now. Vuelve más rato.")}</Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
            {visibles.map((d, k) => (
              sobrio() ? (
              <Pressable key={d.drop_id} onPress={() => alAbrir(d)} style={{ width: 216, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.borde, borderRadius: R(16), padding: 14, gap: 6 }}>
                <EtiquetaPrecio valor={d.tipo === 'sorpresa' ? '¿?' : precio(d.precio)} giro={k % 2 ? '-4deg' : '5deg'} />
                <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.rojoTexto, textTransform: 'uppercase' }}>{tur ? categoriaTur(d.categoria, lang) || textoCategoria(d.categoria) : textoCategoria(d.categoria)} · {t('quedan', "quedan:")} {d.quedan}</Text>
                <Text style={{ fontFamily: F.negrita, fontSize: 17 }} numberOfLines={1}>{d.local_nombre}</Text>
                <FraseGlosario texto={(d.frase || d.titulo).toUpperCase()} colorAyuda={C.rojoTexto} numberOfLines={3} style={{ ...letrista, fontSize: 14, lineHeight: 18 }} />
                <Text style={{ fontFamily: F.media, fontSize: 13, color: C.gris }}>
                  {cuad(d.cuadras)} · {t('hasta las', "hasta")} {new Date(d.termina_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {d.tipo === 'grupal' && d.nivel_actual ? <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.azul }}>{t('Nivel actual', "Ahora")}: {d.nivel_actual}</Text> : null}
              </Pressable>
              ) : (
              <Pressable key={d.drop_id} onPress={() => alAbrir(d)} style={{ width: 236, borderWidth: 3, borderColor: C.borde, backgroundColor: C.papel, shadowColor: C.sombra, shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0 }}>
                <View style={{ height: 118, borderBottomWidth: 3, borderColor: C.borde, overflow: 'hidden', padding: 10, justifyContent: 'flex-start' }}>
                  <PuntosPop color={k % 2 ? C.azul : C.rojo} fondo={k % 2 ? '#DDE8F6' : '#FFE3E3'} />
                  <GloboPop>
                    <FraseGlosario texto={d.frase || d.titulo} colorAyuda={C.rojoTexto} numberOfLines={3} style={{ fontFamily: F.negrita, fontSize: 13, lineHeight: 16, textTransform: 'uppercase' }} />
                  </GloboPop>
                  <Estallido texto={d.tipo === 'sorpresa' ? '¿?' : precio(d.precio) || ONOMATOPEYAS[k % ONOMATOPEYAS.length]} tam={66} style={{ position: 'absolute', right: 4, bottom: 2 }} />
                </View>
                <View style={{ padding: 10, gap: 3 }}>
                  <Text style={{ fontFamily: F.negrita, fontSize: 11, color: C.rojoTexto, textTransform: 'uppercase' }}>{tur ? categoriaTur(d.categoria, lang) || textoCategoria(d.categoria) : textoCategoria(d.categoria)} · {t('quedan', "quedan:")} {d.quedan}</Text>
                  <Text style={{ ...letrista, fontSize: 18 }} numberOfLines={1}>{d.local_nombre}</Text>
                  <Text style={{ fontFamily: F.media, fontSize: 12, color: C.gris }}>
                    {cuad(d.cuadras)} · {t('hasta las', "hasta")} {new Date(d.termina_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {d.tipo === 'grupal' && d.nivel_actual ? <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.azul }}>{t('Nivel actual', "Ahora")}: {d.nivel_actual}</Text> : null}
                </View>
              </Pressable>
              )
            ))}
          </ScrollView>
        </View>
        <Ola color={fondoBanner('cerca')} />
      </View>

    </>
  );

  return (
    <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={async () => { setRefrescando(true); await alRefrescar(); setRefrescando(false); }} />}>
      {moderno ? cabeceraModerna : (
        <>
      <View style={{ backgroundColor: fondoBanner('cabecera'), paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 }}>
        <FondoBauhaus variante="inicio" />
        <Logo ancho={190} claro={!bannerClaro('cabecera')} style={{ marginLeft: 22, marginTop: 4, marginBottom: 2 }} />
        <Text style={{ fontFamily: F.negrita, fontSize: 13, lineHeight: 17, marginLeft: 22, width: 190, color: tintaBanner('cabecera') }}>{visita ? t(`Vas a ${visita.nombre} · ${visita.comuna}`, `Going to ${visita.nombre} · ${visita.comuna}`) : t(`${lugar} · tu barrio te tiene ofertas`, `${lugar} · ofertas like a local`)}</Text>
        <Pressable onPress={() => setVerIdiomas(!verIdiomas)} accessibilityRole="button" accessibilityLabel="Idioma · Language"
          style={{ position: 'absolute', right: 68, top: 14, height: 44, paddingHorizontal: 12, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, backgroundColor: tur ? C.negro : C.papel, justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 12, color: tur ? C.amarillo : C.negro }}>{tur ? `🌍 ${lang.toUpperCase()}` : 'Tourist?'}</Text>
        </Pressable>
        {verIdiomas ? <SelectorIdioma alElegir={() => setVerIdiomas(false)} style={{ paddingLeft: 26, paddingTop: 8, paddingBottom: 6 }} /> : null}
        <Pressable onPress={alAyuda} accessibilityRole="button" accessibilityLabel={t('¿Cómo funciona Dropper?', "¿Cómo funciona Dropper?")}
          style={{ position: 'absolute', right: 16, top: 14, minWidth: 44, height: 44, paddingHorizontal: 14, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, backgroundColor: C.papel, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...letrista, fontSize: 20 }}>?</Text>
        </Pressable>
      </View>
      <Ola color={fondoBanner('cabecera')} />
        </>
      )}

      {lejos ? (
        <View style={{ marginHorizontal: 16, marginBottom: 6, backgroundColor: C.papel, borderWidth: 2, borderColor: C.borde, borderRadius: R(16), padding: 10 }}>
          <Text style={{ fontFamily: F.media, fontSize: 13 }}>
            {t(`No hay drops cerca de ti: te mostramos los de ${barrioLejos || nombreBarrio}. Para canjear, tienes que llegar al local.`,
               `No drops cerca de ti: these are the ones de ${barrioLejos || nombreBarrio}. Para canjear, tienes que estar en el local.`)}
          </Text>
        </View>
      ) : null}

      {avisoQr === 'sin_drops' && (
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.azul, borderRadius: R(16), padding: 14, gap: 8 }}>
          <Text style={{ ...letrista, fontSize: 17 }}>{t('¡BIENVENIDO A DROPPER!', '¡BIENVENIDO! WELCOME TO DROPPER')}</Text>
          <Text style={{ fontFamily: F.normal, fontSize: 14 }}>
            {t('Este local no tiene un drop en vivo justo ahora. Mira abajo lo que hay en el barrio, y vuelve más rato: los locales sueltan ofertas durante el día.',
               'Este local no tiene drop right now. Mira lo que hay en el barrio abajo y vuelve más rato: los locales sueltan ofertas all day.')}
          </Text>
          <Boton texto={t('Entendido', 'Ok, ¡bacán!')} fondo={C.papel} color={C.negro} onPress={alCerrarAvisoQr} />
        </View>
      )}

      {(avisos === 'pendiente' || avisos === 'bloqueado') && (
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.borde, borderRadius: R(16), padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.rojo} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
              <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </Svg>
            <Text style={{ ...letrista, fontSize: 17, flex: 1 }}>{t('¿TE AVISAMOS CUANDO SUELTEN UN DROP CERCA?', "¿TE AVISAMOS WHEN UN DROP SALE CERCA?")}</Text>
          </View>
          <Text style={{ fontFamily: F.normal, fontSize: 14 }}>
            {avisos === 'bloqueado'
              ? t('Tienes las notificaciones apagadas para Dropper. Actívalas en Ajustes del teléfono → Dropper → Notificaciones.', "Las notifications están off para Dropper. Actívalas en Settings → Dropper → Notifications.")
              : t('Cuando un local a pocas cuadras suelta un drop y cuando llegas a su puerta con tu QR listo. Máximo 3 al día y nunca de noche.', "Cuando un local a pocas cuadras suelta un drop, y cuando llegas a su puerta con tu QR listo. Max 3 al día, nunca de noche.")}
          </Text>
          {avisoMotivo === 'no_soportado' ? (
            <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.rojoTexto }}>{t('Este teléfono no puede recibir avisos en la versión de prueba. Funcionarán en la app de la tienda.', "Este phone no recibe avisos en la versión de prueba. Van a funcionar en la app de la tienda.")}</Text>
          ) : avisoMotivo === 'error' ? (
            <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.rojoTexto }}>{t('No pudimos activarlos. Prueba de nuevo en un rato.', "No se pudieron activar. Try again en un rato.")}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {avisos === 'pendiente' && <Boton texto={t('Avísame', "Avísame · Ping me")} fondo={C.rojo} onPress={alPrenderAvisos} />}
            <Boton texto={t('Ahora no', "Ahora no")} fondo={C.papel} color={C.negro} onPress={alCerrarAvisos} />
          </View>
        </View>
      )}

      {moderno ? (
        <>
          {enLugar ? bloqueLugar : <Seguro><MiniMapa pos={visita ? { lat: visita.lat, lng: visita.lng } : pos} yo={!visita && pos && !pos.aprox ? pos : null} drops={drops.filter((d) => !d.lejos_marca)} alAbrir={alAbrir} alVerMapa={alVerMapa} t={t} lugares={lugares} alAbrirLugar={alAbrirLugar} destino={destino} alCerrarRuta={alCerrarRuta} radio={visita ? 200 : radio} textoRadio={visita ? '2 cuadras' : textoRadio} /></Seguro>}
          {filaLugares}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 16 }}>
            {CATEGORIAS.map((c) => <Pildora key={c.id} texto={tur ? categoriaTur(c.id, lang) || c.texto : c.texto} categoria={c.id} activa={filtro === c.id} onPress={() => setFiltro(c.id)} />)}
          </ScrollView>
          {dropsModernos}
          {bloqueFrase}
          {bloqueBarrios}
        </>
      ) : (
        <>
          {bloqueLugar}
          {filaLugares}
          {bloqueBarrios}
          {bloqueFrase}
          {bloqueDrops}
        </>
      )}

      <View style={{ marginTop: 18 }}>
        <Ola color={fondoBanner('aprendio')} abajo={false} />
        <View style={{ backgroundColor: fondoBanner('aprendio'), paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}>
          <Text style={{ ...letrista, fontSize: 21, color: acentoBanner('aprendio') }}>{t('DROPPER APRENDIÓ QUE…', "DROPPER APRENDIÓ QUE…")}</Text>
          {gustos.length === 0 ? (
            <Text style={{ fontFamily: F.normal, fontSize: 14, color: tintaBanner('aprendio') }}>{t('Todavía te estamos conociendo. Súmate a un drop y aquí aparece lo que te tinca.', "Todavía te estamos conociendo. Súmate a un drop y tus gustos show up here.")}</Text>
          ) : (
            <>
              <Text style={{ fontFamily: F.normal, fontSize: 13, color: tintaBanner('aprendio') }}>{t('Con esto elegimos qué mostrarte primero. Toca uno para apagarlo.', "Con esto te mostramos lo bueno first. Toca uno para apagarlo.")}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {gustos.map((g) => (
                  <Pressable key={g.id} onPress={() => alternar(g)} accessibilityRole="switch" accessibilityState={{ checked: g.activo }}
                    style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 2.5, borderColor: C.borde, backgroundColor: g.activo ? C.papel : 'transparent', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.negrita, fontSize: 13, textDecorationLine: g.activo ? 'none' : 'line-through' }}>{g.etiqueta}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
