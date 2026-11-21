// Modo turista en 4 mezclas: Spanglish (en), Portuñol (pt), Itañol (it) y Deutschñol (de).
// La app sigue en español chileno, pero con palabras clave en el idioma del turista,
// para que entienda lo justo y aprenda un poco de chileno en el camino.

export const IDIOMAS = [
  { id: 'es', corto: 'ES', nombre: 'Español', mezcla: 'Español' },
  { id: 'en', corto: 'EN', nombre: 'English', mezcla: 'Spanglish' },
  { id: 'pt', corto: 'PT', nombre: 'Português', mezcla: 'Portuñol' },
  { id: 'it', corto: 'IT', nombre: 'Italiano', mezcla: 'Itañol' },
  { id: 'de', corto: 'DE', nombre: 'Deutsch', mezcla: 'Deutschñol' },
];

// [palabra en español, reemplazo]. Lo más largo primero para que "cómo llegar" gane a "llegar".
const DICCIONARIO = {
  pt: [
    ['cómo llegar', 'como chegar'], ['ya puedes', 'já pode'], ['vuelve más rato', 'volta daqui a pouco'], ['no hay', 'não tem'],
    ['más cerca de ti', 'mais pertinho de você'], ['cerca de ti', 'pertinho de você'], ['estás a', 'você tá a'], ['estás aquí', 'você tá aqui'],
    ['¡estás aquí!', '¡você tá aqui!'], ['se desbloquea al llegar', 'desbloqueia quando chegar'], ['al tiro', 'al tiro (já!)'],
    ['ver drop', 'olhar o drop'], ['ver', 'olhar'], ['quedan', 'restam'], ['queda', 'resta'], ['ahora', 'agora'], ['hoy', 'hoje'],
    ['gratis', 'grátis'], ['ofertas', 'promoções'], ['oferta', 'promoção'], ['barrios', 'bairros'], ['barrio', 'bairro'],
    ['locales', 'lojinhas'], ['local', 'lojinha'], ['cuenta', 'conta'], ['guardar', 'salvar'], ['entrar', 'entrar'],
    ['canjear', 'resgatar'], ['canjéalo', 'resgata'], ['canjes', 'resgates'], ['canje', 'resgate'], ['llegar', 'chegar'],
    ['láminas', 'figurinhas'], ['lámina', 'figurinha'], ['álbum', 'álbum'], ['tu', 'teu'], ['gracias', 'obrigado'],
    ['¡bienvenido', '¡bem-vindo'], ['bienvenido', 'bem-vindo'], ['amigos', 'amigos'], ['buscar', 'procurar'], ['comer', 'comer'],
    ['sorpresa', 'surpresa'], ['juntas', 'juntas'], ['todo', 'tudo'], ['mapa', 'mapa'], ['avísame', 'me avisa'], ['siguiente', 'próximo'],
    ['otra', 'outra'], ['listo', 'pronto'], ['cerrar', 'fechar'], ['volver', 'voltar'], ['¿a qué barrio vas?', '¿pra qual bairro você vai?'],
  ],
  it: [
    ['cómo llegar', 'come arrivare'], ['ya puedes', 'già puoi'], ['vuelve más rato', 'torna più tardi'], ['no hay', 'non c’è'],
    ['más cerca de ti', 'più vicino a te'], ['cerca de ti', 'vicino a te'], ['estás a', 'sei a'], ['¡estás aquí!', '¡sei qui!'], ['estás aquí', 'sei qui'],
    ['se desbloquea al llegar', 'si sblocca quando arrivi'], ['ver drop', 'vedi il drop'], ['ver', 'vedi'], ['quedan', 'ne restano'],
    ['queda', 'resta'], ['ahora', 'adesso'], ['hoy', 'oggi'], ['gratis', 'gratis'], ['ofertas', 'offerte'], ['oferta', 'offerta'],
    ['barrios', 'quartieri'], ['barrio', 'quartiere'], ['locales', 'negozi'], ['local', 'negozio'], ['cuenta', 'account'],
    ['guardar', 'salvare'], ['canjear', 'riscattare'], ['canjéalo', 'riscattalo'], ['canjes', 'riscatti'], ['canje', 'riscatto'],
    ['llegar', 'arrivare'], ['láminas', 'figurine'], ['lámina', 'figurina'], ['gracias', 'grazie'], ['¡bienvenido', '¡benvenuto'],
    ['bienvenido', 'benvenuto'], ['buscar', 'cercare'], ['sorpresa', 'sorpresa'], ['todo', 'tutto'], ['avísame', 'avvisami'],
    ['siguiente', 'prossimo'], ['otra', 'un’altra'], ['listo', 'pronto'], ['cerrar', 'chiudere'], ['volver', 'tornare'],
    ['vamos', 'andiamo'], ['rico', 'buonissimo'], ['¿a qué barrio vas?', '¿in quale quartiere vai?'],
  ],
  de: [
    ['cómo llegar', 'Weg dorthin'], ['ya puedes', 'jetzt kannst du'], ['vuelve más rato', 'komm später wieder'], ['no hay', 'es gibt keine'],
    ['más cerca de ti', 'ganz in deiner Nähe'], ['cerca de ti', 'in deiner Nähe'], ['estás a', 'du bist'], ['¡estás aquí!', '¡du bist da!'], ['estás aquí', 'du bist da'],
    ['se desbloquea al llegar', 'wird freigeschaltet, wenn du ankommst'], ['ver drop', 'Drop ansehen'], ['ver', 'ansehen'], ['quedan', 'noch'],
    ['queda', 'noch'], ['ahora', 'jetzt'], ['hoy', 'heute'], ['gratis', 'gratis'], ['ofertas', 'Angebote'], ['oferta', 'Angebot'],
    ['barrios', 'Viertel'], ['barrio', 'Viertel'], ['locales', 'Läden'], ['local', 'Laden'], ['cuenta', 'Konto'], ['guardar', 'speichern'],
    ['canjear', 'einlösen'], ['canjéalo', 'lös es ein'], ['canjes', 'Einlösungen'], ['canje', 'Einlösung'], ['llegar', 'ankommen'],
    ['láminas', 'Sticker'], ['lámina', 'Sticker'], ['gracias', 'danke'], ['¡bienvenido', '¡willkommen'], ['bienvenido', 'willkommen'],
    ['buscar', 'suchen'], ['sorpresa', 'Überraschung'], ['todo', 'alles'], ['avísame', 'sag mir Bescheid'], ['siguiente', 'weiter'],
    ['otra', 'noch eine'], ['listo', 'fertig'], ['cerrar', 'schließen'], ['volver', 'zurück'], ['vamos', 'los geht’s'], ['rico', 'lecker'],
    ['¿a qué barrio vas?', '¿in welches Viertel gehst du?'],
  ],
};

const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const REGLAS = {};
for (const id of Object.keys(DICCIONARIO)) {
  const lista = [...DICCIONARIO[id]].sort((a, b) => b[0].length - a[0].length);
  const mapa = Object.fromEntries(lista.map(([a, b]) => [a, b]));
  const re = new RegExp(`(^|[^${LETRAS}])(${lista.map(([a]) => escapar(a)).join('|')})(?=[^${LETRAS}]|$)`, 'gi');
  REGLAS[id] = { re, mapa };
}

function conMayuscula(original, nuevo) {
  const i = original.search(new RegExp(`[${LETRAS}]`));
  const j = nuevo.search(new RegExp(`[${LETRAS}]`));
  if (i < 0 || j < 0) return nuevo;
  const mayus = original[i] === original[i].toUpperCase();
  const todoMayus = original === original.toUpperCase() && original.length > 2;
  if (todoMayus) return nuevo.toUpperCase();
  return mayus ? nuevo.slice(0, j) + nuevo[j].toUpperCase() + nuevo.slice(j + 1) : nuevo;
}

// Mezcla un texto en español con el idioma del turista
export function mezclar(texto, id) {
  const r = REGLAS[id];
  if (!r || typeof texto !== 'string') return texto;
  return texto.replace(r.re, (m, antes, palabra) => antes + conMayuscula(palabra, r.mapa[palabra.toLowerCase()] || palabra));
}

// Minutos caminando, en cada idioma
export const A_PIE = { en: 'min walk', pt: 'min a pé', it: 'min a piedi', de: 'Min. zu Fuß' };
export const LEJOS = { en: 'lejos (far)', pt: 'lejos (longe)', it: 'lejos (lontano)', de: 'lejos (weit weg)' };
export const TOCA = {
  en: 'Tap the underlined words · Toca las palabras subrayadas',
  pt: 'Toca nas palavras sublinhadas · Toca las palabras subrayadas',
  it: 'Tocca le parole sottolineate · Toca las palabras subrayadas',
  de: 'Tippe auf die unterstrichenen Wörter · Toca las palabras subrayadas',
};

// Categorías en cada mezcla
export const CATEGORIAS_MEZCLA = {
  pt: { todo: 'Tudo', comer: 'Comer · Comida', tomar: 'Tomar · Bebidas', cafe: 'Café', dulce: 'Dulce · Doces', almacen: 'Almacén · Mercearia', diseno: 'Diseño · Design', deco: 'Deco · Casa', antiguedades: 'Antigüedades · Antiguidades', ropa: 'Ropa · Roupa', accesorios: 'Accesorios · Acessórios', libros: 'Libros · Livros', musica: 'Música · Discos', arte: 'Arte', plantas: 'Plantas', belleza: 'Belleza · Beleza', bienestar: 'Bienestar · Bem-estar', mascotas: 'Mascotas · Pets', otros: 'Otros · Outros' },
  it: { todo: 'Tutto', comer: 'Comer · Cibo', tomar: 'Tomar · Bevande', cafe: 'Café · Caffè', dulce: 'Dulce · Dolci', almacen: 'Almacén · Alimentari', diseno: 'Diseño · Design', deco: 'Deco · Casa', antiguedades: 'Antigüedades · Antiquariato', ropa: 'Ropa · Vestiti', accesorios: 'Accesorios · Accessori', libros: 'Libros · Libri', musica: 'Música · Vinili', arte: 'Arte', plantas: 'Plantas · Piante', belleza: 'Belleza · Bellezza', bienestar: 'Bienestar · Benessere', mascotas: 'Mascotas · Animali', otros: 'Otros · Altro' },
  de: { todo: 'Alles', comer: 'Comer · Essen', tomar: 'Tomar · Getränke', cafe: 'Café · Kaffee', dulce: 'Dulce · Süßes', almacen: 'Almacén · Feinkost', diseno: 'Diseño · Design', deco: 'Deco · Wohnen', antiguedades: 'Antigüedades · Antiquitäten', ropa: 'Ropa · Kleidung', accesorios: 'Accesorios · Accessoires', libros: 'Libros · Bücher', musica: 'Música · Platten', arte: 'Arte · Kunst', plantas: 'Plantas · Pflanzen', belleza: 'Belleza · Beauty', bienestar: 'Bienestar · Wellness', mascotas: 'Mascotas · Haustiere', otros: 'Otros · Mehr' },
};

// Significado de los modismos más comunes, en cada idioma (el resto cae al inglés)
export const GLOSARIO_MEZCLA = {
  pt: {
    caserito: 'cliente fiel — assim os feirantes chilenos chamam você', 'al tiro': 'agora mesmo (chileno)', altiro: 'agora mesmo (chileno)',
    cachai: 'sacou? (chileno)', 'media promo': 'uma promoção ótima (chileno)', bacán: 'legal, demais', bacanísimo: 'muito legal',
    once: 'lanche da tarde chileno', sopaipillas: 'massa frita de abóbora, lanche de rua', completo: 'cachorro-quente chileno com abacate',
    marraqueta: 'pão francês chileno', marraquetas: 'pães franceses chilenos', chela: 'cerveja (gíria)', pino: 'recheio de carne e cebola da empanada',
    picada: 'lugar pequeno, barato e autêntico', yapa: 'um extra de presente', drop: 'promoção limitada: poucas unidades, acaba logo',
    cuadra: 'quarteirão (~100 m)', cuadras: 'quarteirões (~100 m cada)', lámina: 'figurinha do álbum', láminas: 'figurinhas do álbum',
    canjear: 'resgatar', quedan: 'restam', local: 'loja', locales: 'lojas', barrio: 'bairro', nomás: 'só, à vontade', 'vuelve más rato': 'volta daqui a pouco',
  },
  it: {
    caserito: 'cliente affezionato — così ti chiamano al mercato in Cile', 'al tiro': 'subito (cileno)', altiro: 'subito (cileno)',
    cachai: 'capisci? (cileno)', 'media promo': 'un’offerta pazzesca (cileno)', bacán: 'figo, fantastico', bacanísimo: 'fichissimo',
    once: 'merenda cilena', sopaipillas: 'frittelle di zucca, street food cileno', completo: 'hot dog cileno con avocado',
    marraqueta: 'panino croccante cileno', marraquetas: 'panini croccanti cileni', chela: 'birra (gergo)', pino: 'ripieno di carne e cipolla delle empanadas',
    picada: 'posticino economico e autentico', yapa: 'un piccolo extra in regalo', drop: 'offerta limitata: pochi pezzi, finisce presto',
    cuadra: 'isolato (~100 m)', cuadras: 'isolati (~100 m)', lámina: 'figurina dell’album', láminas: 'figurine dell’album',
    canjear: 'riscattare', quedan: 'ne restano', local: 'negozio', locales: 'negozi', barrio: 'quartiere', nomás: 'pure, soltanto', 'vuelve más rato': 'torna più tardi',
  },
  de: {
    caserito: 'Stammkunde — so nennen dich chilenische Marktverkäufer', 'al tiro': 'sofort (chilenisch)', altiro: 'sofort (chilenisch)',
    cachai: 'verstehst du? (chilenisch)', 'media promo': 'ein Super-Angebot (chilenisch)', bacán: 'cool, super', bacanísimo: 'mega cool',
    once: 'chilenische Teezeit am Nachmittag', sopaipillas: 'frittierter Kürbisteig, Streetfood', completo: 'chilenischer Hotdog mit Avocado',
    marraqueta: 'knuspriges chilenisches Brötchen', marraquetas: 'knusprige chilenische Brötchen', chela: 'Bier (Slang)', pino: 'Füllung aus Rind und Zwiebeln für Empanadas',
    picada: 'kleines, günstiges, authentisches Lokal', yapa: 'ein kleines Extra gratis', drop: 'begrenztes Angebot: wenige Stück, endet bald',
    cuadra: 'Häuserblock (~100 m)', cuadras: 'Häuserblocks (~100 m)', lámina: 'Sticker fürs Album', láminas: 'Sticker fürs Album',
    canjear: 'einlösen', quedan: 'noch übrig', local: 'Laden', locales: 'Läden', barrio: 'Viertel', nomás: 'einfach, nur', 'vuelve más rato': 'komm später wieder',
  },
};
