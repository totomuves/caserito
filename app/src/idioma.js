import React, { createContext, useContext, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, F } from './tema';

// Modo turista: la app en Spanglish, con glosario de modismos y cuadras en metros.
// Se activa solo si el teléfono no está en español, o con el botón en Inicio.

const CLAVE = 'caserito_idioma';
const Ctx = createContext({ tur: false, t: (es) => es, cuad: (n) => String(n), setTur: () => {} });

function idiomaDelTelefono() {
  try { return (Intl.DateTimeFormat().resolvedOptions().locale || 'es').toLowerCase(); } catch { return 'es'; }
}

export function IdiomaProvider({ children }) {
  const [tur, setTurState] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(CLAVE).then((v) => {
      if (v === 'tur') setTurState(true);
      else if (v === 'es') setTurState(false);
      else setTurState(!idiomaDelTelefono().startsWith('es'));
    }).catch(() => {});
  }, []);
  const setTur = (v) => { setTurState(v); AsyncStorage.setItem(CLAVE, v ? 'tur' : 'es').catch(() => {}); };
  // t('texto en español', 'texto en Spanglish')
  const t = (es, sp) => (tur && sp !== undefined ? sp : es);
  const cuad = (n) => {
    if (n >= 99) return tur ? 'far, in Barrio Italia' : 'lejos, en Barrio Italia';
    const base = n <= 1 ? '1 cuadra' : `${n} cuadras`;
    if (!tur) return base;
    const m = Math.max(1, n) * 100;
    return `${base} (~${m} m, ${Math.max(1, Math.round(m / 80))} min walk)`;
  };
  return <Ctx.Provider value={{ tur, t, cuad, setTur }}>{children}</Ctx.Provider>;
}

export const useIdioma = () => useContext(Ctx);

// Categorías en Spanglish
export const CATEGORIA_TUR = {
  todo: 'All', comer: 'Comer · Food', tomar: 'Tomar · Drinks', cafe: 'Café · Coffee', dulce: 'Dulce · Sweets',
  almacen: 'Almacén · Deli', diseno: 'Diseño · Design', deco: 'Deco · Home', antiguedades: 'Antigüedades · Antiques',
  ropa: 'Ropa · Vintage', accesorios: 'Accesorios', libros: 'Libros · Books', musica: 'Música · Vinyl', arte: 'Arte · Art',
  plantas: 'Plantas · Plants', belleza: 'Belleza · Beauty', bienestar: 'Bienestar · Wellness', mascotas: 'Mascotas · Pets', otros: 'Otros · More',
};

// Glosario de modismos (lo que aparece en las frases de los locales)
const GLOSARIO = [
  ['caserito', 'a loyal regular — what Chilean market vendors call you'],
  ['al tiro', 'right now (Chilean)'], ['altiro', 'right now (Chilean)'], ['cachai', 'you know? (Chilean)'],
  ['media promo', 'a great deal (Chilean)'], ['bacanísimo', 'super awesome'], ['bacán', 'awesome (Chile, Peru, Colombia)'],
  ['once', 'Chilean afternoon tea'], ['sopaipillas', 'fried pumpkin dough, Chilean street snack'],
  ['completo', 'Chilean hot dog loaded with avocado & tomato'], ['marraquetas', 'Chilean crusty bread rolls'],
  ['marraqueta', 'Chilean crusty bread roll'], ['cazuela', 'Chilean meat & veggie stew'], ['chela', 'beer (slang)'],
  ['schop', 'draft beer'], ['pino', 'beef & onion filling of Chilean empanadas'], ['picada', 'small, cheap, authentic eatery'],
  ['yapa', 'a little free extra'], ['chamo', 'buddy (Venezuelan)'], ['pana', 'friend (Venezuelan)'],
  ['burda de', 'super, very (Venezuelan)'], ['chévere', 'cool (Venezuelan, Colombian)'], ['molleja', 'wow, amazing (Venezuelan)'],
  ['epa', 'hey! (Venezuelan)'], ['reina pepiada', 'arepa stuffed with chicken & avocado'], ['arepas', 'corn flatbreads (Venezuela, Colombia)'],
  ['arepa', 'corn flatbread (Venezuela, Colombia)'], ['tequeños', 'cheese sticks (Venezuelan)'], ['causita', 'buddy (Peruvian)'],
  ['causa', 'buddy (Peruvian) — also a potato dish'], ['paja', 'great, cool (Peruvian)'], ['lomo saltado', 'Peruvian beef stir-fry'],
  ['qué nota', 'how cool! (Colombian)'], ['parcero', 'pal (Colombian)'], ['parce', 'pal (Colombian)'], ['hágale', 'go for it! (Colombian)'],
  ['bandeja paisa', 'big Colombian platter'], ['chingón', 'awesome (Mexican, informal)'], ['órale', 'come on! (Mexican)'],
  ['ándale', 'hurry up! (Mexican)'], ['qué onda', "what's up (Mexican)"], ['cuates', 'buddies (Mexican)'], ['nomás', 'just, only'],
  ['che', 'hey (Argentine)'], ['posta', 'for real (Argentine)'], ['drop', 'a limited deal: few units, ends soon'],
];
const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE = new RegExp(`(^|[^${LETRAS}])(${GLOSARIO.map(([p]) => escapar(p)).sort((a, b) => b.length - a.length).join('|')})(?=[^${LETRAS}]|$)`, 'gi');
const significado = (p) => {
  const k = p.toLowerCase();
  const e = GLOSARIO.find(([w]) => w === k);
  return e ? e[1] : '';
};

// Una frase de local: en modo turista, los modismos se pueden tocar para ver qué significan
export function FraseGlosario({ texto, style, numberOfLines, colorAyuda = C.amarillo }) {
  const { tur } = useIdioma();
  const [abierta, setAbierta] = useState(null);
  if (!tur || !texto) return <Text style={style} numberOfLines={numberOfLines}>{texto}</Text>;
  const partes = [];
  let ultimo = 0;
  texto.replace(RE, (m, antes, palabra, idx) => {
    const ini = idx + antes.length;
    if (ini > ultimo) partes.push(texto.slice(ultimo, ini));
    partes.push({ palabra });
    ultimo = ini + palabra.length;
    return m;
  });
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  const hay = partes.some((p) => typeof p !== 'string');
  return (
    <View style={{ gap: 6 }}>
      <Text style={style} numberOfLines={numberOfLines}>
        {partes.map((p, i) => (typeof p === 'string' ? p : (
          <Text key={i} onPress={() => setAbierta(abierta === p.palabra ? null : p.palabra)} accessibilityRole="button"
            accessibilityHint="Toca para ver qué significa" style={{ textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: colorAyuda }}>
            {p.palabra}
          </Text>
        )))}
      </Text>
      {abierta ? (
        <Pressable onPress={() => setAbierta(null)} style={{ alignSelf: 'flex-start', backgroundColor: C.papel, borderWidth: 2, borderColor: C.negro, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.negro }}>“{abierta.toLowerCase()}” = {significado(abierta)}</Text>
        </Pressable>
      ) : hay ? (
        <Text style={{ fontFamily: F.media, fontSize: 11, color: colorAyuda }}>Tap the underlined words · Toca las palabras subrayadas</Text>
      ) : null}
    </View>
  );
}
