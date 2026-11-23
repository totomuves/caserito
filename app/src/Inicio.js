import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { supabase } from './supabase';
import { C, F, letrista, CATEGORIAS, textoCategoria, tieneCategoria, precio, cuadras, R, ESTILO, sobrio } from './tema';
import { Ola, Brillo, Pildora, EtiquetaPrecio, Boton, FondoBauhaus, PuntosPop, GloboPop, Estallido, ONOMATOPEYAS } from './componentes';
import { useIdioma, FraseGlosario, CATEGORIA_TUR, categoriaTur, SelectorIdioma } from './idioma';
import Logo from './Logo';
import { SelectorBarrios, useCoordenadas } from './MapaComun';
import { useEstilo } from './estilo';
import Portada from './Portada';
import Svg, { Path } from 'react-native-svg';

function etiquetaPara(d, hora, t, cuad) {
  if (d.tipo === 'grupal') return t('¡ENTRE TODOS!', "¡ENTRE TODOS! GROUP DROP");
  if (d.tipo === 'recien_llegado') return t('¡RECIÉN LLEGADO!', "¡RECIÉN LLEGADO! JUST IN");
  if (d.tipo === 'sorpresa') return t('¿UNA SORPRESA?', "¿SORPRESA? MYSTERY DROP");
  if (d.categoria === 'comer' && hora >= 12 && hora < 15) return t('HORA DE ALMUERZO', "HORA DE ALMUERZO · LUNCH");
  if (d.categoria === 'cafe' && hora >= 15 && hora < 19) return t('TU CAFÉ DE LA TARDE', "CAFECITO DE LA TARDE · COFFEE");
  return cuad(d.cuadras).toUpperCase();
}

export default function Inicio({ drops, usuario, lejos, alAbrir, alRefrescar, alAyuda, avisos, avisoMotivo, alPrenderAvisos, alCerrarAvisos, avisoQr, alCerrarAvisoQr, barrioActual, barrioLejos, barrios = [], visita = null, alVisitar = () => {} }) {
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
  const coords = useCoordenadas(estilo === 'diario' ? drops : []);

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
    return lista.length ? lista : [{ tag: 'BARRIO ITALIA', texto: t('TODAVÍA NO HAY DROPS CERCA. DATE UNA VUELTA, QUE LOS LOCALES SUELTAN SORPRESAS DURANTE EL DÍA.', "NO DROPS CERCA YET. ¡DATE UNA VUELTA! LOS LOCALES SUELTAN SORPRESAS ALL DAY."), drop: null }];
  }, [drops, gustos, tur]);

  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);
  const f = frases[i % frases.length];

  const visibles = filtro === 'todo' ? drops : drops.filter((d) => tieneCategoria(d, filtro));

  async function alternar(g) {
    setGustos(gustos.map((x) => (x.id === g.id ? { ...x, activo: !x.activo } : x)));
    await supabase.from('gustos').update({ activo: !g.activo }).eq('id', g.id);
  }

  if (estilo === 'diario') {
    return <Portada drops={drops} nombreBarrio={nombreBarrio} barrios={barrios} visita={visita} alVisitar={alVisitar} alAbrir={alAbrir} alRefrescar={alRefrescar} coords={coords} t={t} cuad={cuad} />;
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={async () => { setRefrescando(true); await alRefrescar(); setRefrescando(false); }} />}>
      <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 }}>
        <FondoBauhaus variante="inicio" />
        <Logo ancho={190} style={{ marginLeft: 22, marginTop: 4, marginBottom: 2 }} />
        <Text style={{ fontFamily: F.negrita, fontSize: 13, lineHeight: 17, marginLeft: 22, width: 190 }}>{visita ? t(`Vas a ${visita.nombre} · ${visita.comuna}`, `Going to ${visita.nombre} · ${visita.comuna}`) : t(`${lugar} · tu barrio te tiene ofertas`, `${lugar} · ofertas like a local`)}</Text>
        <Pressable onPress={() => setVerIdiomas(!verIdiomas)} accessibilityRole="button" accessibilityLabel="Idioma · Language"
          style={{ position: 'absolute', right: 68, top: 14, height: 44, paddingHorizontal: 12, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, backgroundColor: tur ? C.negro : C.papel, justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 12, color: tur ? C.amarillo : C.negro }}>{tur ? `🌍 ${lang.toUpperCase()}` : 'Tourist?'}</Text>
        </Pressable>
        {verIdiomas ? <SelectorIdioma alElegir={() => setVerIdiomas(false)} style={{ paddingLeft: 26, paddingTop: 8, paddingBottom: 6 }} /> : null}
        <Pressable onPress={alAyuda} accessibilityRole="button" accessibilityLabel={t('¿Cómo funciona Droper?', "¿Cómo funciona Droper?")}
          style={{ position: 'absolute', right: 16, top: 14, minWidth: 44, height: 44, paddingHorizontal: 14, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, backgroundColor: C.papel, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...letrista, fontSize: 20 }}>?</Text>
        </Pressable>
      </View>
      <Ola color={C.amarillo} />

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
          <Text style={{ ...letrista, fontSize: 17 }}>{t('¡BIENVENIDO A DROPER!', '¡BIENVENIDO! WELCOME TO DROPER')}</Text>
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
              ? t('Tienes las notificaciones apagadas para Droper. Actívalas en Ajustes del teléfono → Droper → Notificaciones.', "Las notifications están off para Droper. Actívalas en Settings → Droper → Notifications.")
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

      <SelectorBarrios barrios={barrios} vista={visita} alElegir={alVisitar} flotante={false} titulo={t('¿A qué barrio vas?', '¿A qué barrio vas? Pick a barrio')} />
      {visita ? (
        <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: C.papel, borderWidth: 2, borderColor: C.azul, borderRadius: R(16), padding: 10 }}>
          <Text style={{ fontFamily: F.media, fontSize: 13 }}>
            {t(`Estás viendo los drops de ${visita.nombre}. Cuando llegues, la app vuelve sola a "Aquí" y se activa tu QR en cada local.`,
               `Estás viendo los drops de ${visita.nombre}. When you get there, la app vuelve a "Aquí" y tu QR se activa.`)}
          </Text>
        </View>
      ) : null}

      <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: C.negro, borderRadius: R(16), padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <FraseGlosario texto={f.tag} style={{ ...letrista, fontSize: 16, color: C.amarillo }} />
          <Pressable onPress={() => setI(i + 1)} accessibilityRole="button" accessibilityLabel="Otra sugerencia"
            style={{ height: 32, paddingHorizontal: 12, borderRadius: R(16), borderWidth: 1.5, borderColor: '#FFFFFF66', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>{t('Otra', "Siguiente")}</Text>
          </Pressable>
        </View>
        <FraseGlosario texto={f.texto} style={{ ...letrista, fontSize: 20, lineHeight: 26, color: '#FFFFFF', minHeight: 78 }} />
        {f.drop && (
          <Pressable onPress={() => alAbrir(f.drop)} style={{ alignSelf: 'flex-start', height: 40, paddingHorizontal: 16, borderRadius: R(16), backgroundColor: C.amarillo, justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 14 }}>{t('Ir al drop →', "Ver drop →")}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 18 }}>
        {CATEGORIAS.map((c) => <Pildora key={c.id} texto={tur ? categoriaTur(c.id, lang) || c.texto : c.texto} categoria={c.id} activa={filtro === c.id} onPress={() => setFiltro(c.id)} />)}
      </ScrollView>

      <View style={{ marginTop: 14 }}>
        <Ola color={C.rojo} abajo={false} />
        <View style={{ backgroundColor: C.rojo, paddingTop: 4, paddingBottom: 18, gap: 12 }}>
          <Text style={{ ...letrista, fontSize: 24, color: C.amarillo, paddingHorizontal: 20 }}>{t('CERCA DE TI', "CERCA · NEAR YOU")}</Text>
          {visibles.length === 0 && (
            <Text style={{ fontFamily: F.media, color: '#FFFFFF', paddingHorizontal: 20 }}>{t(`No hay drops de ${textoCategoria(filtro).toLowerCase()} ahora. Vuelve más rato.`, "No drops acá right now. Vuelve más rato.")}</Text>
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
        <Ola color={C.rojo} />
      </View>

      <View style={{ marginTop: 18 }}>
        <Ola color={C.amarillo} abajo={false} />
        <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}>
          <Text style={{ ...letrista, fontSize: 21 }}>{t('DROPER APRENDIÓ QUE…', "DROPER APRENDIÓ QUE…")}</Text>
          {gustos.length === 0 ? (
            <Text style={{ fontFamily: F.normal, fontSize: 14 }}>{t('Todavía te estamos conociendo. Súmate a un drop y aquí aparece lo que te tinca.', "Todavía te estamos conociendo. Súmate a un drop y tus gustos show up here.")}</Text>
          ) : (
            <>
              <Text style={{ fontFamily: F.normal, fontSize: 13 }}>{t('Con esto elegimos qué mostrarte primero. Toca uno para apagarlo.', "Con esto te mostramos lo bueno first. Toca uno para apagarlo.")}</Text>
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
