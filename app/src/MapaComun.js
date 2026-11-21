import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { supabase, leerPunto } from './supabase';
import { C, F, letrista, precio, cuadras, textoCategoria } from './tema';
import { Boton } from './componentes';
import { useIdioma, FraseGlosario, CATEGORIA_TUR } from './idioma';

export const COLOR_TIPO = { normal: C.rojo, grupal: C.azul, sorpresa: '#B45309', recien_llegado: C.negro };

// Cinta de arriba del cartel según el tipo de drop
export const CINTA_TIPO = { normal: 'DROP', grupal: 'ENTRE TODOS', sorpresa: '¿SORPRESA?', recien_llegado: 'RECIÉN LLEGÓ' };
// Se está acabando: quedan pocos o termina pronto
export function urgente(d) {
  const min = d.termina_at ? (new Date(d.termina_at).getTime() - Date.now()) / 60000 : 999;
  return (d.tipo !== 'recien_llegado' && d.quedan != null && d.quedan <= 3) || min < 20;
}

export function etiquetaPin(d) {
  return d.tipo === 'sorpresa' ? '¿?' : d.tipo === 'grupal' ? `${d.quedan}` : precio(d.precio) || '¡NUEVO!';
}

// Coordenadas de los locales que tienen drops
export function useCoordenadas(drops) {
  const [coords, setCoords] = useState({});
  useEffect(() => {
    const ids = [...new Set(drops.map((d) => d.local_id))];
    if (!ids.length) return;
    supabase.from('locales').select('id, ubicacion').in('id', ids).then(({ data }) => {
      const m = {};
      (data || []).forEach((l) => { const p = leerPunto(l.ubicacion); if (p) m[l.id] = p; });
      setCoords(m);
    });
  }, [drops]);
  return coords;
}

// Ir a otro barrio desde el mapa: trae los drops de ese barrio (o vuelve a "Aquí")
export function useVistaBarrio(dropsPropios) {
  const [vista, setVista] = useState(null);
  const [dropsVista, setDropsVista] = useState([]);
  useEffect(() => {
    if (!vista) return;
    let vivo = true;
    supabase.rpc('drops_cerca', { lat: vista.lat, lng: vista.lng, radio_m: 2000 }).then(({ data }) => {
      if (vivo) setDropsVista((data || []).map((d) => ({ ...d, dentro_del_radio: false, cuadras: Math.max(d.cuadras, 99) })));
    });
    return () => { vivo = false; };
  }, [vista]);
  return { vista, setVista, drops: vista ? dropsVista : dropsPropios };
}

// Botones de barrios arriba del mapa
export function SelectorBarrios({ barrios, vista, alElegir, flotante = true, titulo }) {
  const { t } = useIdioma();
  if (!barrios || barrios.length < 2) return null;
  const chip = (activo) => ({ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 2.5, borderColor: C.negro, backgroundColor: activo ? C.negro : C.papel, justifyContent: 'center' });
  const texto = (activo) => ({ fontFamily: F.negrita, fontSize: 13, color: activo ? C.amarillo : C.negro });
  return (
    <View style={flotante ? { position: 'absolute', top: 10, left: 0, right: 0, zIndex: 900 } : { marginTop: 10, gap: 6 }} pointerEvents="box-none">
      {titulo ? <Text style={{ fontFamily: F.negrita, fontSize: 13, paddingHorizontal: 16 }}>{titulo}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
        <Pressable onPress={() => alElegir(null)} accessibilityRole="button" accessibilityState={{ selected: !vista }} style={chip(!vista)}>
          <Text style={texto(!vista)}>{t('📍 Aquí', '📍 Here')}</Text>
        </Pressable>
        {barrios.map((b) => {
          const activo = vista && vista.id === b.id;
          return (
            <Pressable key={b.id} onPress={() => alElegir(b)} accessibilityRole="button" accessibilityState={{ selected: !!activo }} style={chip(activo)}>
              <Text style={texto(activo)}>{b.nombre.replace(/^Barrio /, '')}{!b.lanzado ? t(' · pronto', ' · soon') : ''}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Todos los locales de Caserito (aprobados y activos), tengan o no un drop ahora
export function useLocalesMapa() {
  const [locales, setLocales] = useState([]);
  useEffect(() => {
    supabase.from('locales').select('id, nombre, categoria, ubicacion').eq('activo', true).eq('aprobado', true)
      .then(({ data }) => {
        setLocales((data || []).map((l) => ({ ...l, punto: leerPunto(l.ubicacion) })).filter((l) => l.punto));
      });
  }, []);
  return locales;
}

// Aviso sin ubicación + hoja de abajo con el drop elegido o el más cercano
export function HojaMapa({ drops, pos, sel, alAbrir }) {
  const cercano = sel || [...drops].sort((a, b) => a.cuadras - b.cuadras)[0];
  const { tur, t, cuad } = useIdioma();
  return (
    <>
      {pos.aprox && (
        <View style={{ position: 'absolute', top: 12, left: 16, right: 16, backgroundColor: C.papel, borderWidth: 2, borderColor: C.negro, borderRadius: 14, padding: 10, zIndex: 1000 }}>
          <Text style={{ fontFamily: F.media, fontSize: 13 }}>{t('Sin tu ubicación te mostramos Barrio Italia. Actívala para ver a cuántas cuadras está cada drop.', "Activa tu ubicación to see a cuántas cuadras está cada drop. Por ahora: Barrio Italia.")}</Text>
        </View>
      )}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: C.crema, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 2.5, borderColor: C.negro, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 92, gap: 10 }}>
        <Text style={{ ...letrista, fontSize: 19 }}>{sel ? t('ESTE DROP', "ESTE DROP") : t('MÁS CERCA DE TI', "EL MÁS CERCA · CLOSEST")}</Text>
        {cercano ? (
          <Pressable onPress={() => alAbrir(cercano)} style={{ backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.negro, borderRadius: 18, padding: 14, gap: 6 }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.rojoTexto, textTransform: 'uppercase' }}>{tur ? CATEGORIA_TUR[cercano.categoria] || textoCategoria(cercano.categoria) : textoCategoria(cercano.categoria)} · {t('quedan', "quedan:")} {cercano.quedan}</Text>
            <Text style={{ fontFamily: F.negrita, fontSize: 17 }}>{cercano.local_nombre}</Text>
            <FraseGlosario texto={(cercano.frase || cercano.titulo).toUpperCase()} colorAyuda={C.rojoTexto} numberOfLines={2} style={{ ...letrista, fontSize: 15 }} />
            <Text style={{ fontFamily: F.negrita, fontSize: 13 }}>
              {cercano.dentro_del_radio ? t('¡Estás aquí! Ya puedes canjearlo.', "¡Llegaste! Listo pa’ canjear.") : t(`Estás ${cuad(cercano.cuadras)} · se desbloquea al llegar`, `Estás a ${cuad(cercano.cuadras)} · se activa al llegar`)}
            </Text>
            <Boton texto={t("Ver drop", "Ver drop")} onPress={() => alAbrir(cercano)} />
          </Pressable>
        ) : (
          <Text style={{ fontFamily: F.media, fontSize: 14 }}>{t('No hay drops activos cerca en este momento.', "No drops cerca right now.")}</Text>
        )}
      </View>
    </>
  );
}
