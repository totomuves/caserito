import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
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
  const { t } = useIdioma();

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
            <Pressable key={l.id} onPress={() => setSel(k)} accessibilityLabel={`${t('Lámina', "Lámina")} ${k + 1}, ${ganada ? l.nombre + t(', ganada', ", ¡la tienes!") : textoCategoria(l.categoria) + t(', te falta', ", te falta")}`}
              style={{ width: '22.6%', height: 118, borderRadius: 12, borderWidth: activa ? 3 : 2.5, borderStyle: ganada || activa ? 'solid' : 'dashed', borderColor: activa ? C.rojo : ganada ? C.negro : '#8A7A66', backgroundColor: ganada ? m.fondo : 'transparent', transform: [{ rotate: ganada ? GIROS[k % 4] : '0deg' }], padding: 5, justifyContent: 'space-between' }}>
              <Text style={{ ...letrista, fontSize: 13, color: ganada ? m.num : '#8A7A66' }}>{k + 1}</Text>
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
        </View>
      )}
    </ScrollView>
  );
}
