export const C = {
  amarillo: '#FFD100',
  rojo: '#E30A2F',
  rojoTexto: '#C20826',
  negro: '#111111',
  azul: '#1E5AA8',
  crema: '#F3E6CC',
  papel: '#FFF6E5',
  gris: '#4A4A4A',
  amarilloSuave: '#FFF3B0',
};

export const F = {
  letrista: 'LuckiestGuy_400Regular',
  normal: 'Archivo_400Regular',
  media: 'Archivo_600SemiBold',
  negrita: 'Archivo_800ExtraBold',
};

// Estilo de los títulos/precios: mayúsculas de cartel, inclinadas
export const letrista = { fontFamily: F.letrista, fontStyle: 'italic', letterSpacing: 0.5 };

export const CATEGORIAS = [
  { id: 'todo', texto: 'Todo' },
  { id: 'comer', texto: 'Comer' },
  { id: 'cafe', texto: 'Café' },
  { id: 'musica', texto: 'Música' },
  { id: 'ropa', texto: 'Ropa' },
  { id: 'diseno', texto: 'Diseño' },
  { id: 'otros', texto: 'Otros' },
];

export function textoCategoria(id) {
  const c = CATEGORIAS.find((x) => x.id === id);
  return c ? c.texto : 'Otros';
}

export function precio(n) {
  if (n === null || n === undefined) return '';
  return '$' + Number(n).toLocaleString('es-CL');
}

export function cuadras(n) {
  return n <= 1 ? 'a 1 cuadra' : `a ${n} cuadras`;
}

// Centro de Barrio Italia (si el usuario no comparte su ubicación)
export const BARRIO_ITALIA = { lat: -33.4445, lng: -70.6255 };
