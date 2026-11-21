import React, { createContext, useContext, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, F, R } from './tema';
import { IDIOMAS, mezclar, A_PIE, LEJOS, TOCA, CATEGORIAS_MEZCLA, GLOSARIO_MEZCLA } from './mezclas';
export { IDIOMAS } from './mezclas';

// Modo turista: la app en Spanglish, con glosario de modismos y cuadras en metros.
// Se activa solo si el teléfono no está en español, o con el botón en Inicio.

const CLAVE = 'caserito_idioma';
const Ctx = createContext({ tur: false, lang: 'es', t: (es) => es, cuad: (n) => String(n), setTur: () => {}, setLang: () => {} });

function idiomaDelTelefono() {
  try { return (Intl.DateTimeFormat().resolvedOptions().locale || 'es').toLowerCase(); } catch { return 'es'; }
}
function idiomaInicial() {
  const l = idiomaDelTelefono().slice(0, 2);
  return ['es', 'pt', 'fr', 'it', 'de'].includes(l) ? l : 'en';
}

// lang: 'es' (español chileno), 'en' (Spanglish), 'pt' (Portuñol), 'fr' (Franchileno), 'it' (Itañol), 'de' (Deutschñol)
export function IdiomaProvider({ children }) {
  const [lang, setLangState] = useState('es');
  useEffect(() => {
    AsyncStorage.getItem(CLAVE).then((v) => {
      if (v === 'tur') setLangState('en');
      else if (IDIOMAS.some((x) => x.id === v)) setLangState(v);
      else setLangState(idiomaInicial());
    }).catch(() => {});
  }, []);
  const setLang = (v) => { setLangState(v); AsyncStorage.setItem(CLAVE, v).catch(() => {}); };
  const tur = lang !== 'es';
  const setTur = (v) => setLang(v ? (lang !== 'es' ? lang : idiomaInicial() === 'es' ? 'en' : idiomaInicial()) : 'es');
  // t('texto en español', 'texto en Spanglish'): en pt/it/de se mezcla el español con su idioma
  const t = (es, sp) => {
    if (lang === 'es') return es;
    if (lang === 'en') return sp !== undefined ? sp : es;
    return mezclar(es, lang);
  };
  const cuad = (n) => {
    if (n >= 99) return tur ? LEJOS[lang] : 'lejos';
    const base = n <= 1 ? '1 cuadra' : `${n} cuadras`;
    if (!tur) return base;
    const m = Math.max(1, n) * 100;
    return `${base} (~${m} m, ${Math.max(1, Math.round(m / 80))} ${A_PIE[lang]})`;
  };
  return <Ctx.Provider value={{ tur, lang, t, cuad, setTur, setLang }}>{children}</Ctx.Provider>;
}

export const useIdioma = () => useContext(Ctx);

// Categorías en Spanglish
export const CATEGORIA_TUR = {
  todo: 'All', comer: 'Comer · Food', tomar: 'Tomar · Drinks', cafe: 'Café · Coffee', dulce: 'Dulce · Sweets',
  almacen: 'Almacén · Deli', diseno: 'Diseño · Design', deco: 'Deco · Home', antiguedades: 'Antigüedades · Antiques',
  ropa: 'Ropa · Vintage', accesorios: 'Accesorios', libros: 'Libros · Books', musica: 'Música · Vinyl', arte: 'Arte · Art',
  plantas: 'Plantas · Plants', belleza: 'Belleza · Beauty', bienestar: 'Bienestar · Wellness', mascotas: 'Mascotas · Pets', otros: 'Otros · More',
};

// Nombre de la categoría en el idioma del turista
export function categoriaTur(id, lang) {
  return (CATEGORIAS_MEZCLA[lang] && CATEGORIAS_MEZCLA[lang][id]) || CATEGORIA_TUR[id];
}

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
  // Spanglish de la app
  ['date una vuelta', 'take a walk around'], ['cuadras', 'blocks (~100 m each)'], ['cuadra', 'a block (~100 m)'],
  ['láminas', 'stickers for your album'], ['lámina', 'a sticker for your album'], ['álbum', 'album'],
  ['canjear', 'to redeem'], ['canjea', 'redeem'], ['canjeados', 'redeemed'], ['canjeado', 'redeemed'], ['canje', 'a redeem'],
  ['locales', 'shops, places'], ['local', 'shop, place'], ['quedan', 'left (how many are left)'],
  ['súmate', 'join in'], ['me sumo', 'I’m in'], ['pásale el dato', 'pass on the tip'], ['cafecito', 'a little coffee'],
  ['almuerzo', 'lunch'], ['hora de almuerzo', 'lunch time'], ['sorpresa', 'surprise'], ['sorpresas', 'surprises'],
  ['recién llegado', 'just arrived (new stock)'], ['entre todos', 'all together'], ['la caja', 'the counter, where you pay'],
  ['reseña', 'review'], ['apodo', 'nickname'], ['avísame', 'let me know'], ['pa’llá', 'over there (casual)'],
  ['listo', 'ready / done'], ['llegaste', 'you made it'], ['cerca', 'nearby'], ['lejos', 'far'], ['ahora', 'now'],
  ['ofertas', 'deals'], ['barrio', 'neighborhood'], ['gustos', 'likes, tastes'], ['vuelve más rato', 'come back in a bit'],
  ['repetidas', 'duplicate stickers'], ['repetida', 'a duplicate sticker'], ['estás dentro', 'you’re in'], ['¿qué tal?', 'how was it?'], ['gracias', 'thanks'], ['siguiente', 'next'],
];
const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Expresiones de otros idiomas en las frases de los locales: se pueden tocar en español y en modo turista
// [expresión, significado en español, en inglés]
const EXTRANJERO = [
  ['mamma mia', '¡madre mía!', 'oh my!'], ['andiamo', '¡vamos!', 'let’s go!'], ['che buono', '¡qué rico!', 'so good!'], ['ecco', '¡aquí está!', 'here it is!'],
  ['avanti', '¡adelante!', 'go ahead!'], ['basta così', 'con eso basta', 'that’s enough'],
  ['qué guay', '¡qué bacán! (España)', 'how cool! (Spain)'], ['mola', 'es bacán (España)', 'it’s cool (Spain)'], ['venga', '¡vamos! (España)', 'come on! (Spain)'],
  ['oh là là', '¡guau!', 'wow!'], ['c’est magnifique', '¡es magnífico!', 'it’s wonderful!'], ['allez', '¡vamos!', 'let’s go!'], ['et voilà', '¡y listo!', 'and there you go!'],
  ['lovely', '¡qué rico! / precioso', 'lovely'], ['cheers', 'salud / gracias', 'cheers'], ['brilliant', '¡genial!', 'brilliant'], ['fancy a', '¿se te antoja un…?', 'do you want a…?'],
  ['awesome', '¡increíble!', 'awesome'], ['yummy', '¡qué rico!', 'yummy'], ['grab it', '¡agárralo!', 'grab it'],
  ['wunderbar', '¡maravilloso!', 'wonderful!'], ['prost', '¡salud!', 'cheers!'], ['schnell', '¡rápido!', 'quick!'],
  ['opa', '¡epa! (de celebración)', 'hooray!'], ['kalí órexi', '¡buen provecho!', 'enjoy your meal!'], ['éla', '¡ven!', 'come!'],
  ['afiyet olsun', '¡buen provecho!', 'enjoy your meal!'], ['çok güzel', '¡muy bueno!', 'very good!'], ['hadi', '¡vamos!', 'come on!'],
  ['yalla', '¡vamos!', 'let’s go!'], ['sahtein', '¡buen provecho!', 'enjoy!'], ['habibi', 'querido/a, amigo/a', 'my dear'],
  ['bahut badhiya', '¡excelente!', 'excellent!'], ['chalo', '¡vamos!', 'let’s go!'], ['ekdum', 'totalmente', 'totally'],
  ['hǎo chī', '¡qué rico!', 'delicious!'], ['jiāyóu', '¡vamos, ánimo!', 'go for it!'],
  ['oishii', '¡qué rico!', 'delicious!'], ['hayaku', '¡rápido!', 'hurry!'], ['itadakimasu', 'a comer (se dice antes de comer)', 'let’s eat'], ['sugoi', '¡increíble!', 'amazing!'],
  ['daebak', '¡increíble!', 'awesome!'], ['masisseoyo', '¡está rico!', 'it’s tasty!'], ['ppalli', '¡rápido!', 'quick!'],
  ['aroi mak', '¡muy rico!', 'very tasty!'], ['sabai sabai', 'relajado, tranqui', 'relaxed, easy'], ['mai pen rai', 'no hay problema', 'no worries'],
  ['ngon quá', '¡qué rico!', 'so tasty!'], ['đi nào', '¡vamos!', 'let’s go!'], ['ăn ngon nhé', '¡que lo disfrutes!', 'enjoy your meal!'],
  ['que legal', '¡qué bacán! (Brasil)', 'how cool! (Brazil)'], ['tá demais', '¡está buenísimo!', 'it’s awesome'], ['bora', '¡vamos!', 'let’s go!'], ['nossa', '¡guau!', 'wow!'], ['vem logo', '¡ven luego!', 'come quick!'],
  ['sak pase', '¿qué tal? (Haití)', 'what’s up? (Haiti)'], ['li bon anpil', '¡está muy bueno!', 'it’s really good'], ['vini vit', '¡ven rápido!', 'come quick!'],
  ['asere', 'amigo (Cuba)', 'buddy (Cuba)'], ['qué volá', '¿qué tal? (Cuba)', 'what’s up? (Cuba)'], ['en talla', 'buenísimo (Cuba)', 'great (Cuba)'],
  ['klk', '¿qué lo que?, ¿qué tal? (Rep. Dominicana)', 'what’s up? (Dominican)'], ['manito', 'amigo', 'buddy'],
  ['ñaño', 'hermano, amigo (Ecuador)', 'bro (Ecuador)'], ['de ley', 'seguro, de verdad (Ecuador)', 'for sure (Ecuador)'],
  ['jallalla', '¡que viva! (aymara, Bolivia)', 'cheers! (Aymara, Bolivia)'], ['cumpa', 'compadre, amigo', 'buddy'], ['macanudo', 'muy bueno', 'great'],
  ['bo', 'oye, amigo (Uruguay)', 'hey, mate (Uruguay)'], ['vamo arriba', '¡vamos! (Uruguay)', 'come on! (Uruguay)'], ['está de más', 'está buenísimo (Uruguay)', 'it’s awesome (Uruguay)'],
];

const armarRE = (lista) => new RegExp(`(^|[^${LETRAS}])(${lista.map(([p]) => escapar(p)).sort((a, b) => b.length - a.length).join('|')})(?=[^${LETRAS}]|$)`, 'gi');
const RE = armarRE([...GLOSARIO, ...EXTRANJERO]);
const RE_LOCAL = armarRE(EXTRANJERO);
const significado = (p, tur = true, lang = 'en') => {
  const k = p.toLowerCase();
  const x = EXTRANJERO.find(([w]) => w === k);
  if (x) return tur ? x[2] : x[1];
  if (GLOSARIO_MEZCLA[lang] && GLOSARIO_MEZCLA[lang][k]) return GLOSARIO_MEZCLA[lang][k];
  const e = GLOSARIO.find(([w]) => w === k);
  return e ? e[1] : '';
};

// Una frase de local: en modo turista, los modismos se pueden tocar para ver qué significan
export function FraseGlosario({ texto, style, numberOfLines, colorAyuda = C.amarillo }) {
  const { tur, lang } = useIdioma();
  const [abierta, setAbierta] = useState(null);
  if (!texto) return <Text style={style} numberOfLines={numberOfLines}>{texto}</Text>;
  const partes = [];
  let ultimo = 0;
  texto.replace(tur ? RE : RE_LOCAL, (m, antes, palabra, idx) => {
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
          <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.negro }}>“{abierta.toLowerCase()}” = {significado(abierta, tur, lang)}</Text>
        </Pressable>
      ) : hay ? (
        <Text style={{ fontFamily: F.media, fontSize: 11, color: colorAyuda }}>{tur ? TOCA[lang] || TOCA.en : 'Toca las palabras subrayadas'}</Text>
      ) : null}
    </View>
  );
}

// Elegir idioma: Español, English (Spanglish), Português (Portuñol), Italiano (Itañol), Deutsch (Deutschñol)
export function SelectorIdioma({ alElegir, style }) {
  const { lang, setLang } = useIdioma();
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>
      {IDIOMAS.map((x) => {
        const activo = lang === x.id;
        return (
          <Pressable key={x.id} onPress={() => { setLang(x.id); alElegir && alElegir(x.id); }} accessibilityRole="button" accessibilityState={{ selected: activo }}
            style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: R(16), borderWidth: 2.5, borderColor: C.negro, backgroundColor: activo ? C.negro : C.papel, justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 13, color: activo ? C.amarillo : C.negro }}>{x.nombre}{x.id !== 'es' ? ` · ${x.mezcla}` : ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
