import React, { createContext, useContext, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, F, aplicarEstilo, aplicarBanners } from './tema';
import { supabase } from './supabase';

// Estilo gráfico de la app: 'bauhaus' (por defecto) o 'diario' (diario popular del barrio)
const CLAVE = 'caserito_estilo';
const Ctx = createContext({ estilo: 'bauhaus', setEstilo: () => {}, setEstiloBarrio: () => {} });

export function EstiloProvider({ children }) {
  const [general, setEstiloState] = useState('bauhaus');
  const [deBarrio, setEstiloBarrio] = useState(null); // el barrio donde estás (o al que vas) puede tener su propio estilo
  const estilo = deBarrio || general;
  const [banners, setBanners] = useState(null);
  // El admin elige el estilo (tabla caserito.ajustes). Se guarda una copia para partir rápido la próxima vez.
  useEffect(() => {
    const valido = (v) => ['clasico', 'bauhaus', 'diario', 'moderno'].includes(v);
    AsyncStorage.getItem(CLAVE).then((v) => { if (valido(v)) setEstiloState(v); }).catch(() => {});
    supabase.from('ajustes').select('valor').eq('clave', 'estilo').maybeSingle().then(({ data }) => {
      if (data && valido(data.valor)) { setEstiloState(data.valor); AsyncStorage.setItem(CLAVE, data.valor).catch(() => {}); }
    });
    // Colores de los banners (paleta Bauhaus) que elige el admin
    const leer = (v) => { try { return JSON.parse(v); } catch (e) { return null; } };
    AsyncStorage.getItem(CLAVE + '_banners').then((v) => { const b = v && leer(v); if (b) setBanners(b); }).catch(() => {});
    supabase.from('ajustes').select('valor').eq('clave', 'banners').maybeSingle().then(({ data }) => {
      const b = data && leer(data.valor);
      if (b) { setBanners(b); AsyncStorage.setItem(CLAVE + '_banners', data.valor).catch(() => {}); }
    });
  }, []);
  const setEstilo = (v) => { setEstiloState(v); AsyncStorage.setItem(CLAVE, v).catch(() => {}); };
  aplicarEstilo(estilo);
  aplicarBanners(banners);
  return <Ctx.Provider value={{ estilo, general, setEstilo, setEstiloBarrio, banners }}>{children}</Ctx.Provider>;
}
export const useEstilo = () => useContext(Ctx);

// Switch de estilo (va en Tú)
export function SelectorEstilo() {
  const { estilo, setEstilo } = useEstilo();
  const op = [
    { id: 'bauhaus', titulo: 'Bauhaus', sub: 'Figuras y colores planos' },
    { id: 'diario', titulo: 'Diario', sub: 'Portada de diario popular' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup">
      {op.map((o) => {
        const on = estilo === o.id;
        return (
          <Pressable key={o.id} onPress={() => setEstilo(o.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={{ flex: 1, minHeight: 64, borderWidth: 3, borderColor: C.borde, padding: 10, backgroundColor: on ? (o.id === 'diario' ? C.rojo : C.amarillo) : C.papel,
              shadowColor: C.sombra, shadowOffset: { width: on ? 4 : 0, height: on ? 4 : 0 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <Text style={{ fontFamily: o.id === 'diario' ? F.titular : F.letrista, fontSize: 18, color: on && o.id === 'diario' ? '#FFFFFF' : C.negro }}>{o.titulo.toUpperCase()}</Text>
            <Text style={{ fontFamily: F.media, fontSize: 12, color: on && o.id === 'diario' ? '#FFFFFF' : C.gris }}>{o.sub}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
