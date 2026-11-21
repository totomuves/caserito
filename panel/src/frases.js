// Frases con modismos del país de la cocina. Tono de guiño cariñoso, nunca de burla.
// El dueño elige una y la aprueba antes de publicar.
// Variables: {p} producto, {$} precio, {n} cupo, {h} hora de término.

export const COCINAS = [
  'Chilena', 'Venezolana', 'Peruana', 'Colombiana', 'Mexicana', 'Argentina', 'Uruguaya', 'Boliviana', 'Ecuatoriana',
  'Cubana', 'Dominicana', 'Haitiana', 'Brasileña', 'Italiana', 'Española', 'Francesa', 'Inglesa', 'Estadounidense',
  'Alemana', 'Griega', 'Turca', 'Árabe', 'India', 'China', 'Japonesa', 'Coreana', 'Tailandesa', 'Vietnamita', 'Otra',
];

const PLANTILLAS = {
  Chilena: [
    'Caserito, {p} a {$}, ¡al tiro que se acaba!',
    'Está la media promo: {p} a {$} hasta las {h}.',
    'Cachai que quedan {n} no más. ¡Ven altiro por tu {p}!',
  ],
  Venezolana: [
    '¡Epa, chamo! {p} a {$}. Está burda de bueno, quedan {n}.',
    'Pana, esto está demasiado chévere: {p} a {$} hasta las {h}.',
    '¡Qué molleja de precio! {p} a {$}, vente antes que se acabe.',
  ],
  Peruana: [
    'Causa, {p} a {$}: está de chuparse los dedos. Solo {n}.',
    'Habla, causita: {p} a precio bacán hasta las {h}.',
    'Está paja: {p} a {$}. ¡No te lo pierdas!',
  ],
  Colombiana: [
    '¡Qué nota, parce! {p} a {$}, quedan poquitos.',
    'Parcero, esto está bacanísimo: {p} a {$} hasta las {h}.',
    '¡Hágale, que se acaba! {p} a {$}.',
  ],
  Mexicana: [
    '¡Hay un drop bien chingón! {p} a {$} hasta las {h}.',
    '¿Qué onda? {p} a precio de cuates, nomás {n}.',
    'Órale, se está yendo el {p}. ¡Ándale, a {$}!',
  ],
  Argentina: [
    '¡Che, mirá esto! {p} a {$}, quedan {n}.',
    'Está re bueno: {p} a {$} hasta las {h}.',
    'Posta, {p} a {$}. ¡Vení antes que vuele!',
  ],
  Uruguaya: [
    '¡Está de más, bo! {p} a {$}, quedan {n}.',
    'Tá, te lo dejo fácil: {p} a {$} hasta las {h}.',
    '¡Vamo arriba! {p} a {$} antes que se termine.',
  ],
  Boliviana: [
    '¡Jallalla, caserito! {p} a {$}. Solo {n}.',
    'Está macanudo: {p} a {$} hasta las {h}.',
    '¡Apurate, cumpa! {p} a {$}, quedan poquitos.',
  ],
  Ecuatoriana: [
    '¡Qué bacán, ñaño! {p} a {$}. Quedan {n}.',
    'De ley que te gusta: {p} a {$} hasta las {h}.',
    '¡Chévere, mijo! {p} a {$}, ven nomás.',
  ],
  Cubana: [
    '¡Qué volá, asere! {p} a {$}. Quedan {n}.',
    'Esto está en talla: {p} a {$} hasta las {h}.',
    '¡Dale, que se acaba! {p} a {$}, mi socio.',
  ],
  Dominicana: [
    '¡Klk! {p} a {$}, quedan {n} nomás.',
    'Eso está chévere, manito: {p} a {$} hasta las {h}.',
    '¡Dale, que se va! {p} a {$}.',
  ],
  Haitiana: [
    'Sak pase! {p} a {$}. Quedan {n}.',
    'Li bon anpil: {p} a {$} hasta las {h}.',
    'Vini vit! {p} a {$} antes que se acabe.',
  ],
  Brasileña: [
    'Que legal! {p} a {$}, quedan {n}.',
    'Tá demais: {p} a {$} hasta las {h}. Bora!',
    'Nossa! {p} a {$}. Vem logo!',
  ],
  Italiana: [
    '¡Mamma mia! {p} a {$}. Quedan {n}, andiamo!',
    'Che buono: {p} a {$} hasta las {h}. ¡Ecco!',
    'Avanti, caserito: {p} a {$}. Basta così, se acaba.',
  ],
  Española: [
    '¡Qué guay! {p} a {$}, quedan {n}.',
    'Esto mola un montón: {p} a {$} hasta las {h}.',
    '¡Venga, vamos! {p} a {$} antes de que vuele.',
  ],
  Francesa: [
    'Oh là là! {p} a {$}. Solo {n}.',
    'C’est magnifique: {p} a {$} hasta las {h}.',
    'Allez, allez! {p} a {$}, et voilà.',
  ],
  Inglesa: [
    'Lovely! {p} a {$}. Solo {n}, cheers.',
    'Brilliant: {p} a {$} hasta las {h}.',
    'Fancy a {p}? A {$}, quedan {n}.',
  ],
  Estadounidense: [
    'Awesome deal: {p} a {$}. Quedan {n}!',
    'Yummy: {p} a {$} hasta las {h}.',
    'Grab it! {p} a {$}, antes que se acabe.',
  ],
  Alemana: [
    'Wunderbar! {p} a {$}. Quedan {n}.',
    'Prost, caserito: {p} a {$} hasta las {h}.',
    'Schnell, schnell! {p} a {$}, se acaba.',
  ],
  Griega: [
    'Opa! {p} a {$}. Solo {n}.',
    'Kalí órexi: {p} a {$} hasta las {h}.',
    'Éla, éla! {p} a {$} antes que vuele.',
  ],
  Turca: [
    'Afiyet olsun! {p} a {$}. Quedan {n}.',
    'Çok güzel: {p} a {$} hasta las {h}.',
    'Hadi! {p} a {$}, que se acaba.',
  ],
  Árabe: [
    'Yalla, yalla! {p} a {$}. Quedan {n}.',
    'Sahtein: {p} a {$} hasta las {h}.',
    'Habibi, este precio no se repite: {p} a {$}.',
  ],
  India: [
    'Bahut badhiya! {p} a {$}, quedan {n}.',
    'Chalo, chalo: {p} a {$} hasta las {h}.',
    'Ekdum fresco: {p} a {$}. ¡Ven por el tuyo!',
  ],
  China: [
    'Hǎo chī! {p} a {$}. Quedan {n}.',
    'Jiāyóu, caserito: {p} a {$} hasta las {h}.',
    'Precio de buena suerte: {p} a {$}. Solo {n}.',
  ],
  Japonesa: [
    'Oishii! {p} a {$}. Solo {n}, hayaku!',
    'Itadakimasu: {p} a {$} hasta las {h}.',
    'Sugoi: {p} a {$}. ¡Ven antes que se acabe!',
  ],
  Coreana: [
    'Daebak! {p} a {$}. Quedan {n}.',
    'Masisseoyo: {p} a {$} hasta las {h}.',
    'Ppalli ppalli! {p} a {$} antes que vuele.',
  ],
  Tailandesa: [
    'Aroi mak! {p} a {$}. Solo {n}.',
    'Sabai sabai: {p} a {$} hasta las {h}.',
    'Mai pen rai con el precio: {p} a {$}.',
  ],
  Vietnamita: [
    'Ngon quá! {p} a {$}. Quedan {n}.',
    'Đi nào, caserito: {p} a {$} hasta las {h}.',
    'Ăn ngon nhé: {p} a {$}, se acaba.',
  ],
  Otra: [
    '{p} a {$} hasta las {h}. ¡Quedan {n}!',
    'Hoy en el barrio: {p} a {$}. Solo {n}.',
    'Pasa por tu {p} a {$} antes de las {h}.',
  ],
};

export function formatoPrecio(n) {
  if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '';
  return '$' + Number(n).toLocaleString('es-CL');
}

export function frasesPara(cocina, { producto, precio, cupo, hora }) {
  const lista = PLANTILLAS[cocina] || PLANTILLAS.Otra;
  return lista.map((t) =>
    t
      .replaceAll('{p}', producto || 'el drop')
      .replaceAll('{$}', formatoPrecio(precio) || 'precio de caserito')
      .replaceAll('{n}', String(cupo || ''))
      .replaceAll('{h}', hora || '')
  );
}
