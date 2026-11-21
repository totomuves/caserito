import React, { createContext, useContext, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, F } from './tema';

// Estilo gráfico de la app: 'bauhaus' (por defecto) o 'diario' (diario popular del barrio)
const CLAVE = 'caserito_estilo';
const Ctx = createContext({ estilo: 'bauhaus', setEstilo: () => {} });

export function EstiloProvider({ children }) {
  const [estilo, setEstiloState] = useState('bauhaus');
  useEffect(() => {
    AsyncStorage.getItem(CLAVE).then((v) => { if (v === 'diario' || v === 'bauhaus') setEstiloState(v); }).catch(() => {});
  }, []);
  const setEstilo = (v) => { setEstiloState(v); AsyncStorage.setItem(CLAVE, v).catch(() => {}); };
  return <Ctx.Provider value={{ estilo, setEstilo }}>{children}</Ctx.Provider>;
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
            style={{ flex: 1, minHeight: 64, borderWidth: 3, borderColor: C.negro, padding: 10, backgroundColor: on ? (o.id === 'diario' ? C.rojo : C.amarillo) : C.papel,
              shadowColor: C.negro, shadowOffset: { width: on ? 4 : 0, height: on ? 4 : 0 }, shadowOpacity: 1, shadowRadius: 0 }}>
            <Text style={{ fontFamily: o.id === 'diario' ? F.titular : F.letrista, fontSize: 18, color: on && o.id === 'diario' ? '#FFFFFF' : C.negro }}>{o.titulo.toUpperCase()}</Text>
            <Text style={{ fontFamily: F.media, fontSize: 12, color: on && o.id === 'diario' ? '#FFFFFF' : C.gris }}>{o.sub}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
