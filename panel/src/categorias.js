// Debe coincidir con caserito.categorias_validas() en supabase/004
export const GRUPOS = [
  {
    titulo: 'Comer y tomar',
    items: [
      { id: 'comer', texto: 'Comer' },
      { id: 'tomar', texto: 'Tomar (bar, chela, coctelería)' },
      { id: 'cafe', texto: 'Café' },
      { id: 'dulce', texto: 'Dulce (pastelería, heladería)' },
      { id: 'almacen', texto: 'Almacén (pan, gourmet, vinos)' },
    ],
  },
  {
    titulo: 'Tiendas',
    items: [
      { id: 'diseno', texto: 'Diseño y artesanía' },
      { id: 'deco', texto: 'Deco y muebles' },
      { id: 'antiguedades', texto: 'Antigüedades' },
      { id: 'ropa', texto: 'Ropa y vintage' },
      { id: 'accesorios', texto: 'Joyas, zapatos y accesorios' },
      { id: 'libros', texto: 'Libros' },
      { id: 'musica', texto: 'Música y vinilos' },
      { id: 'arte', texto: 'Arte y galerías' },
      { id: 'plantas', texto: 'Plantas y flores' },
    ],
  },
  {
    titulo: 'Servicios',
    items: [
      { id: 'belleza', texto: 'Belleza, barbería y tattoo' },
      { id: 'bienestar', texto: 'Bienestar (yoga, masajes)' },
      { id: 'mascotas', texto: 'Mascotas' },
      { id: 'otros', texto: 'Otro' },
    ],
  },
];

export const CATEGORIAS = GRUPOS.flatMap((g) => g.items);
export const CON_COCINA = ['comer', 'tomar', 'cafe', 'dulce', 'almacen'];
export const MAX_CATEGORIAS = 3;

export function textoCategoria(id) {
  const c = CATEGORIAS.find((x) => x.id === id);
  return c ? c.texto.replace(/ \(.*\)$/, '') : 'Otro';
}
