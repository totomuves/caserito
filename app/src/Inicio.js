import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { supabase } from './supabase';
import { C, F, letrista, CATEGORIAS, textoCategoria, tieneCategoria, precio, cuadras } from './tema';
import { Ola, Brillo, Pildora, EtiquetaPrecio, Boton } from './componentes';
import { useIdioma, FraseGlosario, CATEGORIA_TUR } from './idioma';

function etiquetaPara(d, hora, t, cuad) {
  if (d.tipo === 'grupal') return t('¡ENTRE TODOS!', 'GROUP DROP · ¡ENTRE TODOS!');
  if (d.tipo === 'recien_llegado') return t('¡RECIÉN LLEGADO!', 'JUST ARRIVED · ¡RECIÉN LLEGADO!');
  if (d.tipo === 'sorpresa') return t('¿UNA SORPRESA?', 'MYSTERY DROP · ¿SORPRESA?');
  if (d.categoria === 'comer' && hora >= 12 && hora < 15) return t('HORA DE ALMUERZO', 'LUNCH TIME · ALMUERZO');
  if (d.categoria === 'cafe' && hora >= 15 && hora < 19) return t('TU CAFÉ DE LA TARDE', 'AFTERNOON COFFEE · CAFECITO');
  return cuad(d.cuadras).toUpperCase();
}

export default function Inicio({ drops, usuario, alAbrir, alRefrescar, alAyuda }) {
  const [filtro, setFiltro] = useState('todo');
  const [gustos, setGustos] = useState([]);
  const [i, setI] = useState(0);
  const [refrescando, setRefrescando] = useState(false);
  const { tur, t, cuad, setTur } = useIdioma();

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
    return lista.length ? lista : [{ tag: 'BARRIO ITALIA', texto: t('TODAVÍA NO HAY DROPS CERCA. DATE UNA VUELTA, QUE LOS LOCALES SUELTAN SORPRESAS DURANTE EL DÍA.', 'NO DROPS NEARBY YET. TAKE A WALK: LOCAL SHOPS DROP SURPRISES ALL DAY · ¡DATE UNA VUELTA!'), drop: null }];
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

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={async () => { setRefrescando(true); await alRefrescar(); setRefrescando(false); }} />}>
      <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 }}>
        <Brillo tam={20} style={{ position: 'absolute', left: 14, top: 18 }} />
        <Brillo tam={14} style={{ position: 'absolute', right: 40, top: 12 }} />
        <Text style={{ ...letrista, fontSize: 40, color: C.rojo, textShadowColor: C.azul, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0, paddingLeft: 26 }}>CASERITO</Text>
        <Text style={{ fontFamily: F.negrita, fontSize: 13, paddingLeft: 26 }}>{t('Barrio Italia · tu barrio te tiene ofertas', 'Barrio Italia · local deals, like a local')}</Text>
        <Pressable onPress={() => setTur(!tur)} accessibilityRole="switch" accessibilityState={{ checked: tur }}
          style={{ position: 'absolute', right: 68, top: 14, height: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 2.5, borderColor: C.negro, backgroundColor: tur ? C.negro : C.papel, justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 12, color: tur ? C.amarillo : C.negro }}>{tur ? 'Español' : 'Tourist?'}</Text>
        </Pressable>
        <Pressable onPress={alAyuda} accessibilityRole="button" accessibilityLabel={t('¿Cómo funciona Caserito?', 'How does Caserito work?')}
          style={{ position: 'absolute', right: 16, top: 14, minWidth: 44, height: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 2.5, borderColor: C.negro, backgroundColor: C.papel, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...letrista, fontSize: 20 }}>?</Text>
        </Pressable>
      </View>
      <Ola color={C.amarillo} />

      <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: C.negro, borderRadius: 18, padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ ...letrista, fontSize: 16, color: C.amarillo }}>{f.tag}</Text>
          <Pressable onPress={() => setI(i + 1)} accessibilityRole="button" accessibilityLabel="Otra sugerencia"
            style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: '#FFFFFF66', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>{t('Otra', 'Next')}</Text>
          </Pressable>
        </View>
        <FraseGlosario texto={f.texto} style={{ ...letrista, fontSize: 20, lineHeight: 26, color: '#FFFFFF', minHeight: 78 }} />
        {f.drop && (
          <Pressable onPress={() => alAbrir(f.drop)} style={{ alignSelf: 'flex-start', height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.amarillo, justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 14 }}>{t('Ir al drop →', 'Go to drop →')}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 18 }}>
        {CATEGORIAS.map((c) => <Pildora key={c.id} texto={tur ? CATEGORIA_TUR[c.id] || c.texto : c.texto} activa={filtro === c.id} onPress={() => setFiltro(c.id)} />)}
      </ScrollView>

      <View style={{ marginTop: 14 }}>
        <Ola color={C.rojo} abajo={false} />
        <View style={{ backgroundColor: C.rojo, paddingTop: 4, paddingBottom: 18, gap: 12 }}>
          <Text style={{ ...letrista, fontSize: 24, color: C.amarillo, paddingHorizontal: 20 }}>{t('CERCA DE TI', 'NEAR YOU · CERCA')}</Text>
          {visibles.length === 0 && (
            <Text style={{ fontFamily: F.media, color: '#FFFFFF', paddingHorizontal: 20 }}>{t(`No hay drops de ${textoCategoria(filtro).toLowerCase()} ahora. Vuelve más rato.`, 'No drops here right now. Check back later · Vuelve más rato.')}</Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
            {visibles.map((d, k) => (
              <Pressable key={d.drop_id} onPress={() => alAbrir(d)} style={{ width: 216, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.negro, borderRadius: 16, padding: 14, gap: 6 }}>
                <EtiquetaPrecio valor={d.tipo === 'sorpresa' ? '¿?' : precio(d.precio)} giro={k % 2 ? '-4deg' : '5deg'} />
                <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.rojoTexto, textTransform: 'uppercase' }}>{tur ? CATEGORIA_TUR[d.categoria] || textoCategoria(d.categoria) : textoCategoria(d.categoria)} · {t('quedan', 'left:')} {d.quedan}</Text>
                <Text style={{ fontFamily: F.negrita, fontSize: 17 }} numberOfLines={1}>{d.local_nombre}</Text>
                <FraseGlosario texto={(d.frase || d.titulo).toUpperCase()} colorAyuda={C.rojoTexto} numberOfLines={3} style={{ ...letrista, fontSize: 14, lineHeight: 18 }} />
                <Text style={{ fontFamily: F.media, fontSize: 13, color: C.gris }}>
                  {cuad(d.cuadras)} · {t('hasta las', 'until')} {new Date(d.termina_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {d.tipo === 'grupal' && d.nivel_actual ? <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.azul }}>{t('Nivel actual', 'Now')}: {d.nivel_actual}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <Ola color={C.rojo} />
      </View>

      <View style={{ marginTop: 18 }}>
        <Ola color={C.amarillo} abajo={false} />
        <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}>
          <Text style={{ ...letrista, fontSize: 21 }}>{t('CASERITO APRENDIÓ QUE…', 'CASERITO LEARNED THAT…')}</Text>
          {gustos.length === 0 ? (
            <Text style={{ fontFamily: F.normal, fontSize: 14 }}>{t('Todavía te estamos conociendo. Súmate a un drop y aquí aparece lo que te tinca.', "We're still getting to know you. Join a drop and your likes show up here.")}</Text>
          ) : (
            <>
              <Text style={{ fontFamily: F.normal, fontSize: 13 }}>{t('Con esto elegimos qué mostrarte primero. Toca uno para apagarlo.', 'We use this to show you the good stuff first. Tap to turn one off.')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {gustos.map((g) => (
                  <Pressable key={g.id} onPress={() => alternar(g)} accessibilityRole="switch" accessibilityState={{ checked: g.activo }}
                    style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 2.5, borderColor: C.negro, backgroundColor: g.activo ? C.papel : 'transparent', justifyContent: 'center' }}>
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
