import { supabase } from './supabase.js';

// Achica la imagen en el teléfono (WebP, o JPG si no se puede) y la sube a la carpeta del usuario
export async function subirImagen(archivo, prefijo, lado = 800) {
  const { data: u } = await supabase.auth.getUser();
  const img = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(img.width * escala);
  lienzo.height = Math.round(img.height * escala);
  lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
  const blob = await new Promise((r) => lienzo.toBlob(r, 'image/webp', 0.82));
  const webp = blob && blob.type === 'image/webp';
  const final = webp ? blob : await new Promise((r) => lienzo.toBlob(r, 'image/jpeg', 0.82));
  const ruta = `${u.user.id}/${prefijo}-${Date.now()}.${webp ? 'webp' : 'jpg'}`;
  const up = await supabase.storage.from('caserito-logos').upload(ruta, final, { contentType: webp ? 'image/webp' : 'image/jpeg', upsert: true });
  if (up.error) throw up.error;
  return supabase.storage.from('caserito-logos').getPublicUrl(ruta).data.publicUrl;
}
