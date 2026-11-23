import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Path } from 'react-native-svg';
import { supabase, explicar, leerPunto } from './supabase';
import { C, F, letrista, precio, cuadras, textoCategoria, R, ESTILO, sobrio } from './tema';
import { Ola, Boton, EtiquetaPrecio, Brillo, FondoBauhaus, Figura, PuntosPop, GloboPop, Estallido } from './componentes';
import { ArteLocal } from './arteLocal';
import { useIdioma, FraseGlosario, CATEGORIA_TUR, categoriaTur } from './idioma';

export default function Drop({ drop, usuario, alCerrar }) {
  const [mio, setMio] = useState(undefined);
  const [estado, setEstado] = useState(null);
  const [niveles, setNiveles] = useState([]);
  const [error, setError] = useState('');
  const [ahora, setAhora] = useState(Date.now());
  const [nota, setNota] = useState(null);
  const [destino, setDestino] = useState(null);

  useEffect(() => {
    supabase.from('participaciones').select('codigo, canjeado_at')
      .eq('drop_id', drop.drop_id).eq('usuario_id', usuario.id).maybeSingle()
      .then(({ data }) => setMio(data || null));
    if (drop.tipo === 'grupal') {
      supabase.from('drop_niveles').select('umbral, beneficio').eq('drop_id', drop.drop_id).order('umbral')
        .then(({ data }) => setNiveles(data || []));
    }
    supabase.from('locales').select('ubicacion, direccion, logo_url').eq('id', drop.local_id).maybeSingle()
      .then(({ data }) => data && setDestino({ ...leerPunto(data.ubicacion), direccion: data.direccion, logo: data.logo_url }));
    supabase.from('calificaciones').select('promedio, cantidad').eq('local_id', drop.local_id).maybeSingle()
      .then(({ data }) => setNota(data || null));
    const leer = () => supabase.rpc('estado_drop', { p_drop: drop.drop_id })
      .then(({ data }) => data && setEstado(Array.isArray(data) ? data[0] : data));
    leer();
    const t1 = setInterval(leer, 10000);
    const t2 = setInterval(() => setAhora(Date.now()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [drop.drop_id]);

  async function sumarme() {
    setError('');
    const { data, error } = await supabase.rpc('sumarme', { p_drop: drop.drop_id });
    if (error) { setError(explicar(error)); return; }
    setMio({ codigo: data, canjeado_at: null });
    // Caserito aprende: te tinca esta categoría
    await supabase.from('gustos').upsert(
      { usuario_id: usuario.id, etiqueta: 'Te tinca: ' + textoCategoria(drop.categoria).toLowerCase(), categoria: drop.categoria, origen: 'aprendido' },
      { onConflict: 'usuario_id,etiqueta', ignoreDuplicates: true }
    );
  }

  const quedan = estado ? estado.quedan : drop.quedan;
  const canjeados = estado ? Number(estado.canjeados) : 0;
  const nivel = estado ? estado.nivel_actual : drop.nivel_actual;
  const resta = Math.max(0, new Date(drop.termina_at).getTime() - ahora);
  const reloj = `${Math.floor(resta / 3600000)}:${String(Math.floor((resta % 3600000) / 60000)).padStart(2, '0')}:${String(Math.floor((resta % 60000) / 1000)).padStart(2, '0')}`;
  const maxNivel = niveles.length ? niveles[niveles.length - 1].umbral : 1;
  const { tur, lang, t, cuad } = useIdioma();

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ backgroundColor: sobrio() ? C.amarillo : C.rojo, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <FondoBauhaus variante="drop" />
        <Pressable onPress={alCerrar} accessibilityRole="button" accessibilityLabel={t("Volver", "Volver · Back")}
          style={{ width: 44, height: 44, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, backgroundColor: C.papel, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.negro} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 18l-6-6 6-6" /></Svg>
        </Pressable>
        <View accessibilityLabel={`Lámina de ${drop.local_nombre}`} style={{ width: 44, height: 44, borderWidth: 2.5, borderColor: C.borde, overflow: 'hidden', backgroundColor: C.papel }}>
          <ArteLocal id={drop.local_id} categoria={drop.categoria} pista={drop.local_nombre} ancho={39} alto={39} borde={false} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...letrista, fontSize: 22, color: sobrio() ? C.negro : C.papel, textShadowColor: C.negro, textShadowOffset: { width: sobrio() ? 0 : 2, height: sobrio() ? 0 : 2 }, textShadowRadius: 0 }} numberOfLines={1}>{drop.local_nombre}</Text>
          <Text style={{ fontFamily: F.negrita, fontSize: 12, color: sobrio() ? C.negro : C.papel }}>
            {tur ? categoriaTur(drop.categoria, lang) || textoCategoria(drop.categoria) : textoCategoria(drop.categoria)} · {cuad(drop.cuadras)}{nota ? ` · ★ ${nota.promedio} (${nota.cantidad})` : ''}
          </Text>
        </View>
      </View>
      <Ola color={sobrio() ? C.amarillo : C.rojo} />

      {sobrio() ? null : (
      <View style={{ marginHorizontal: 16, marginTop: 14, borderWidth: 3, borderColor: C.borde, height: 150, overflow: 'hidden', padding: 12, shadowColor: C.sombra, shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0 }}>
        <PuntosPop color={C.rojo} fondo="#FFE3E3" tam={3.4} sep={10} />
        {drop.frase ? (
          <GloboPop style={{ maxWidth: '78%' }}>
            <FraseGlosario texto={drop.frase} colorAyuda={C.rojoTexto} style={{ fontFamily: F.negrita, fontSize: 15, lineHeight: 19, textTransform: 'uppercase' }} />
          </GloboPop>
        ) : null}
        <Estallido texto={drop.tipo === 'sorpresa' && !mio ? '¿?' : precio(drop.precio) || '¡YA!'} tam={96} style={{ position: 'absolute', right: 6, bottom: 4 }} />
      </View>
      )}

      <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.borde, borderRadius: R(16), padding: 18, gap: 10 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.rojoTexto, textTransform: 'uppercase' }}>
          {drop.tipo === 'recien_llegado' ? t('Recién llegado', "Recién llegado · Just in") : drop.tipo === 'grupal' ? t('Drop grupal', "Drop grupal · Group") : drop.tipo === 'sorpresa' ? t('Drop sorpresa', "Drop sorpresa · Mystery") : 'Drop'} · {t('quedan', "quedan:")} {quedan}
        </Text>
        {sobrio() ? <EtiquetaPrecio valor={drop.tipo === 'sorpresa' && !mio ? '¿?' : precio(drop.precio)} /> : null}
        <Text style={{ ...letrista, fontSize: 24, lineHeight: 28 }}>{drop.tipo === 'sorpresa' && !drop.dentro_del_radio ? t('SE REVELA EN EL LOCAL', "SE REVELA EN EL LOCAL · SURPRISE!") : drop.titulo.toUpperCase()}</Text>
        {sobrio() && drop.frase ? <FraseGlosario texto={`“${drop.frase.toUpperCase()}”`} colorAyuda={C.rojoTexto} style={{ ...letrista, fontSize: 17, lineHeight: 22, color: C.rojo }} /> : null}

        {drop.tipo === 'grupal' && (
          <View style={{ gap: 6, marginTop: 4 }}>
            <View style={{ height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: C.borde, backgroundColor: C.amarilloSuave, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (canjeados / maxNivel) * 100)}%`, height: '100%', backgroundColor: C.rojo }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {niveles.map((n) => <Text key={n.umbral} style={{ fontFamily: F.negrita, fontSize: 12, color: C.gris }}>{n.umbral} · {n.beneficio}</Text>)}
            </View>
            <Text style={{ fontFamily: F.media, fontSize: 14 }}>
              <Text style={{ fontFamily: F.negrita }}>{canjeados} {t('canjeados.', "canjeados.")}</Text> {nivel ? `${t('Ahora', "Ahora")}: ${nivel}.` : t('Todavía sin descuento.', "Sin descuento yet.")}{estado && estado.siguiente_umbral ? t(` Faltan ${estado.siguiente_umbral - canjeados} para el siguiente nivel.`, ` ${estado.siguiente_umbral - canjeados} más to unlock el siguiente nivel. ¡Invita a tus amigos!`) : ''}
            </Text>
          </View>
        )}

        {mio === undefined ? null : !mio ? (
          <Boton texto={t("Me sumo", "Me sumo · Join")} grande fondo={C.amarillo} color={C.negro} onPress={sumarme} style={{ marginTop: 6 }} />
        ) : mio.canjeado_at ? (
          <View style={{ backgroundColor: C.azul, borderRadius: R(16), padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Figura forma="circulo" color={C.amarillo} tam={22} />
            <Text style={{ fontFamily: F.negrita, color: '#FFFFFF', fontSize: 15, flex: 1 }}>{t('¡Canjeado! Ganaste la lámina de este local.', "¡Canjeado! Ganaste la lámina de este local for your álbum.")}</Text>
          </View>
        ) : drop.dentro_del_radio ? (
          <View style={{ alignItems: 'center', gap: 8, marginTop: 6 }}>
            <View style={{ backgroundColor: '#FFFFFF', padding: 12, borderRadius: R(16), borderWidth: 2, borderColor: C.borde }}>
              <QRCode value={mio.codigo} size={200} />
            </View>
            <Text style={{ fontFamily: F.media, fontSize: 13, color: C.gris }}>{t('o dicta este código en caja', "o lee este código en la caja")}</Text>
            <Text style={{ ...letrista, fontSize: 28, letterSpacing: 4 }}>{mio.codigo.slice(0, 4)} {mio.codigo.slice(4)}</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: C.negro, borderRadius: R(16), padding: 14, gap: 4 }}>
            <Text style={{ fontFamily: F.negrita, color: C.amarillo, fontSize: 15 }}>{t('¡Estás dentro!', "¡Estás dentro! You’re in.")}</Text>
            <Text style={{ fontFamily: F.normal, color: '#FFFFFF', fontSize: 14 }}>{t(`Tu código para canjear aparece cuando llegues al local. Estás ${cuad(drop.cuadras)}.`, `Tu QR aparece when you llegas al local. Estás a ${cuad(drop.cuadras)}.`)}</Text>
          </View>
        )}
        {mio && mio.canjeado_at ? <Resena localId={drop.local_id} usuario={usuario} t={t} /> : null}
        {error ? <Text style={{ fontFamily: F.negrita, color: C.rojoTexto }}>{error}</Text> : null}
      </View>

      {destino && destino.lat && !drop.dentro_del_radio ? (
        <View style={{ marginHorizontal: 16, marginTop: 14 }}>
          <Boton texto={t(`Cómo llegar caminando · ${cuad(drop.cuadras)}`, `Camina pa’llá · ${cuad(drop.cuadras)}`)} fondo={C.amarillo} color={C.negro} onPress={() => caminar(destino)} />
          {destino.direccion ? <Text style={{ fontFamily: F.media, fontSize: 13, color: C.gris, textAlign: 'center', marginTop: 6 }}>{destino.direccion}</Text> : null}
        </View>
      ) : null}

      <View style={{ marginHorizontal: 16, marginTop: 14, flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: C.negro, borderRadius: R(16), padding: 12 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.amarillo }}>{t('Termina en', "Termina en")}</Text>
          <Text style={{ ...letrista, fontSize: 24, color: C.papel }}>{reloj}</Text>
        </View>
        <Pressable onPress={() => Share.share({ message: t(`¡Droper! ${drop.local_nombre} soltó un drop: ${drop.frase || drop.titulo}. Míralo aquí: https://www.caserito.store/?local=${drop.local_id}`, `¡Droper! ${drop.local_nombre} soltó un drop: ${drop.frase || drop.titulo}. Check it: https://www.caserito.store/?local=${drop.local_id}`) })}
          style={{ flex: 1, backgroundColor: C.azul, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, padding: 12, justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 15, color: '#FFFFFF' }}>{t('Pasarle el dato a un amigo', "Pásale el dato · Tell a friend")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Resena({ localId, usuario, t }) {
  const [estrellas, setEstrellas] = useState(0);
  const [texto, setTexto] = useState('');
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('resenas').select('estrellas, texto').eq('local_id', localId).eq('usuario_id', usuario.id).maybeSingle()
      .then(({ data }) => { if (data) { setEstrellas(data.estrellas); setTexto(data.texto || ''); setEnviada(true); } });
  }, [localId]);

  async function enviar() {
    setError('');
    const { error } = await supabase.rpc('resenar', { p_local: localId, p_estrellas: estrellas, p_texto: texto });
    if (error) setError(explicar(error)); else setEnviada(true);
  }

  return (
    <View style={{ marginTop: 10, borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#CDBF9F', paddingTop: 12, gap: 8 }}>
      <Text style={{ ...letrista, fontSize: 18 }}>{enviada ? t('¡GRACIAS POR TU RESEÑA!', "¡GRACIAS! THANKS!") : t('¿QUÉ TAL ESTUVO?', "¿QUÉ TAL? HOW WAS IT?")}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => { setEstrellas(n); setEnviada(false); }} accessibilityRole="button" accessibilityLabel={`${n} estrellas`} hitSlop={6}>
            <Svg width={34} height={34} viewBox="0 0 24 24">
              <Path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.1l-5.9 3.2 1.3-6.5-4.9-4.5 6.6-.8z" fill={n <= estrellas ? C.rojo : 'none'} stroke={C.negro} strokeWidth={1.6} strokeLinejoin="round" />
            </Svg>
          </Pressable>
        ))}
      </View>
      <TextInput value={texto} onChangeText={(v) => { setTexto(v); setEnviada(false); }} maxLength={280} multiline
        placeholder={t("Cuéntale al barrio (opcional)", "Cuéntale al barrio (optional)")} placeholderTextColor={C.gris}
        style={{ minHeight: 70, borderWidth: 2, borderColor: C.borde, borderRadius: R(16), backgroundColor: '#FFFFFF', padding: 10, fontFamily: F.normal, fontSize: 15, textAlignVertical: 'top' }} />
      {!enviada && <Boton texto={t("Publicar reseña", "Publicar reseña")} deshabilitado={!estrellas} onPress={enviar} />}
      <Text style={{ fontFamily: F.normal, fontSize: 12, color: C.gris }}>{t('Reseña verificada: solo reseñan quienes canjearon aquí.', "Reseña verificada: solo quienes compraron here pueden opinar.")}</Text>
      {error ? <Text style={{ fontFamily: F.negrita, color: C.rojoTexto }}>{error}</Text> : null}
    </View>
  );
}

// Abre el mapa del teléfono con la ruta a pie (Apple Maps en iPhone, Google Maps en Android)
export function caminar({ lat, lng }) {
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
  const nativo = Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=w` : web;
  Linking.openURL(nativo).catch(() => Linking.openURL(web));
}
