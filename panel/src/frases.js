// Frases con modismos del país de la cocina. Tono de guiño cariñoso, nunca de burla.
// El dueño elige una y la aprueba antes de publicar.
// Variables: {p} producto, {$} precio, {n} cupo, {h} hora de término.

export const COCINAS = ['Chilena', 'Venezolana', 'Peruana', 'Colombiana', 'Mexicana', 'Argentina', 'Otra'];

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
