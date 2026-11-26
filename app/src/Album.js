import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase, explicar } from './supabase';
import { C, F, letrista, textoCategoria, R, ESTILO, sobrio } from './tema';
import { Ola, Brillo, IconoCategoria, Boton, FondoBauhaus, Figura, figuraDe, colorDe, PuntosPop } from './componentes';
import { useIdioma } from './idioma';
import { identidadDe, Motivo } from './identidad';
import { Monstruito, apodoLamina, letraLamina } from './monstruito';
import { ArteLocal } from './arteLocal';
import Honor from './Honor';
import { PosterLugar, useVisitados } from './Poster';
import { useLugares } from './MapaComun';
import Svg, { Circle } from 'react-native-svg';

const MARCOS = [
  { fondo: C.amarillo, num: C.negro, texto: C.negro },
  { fondo: C.rojo, num: C.amarillo, texto: '#FFFFFF' },
  { fondo: C.azul, num: C.amarillo, texto: '#FFFFFF' },
];
const GIROS = ['-2deg', '1.5deg', '-1deg', '2deg'];

// Arte de cada lámina: Bauhaus + pop art (puntos Ben-Day de Lichtenstein): bloque de color, la figura del rubro y una figura de acento, con ojos saltones
const PALETAS = [
  { fondo: C.amarillo, figura: C.rojo, acento: C.azul, puntos: '#F29B00' },
  { fondo: C.azul, figura: C.amarillo, acento: C.rojo, puntos: '#5D8BD0' },
  { fondo: C.rojo, figura: C.negro, acento: C.amarillo, puntos: '#FF6B7E' },
  { fondo: C.papel, figura: C.azul, acento: C.amarillo, puntos: '#F2A0A8' },
  { fondo: C.negro, figura: C.amarillo, acento: C.rojo, puntos: '#3A3A3A' },
];
const ACENTOS = ['cuadrado', 'circulo', 'triangulo', 'cuarto'];
const POSICIONES = [
  { figura: { left: -18, top: -18 }, acento: { right: 6, bottom: 6 } },
  { figura: { right: -16, bottom: -16 }, acento: { left: 8, top: 8 } },
  { figura: { right: -10, top: -14 }, acento: { left: 6, bottom: 4 } },
  { figura: { left: -12, bottom: -20 }, acento: { right: 8, top: 8 } },
];
function ArteBauhaus({ local, alto = 80 }) {
  // Arte único por local (composición Bauhaus generada desde su id)
  return (
    <View style={{ height: alto, borderWidth: 2, borderColor: C.borde, overflow: 'hidden' }}>
      <ArteLocal id={local.id} categoria={local.categoria} pista={local.nombre} ancho="100%" alto={alto} borde={false} imagen={local.logo_url} />
    </View>
  );
}

export default function Album({ usuario, alIrAlMapa, barrios = [], barrioInicial }) {
  // Un álbum por barrio: parte en el barrio donde estás
  const [barrioSel, setBarrioSel] = useState(barrioInicial || null);
  useEffect(() => { if (!barrioSel && barrioInicial) setBarrioSel(barrioInicial); }, [barrioInicial]);
  const barrio = barrios.find((x) => x.id === barrioSel) || null;
  const ide = identidadDe(barrioSel || 'barrio-italia');
  const [locales, setLocales] = useState(null);
  const [mias, setMias] = useState({});
  const [sel, setSel] = useState(null);
  const [error, setError] = useState('');
  const [rep, setRep] = useState({});
  const [pidiendo, setPidiendo] = useState(false);
  const [msgRep, setMsgRep] = useState('');
  const { t } = useIdioma();
  const [arte, setArte] = useState(null);
  const [msgArte, setMsgArte] = useState('');
  async function cargarArte() {
    if (!barrioSel) { setArte(null); return; }
    const r = await supabase.rpc('mi_arte', { p_barrio: barrioSel });
    setArte(!r.error && r.data && r.data[0] ? r.data[0] : null);
  }
  useEffect(() => { cargarArte(); }, [barrioSel, usuario.id]);
  async function pedirArte() {
    setMsgArte('');
    const { error } = await supabase.rpc('pedir_arte', { p_barrio: barrioSel });
    if (error) setMsgArte(explicar(error)); else cargarArte();
  }

  // Repetidas por local (si el SQL 014 no está, simplemente no se muestran)
  async function cargarRepetidas() {
    const r = await supabase.rpc('mis_repetidas');
    if (r.error) return;
    const mapa = {};
    (r.data || []).forEach((x) => { mapa[x.local_id] = x; });
    setRep(mapa);
  }
  useEffect(() => { cargarRepetidas(); }, [usuario.id]);

  async function pedirCambio(localId) {
    setPidiendo(true); setMsgRep('');
    const { error } = await supabase.rpc('pedir_cambio_repetidas', { p_local: localId });
    setPidiendo(false);
    if (error) setMsgRep(explicar(error)); else cargarRepetidas();
  }

  useEffect(() => {
    (async () => {
      setSel(null);
      const campos = 'id, nombre, categoria, producto_estrella, logo_url, creado_at';
      let l = barrioSel
        ? await supabase.from('locales').select(campos).eq('activo', true).eq('aprobado', true).eq('barrio_id', barrioSel).order('creado_at')
        : { error: true };
      // Sin el SQL 015 (o sin barrios): el álbum de Barrio Italia, como antes
      if (l.error) l = await supabase.from('locales').select(campos).eq('activo', true).eq('aprobado', true).eq('barrio', 'Barrio Italia').order('creado_at');
      if (l.error) { setError(explicar(l.error)); return; }
      const m = await supabase.from('laminas').select('local_id, ganada_at').eq('usuario_id', usuario.id);
      const mapa = {};
      (m.data || []).forEach((x) => { mapa[x.local_id] = x.ganada_at; });
      setLocales(l.data || []);
      setMias(mapa);
    })();
  }, [usuario.id, barrioSel]);

  if (error) return <Text style={{ padding: 20, fontFamily: F.media }}>{error}</Text>;
  if (!locales) return null;

  const total = locales.length;
  const tengo = locales.filter((l) => mias[l.id]).length;
  const hitos = [5, 10, total].filter((h, k, a) => h > 0 && h <= total && a.indexOf(h) === k);
  const elegido = sel !== null ? locales[sel] : null;

  const detalle = elegido ? (
        <View style={{ margin: 16, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.borde, borderRadius: R(16), padding: 16, gap: 8 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.rojoTexto, textTransform: 'uppercase' }}>
            {t('Lámina', "Lámina")} {sel + 1} · {mias[elegido.id] ? t('ganada', "¡la tienes!") : t('te falta', "te falta")}
          </Text>
          {mias[elegido.id] ? (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {ESTILO === 'clasico' ? <Monstruito categoria={elegido.categoria} local={elegido} tam={72} /> : <View style={{ width: 90, borderWidth: 3, borderColor: C.borde, padding: 4, backgroundColor: C.papel }}><ArteBauhaus local={elegido} k={sel} alto={90} /></View>}
              <View style={{ flex: 1 }}>
                <Text style={{ ...letrista, fontSize: 22 }}>{apodoLamina(elegido).toUpperCase()}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  
                  <Text style={{ fontFamily: F.negrita, fontSize: 14 }}>{elegido.nombre} · {t('lámina', 'lámina')} {sel + 1}{letraLamina(elegido)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={{ ...letrista, fontSize: 22 }}>{textoCategoria(elegido.categoria).toUpperCase()}</Text>
          )}
          <Text style={{ fontFamily: F.normal, fontSize: 14 }}>
            {mias[elegido.id]
              ? `${t('La ganaste el', "La ganaste el")} ${new Date(mias[elegido.id]).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}${elegido.producto_estrella ? ' · ' + t('producto estrella', "imperdible") + ': ' + elegido.producto_estrella : ''}.`
              : t('Canjea cualquier drop de este local y la lámina es tuya. Búscalo en el mapa.', "Canjea any drop en este local y la lámina es tuya. Find it en el mapa.")}
          </Text>
          {!mias[elegido.id] && <Boton texto={t("Ver en el mapa", "Ver en el mapa")} onPress={alIrAlMapa} />}
          {mias[elegido.id] && rep[elegido.id] ? <Repetidas r={rep[elegido.id]} t={t} pidiendo={pidiendo} msg={msgRep} alPedir={() => pedirCambio(elegido.id)} /> : null}
        </View>
  ) : null;
  if (ESTILO === 'moderno') {
    return <AlbumModerno {...{ barrio, barrios, barrioSel, setBarrioSel, locales, mias, rep, sel, setSel, tengo, total, arte, msgArte, pedirArte, detalle, t }} chile={Object.keys(mias).length} />;
  }
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={{ backgroundColor: sobrio() ? C.amarillo : C.azul, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 }}>
        <FondoBauhaus variante="album" />
        <Text style={{ fontFamily: F.negrita, fontSize: 11, letterSpacing: 2, color: sobrio() ? C.negro : C.amarillo, textTransform: 'uppercase' }}>{t('Álbum de Chile · ', 'Álbum de Chile · ')}{ide.edicion}</Text>
        <Text style={{ ...letrista, fontSize: 34, color: sobrio() ? C.rojo : C.papel, textShadowColor: sobrio() ? C.azul : C.negro, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0, maxWidth: 250 }}>{(barrio ? barrio.nombre : 'Barrio Italia').toUpperCase()}</Text>
        {barrio ? <Text style={{ fontFamily: F.negrita, fontSize: 12, color: sobrio() ? C.negro : C.papel }}>{barrio.comuna} · {Object.keys(mias).length} {t('láminas en todo Chile', 'láminas en todo Chile')}</Text> : null}
        <View style={{ marginTop: 6, width: 120 }}><Motivo tipo={ide.motivo} a={ide.principal} b={ide.acento} alto={8} /></View>
      </View>
      <Ola color={sobrio() ? C.amarillo : C.azul} />
      {barrios.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
          {barrios.map((x) => {
            const activo = x.id === barrioSel;
            return (
              <Pressable key={x.id} onPress={() => setBarrioSel(x.id)} accessibilityRole="button" accessibilityState={{ selected: activo }}
                style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, backgroundColor: activo ? C.negro : C.papel, justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.negrita, fontSize: 14, color: activo ? C.amarillo : C.negro }}>
                  {x.nombre.replace(/^Barrio /, '')}{!x.lanzado ? t(' · pronto', ' · soon') : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {total === 0 && (
        <View style={{ marginHorizontal: 16, marginTop: 6, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.borde, borderRadius: R(16), padding: 16, gap: 6 }}>
          <Text style={{ ...letrista, fontSize: 20 }}>{t('¡LLEGAMOS PRONTO!', '¡LLEGAMOS PRONTO! SOON')}</Text>
          <Text style={{ fontFamily: F.normal, fontSize: 14 }}>
            {t(`Todavía no hay locales de ${barrio ? barrio.nombre : 'este barrio'} en Dropper. Cuando se sumen, aquí aparecen sus láminas.`,
               `Todavía no hay locales de ${barrio ? barrio.nombre : 'este barrio'}. Cuando se sumen, sus láminas show up here.`)}
          </Text>
        </View>
      )}
      <View style={{ marginHorizontal: 16, marginTop: 6, backgroundColor: C.negro, borderRadius: R(16), padding: 16, gap: 10 }}>
        <Text style={{ ...letrista, fontSize: 30, color: C.amarillo }}>{tengo} {t('DE', "DE")} {total}</Text>
        <View style={{ height: 14, borderRadius: 7, backgroundColor: '#3A3A3A', overflow: 'hidden' }}>
          <View style={{ width: total ? `${(tengo / total) * 100}%` : '0%', height: '100%', backgroundColor: C.amarillo }} />
        </View>
        <Text style={{ fontFamily: F.media, fontSize: 13, color: C.papel }}>
          {hitos.map((h) => `${h} ${t('láminas', "láminas")}${tengo >= h ? ' ✓' : ''}`).join('  ·  ')}
        </Text>
        <Text style={{ fontFamily: F.normal, fontSize: 12, color: C.papel }}>{t('Ganas la lámina de un local con tu primer canje ahí.', "Get a local’s lámina (sticker) con tu primer canje there. ¡Júntalas todas!")}</Text>
      </View>

      {total > 0 ? <EdicionEspecial ide={ide} barrio={barrio} tengo={tengo} necesarias={Math.min(total, (arte && arte.necesarias) || 5)} t={t} /> : null}
      {arte ? <ArteBarrio a={arte} t={t} msg={msgArte} alPedir={pedirArte} /> : null}
      <Posters t={t} />
      <Honor usuario={usuario} t={t} />

      <Text style={{ ...letrista, fontSize: 20, marginHorizontal: 16, marginTop: 18, marginBottom: 10 }}>{t('LAS LÁMINAS', "LAS LÁMINAS · STICKERS")}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, rowGap: 16 }}>
        {locales.map((l, k) => {
          const ganada = !!mias[l.id];
          const m = ide.marcos[k % 3];
          const activa = sel === k;
          return (
            ESTILO === 'clasico' ? (
            <Pressable key={l.id} onPress={() => setSel(k)} accessibilityLabel={`${t('Lámina', "Lámina")} ${k + 1}, ${ganada ? l.nombre + t(', ganada', ", ¡la tienes!") + (rep[l.id] && rep[l.id].repetidas ? `, ${rep[l.id].repetidas} ${t('repetidas', 'repetidas')}` : '') : textoCategoria(l.categoria) + t(', te falta', ", te falta")}`}
              style={{ width: '22.6%', height: 118, borderRadius: R(12), borderWidth: activa ? 3 : 2.5, borderStyle: ganada || activa ? 'solid' : 'dashed', borderColor: activa ? C.rojo : ganada ? C.negro : '#8A7A66', backgroundColor: ganada ? m.fondo : 'transparent', transform: [{ rotate: ganada ? GIROS[k % 4] : '0deg' }], padding: 5, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ ...letrista, fontSize: 13, color: ganada ? m.num : '#8A7A66' }}>{k + 1}{ganada ? letraLamina(l) : ''}</Text>
                {ganada && rep[l.id] && rep[l.id].repetidas > 0 ? (
                  <View style={{ backgroundColor: C.negro, borderRadius: R(8), paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontFamily: F.negrita, fontSize: 10, color: C.amarillo }}>×{rep[l.id].repetidas}</Text>
                  </View>
                ) : null}
              </View>
              {ganada ? <Motivo tipo={ide.motivo} a={ide.principal} b={ide.acento} alto={4} /> : null}
              <View style={{ alignItems: 'center' }}>
                {ganada ? (
                  <Monstruito categoria={l.categoria} local={l} tam={48} />
                ) : (
                  <Figura forma={figuraDe(l.categoria)} color={C.crema} borde="#8A7A66" tam={34} />
                )}
              </View>
              <Text numberOfLines={2} style={{ fontFamily: F.negrita, fontSize: 10, textAlign: 'center', color: ganada ? m.texto : C.gris }}>
                {ganada ? apodoLamina(l) : textoCategoria(l.categoria)}
              </Text>
            </Pressable>
            ) : (
            <Pressable key={l.id} onPress={() => setSel(k)} accessibilityLabel={`${t('Lámina', "Lámina")} ${k + 1}, ${ganada ? l.nombre + t(', ganada', ", ¡la tienes!") + (rep[l.id] && rep[l.id].repetidas ? `, ${rep[l.id].repetidas} ${t('repetidas', 'repetidas')}` : '') : textoCategoria(l.categoria) + t(', te falta', ", te falta")}`}
              style={{ width: '30.5%', transform: [{ rotate: ganada ? GIROS[k % 4] : '0deg' }] }}>
              {ganada ? (
                <View style={{ backgroundColor: C.papel, borderWidth: 3, borderColor: activa ? C.rojo : C.negro, padding: 5, shadowColor: C.sombra, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 0 }}>
                  <ArteBauhaus local={l} k={k} alto={80} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ ...letrista, fontSize: 11, color: C.rojo }}>N° {String(k + 1).padStart(2, '0')}{letraLamina(l)}</Text>
                    {rep[l.id] && rep[l.id].repetidas > 0 ? (
                      <View style={{ backgroundColor: C.negro, paddingHorizontal: 4 }}>
                        <Text style={{ fontFamily: F.negrita, fontSize: 10, color: C.amarillo }}>×{rep[l.id].repetidas}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={2} style={{ fontFamily: F.negrita, fontSize: 10, lineHeight: 12, minHeight: 24 }}>{l.nombre}</Text>
                </View>
              ) : (
                <View style={{ borderWidth: activa ? 3 : 2.5, borderStyle: 'dashed', borderColor: activa ? C.rojo : '#8A7A66', backgroundColor: C.crema, padding: 5, alignItems: 'center' }}>
                  <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
                    <Figura forma={figuraDe(l.categoria)} color={C.crema} borde="#8A7A66" tam={38} />
                  </View>
                  <Text style={{ ...letrista, fontSize: 11, color: '#8A7A66', alignSelf: 'flex-start', marginTop: 4 }}>N° {String(k + 1).padStart(2, '0')}</Text>
                  <Text numberOfLines={2} style={{ fontFamily: F.negrita, fontSize: 10, lineHeight: 12, minHeight: 24, color: C.gris, alignSelf: 'flex-start' }}>{textoCategoria(l.categoria)}</Text>
                </View>
              )}
            </Pressable>
            )
          );
        })}
      </View>

      {detalle}
    </ScrollView>
  );
}

// Repetidas de un local: cuántas tienes, qué te dan y el QR del cambio
function Repetidas({ r, t, pidiendo, msg, alPedir }) {
  const premio = r.necesarias && r.premio;
  return (
    <View style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#CDBF9F', paddingTop: 10, gap: 8 }}>
      <Text style={{ fontFamily: F.negrita, fontSize: 15 }}>
        {r.repetidas === 1 ? t('Tienes 1 repetida', 'Tienes 1 repetida (duplicate)') : t(`Tienes ${r.repetidas} repetidas`, `Tienes ${r.repetidas} repetidas (duplicates)`)}
      </Text>
      {!premio ? (
        <Text style={{ fontFamily: F.normal, fontSize: 13, color: C.gris }}>{t('Cada canje extra en este local es una repetida. Este local todavía no las cambia por nada.', 'Cada canje extra here es una repetida. Este local no las cambia yet.')}</Text>
      ) : r.codigo ? (
        <View style={{ alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: R(16), borderWidth: 2, borderColor: C.borde, padding: 14 }}>
          <Text style={{ ...letrista, fontSize: 18, textAlign: 'center' }}>{t('CAMBIO LISTO', 'CAMBIO LISTO · READY')}</Text>
          <Text style={{ fontFamily: F.negrita, fontSize: 15, textAlign: 'center' }}>{r.premio}</Text>
          <QRCode value={r.codigo} size={170} />
          <Text style={{ fontFamily: F.negrita, fontSize: 20, letterSpacing: 3 }}>{r.codigo}</Text>
          <Text style={{ fontFamily: F.normal, fontSize: 13, textAlign: 'center' }}>
            {t('Muéstralo en la caja. Vale hasta el', 'Muéstralo en la caja. Vale hasta el')} {new Date(r.expira_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ fontFamily: F.normal, fontSize: 14 }}>{t(`Con ${r.necesarias} repetidas te dan: `, `Con ${r.necesarias} repetidas you get: `)}<Text style={{ fontFamily: F.negrita }}>{r.premio}</Text></Text>
          <View style={{ height: 12, borderRadius: 6, backgroundColor: '#E7DCC4', borderWidth: 2, borderColor: C.borde, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (r.repetidas / r.necesarias) * 100)}%`, height: '100%', backgroundColor: C.amarillo }} />
          </View>
          {r.repetidas >= r.necesarias
            ? <Boton texto={pidiendo ? t('Pidiendo…', 'Pidiendo…') : t('Cambiar mis repetidas', 'Cambiar mis repetidas · Trade in')} fondo={C.rojo} onPress={alPedir} deshabilitado={pidiendo} />
            : <Text style={{ fontFamily: F.normal, fontSize: 13, color: C.gris }}>{r.necesarias - r.repetidas === 1 ? t('Te falta 1. Vuelve a canjear acá.', 'Te falta 1. Vuelve a canjear acá.') : t(`Te faltan ${r.necesarias - r.repetidas}. Vuelve a canjear acá.`, `Te faltan ${r.necesarias - r.repetidas}. Vuelve a canjear acá.`)}</Text>}
          {msg ? <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.rojoTexto }}>{msg}</Text> : null}
        </>
      )}
    </View>
  );
}

// El arte del barrio: se cambia por N láminas distintas del barrio y se retira en un local
function ArteBarrio({ a, t, msg, alPedir }) {
  const listo = a.tengo >= a.necesarias;
  return (
    <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.azul, borderRadius: R(16), padding: 16, gap: 8 }}>
      <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.azul, textTransform: 'uppercase' }}>{t('Arte del barrio', 'Arte del barrio · local art')}</Text>
      <Text style={{ ...letrista, fontSize: 22 }}>{a.nombre.toUpperCase()}</Text>
      {a.imagen ? <Image source={{ uri: a.imagen }} style={{ width: '100%', height: 170, borderRadius: R(16), borderWidth: 2, borderColor: C.borde }} resizeMode="cover" accessibilityIgnoresInvertColors accessibilityLabel={a.nombre} /> : null}
      {a.descripcion ? <Text style={{ fontFamily: F.normal, fontSize: 14 }}>{a.descripcion}</Text> : null}
      {a.canjeado_at ? (
        <Text style={{ fontFamily: F.negrita, fontSize: 15 }}>{t('¡Ya es tuyo! Lo retiraste el', '¡Ya es tuyo! Lo retiraste el')} {new Date(a.canjeado_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}.</Text>
      ) : a.codigo ? (
        <>
        <Text style={{ fontFamily: F.negrita, fontSize: 15, color: C.rojoTexto }}>{t('¡GANASTE! Fuiste el primero del barrio.', '¡GANASTE! You were the first one.')}</Text>
        <View style={{ alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: R(16), borderWidth: 2, borderColor: C.borde, padding: 14 }}>
          <QRCode value={a.codigo} size={170} />
          <Text style={{ fontFamily: F.negrita, fontSize: 20, letterSpacing: 3 }}>{a.codigo}</Text>
          <Text style={{ fontFamily: F.normal, fontSize: 13, textAlign: 'center' }}>{t(`Retíralo en ${a.punto || 'el local del barrio'}: muestra este QR en la caja.`, `Retíralo en ${a.punto || 'el local del barrio'}: show this QR en la caja.`)}</Text>
          {a.vence_at ? <Text style={{ fontFamily: F.negrita, fontSize: 12, textAlign: 'center' }}>{t(`Tienes hasta el ${new Date(a.vence_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })} para retirarlo. Si no, pasa al siguiente.`, `Pick it up before ${new Date(a.vence_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}.`)}</Text> : null}
        </View>
        </>
      ) : a.ganado ? (
        <View style={{ gap: 4, backgroundColor: C.negro, padding: 12, borderRadius: R(12) }}>
          <Text style={{ ...letrista, fontSize: 18, color: C.amarillo }}>{t(`¡YA LO GANÓ ${(a.ganador || 'UN CASERITO').toUpperCase()}!`, `¡${(a.ganador || 'UN CASERITO').toUpperCase()} ALREADY WON IT!`)}</Text>
          <Text style={{ fontFamily: F.normal, fontSize: 13, color: C.papel }}>
            {a.vence_at
              ? t(`Si no lo retira antes del ${new Date(a.vence_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}, vuelve a quedar libre. Sigue juntando láminas.`, `Si no lo retira antes del ${new Date(a.vence_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}, it's up for grabs again.`)
              : t('Ya lo retiró. Atento: cuando llegue un arte nuevo al barrio, parte otra carrera.', 'Ya lo retiró. Stay tuned for the next arte.')}
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ fontFamily: F.normal, fontSize: 14 }}>
            {t(`Hay uno solo: se lo lleva el primero que junte ${a.necesarias} láminas de este barrio`, `Only one: the first to collect ${a.necesarias} láminas de este barrio wins it`)}{a.punto ? t(` (se retira en ${a.punto}).`, ` (pick it up en ${a.punto}).`) : '.'}
          </Text>
          <View style={{ height: 12, borderRadius: 6, backgroundColor: '#E7DCC4', borderWidth: 2, borderColor: C.borde, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (a.tengo / a.necesarias) * 100)}%`, height: '100%', backgroundColor: C.azul }} />
          </View>
          <Text style={{ fontFamily: F.negrita, fontSize: 13 }}>{Math.min(a.tengo, a.necesarias)} {t('de', 'de')} {a.necesarias}</Text>
          {listo && <Boton texto={t('Cambiar por el arte', 'Cambiar por el arte · Trade in')} fondo={C.azul} onPress={alPedir} />}
        </>
      )}
      {msg ? <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.rojoTexto }}>{msg}</Text> : null}
    </View>
  );
}

// Lámina de edición especial del barrio: se desbloquea juntando láminas de ese barrio
// Edición especial: la lámina más Bauhaus del álbum. Una composición de 5 figuras;
// cada lámina que juntas del barrio pinta una figura, y con todas aparece la lámina completa.
const COMPOSICION = [
  { forma: 'circulo', color: C.rojo, tam: 88, pos: { left: -14, top: 6 } },
  { forma: 'cuadrado', color: C.amarillo, tam: 46, pos: { right: 10, top: 12 } },
  { forma: 'triangulo', color: C.azul, tam: 62, pos: { right: 8, top: 62 } },
  { forma: 'cuarto', color: C.negro, tam: 52, pos: { left: 10, top: 96 } },
  { forma: 'semi', color: '#C9A227', tam: 58, pos: { left: 58, top: 104 } },
];
function EdicionEspecial({ ide, barrio, tengo, necesarias, t }) {
  const lista = tengo >= necesarias;
  const nombre = (barrio ? barrio.nombre : 'Barrio Italia').replace(/^Barrio /, '');
  const pintadas = Math.min(5, Math.round((Math.min(tengo, necesarias) / Math.max(1, necesarias)) * 5));
  return (
    <View style={{ marginHorizontal: 16, marginTop: 16, flexDirection: 'row', gap: 16, alignItems: 'center' }}>
      <View accessibilityLabel={lista ? `${t('Lámina edición especial de', 'Edición especial de')} ${nombre}` : `${t('Edición especial', 'Edición especial')}: ${tengo} ${t('de', 'de')} ${necesarias}`}
        style={{ width: 140, height: 196, backgroundColor: C.papel, borderWidth: 3, borderColor: C.borde, shadowColor: lista ? '#C9A227' : C.negro, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, overflow: 'hidden' }}>
        {/* grilla */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 150, height: 3, backgroundColor: C.negro }} />
        <View style={{ position: 'absolute', left: 92, top: 0, height: 150, width: 3, backgroundColor: C.negro }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 92, height: 2, backgroundColor: C.negro }} />
        {COMPOSICION.map((f, i) => (
          <Figura key={i} forma={f.forma} tam={f.tam} color={i < pintadas ? f.color : C.papel} borde={i < pintadas ? C.negro : '#B9AA92'} grosor={i < pintadas ? 2.5 : 2}
            style={{ position: 'absolute', ...f.pos }} />
        ))}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 43, backgroundColor: lista ? C.negro : '#B9AA92', paddingHorizontal: 8, justifyContent: 'center' }}>
          <Text numberOfLines={1} style={{ ...letrista, fontSize: 17, color: lista ? C.amarillo : C.papel }}>{nombre.toUpperCase()}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.negrita, fontSize: 8, letterSpacing: 1.5, color: lista ? '#C9A227' : C.papel }}>{t('EDICIÓN ESPECIAL', 'EDICIÓN ESPECIAL')}</Text>
        </View>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ ...letrista, fontSize: 18 }}>{lista ? t('¡TIENES LA EDICIÓN ESPECIAL!', '¡TIENES LA EDICIÓN ESPECIAL!') : t('EDICIÓN ESPECIAL', 'EDICIÓN ESPECIAL')}</Text>
        <Text style={{ fontFamily: F.normal, fontSize: 13 }}>
          {lista
            ? t(`La lámina de ${nombre} quedó completa: arte del barrio, ${ide.edicion.toLowerCase()} del Álbum de Chile.`, `La lámina de ${nombre} quedó completa. ¡Arte para el pueblo!`)
            : t(`Cada lámina de ${nombre} pinta una figura. Junta ${necesarias} y la composición queda completa.`, `Cada lámina de ${nombre} paints una figura. Junta ${necesarias} to complete it.`)}
        </Text>
        {!lista && (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {COMPOSICION.map((f, i) => <Figura key={i} forma={f.forma} tam={18} color={i < pintadas ? f.color : C.papel} borde={i < pintadas ? C.negro : '#B9AA92'} />)}
          </View>
        )}
      </View>
    </View>
  );
}


// Pósters de patios y malls: se ganan al estar adentro
export function Posters({ t }) {
  const lugares = useLugares();
  const vistos = useVisitados();
  if (!lugares.length) return null;
  const ganados = lugares.filter((g) => vistos.includes(g.id)).length;
  return (
    <View style={{ marginTop: 18, gap: 10 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ ...letrista, fontSize: 22 }}>{t('PÓSTERS', 'PÓSTERS · POSTERS')}</Text>
        <Text style={{ fontFamily: F.media, fontSize: 13, color: C.gris }}>{t(`Uno por cada patio y mall. Entra y es tuyo · ${ganados} de ${lugares.length}`, `One per mall · ${ganados}/${lugares.length}`)}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: 6 }}>
        {lugares.map((g) => <PosterLugar key={g.id} lugar={g} ancho={150} bloqueado={!vistos.includes(g.id)} />)}
      </ScrollView>
    </View>
  );
}

// Álbum moderno: limpio como Inicio. Anillo de avance, barrios, premio y láminas en 3 columnas
function AlbumModerno({ barrio, barrios, barrioSel, setBarrioSel, locales, mias, rep, sel, setSel, tengo, total, arte, msgArte, pedirArte, detalle, t, chile }) {
  const r = 32, largo = 2 * Math.PI * r;
  const avance = total ? tengo / total : 0;
  const sombra = { shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 };
  const premioSimple = arte && !arte.codigo && !arte.canjeado_at && !arte.ganado && arte.tengo < arte.necesarias;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} style={{ backgroundColor: '#F4F4F4' }}>
      <View style={{ backgroundColor: C.azul, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 11, letterSpacing: 1.5, color: C.amarillo }}>{t('TU ÁLBUM', 'YOUR ALBUM')}</Text>
          <Text style={{ fontFamily: F.negrita, fontSize: 28, letterSpacing: -1, color: '#FFFFFF' }} numberOfLines={1}>{barrio ? barrio.nombre : 'Barrio Italia'}</Text>
          <Text style={{ fontFamily: F.media, fontSize: 12, color: '#DCE6F5' }}>{barrio ? `${barrio.comuna} · ` : ''}{t(`${chile} láminas en todo Chile`, `${chile} stickers in Chile`)}</Text>
        </View>
        <View style={{ width: 82, height: 82, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={t(`${tengo} de ${total} láminas`, `${tengo} of ${total}`)}>
          <Svg width={82} height={82} style={{ position: 'absolute' }}>
            <Circle cx={41} cy={41} r={r} stroke="rgba(255,255,255,0.22)" strokeWidth={9} fill="none" />
            <Circle cx={41} cy={41} r={r} stroke={C.amarillo} strokeWidth={9} fill="none" strokeDasharray={`${largo * avance} ${largo}`} strokeLinecap="round" transform="rotate(-90 41 41)" />
          </Svg>
          <Text style={{ fontFamily: F.negrita, fontSize: 19, color: '#FFFFFF' }}>{tengo}/{total}</Text>
          <Text style={{ fontFamily: F.media, fontSize: 9, color: '#DCE6F5' }}>{t('láminas', 'stickers')}</Text>
        </View>
      </View>

      {barrios.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
          {barrios.map((x) => {
            const activo = x.id === barrioSel;
            return (
              <Pressable key={x.id} onPress={() => setBarrioSel(x.id)} accessibilityRole="button" accessibilityState={{ selected: activo }}
                style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: activo ? 0 : 1.5, borderColor: '#DDDDDD', backgroundColor: activo ? C.negro : '#FFFFFF', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.negrita, fontSize: 13, color: activo ? '#FFFFFF' : x.lanzado ? C.negro : '#777777' }}>{x.nombre.replace(/^Barrio /, '')}{!x.lanzado ? t(' · pronto', ' · soon') : ''}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {premioSimple ? (
        <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center', ...sombra }}>
          <View style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: C.amarillo, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {arte.imagen ? <Image source={{ uri: arte.imagen }} style={{ width: 54, height: 54 }} accessibilityIgnoresInvertColors /> : <Text style={{ fontSize: 24 }}>🎁</Text>}
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 14 }} numberOfLines={1}>{t('Premio', 'Prize')}: {arte.nombre}</Text>
            <View style={{ height: 7, borderRadius: 4, backgroundColor: '#E8EEF8', overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (arte.tengo / arte.necesarias) * 100)}%`, height: '100%', backgroundColor: C.azul }} />
            </View>
            <Text style={{ fontFamily: F.media, fontSize: 11, color: C.gris }}>{t(`${arte.tengo} de ${arte.necesarias} · el primero que las junte se lo lleva`, `${arte.tengo} of ${arte.necesarias} · first one wins`)}</Text>
          </View>
        </View>
      ) : arte ? <ArteBarrio a={arte} t={t} msg={msgArte} alPedir={pedirArte} /> : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 18, paddingTop: 18 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 18 }}>{t('Láminas', 'Stickers')}</Text>
        <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.gris }}>{total ? t(`Tienes ${tengo} · faltan ${total - tengo}`, `${tengo} · ${total - tengo} to go`) : ''}</Text>
      </View>
      {total === 0 ? (
        <Text style={{ fontFamily: F.media, fontSize: 14, color: C.gris, paddingHorizontal: 18, paddingTop: 8 }}>{t('Todavía no hay locales en este barrio. Cuando se sumen, aquí aparecen sus láminas.', 'No places here yet.')}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 10, gap: 10 }}>
        {locales.map((l, k) => {
          const ganada = !!mias[l.id];
          const activa = sel === k;
          const reps = rep[l.id] && rep[l.id].repetidas;
          return (
            <Pressable key={l.id} onPress={() => setSel(activa ? null : k)} accessibilityRole="button"
              accessibilityLabel={ganada ? `${l.nombre}${reps ? `, ${reps} ${t('repetidas', 'duplicates')}` : ''}` : `${textoCategoria(l.categoria)}, ${t('te falta', 'missing')}`}
              style={{ width: '31.2%' }}>
              {ganada ? (
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', borderWidth: activa ? 2 : 0, borderColor: C.negro, ...sombra }}>
                  <View style={{ height: 78 }}>
                    <ArteLocal id={l.id} categoria={l.categoria} pista={l.nombre} ancho="100%" alto={78} borde={false} imagen={l.logo_url} />
                    {reps ? <View style={{ position: 'absolute', right: 6, top: 6, backgroundColor: C.negro, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ fontFamily: F.negrita, fontSize: 9, color: C.amarillo }}>×{reps}</Text></View> : null}
                  </View>
                  <Text numberOfLines={1} style={{ fontFamily: F.negrita, fontSize: 11, paddingHorizontal: 8, paddingVertical: 6 }}>{l.nombre}</Text>
                </View>
              ) : (
                <View style={{ height: 104, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: activa ? C.negro : '#C9C9C9', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Text style={{ fontFamily: F.negrita, fontSize: 26, color: '#8A8A8A' }}>?</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.negrita, fontSize: 10, color: '#8A8A8A' }}>{textoCategoria(l.categoria)} · {t('te falta', 'missing')}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {detalle}
    </ScrollView>
  );
}
