import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { supabase, leerPunto } from './supabase';
import { C, F, letrista, precio, cuadras, textoCategoria, R, ESTILO } from './tema';
import { caminar } from './Drop';
import { figuraDe, colorDe, Figura, PuntosPop, GloboPop, Estallido } from './componentes';
import { useIdioma, FraseGlosario, CATEGORIA_TUR, categoriaTur } from './idioma';

export const COLOR_TIPO = { normal: C.rojo, grupal: C.azul, sorpresa: '#B45309', recien_llegado: C.negro };

// Cinta de arriba del cartel según el tipo de drop
export const CINTA_TIPO = { normal: 'DROP', grupal: 'ENTRE TODOS', sorpresa: '¿SORPRESA?', recien_llegado: 'RECIÉN LLEGÓ' };
// Se está acabando: quedan pocos o termina pronto
export function urgente(d) {
  const min = d.termina_at ? (new Date(d.termina_at).getTime() - Date.now()) / 60000 : 999;
  return (d.tipo !== 'recien_llegado' && d.quedan != null && d.quedan <= 3) || min < 20;
}

// Filtros del mapa (como en el diseño "Caserito — pantallas")
const COMIDA = ['comer', 'tomar', 'dulce', 'almacen'];
export const FILTROS = [
  { id: 'todo', es: 'Todo', en: 'All', pasa: () => true },
  { id: 'comida', es: 'Comida', en: 'Food', figura: 'circulo', color: C.rojo, pasa: (d) => COMIDA.includes(d.categoria) || (d.categorias || []).some((c) => COMIDA.includes(c)) },
  { id: 'cafe', es: 'Café', en: 'Coffee', figura: 'cuadrado', color: C.azul, pasa: (d) => d.categoria === 'cafe' || (d.categorias || []).includes('cafe') },
  { id: 'grupal', es: 'Grupales', en: 'Group', figura: 'triangulo', color: C.negro, pasa: (d) => d.tipo === 'grupal' },
];
export function filtrar(drops, id) {
  const f = FILTROS.find((x) => x.id === id) || FILTROS[0];
  return drops.filter(f.pasa);
}

// Chips de filtro bajo los barrios
export function FiltrosMapa({ drops, filtro, alElegir, arriba = 60 }) {
  const { t } = useIdioma();
  return (
    <View style={{ position: 'absolute', top: arriba, left: 0, right: 0, zIndex: 900 }} pointerEvents="box-none">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
        {FILTROS.map((f) => {
          const activo = filtro === f.id;
          const n = filtrar(drops, f.id).length;
          if (f.id !== 'todo' && !n) return null;
          return (
            <Pressable key={f.id} onPress={() => alElegir(f.id)} accessibilityRole="button" accessibilityState={{ selected: activo }}
              style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: R(16), borderWidth: 2.5, borderColor: C.negro, backgroundColor: activo ? C.amarillo : C.papel, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {f.figura ? <Figura forma={f.figura} color={f.color} tam={11} /> : null}
              <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.negro }}>{t(f.es, f.en)}{f.id === 'todo' ? ` · ${n}` : ''}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Lo que va en la etiqueta girada sobre el pin
export function etiquetaTag(d) {
  if (d.tipo === 'sorpresa') return '¿Sorpresa?';
  if (d.tipo === 'grupal') return `Quedan ${d.quedan}`;
  return precio(d.precio) || '¡Nuevo!';
}
// Lo que va dentro de la gota
export function centroPin(d) {
  if (d.tipo === 'sorpresa') return '?';
  if (d.tipo === 'grupal') return String(d.quedan);
  return d.quedan != null && d.tipo !== 'recien_llegado' ? String(d.quedan) : '★';
}
// Figura y color del pin (Bauhaus): sorpresa = rombo amarillo, grupal = triángulo negro, el resto según el rubro
export function figuraPin(d) {
  if (d.tipo === 'sorpresa') return { forma: 'rombo', color: C.amarillo, texto: C.negro };
  if (d.tipo === 'grupal') return { forma: 'triangulo', color: C.negro, texto: C.amarillo };
  const forma = figuraDe(d.categoria);
  const color = colorDe(d.categoria);
  return { forma, color, texto: color === C.amarillo ? C.negro : C.papel };
}
export const RUTA_PIN = {
  circulo: 'M18 3a15 15 0 1 0 0 30a15 15 0 1 0 0-30z',
  cuadrado: 'M4 4h28v28H4z',
  triangulo: 'M18 2L34 33H2z',
  cuarto: 'M3 33A30 30 0 0 1 33 3V33z',
  rombo: 'M18 1L35 18L18 35L1 18z',
};

// Minutos caminando (cuadras de 100 m a 80 m/min)
export function minutos(d) { return Math.max(1, Math.round((d.cuadras || 1) * 1.25)); }
// Qué tan cerca estás de desbloquearlo (0 a 1)
export function avance(d) { return d.dentro_del_radio ? 1 : Math.max(0.06, Math.min(0.95, 1 - (d.cuadras - 0.5) / 15)); }

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
  const chip = (activo) => ({ minHeight: 40, paddingHorizontal: 12, borderRadius: R(16), borderWidth: 2.5, borderColor: C.negro, backgroundColor: activo ? C.negro : C.papel, justifyContent: 'center' });
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
export function HojaMapa({ drops, pos, sel, alAbrir, coords = {} }) {
  const cercano = sel || [...drops].sort((a, b) => a.cuadras - b.cuadras)[0];
  const { tur, lang, t, cuad } = useIdioma();
  const destino = cercano && coords[cercano.local_id];
  return (
    <>
      {pos.aprox && (
        <View style={{ position: 'absolute', top: 112, left: 16, right: 16, backgroundColor: C.papel, borderWidth: 2, borderColor: C.negro, borderRadius: R(16), padding: 10, zIndex: 1000 }}>
          <Text style={{ fontFamily: F.media, fontSize: 13 }}>{t('Sin tu ubicación te mostramos Barrio Italia. Actívala para ver a cuántas cuadras está cada drop.', "Activa tu ubicación to see a cuántas cuadras está cada drop. Por ahora: Barrio Italia.")}</Text>
        </View>
      )}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: C.papel, borderTopLeftRadius: R(26), borderTopRightRadius: R(26), borderTopWidth: 2.5, borderColor: C.negro, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 92, gap: 10 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: C.negro, opacity: 0.25 }} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ ...letrista, fontSize: 20 }}>{sel ? t('ESTE DROP', 'ESTE DROP') : t('MÁS CERCA DE TI', 'MÁS CERCA · CLOSEST')}</Text>
          <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.gris }}>{drops.length} {drops.length === 1 ? t('drop activo', 'drop live') : t('drops activos', 'drops live')}</Text>
        </View>
        {cercano ? (
          <Pressable onPress={() => alAbrir(cercano)} style={{ backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.negro, borderRadius: R(16), padding: 14, gap: 7, shadowColor: C.negro, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontFamily: F.negrita, fontSize: 12, color: COLOR_TIPO[cercano.tipo] || C.rojoTexto, textTransform: 'uppercase', flexShrink: 1 }}>{tur ? categoriaTur(cercano.categoria, lang) || textoCategoria(cercano.categoria) : textoCategoria(cercano.categoria)} · {t('quedan', 'quedan')} {cercano.quedan}</Text>
            </View>
            <Text style={{ ...letrista, fontSize: 19 }}>{cercano.local_nombre}</Text>
            {ESTILO === 'clasico' ? (
              <FraseGlosario texto={`“${cercano.frase || cercano.titulo}”`} colorAyuda={C.rojoTexto} numberOfLines={2} style={{ fontFamily: F.media, fontSize: 15, fontStyle: 'italic' }} />
            ) : (
            <View style={{ height: 86, borderWidth: 2.5, borderColor: C.negro, overflow: 'hidden', padding: 8 }}>
              <PuntosPop color={C.rojo} fondo="#FFE3E3" tam={2.6} sep={8} />
              <GloboPop style={{ maxWidth: '76%' }}>
                <FraseGlosario texto={cercano.frase || cercano.titulo} colorAyuda={C.rojoTexto} numberOfLines={2} style={{ fontFamily: F.negrita, fontSize: 12, lineHeight: 15, textTransform: 'uppercase' }} />
              </GloboPop>
              <Estallido texto={cercano.tipo === 'sorpresa' ? '¿?' : precio(cercano.precio) || '¡YA!'} tam={64} style={{ position: 'absolute', right: 2, bottom: 2 }} />
            </View>
            )}
            <Text style={{ fontFamily: F.negrita, fontSize: 13 }}>
              {cercano.dentro_del_radio ? t('¡Estás aquí! Ya puedes canjearlo.', '¡Llegaste! Listo pa’ canjear.') : t(`Estás ${cuad(cercano.cuadras)} · se desbloquea al llegar`, `Estás a ${cuad(cercano.cuadras)} · se activa al llegar`)}
            </Text>
            <View style={{ height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.negro, backgroundColor: C.amarilloSuave, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(avance(cercano) * 100)}%`, height: '100%', backgroundColor: cercano.dentro_del_radio ? '#1F9D55' : C.amarillo }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {cercano.dentro_del_radio || !destino ? (
                <Pressable onPress={() => alAbrir(cercano)} accessibilityRole="button" style={{ flex: 1, minHeight: 48, borderRadius: R(16), backgroundColor: C.negro, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.negrita, fontSize: 15, color: C.amarillo }}>{cercano.dentro_del_radio ? t('Canjear ahora', 'Canjear now') : t('Ver drop', 'Ver drop')}</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable onPress={() => caminar(destino)} accessibilityRole="button" style={{ flex: 1, minHeight: 48, borderRadius: R(16), backgroundColor: C.negro, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.negrita, fontSize: 15, color: C.amarillo }}>{t(`Cómo llegar · ${minutos(cercano)} min`, `Cómo llegar · ${minutos(cercano)} min walk`)}</Text>
                  </Pressable>
                  <Pressable onPress={() => alAbrir(cercano)} accessibilityRole="button" style={{ minHeight: 48, paddingHorizontal: 16, borderRadius: R(16), borderWidth: 2.5, borderColor: C.negro, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.negrita, fontSize: 15 }}>{t('Ver', 'Ver')}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        ) : (
          <Text style={{ fontFamily: F.media, fontSize: 14 }}>{t('No hay drops activos con este filtro ahora.', 'No drops con este filtro right now.')}</Text>
        )}
      </View>
    </>
  );
}
