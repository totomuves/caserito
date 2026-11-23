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
  borde: '#111111',  // bordes de tarjetas y botones (en Moderno: gris suave)
  sombra: '#111111', // sombras (en Moderno: suaves)
};
const BASE = { ...C };

export const F = {
  letrista: 'Jost_800ExtraBold',
  pincel: 'LuckiestGuy_400Regular',
  titular: 'Anton_400Regular',
  angosta: 'ArchivoNarrow_700Bold',
  serifa: 'Gelasio_400Regular',
  normal: 'Archivo_400Regular',
  media: 'Archivo_600SemiBold',
  negrita: 'Archivo_800ExtraBold',
};

// Títulos y precios: cambian con el estilo (skin) que elige el admin
export const letrista = { fontFamily: F.letrista, letterSpacing: -0.3 };
// Skin activo: 'clasico' (el primero, pincel y redondeado), 'bauhaus' o 'diario'
export let ESTILO = 'bauhaus';
export function aplicarEstilo(e) {
  ESTILO = e;
  Object.assign(C, BASE);
  if (e === 'moderno') Object.assign(C, { papel: '#FFFFFF', crema: '#F4F4F6', borde: '#E4E4E9', sombra: 'rgba(17,17,17,0.10)', amarilloSuave: '#FFF7CC' });
  if (e === 'moderno') Object.assign(letrista, { fontFamily: F.negrita, fontStyle: 'normal', letterSpacing: -0.6 });
  else if (e === 'clasico') Object.assign(letrista, { fontFamily: F.pincel, fontStyle: 'italic', letterSpacing: 0.5 });
  else if (e === 'diario') Object.assign(letrista, { fontFamily: F.titular, fontStyle: 'normal', letterSpacing: 0 });
  else Object.assign(letrista, { fontFamily: F.letrista, fontStyle: 'normal', letterSpacing: -0.3 });
}
// Colores de los banners del inicio: los elige el admin, siempre de la paleta Bauhaus
export const PALETA = { amarillo: '#FFD100', rojo: '#E30A2F', azul: '#1E5AA8', negro: '#111111', blanco: '#FFFFFF' };
export const BANNERS_BASE = { cabecera: 'amarillo', cerca: 'rojo', frase: 'negro', aprendio: 'amarillo' };
export const BANNERS = { ...BANNERS_BASE };
export function aplicarBanners(b) {
  Object.assign(BANNERS, BANNERS_BASE);
  if (b && typeof b === 'object') Object.keys(BANNERS_BASE).forEach((k) => { if (PALETA[b[k]]) BANNERS[k] = b[k]; });
}
export const fondoBanner = (k) => PALETA[BANNERS[k]];
export const bannerClaro = (k) => BANNERS[k] === 'amarillo' || BANNERS[k] === 'blanco';
// Texto normal sobre el banner
export const tintaBanner = (k) => (bannerClaro(k) ? '#111111' : '#FFFFFF');
// Títulos y detalles sobre el banner (amarillo sobre oscuro, negro o rojo sobre claro)
export const acentoBanner = (k) => (BANNERS[k] === 'blanco' ? '#E30A2F' : bannerClaro(k) ? '#111111' : '#FFD100');

// Radio de esquinas: redondeado solo en el clásico
export const R = (n) => (ESTILO === 'moderno' ? Math.max(n, 14) : ESTILO === 'clasico' ? n : 0);
// Estilos 'sobrios' (Clásico y Moderno): tarjetas simples, sin pop art
export const sobrio = () => ESTILO === 'clasico' || ESTILO === 'moderno';

// Debe coincidir con caserito.categorias_validas() (supabase/004)
export const CATEGORIAS = [
  { id: 'todo', texto: 'Todo' },
  { id: 'comer', texto: 'Comer' },
  { id: 'tomar', texto: 'Tomar' },
  { id: 'cafe', texto: 'Café' },
  { id: 'dulce', texto: 'Dulce' },
  { id: 'almacen', texto: 'Almacén' },
  { id: 'diseno', texto: 'Diseño' },
  { id: 'deco', texto: 'Deco y muebles' },
  { id: 'antiguedades', texto: 'Antigüedades' },
  { id: 'ropa', texto: 'Ropa y vintage' },
  { id: 'accesorios', texto: 'Accesorios' },
  { id: 'libros', texto: 'Libros' },
  { id: 'musica', texto: 'Música' },
  { id: 'arte', texto: 'Arte' },
  { id: 'plantas', texto: 'Plantas' },
  { id: 'belleza', texto: 'Belleza' },
  { id: 'bienestar', texto: 'Bienestar' },
  { id: 'mascotas', texto: 'Mascotas' },
  { id: 'otros', texto: 'Otros' },
];

export function tieneCategoria(d, id) {
  return (d.categorias && d.categorias.length ? d.categorias : [d.categoria]).includes(id);
}

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
