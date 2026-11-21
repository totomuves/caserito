// Caserito de Honor: recibe la selfie, la manda a Gemini (Nano Banana) con el estilo del álbum
// y guarda SOLO la lámina final. La foto original nunca se guarda.
// Secreto necesario en Supabase → Edge Functions → Secrets: GEMINI_API_KEY
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODELO = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash-image';

const MOTIVO: Record<string, string> = {
  comer: 'holding a giant overflowing sandwich and a Chilean empanada, crumbs flying',
  cafe: 'clutching a huge steaming coffee cup, frothy foam everywhere, eyes wide from caffeine',
  tomar: 'raising a foaming mug in a toast, splashes flying',
  dulce: 'covered in frosting and sprinkles, holding a towering cake',
  almacen: 'carrying an overflowing bag of groceries, fruit tumbling out',
  musica: 'blasting a vinyl record player, music notes exploding around',
  ropa: 'wearing a wild mismatched outfit, clothes tags flying',
  libros: 'buried under a tower of books, glasses askew',
  plantas: 'with plants and vines sprouting from the hair',
  mascotas: 'surrounded by happy chaotic puppies and kittens',
  belleza: 'with an extravagant hairdo and sparkles',
  arte: 'splattered with paint, holding brushes',
};

function prompt(local: string, categoria: string) {
  const motivo = MOTIVO[categoria] || 'surrounded by goodies from the neighborhood shop';
  return [
    'Turn the person in this photo into a vertical collectible trading-card illustration.',
    '1980s gross-out collectible sticker art style: hand-painted gouache and airbrush, highly detailed,',
    'semi-realistic caricature with a big head, exaggerated funny expression, cheeky grin, thick dark outlines,',
    'saturated colors, dramatic lighting. Keep the person clearly recognizable (face shape, hair, glasses, skin tone).',
    `Humorous and affectionate, never mean. The person is a loyal regular of "${local}", ${motivo}.`,
    'Plain warm yellow background (#FFD100), character centered, head and torso. No text, no letters, no border, no logos.',
  ].join(' ');
}

function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return responder({ error: 'Usa POST' }, 405);

  const llave = Deno.env.get('GEMINI_API_KEY');
  if (!llave) return responder({ error: 'Falta GEMINI_API_KEY en los secretos de Supabase.' }, 500);

  const url = Deno.env.get('SUPABASE_URL')!;
  const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    db: { schema: 'caserito' },
  });
  const servidor = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'caserito' } });

  const { data: quien } = await usuario.auth.getUser();
  if (!quien?.user) return responder({ error: 'Tienes que entrar a la app primero.' }, 401);

  let datos: { local_id?: string; foto?: string; mime?: string; acepto?: boolean };
  try { datos = await req.json(); } catch { return responder({ error: 'Pedido inválido' }, 400); }
  const { local_id, foto, acepto } = datos;
  const mime = datos.mime && /^image\/(jpeg|png|webp)$/.test(datos.mime) ? datos.mime : 'image/jpeg';
  if (!local_id || !foto) return responder({ error: 'Falta la foto o el local.' }, 400);
  if (!acepto) return responder({ error: 'Tienes que aceptar las condiciones de la foto.' }, 400);
  if (foto.length > 7_000_000) return responder({ error: 'La foto es muy pesada. Prueba con otra.' }, 413);

  const { data: puede, error: e1 } = await usuario.rpc('puede_honor', { p_local: local_id });
  if (e1) return responder({ error: e1.message }, 400);
  if (!puede) return responder({ error: 'La lámina de honor se desbloquea con 7 visitas a este local.' }, 403);

  const { data: local } = await servidor.from('locales').select('nombre, categoria').eq('id', local_id).single();
  if (!local) return responder({ error: 'No encontramos el local.' }, 404);

  // Gemini (Nano Banana): foto + instrucciones → imagen
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': llave },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt(local.nombre, local.categoria) }, { inline_data: { mime_type: mime, data: foto } }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '2:3' } },
    }),
  });
  const g = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = g?.error?.message || `Gemini respondió ${r.status}`;
    const cuota = r.status === 429 || /quota|billing/i.test(msg);
    return responder({ error: cuota ? 'Se acabó el cupo gratis de la IA por hoy. Prueba mañana.' : msg }, cuota ? 429 : 502);
  }
  const partes = g?.candidates?.[0]?.content?.parts || [];
  const img = partes.find((p: any) => p.inlineData || p.inline_data);
  const b64 = img?.inlineData?.data || img?.inline_data?.data;
  if (!b64) return responder({ error: 'La IA no quiso dibujar esta foto. Prueba con otra: de frente, con buena luz y solo tú.' }, 422);
  const tipo = img?.inlineData?.mimeType || img?.inline_data?.mime_type || 'image/png';

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ruta = `${quien.user.id}/${local_id}-${Date.now()}.${tipo.includes('jpeg') ? 'jpg' : 'png'}`;
  const sube = await servidor.storage.from('caserito-retratos').upload(ruta, bytes, { contentType: tipo, upsert: true });
  if (sube.error) return responder({ error: sube.error.message }, 500);
  const { data: pub } = servidor.storage.from('caserito-retratos').getPublicUrl(ruta);

  const { error: e2 } = await servidor.from('retratos').upsert({ usuario_id: quien.user.id, local_id, imagen_url: pub.publicUrl, creado_at: new Date().toISOString() });
  if (e2) return responder({ error: e2.message }, 500);

  return responder({ imagen_url: pub.publicUrl });
});
