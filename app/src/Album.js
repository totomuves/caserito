import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase, explicar } from './supabase';
import { C, F, letrista, textoCategoria } from './tema';
import { Ola, Brillo, IconoCategoria, Boton } from './componentes';
import { useIdioma } from './idioma';

const MARCOS = [
  { fondo: C.amarillo, num: C.negro, texto: C.negro },
  { fondo: C.rojo, num: C.amarillo, texto: '#FFFFFF' },
  { fondo: C.azul, num: C.amarillo, texto: '#FFFFFF' },
];
const GIROS = ['-2deg', '1.5deg', '-1deg', '2deg'];

export default function Album({ usuario, alIrAlMapa }) {
  const [locales, setLocales] = useState(null);
  const [mias, setMias] = useState({});
  const [sel, setSel] = useState(null);
  const [error, setError] = useState('');
  const [rep, setRep] = useState({});
  const [pidiendo, setPidiendo] = useState(false);
  const [msgRep, setMsgRep] = useState('');
  const { t } = useIdioma();

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
      const l = await supabase.from('locales').select('id, nombre, categoria, producto_estrella, logo_url, creado_at').eq('activo', true).eq('aprobado', true).eq('barrio', 'Barrio Italia').order('creado_at');
      if (l.error) { setError(explicar(l.error)); return; }
      const m = await supabase.from('laminas').select('local_id, ganada_at').eq('usuario_id', usuario.id);
      const mapa = {};
      (m.data || []).forEach((x) => { mapa[x.local_id] = x.ganada_at; });
      setLocales(l.data || []);
      setMias(mapa);
    })();
  }, [usuario.id]);

  if (error) return <Text style={{ padding: 20, fontFamily: F.media }}>{error}</Text>;
  if (!locales) return null;

  const total = locales.length;
  const tengo = locales.filter((l) => mias[l.id]).length;
  const hitos = [5, 10, total].filter((h, k, a) => h > 0 && h <= total && a.indexOf(h) === k);
  const elegido = sel !== null ? locales[sel] : null;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 }}>
        <Brillo tam={22} style={{ position: 'absolute', right: 28, top: 16 }} />
        <Text style={{ fontFamily: F.negrita, fontSize: 13 }}>{t('Tu álbum de', "Tu sticker album · Álbum de")}</Text>
        <Text style={{ ...letrista, fontSize: 34, color: C.rojo, textShadowColor: C.azul, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 }}>BARRIO ITALIA</Text>
      </View>
      <Ola color={C.amarillo} />

      <View style={{ marginHorizontal: 16, marginTop: 6, backgroundColor: C.negro, borderRadius: 18, padding: 16, gap: 10 }}>
        <Text style={{ ...letrista, fontSize: 30, color: C.amarillo }}>{tengo} {t('DE', "DE")} {total}</Text>
        <View style={{ height: 14, borderRadius: 7, backgroundColor: '#3A3A3A', overflow: 'hidden' }}>
          <View style={{ width: total ? `${(tengo / total) * 100}%` : '0%', height: '100%', backgroundColor: C.amarillo }} />
        </View>
        <Text style={{ fontFamily: F.media, fontSize: 13, color: C.papel }}>
          {hitos.map((h) => `${h} ${t('láminas', "láminas")}${tengo >= h ? ' ✓' : ''}`).join('  ·  ')}
        </Text>
        <Text style={{ fontFamily: F.normal, fontSize: 12, color: C.papel }}>{t('Ganas la lámina de un local con tu primer canje ahí.', "Get a local’s lámina (sticker) con tu primer canje there. ¡Júntalas todas!")}</Text>
      </View>

      <Text style={{ ...letrista, fontSize: 20, marginHorizontal: 16, marginTop: 18, marginBottom: 10 }}>{t('LAS LÁMINAS', "LAS LÁMINAS · STICKERS")}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 9 }}>
        {locales.map((l, k) => {
          const ganada = !!mias[l.id];
          const m = MARCOS[k % 3];
          const activa = sel === k;
          return (
            <Pressable key={l.id} onPress={() => setSel(k)} accessibilityLabel={`${t('Lámina', "Lámina")} ${k + 1}, ${ganada ? l.nombre + t(', ganada', ", ¡la tienes!") + (rep[l.id] && rep[l.id].repetidas ? `, ${rep[l.id].repetidas} ${t('repetidas', 'repetidas')}` : '') : textoCategoria(l.categoria) + t(', te falta', ", te falta")}`}
              style={{ width: '22.6%', height: 118, borderRadius: 12, borderWidth: activa ? 3 : 2.5, borderStyle: ganada || activa ? 'solid' : 'dashed', borderColor: activa ? C.rojo : ganada ? C.negro : '#8A7A66', backgroundColor: ganada ? m.fondo : 'transparent', transform: [{ rotate: ganada ? GIROS[k % 4] : '0deg' }], padding: 5, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ ...letrista, fontSize: 13, color: ganada ? m.num : '#8A7A66' }}>{k + 1}</Text>
                {ganada && rep[l.id] && rep[l.id].repetidas > 0 ? (
                  <View style={{ backgroundColor: C.negro, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontFamily: F.negrita, fontSize: 10, color: C.amarillo }}>×{rep[l.id].repetidas}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ alignItems: 'center' }}>
                {ganada ? (
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.papel, borderWidth: 2, borderColor: C.negro, alignItems: 'center', justifyContent: 'center' }}>
                    {l.logo_url
                      ? <Image source={{ uri: l.logo_url }} style={{ width: 42, height: 42, borderRadius: 21 }} accessibilityIgnoresInvertColors />
                      : <IconoCategoria categoria={l.categoria} />}
                  </View>
                ) : (
                  <Text style={{ ...letrista, fontSize: 30, color: '#8A7A66' }}>?</Text>
                )}
              </View>
              <Text numberOfLines={2} style={{ fontFamily: F.negrita, fontSize: 10, textAlign: 'center', color: ganada ? m.texto : C.gris }}>
                {ganada ? l.nombre : textoCategoria(l.categoria)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {elegido && (
        <View style={{ margin: 16, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.negro, borderRadius: 18, padding: 16, gap: 8 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.rojoTexto, textTransform: 'uppercase' }}>
            {t('Lámina', "Lámina")} {sel + 1} · {mias[elegido.id] ? t('ganada', "¡la tienes!") : t('te falta', "te falta")}
          </Text>
          <Text style={{ ...letrista, fontSize: 22 }}>{mias[elegido.id] ? elegido.nombre.toUpperCase() : textoCategoria(elegido.categoria).toUpperCase()}</Text>
          <Text style={{ fontFamily: F.normal, fontSize: 14 }}>
            {mias[elegido.id]
              ? `${t('La ganaste el', "La ganaste el")} ${new Date(mias[elegido.id]).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}${elegido.producto_estrella ? ' · ' + t('producto estrella', "imperdible") + ': ' + elegido.producto_estrella : ''}.`
              : t('Canjea cualquier drop de este local y la lámina es tuya. Búscalo en el mapa.', "Canjea any drop en este local y la lámina es tuya. Find it en el mapa.")}
          </Text>
          {!mias[elegido.id] && <Boton texto={t("Ver en el mapa", "Ver en el mapa")} onPress={alIrAlMapa} />}
          {mias[elegido.id] && rep[elegido.id] ? <Repetidas r={rep[elegido.id]} t={t} pidiendo={pidiendo} msg={msgRep} alPedir={() => pedirCambio(elegido.id)} /> : null}
        </View>
      )}
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
        <View style={{ alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: C.negro, padding: 14 }}>
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
          <View style={{ height: 12, borderRadius: 6, backgroundColor: '#E7DCC4', borderWidth: 2, borderColor: C.negro, overflow: 'hidden' }}>
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
