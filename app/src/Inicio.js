import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { supabase } from './supabase';
import { C, F, letrista, CATEGORIAS, textoCategoria, tieneCategoria, precio, cuadras } from './tema';
import { Ola, Brillo, Pildora, EtiquetaPrecio, Boton } from './componentes';

function etiquetaPara(d, hora) {
  if (d.tipo === 'grupal') return '¡ENTRE TODOS!';
  if (d.tipo === 'recien_llegado') return '¡RECIÉN LLEGADO!';
  if (d.tipo === 'sorpresa') return '¿UNA SORPRESA?';
  if (d.categoria === 'comer' && hora >= 12 && hora < 15) return 'HORA DE ALMUERZO';
  if (d.categoria === 'cafe' && hora >= 15 && hora < 19) return 'TU CAFÉ DE LA TARDE';
  return cuadras(d.cuadras).toUpperCase();
}

export default function Inicio({ drops, usuario, alAbrir, alRefrescar }) {
  const [filtro, setFiltro] = useState('todo');
  const [gustos, setGustos] = useState([]);
  const [i, setI] = useState(0);
  const [refrescando, setRefrescando] = useState(false);

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
      tag: etiquetaPara(d, hora),
      texto: (d.frase || `${d.titulo} ${precio(d.precio)} en ${d.local_nombre}, ${cuadras(d.cuadras)}.`).toUpperCase(),
      drop: d,
    }));
    return lista.length ? lista : [{ tag: 'BARRIO ITALIA', texto: 'TODAVÍA NO HAY DROPS CERCA. DATE UNA VUELTA, QUE LOS LOCALES SUELTAN SORPRESAS DURANTE EL DÍA.', drop: null }];
  }, [drops, gustos]);

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
        <Text style={{ fontFamily: F.negrita, fontSize: 13, paddingLeft: 26 }}>Barrio Italia · tu barrio te tiene ofertas</Text>
      </View>
      <Ola color={C.amarillo} />

      <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: C.negro, borderRadius: 18, padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ ...letrista, fontSize: 16, color: C.amarillo }}>{f.tag}</Text>
          <Pressable onPress={() => setI(i + 1)} accessibilityRole="button" accessibilityLabel="Otra sugerencia"
            style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: '#FFFFFF66', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 12, color: '#FFFFFF' }}>Otra</Text>
          </Pressable>
        </View>
        <Text style={{ ...letrista, fontSize: 20, lineHeight: 26, color: '#FFFFFF', minHeight: 78 }}>{f.texto}</Text>
        {f.drop && (
          <Pressable onPress={() => alAbrir(f.drop)} style={{ alignSelf: 'flex-start', height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.amarillo, justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 14 }}>Ir al drop →</Text>
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 18 }}>
        {CATEGORIAS.map((c) => <Pildora key={c.id} texto={c.texto} activa={filtro === c.id} onPress={() => setFiltro(c.id)} />)}
      </ScrollView>

      <View style={{ marginTop: 14 }}>
        <Ola color={C.rojo} abajo={false} />
        <View style={{ backgroundColor: C.rojo, paddingTop: 4, paddingBottom: 18, gap: 12 }}>
          <Text style={{ ...letrista, fontSize: 24, color: C.amarillo, paddingHorizontal: 20 }}>CERCA DE TI</Text>
          {visibles.length === 0 && (
            <Text style={{ fontFamily: F.media, color: '#FFFFFF', paddingHorizontal: 20 }}>No hay drops de {textoCategoria(filtro).toLowerCase()} ahora. Vuelve más rato.</Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
            {visibles.map((d, k) => (
              <Pressable key={d.drop_id} onPress={() => alAbrir(d)} style={{ width: 216, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.negro, borderRadius: 16, padding: 14, gap: 6 }}>
                <EtiquetaPrecio valor={d.tipo === 'sorpresa' ? '¿?' : precio(d.precio)} giro={k % 2 ? '-4deg' : '5deg'} />
                <Text style={{ fontFamily: F.negrita, fontSize: 12, color: C.rojoTexto, textTransform: 'uppercase' }}>{textoCategoria(d.categoria)} · quedan {d.quedan}</Text>
                <Text style={{ fontFamily: F.negrita, fontSize: 17 }} numberOfLines={1}>{d.local_nombre}</Text>
                <Text style={{ ...letrista, fontSize: 14, lineHeight: 18 }} numberOfLines={3}>{(d.frase || d.titulo).toUpperCase()}</Text>
                <Text style={{ fontFamily: F.media, fontSize: 13, color: C.gris }}>
                  {cuadras(d.cuadras)} · hasta las {new Date(d.termina_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {d.tipo === 'grupal' && d.nivel_actual ? <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.azul }}>Nivel actual: {d.nivel_actual}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <Ola color={C.rojo} />
      </View>

      <View style={{ marginTop: 18 }}>
        <Ola color={C.amarillo} abajo={false} />
        <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}>
          <Text style={{ ...letrista, fontSize: 21 }}>CASERITO APRENDIÓ QUE…</Text>
          {gustos.length === 0 ? (
            <Text style={{ fontFamily: F.normal, fontSize: 14 }}>Todavía te estamos conociendo. Súmate a un drop y aquí aparece lo que te tinca.</Text>
          ) : (
            <>
              <Text style={{ fontFamily: F.normal, fontSize: 13 }}>Con esto elegimos qué mostrarte primero. Toca uno para apagarlo.</Text>
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
