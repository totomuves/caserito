// Dropper · Suscripción mensual de los locales con Flow (cargo automático a tarjeta)
//
// Secretos en Supabase → Edge Functions → Secrets:
//   FLOW_API_KEY, FLOW_SECRET_KEY  (Flow → Mis datos → Integración / API)
//   FLOW_PLAN_ID                   (el ID del plan que creaste en Flow → Suscripciones → Planes, ej: droper-local)
//   FLOW_SANDBOX                   ("si" para probar en sandbox.flow.cl; vacío o "no" para producción)
//   PANEL_URL                      (opcional; por defecto https://caserito-yc5f.vercel.app)
// IMPORTANTE: esta función debe tener "Verify JWT" APAGADO (Flow la llama sin sesión). La seguridad va adentro.
//
// Acciones:
//   POST {accion:'iniciar', local_id}  (con la sesión del panel) → crea el cliente en Flow y devuelve la URL para registrar la tarjeta
//   POST ?accion=volver&local=ID       (Flow, al terminar de registrar la tarjeta) → crea la suscripción y vuelve al panel
//   POST {accion:'estado', local_id}   (con la sesión del panel) → sincroniza con Flow y devuelve el estado
//   POST ?accion=aviso                 (Flow: "URL callback" del plan, cuando se paga o falla una cuota) → resincroniza
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
const API_KEY = Deno.env.get('FLOW_API_KEY') || '';
const SECRET = Deno.env.get('FLOW_SECRET_KEY') || '';
const PLAN = Deno.env.get('FLOW_PLAN_ID') || '';
const SANDBOX = (Deno.env.get('FLOW_SANDBOX') || '').toLowerCase() === 'si';
const BASE = SANDBOX ? 'https://sandbox.flow.cl/api' : 'https://www.flow.cl/api';
const PANEL = Deno.env.get('PANEL_URL') || 'https://caserito-yc5f.vercel.app';
const URL_SB = Deno.env.get('SUPABASE_URL')!;
const FUNCION = `${URL_SB}/functions/v1/flow`;

const admin = createClient(URL_SB, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'caserito' } });

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Firma de Flow: parámetros ordenados por nombre, "nombrevalor" concatenados, HMAC-SHA256 en hex con la secretKey
async function firmar(params: Record<string, string>) {
  const cadena = Object.keys(params).sort().map((k) => k + params[k]).join('');
  const llave = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign('HMAC', llave, new TextEncoder().encode(cadena));
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function flow(metodo: 'GET' | 'POST', ruta: string, datos: Record<string, string | number>) {
  const params: Record<string, string> = { apiKey: API_KEY };
  for (const [k, v] of Object.entries(datos)) if (v !== undefined && v !== null && v !== '') params[k] = String(v);
  params.s = await firmar(params);
  const cuerpo = new URLSearchParams(params).toString();
  const r = metodo === 'GET'
    ? await fetch(`${BASE}/${ruta}?${cuerpo}`)
    : await fetch(`${BASE}/${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: cuerpo });
  const t = await r.text();
  let d: any; try { d = JSON.parse(t); } catch { d = { message: t }; }
  if (!r.ok) throw new Error(`Flow ${ruta}: ${d.message || r.status}`);
  return d;
}

// ¿Quién llama? (solo dueño del local o admin)
async function autorizar(req: Request, local: string) {
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const { data: u } = await admin.auth.getUser(token);
  if (!u || !u.user) return null;
  const usuario = createClient(URL_SB, Deno.env.get('SUPABASE_ANON_KEY')!, { db: { schema: 'caserito' }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: s } = await usuario.rpc('mi_suscripcion', { p_local: local });
  return s ? u.user : null;
}

// Lee la suscripción en Flow y la guarda en Dropper
async function sincronizar(local: string) {
  const { data: fila } = await admin.from('suscripciones').select('*').eq('local_id', local).maybeSingle();
  if (!fila) return { estado: 'sin_suscripcion' };
  if (!fila.flow_subscription_id) return fila;
  const s = await flow('GET', 'subscription/get', { subscriptionId: fila.flow_subscription_id });
  // status: 1 activa, 2 en prueba, 4 cancelada (0 = aún no parte) · morose: 1 = con cuotas impagas
  let estado = 'activa';
  if (Number(s.status) === 4) estado = 'cancelada';
  else if (Number(s.morose) === 1) estado = 'morosa';
  else if (![1, 2].includes(Number(s.status))) estado = 'tarjeta_pendiente';
  const nueva = { estado, detalle: s, actualizado_at: new Date().toISOString() };
  await admin.from('suscripciones').update(nueva).eq('local_id', local);
  return { ...fila, ...nueva };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!API_KEY || !SECRET || !PLAN) return json({ error: 'Faltan los secretos de Flow (FLOW_API_KEY, FLOW_SECRET_KEY, FLOW_PLAN_ID).' }, 500);
  const url = new URL(req.url);
  let cuerpo: any = {};
  const tipo = req.headers.get('content-type') || '';
  try {
    if (tipo.includes('application/json')) cuerpo = await req.json();
    else if (req.method === 'POST') cuerpo = Object.fromEntries(new URLSearchParams(await req.text()));
  } catch { cuerpo = {}; }
  const accion = url.searchParams.get('accion') || cuerpo.accion;

  try {
    // 1) El local quiere suscribirse: cliente en Flow + registro de tarjeta
    if (accion === 'iniciar') {
      const local = String(cuerpo.local_id || '');
      const usuario = await autorizar(req, local);
      if (!usuario) return json({ error: 'No tienes permiso para este local.' }, 403);
      const { data: l } = await admin.from('locales').select('id, nombre').eq('id', local).single();
      let { data: fila } = await admin.from('suscripciones').select('*').eq('local_id', local).maybeSingle();
      if (!fila || !fila.flow_customer_id) {
        const c = await flow('POST', 'customer/create', { name: l.nombre, email: usuario.email || cuerpo.email || '', externalId: local });
        await admin.from('suscripciones').upsert({ local_id: local, flow_customer_id: c.customerId, estado: 'tarjeta_pendiente', actualizado_at: new Date().toISOString() });
        fila = { local_id: local, flow_customer_id: c.customerId };
      }
      try {
        const r = await flow('POST', 'customer/register', { customerId: fila.flow_customer_id, url_return: `${FUNCION}?accion=volver&local=${local}` });
        return json({ url: `${r.url}?token=${r.token}` });
      } catch (e) {
        // Sin "Cargo Automático" activado en Flow: suscripción igual, pero Flow manda cada mes un correo con el link de pago
        if (!/automatic charge/i.test(String((e as Error).message))) throw e;
        let subId = fila.flow_subscription_id;
        if (!subId) {
          const s = await flow('POST', 'subscription/create', { planId: PLAN, customerId: fila.flow_customer_id });
          subId = s.subscriptionId;
        }
        await admin.from('suscripciones').update({ flow_subscription_id: subId, tarjeta: 'Pago por correo (Flow)', estado: 'activa', actualizado_at: new Date().toISOString() }).eq('local_id', local);
        await sincronizar(local).catch(() => {});
        return json({ sin_tarjeta: true, mensaje: `Listo: quedaste suscrito. Cada mes Flow te manda un correo a ${usuario.email || 'tu correo'} con el link para pagar.` });
      }
    }

    // 2) Flow devuelve al local después de registrar la tarjeta
    if (accion === 'volver') {
      const local = url.searchParams.get('local') || '';
      const token = cuerpo.token || url.searchParams.get('token') || '';
      let ok = false;
      try {
        const st = await flow('GET', 'customer/getRegisterStatus', { token });
        if (String(st.status) === '1') {
          const { data: fila } = await admin.from('suscripciones').select('*').eq('local_id', local).maybeSingle();
          const tarjeta = [st.creditCardType, st.last4CardDigits ? `···· ${st.last4CardDigits}` : ''].filter(Boolean).join(' ');
          let subId = fila && fila.flow_subscription_id;
          if (!subId) {
            const s = await flow('POST', 'subscription/create', { planId: PLAN, customerId: st.customerId || fila.flow_customer_id });
            subId = s.subscriptionId;
          }
          await admin.from('suscripciones').update({ flow_subscription_id: subId, tarjeta, estado: 'activa', actualizado_at: new Date().toISOString() }).eq('local_id', local);
          await sincronizar(local).catch(() => {});
          ok = true;
        }
      } catch (_) { ok = false; }
      return new Response(null, { status: 302, headers: { Location: `${PANEL}/?suscripcion=${ok ? 'ok' : 'error'}` } });
    }

    // 3) El panel pide el estado (y lo actualiza con Flow)
    if (accion === 'estado') {
      const local = String(cuerpo.local_id || '');
      if (!(await autorizar(req, local))) return json({ error: 'No tienes permiso para este local.' }, 403);
      return json(await sincronizar(local));
    }

    // 4) Aviso de Flow (cuota pagada o rechazada): resincronizamos todas las suscripciones
    if (accion === 'aviso') {
      const { data: filas } = await admin.from('suscripciones').select('local_id').not('flow_subscription_id', 'is', null);
      for (const f of filas || []) await sincronizar(f.local_id).catch(() => {});
      return new Response('ok', { headers: CORS });
    }

    return json({ error: 'Acción desconocida' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
