import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { C, F, CATEGORIAS, textoCategoria, tieneCategoria, precio } from './tema';
import { PuntosPop, Estallido } from './componentes';
import { FraseGlosario } from './idioma';
import { SelectorBarrios } from './MapaComun';
import { caminar } from './Drop';

// Estilo "Diario": el Inicio como portada de diario popular del barrio
const T = { fontFamily: F.titular };
const N = { fontFamily: F.angosta };
const S = { fontFamily: F.serifa };
const ROJO = '#D7261E';
const AMARILLO = '#FFE600';
const PAPEL = '#F7F3EA';

const ANTETITULOS = {
  comer: 'Vecinos hacen fila y nadie se arrepiente:',
  tomar: 'Brindis en la cuadra:',
  cafe: 'Pidió un cortado y salió feliz:',
  dulce: 'Se acabó la dieta en el barrio:',
  almacen: 'Ofertón en el almacén de la esquina:',
};
const FARANDULA = [
  (d) => `${d.local_nombre} lanzó drop sorpresa y nadie sabe qué es`,
  (d) => `Escándalo en ${d.local_nombre}: quedan solo ${d.quedan}`,
  (d) => `${d.local_nombre} rompe el silencio: "${(d.frase || d.titulo).slice(0, 48)}"`,
];
const FARANDULA_EN = [
  (d) => `${d.local_nombre} launched a drop sorpresa and nobody knows what it is`,
  (d) => `Scandal at ${d.local_nombre}: only ${d.quedan} left`,
  (d) => `${d.local_nombre} breaks the silence: "${(d.frase || d.titulo).slice(0, 48)}"`,
];
const HOROSCOPO = ['Aries: un drop te espera a la vuelta.', 'Tauro: hoy no es día de dieta.', 'Géminis: invita a alguien, que el grupal se llena.', 'Cáncer: tu caserito favorito te extraña.', 'Leo: la lámina dorada está cerca.', 'Virgo: llega temprano, que se acaba.'];

function fechaHoy() {
  try { return new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return ''; }
}

// Cinta de última hora que corre
function UltimaHora({ textos, t }) {
  const x = useRef(new Animated.Value(0)).current;
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (!ancho) return undefined;
    x.setValue(0);
    const a = Animated.loop(Animated.timing(x, { toValue: -ancho, duration: ancho * 28, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [ancho]);
  const linea = textos.join('  ✦  ');
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.negro, marginHorizontal: 10, overflow: 'hidden', alignItems: 'center' }}>
      <Text style={{ ...T, backgroundColor: AMARILLO, color: C.negro, paddingHorizontal: 6, paddingVertical: 3, fontSize: 13, zIndex: 2 }}>{t('ÚLTIMA HORA', 'ÚLTIMA HORA · BREAKING')}</Text>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
          <Text onLayout={(e) => setAncho(e.nativeEvent.layout.width)} numberOfLines={1} style={{ ...N, color: '#FFFFFF', fontSize: 12, paddingHorizontal: 8 }}>{linea}  ✦  </Text>
          <Text numberOfLines={1} style={{ ...N, color: '#FFFFFF', fontSize: 12, paddingHorizontal: 8 }}>{linea}  ✦  </Text>
        </Animated.View>
      </View>
    </View>
  );
}

function Caja({ children, fondo = PAPEL, style }) {
  return <View style={[{ borderWidth: 2, borderColor: C.borde, backgroundColor: fondo }, style]}>{children}</View>;
}

export default function Portada({ drops, nombreBarrio, barrios, visita, alVisitar, alAbrir, alRefrescar, coords = {}, t, cuad, alComoLlegar = null }) {
  const [refrescando, setRefrescando] = useState(false);
  const [seccion, setSeccion] = useState('todo');
  const lista = (seccion === 'todo' ? drops : drops.filter((d) => tieneCategoria(d, seccion))).slice().sort((a, b) => a.cuadras - b.cuadras);
  const [portada, segunda, ...resto] = lista;
  const sorpresas = drops.filter((d) => d.tipo === 'sorpresa');
  const farandula = [...sorpresas, ...resto].slice(0, 3);
  const edicion = nombreBarrio.replace(/^Barrio /, '');
  const hora = new Date().getHours();

  const refrescar = async () => { setRefrescando(true); await alRefrescar(); setRefrescando(false); };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: PAPEL }} contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}>
      {/* Cabecera */}
      <View style={{ flexDirection: 'row', marginTop: 10, marginHorizontal: 10, borderWidth: 2, borderColor: C.borde }}>
        <View style={{ flex: 1, backgroundColor: ROJO, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4 }}>
          <Text style={{ ...T, fontSize: 44, lineHeight: 46, color: '#FFFFFF', transform: [{ skewX: '-10deg' }], textShadowColor: C.negro, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 }}>DROPPER</Text>
          <Text style={{ ...N, fontSize: 10, letterSpacing: 3, color: AMARILLO }}>{t('EL DIARIO POPULAR DEL BARRIO', 'THE BARRIO DAILY · DIARIO POPULAR')}</Text>
        </View>
        <View style={{ width: 72, backgroundColor: AMARILLO, borderLeftWidth: 2, borderColor: C.borde, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...T, fontSize: 30, lineHeight: 34 }}>$0</Text>
          <Text style={{ ...N, fontSize: 9 }}>{t('PURA YAPA', 'FREE · YAPA')}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 4 }}>
        <Text style={{ ...N, fontSize: 10, textTransform: 'capitalize' }}>{fechaHoy()} · {t('Edición', 'Edition')} {edicion}</Text>
        <Text style={{ ...N, fontSize: 10 }}>{drops.length} {t('drops hoy', 'drops today')}</Text>
      </View>

      {lista.length ? <UltimaHora t={t} textos={lista.slice(0, 5).map((d) => t(`Quedan ${d.quedan} en ${d.local_nombre}`, `Only ${d.quedan} left en ${d.local_nombre}`))} /> : null}

      {/* Ediciones (barrios) y secciones (categorías) */}
      {barrios.length > 1 ? (
        <View style={{ marginTop: 8 }}>
          <SelectorBarrios barrios={barrios} vista={visita} alElegir={alVisitar} flotante={false} titulo={t('Edición', 'Edición · Edition')} />
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 0, paddingHorizontal: 10, paddingTop: 8 }}>
        {CATEGORIAS.filter((c) => c.id === 'todo' || drops.some((d) => tieneCategoria(d, c.id))).map((c, k) => (
          <Pressable key={c.id} onPress={() => setSeccion(c.id)} accessibilityRole="button" accessibilityState={{ selected: seccion === c.id }}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 2, borderLeftWidth: k ? 0 : 2, borderColor: C.borde, backgroundColor: seccion === c.id ? C.negro : PAPEL }}>
            <Text style={{ ...T, fontSize: 14, color: seccion === c.id ? AMARILLO : C.negro }}>{(c.id === 'todo' ? t('PORTADA', 'FRONT PAGE') : c.texto).toUpperCase()}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {!portada ? (
        <View style={{ margin: 10 }}>
          <Text style={{ ...N, fontSize: 15, color: ROJO, fontStyle: 'italic' }}>{t('Silencio total en el barrio:', 'Total silence en el barrio:')}</Text>
          <Text style={{ ...T, fontSize: 52, lineHeight: 52 }}>{t('¡TODAVÍA NO HAY DROPS!', '¡NO DROPS YET!')}</Text>
          <Text style={{ ...S, fontSize: 14, lineHeight: 20 }}>{t('Los locales sueltan sorpresas durante el día. Date una vuelta o vuelve más rato.', 'Los locales drop surprises all day. Take a walk o vuelve más rato.')}</Text>
        </View>
      ) : (
        <>
          {/* Titular */}
          <Pressable onPress={() => alAbrir(portada)} style={{ marginHorizontal: 10, marginTop: 10 }}>
            <Text style={{ ...N, fontSize: 15, color: ROJO, fontStyle: 'italic' }}>{t(ANTETITULOS[portada.categoria] || (hora < 12 ? 'Arranca el día con ofertón:' : 'Atención, vecinos:'), 'Breaking news, vecinos:')}</Text>
            <FraseGlosario texto={(portada.frase || portada.titulo).toUpperCase()} colorAyuda={ROJO} numberOfLines={4} style={{ ...T, fontSize: 50, lineHeight: 52, color: C.negro, paddingRight: 50 }} />
            <Estallido texto={portada.tipo === 'sorpresa' ? '¿?' : precio(portada.precio) || '¡YA!'} tam={84} style={{ position: 'absolute', right: -6, top: 24 }} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 10, marginTop: 8 }}>
            <Caja style={{ width: 150, height: 150, overflow: 'hidden' }}>
              <PuntosPop color={ROJO} fondo="#FFE3E3" tam={2.4} sep={8} />
              <View style={{ position: 'absolute', left: 25, top: 18, width: 96, height: 96, borderRadius: 48, backgroundColor: AMARILLO, borderWidth: 3, borderColor: C.borde }} />
              <View style={{ position: 'absolute', left: 50, top: 50, flexDirection: 'row', gap: 4 }}>
                {[0, 1].map((i) => <View key={i} style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: C.borde, alignItems: i ? 'flex-end' : 'flex-start', justifyContent: 'flex-end', padding: 1 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.negro }} /></View>)}
              </View>
              <Text style={{ ...N, position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.negro, color: '#FFFFFF', fontSize: 9, padding: 4 }}>{t('Foto: la lámina que se lleva quien canjea.', 'Photo: la lámina you get when you canjear.')}</Text>
            </Caja>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...N, fontSize: 13, color: ROJO, textTransform: 'uppercase' }}>{portada.local_nombre}</Text>
              <Text style={{ ...S, fontSize: 13, lineHeight: 18 }}>
                {t(`${portada.local_nombre} soltó ${portada.titulo.toLowerCase()} y a esta hora quedan ${portada.quedan}. Está a ${cuad(portada.cuadras)} de ti.`, `${portada.local_nombre} dropped ${portada.titulo.toLowerCase()} and only ${portada.quedan} left. It's ${cuad(portada.cuadras)} away.`)}
              </Text>
              <Pressable onPress={() => (portada.dentro_del_radio || !coords[portada.local_id] ? alAbrir(portada) : alComoLlegar ? alComoLlegar({ ...coords[portada.local_id], nombre: portada.local_nombre }) : caminar(coords[portada.local_id]))} accessibilityRole="button"
                style={{ backgroundColor: C.negro, paddingVertical: 10, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ ...T, fontSize: 15, color: AMARILLO }}>{portada.dentro_del_radio ? t('¡CANJÉALO AHORA!', '¡CANJÉALO NOW!') : t(`CÓMO LLEGAR · ${Math.max(1, Math.round((portada.cuadras || 1) * 1.25))} MIN`, `GET THERE · ${Math.max(1, Math.round((portada.cuadras || 1) * 1.25))} MIN`)}</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginHorizontal: 10, marginTop: 12, borderTopWidth: 3, borderBottomWidth: 1, borderColor: C.borde, height: 6 }} />

          {/* Segunda nota + farándula */}
          <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 10, marginTop: 8 }}>
            {segunda ? (
              <Pressable onPress={() => alAbrir(segunda)} style={{ flex: 1.2 }}>
                <Caja fondo={AMARILLO} style={{ padding: 8, flex: 1 }}>
                  <Text style={{ ...N, fontSize: 10 }}>{t('Exclusivo', 'Exclusive')} · {segunda.local_nombre}</Text>
                  <Text numberOfLines={4} style={{ ...N, fontSize: 25, lineHeight: 26, color: ROJO }}>{segunda.frase || segunda.titulo}</Text>
                  <Text style={{ ...N, fontSize: 11, marginTop: 4 }}>{precio(segunda.precio) ? `${precio(segunda.precio)} · ` : ''}{t('Quedan', 'Left:')} {segunda.quedan} · {cuad(segunda.cuadras)}</Text>
                </Caja>
              </Pressable>
            ) : null}
            <Caja fondo={C.azul} style={{ flex: 1, padding: 7 }}>
              <Text style={{ ...T, alignSelf: 'flex-start', backgroundColor: ROJO, color: '#FFFFFF', paddingHorizontal: 5, fontSize: 13 }}>{t('FARÁNDULA', 'FARÁNDULA · GOSSIP')}</Text>
              {(farandula.length ? farandula : drops.slice(0, 2)).map((d, k) => (
                <Pressable key={d.drop_id} onPress={() => alAbrir(d)}>
                  {k ? <Text style={{ color: AMARILLO, textAlign: 'center', letterSpacing: 4 }}>✦ ✦ ✦</Text> : null}
                  <Text style={{ ...N, fontSize: 13, lineHeight: 15, color: '#FFFFFF', marginTop: k ? 0 : 4 }}>{t(FARANDULA[(k + (d.tipo === 'sorpresa' ? 0 : 1)) % FARANDULA.length](d), FARANDULA_EN[(k + (d.tipo === 'sorpresa' ? 0 : 1)) % FARANDULA_EN.length](d))}</Text>
                </Pressable>
              ))}
            </Caja>
          </View>

          {/* Clasificados: el resto de los drops */}
          {resto.length ? (
            <>
              <View style={{ marginHorizontal: 10, marginTop: 14, borderTopWidth: 3, borderBottomWidth: 3, borderColor: C.borde, paddingVertical: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ ...T, fontSize: 24 }}>{t('CLASIFICADOS DEL BARRIO', 'CLASIFICADOS · CLASSIFIEDS')}</Text>
                <Text style={{ ...N, fontSize: 11 }}>{resto.length} {t('avisos', 'ads')}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 10, borderBottomWidth: 2, borderColor: C.borde }}>
                {resto.map((d, k) => {
                  const negro = d.tipo === 'sorpresa';
                  return (
                    <Pressable key={d.drop_id} onPress={() => alAbrir(d)} accessibilityRole="button"
                      style={{ width: '33.33%', padding: 6, borderRightWidth: k % 3 === 2 ? 0 : 1, borderBottomWidth: 1, borderColor: C.borde, backgroundColor: negro ? C.negro : 'transparent' }}>
                      <Text numberOfLines={1} style={{ ...T, fontSize: 15, color: negro ? AMARILLO : C.negro }}>{negro ? t('¿SORPRESA?', '¿SURPRISE?') : d.local_nombre.toUpperCase()}</Text>
                      <Text numberOfLines={3} style={{ ...S, fontSize: 11, lineHeight: 14, color: negro ? '#FFFFFF' : C.negro }}>{negro ? t(`Se revela en el local. Quedan ${d.quedan}.`, `Revealed at the local. Only ${d.quedan}.`) : t(`${d.titulo}. Quedan ${d.quedan}.`, `${d.titulo}. Only ${d.quedan} left.`)}</Text>
                      <Text style={{ ...T, fontSize: 17, color: negro ? AMARILLO : d.tipo === 'grupal' ? C.azul : ROJO }}>{negro ? '¿?' : precio(d.precio) || cuad(d.cuadras)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </>
      )}

      {/* Cierre */}
      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 10, marginTop: 12 }}>
        <Caja fondo={ROJO} style={{ flex: 1.3, padding: 7, alignItems: 'center' }}>
          <Text style={{ ...N, fontSize: 10, color: AMARILLO, textAlign: 'center' }}>{t('Volvió por séptima vez al mismo local', 'Came back por séptima vez')}</Text>
          <Text style={{ ...T, fontSize: 28, lineHeight: 29, color: '#FFFFFF', textAlign: 'center' }}>{t('JOVEN CASERITO SE VOLVIÓ LÁMINA', 'CASERITO TURNS INTO A LÁMINA')}</Text>
        </Caja>
        <Caja fondo="#FFFFFF" style={{ flex: 1, padding: 7 }}>
          <Text style={{ ...T, fontSize: 15 }}>{t('HORÓSCOPO CASERO', 'HORÓSCOPO · HOROSCOPE')}</Text>
          <Text style={{ ...S, fontSize: 11, lineHeight: 15 }}>{t(`${HOROSCOPO[new Date().getDate() % HOROSCOPO.length]} ${HOROSCOPO[(new Date().getDate() + 3) % HOROSCOPO.length]}`, 'Aries: a drop is waiting a la vuelta. Tauro: hoy no diet.')}</Text>
        </Caja>
      </View>
    </ScrollView>
  );
}
