import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { supabase, leerPunto } from './supabase';
import { C, F, letrista, precio, cuadras, textoCategoria } from './tema';
import { Boton } from './componentes';
import { useIdioma, FraseGlosario, CATEGORIA_TUR } from './idioma';

export const COLOR_TIPO = { normal: C.rojo, grupal: C.azul, sorpresa: '#B45309', recien_llegado: C.negro };

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

// Aviso sin ubicación + hoja de abajo con el drop elegido o el más cercano
export function HojaMapa({ drops, pos, sel, alAbrir }) {
  const cercano = sel || [...drops].sort((a, b) => a.cuadras - b.cuadras)[0];
  const { tur, t, cuad } = useIdioma();
  return (
    <>
      {pos.aprox && (
        <View style={{ position: 'absolute', top: 12, left: 16, right: 16, backgroundColor: C.papel, borderWidth: 2, borderColor: C.negro, borderRadius: 14, padding: 10, zIndex: 1000 }}>
          <Text style={{ fontFamily: F.media, fontSize: 13 }}>{t('Sin tu ubicación te mostramos Barrio Italia. Actívala para ver a cuántas cuadras está cada drop.', 'Turn on your location to see how many blocks away each drop is. Showing Barrio Italia for now.')}</Text>
        </View>
      )}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: C.crema, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 2.5, borderColor: C.negro, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 92, gap: 10 }}>
        <Text style={{ ...letrista, fontSize: 19 }}>{sel ? t('ESTE DROP', 'THIS DROP') : t('MÁS CERCA DE TI', 'CLOSEST TO YOU')}</Text>
        {cercano ? (
          <Pressable onPress={() => alAbrir(cercano)} style={{ backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.negro, borderRadius: 18, padding: 14, gap: 6 }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.rojoTexto, textTransform: 'uppercase' }}>{tur ? CATEGORIA_TUR[cercano.categoria] || textoCategoria(cercano.categoria) : textoCategoria(cercano.categoria)} · {t('quedan', 'left:')} {cercano.quedan}</Text>
            <Text style={{ fontFamily: F.negrita, fontSize: 17 }}>{cercano.local_nombre}</Text>
            <FraseGlosario texto={(cercano.frase || cercano.titulo).toUpperCase()} colorAyuda={C.rojoTexto} numberOfLines={2} style={{ ...letrista, fontSize: 15 }} />
            <Text style={{ fontFamily: F.negrita, fontSize: 13 }}>
              {cercano.dentro_del_radio ? t('¡Estás aquí! Ya puedes canjearlo.', 'You’re here! Ready to redeem.') : t(`Estás ${cuad(cercano.cuadras)} · se desbloquea al llegar`, `You’re ${cuad(cercano.cuadras)} away · unlocks when you arrive`)}
            </Text>
            <Boton texto={t("Ver drop", "See drop")} onPress={() => alAbrir(cercano)} />
          </Pressable>
        ) : (
          <Text style={{ fontFamily: F.media, fontSize: 14 }}>{t('No hay drops activos cerca en este momento.', 'No drops nearby right now.')}</Text>
        )}
      </View>
    </>
  );
}
