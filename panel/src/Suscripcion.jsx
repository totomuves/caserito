import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';

// Mi suscripción: plan mensual de Droper pagado con tarjeta en Flow (cargo automático)
const PRECIO = '$10.000 al mes';
const TEXTO = {
  sin_suscripcion: 'Sin suscripción',
  tarjeta_pendiente: 'Falta registrar tu tarjeta',
  activa: 'Activa ✓',
  morosa: 'Pago pendiente',
  cancelada: 'Cancelada',
};

export default function Suscripcion({ local }) {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  const [cargando, setCargando] = useState(false);

  async function leer(conFlow) {
    const r = await supabase.rpc('mi_suscripcion', { p_local: local.id });
    if (r.error) { if (!/mi_suscripcion/.test(r.error.message || '')) setMsg(explicar(r.error)); setS(false); return; }
    setS(r.data);
    if (conFlow && r.data && r.data.estado !== 'sin_suscripcion') {
      const f = await supabase.functions.invoke('flow', { body: { accion: 'estado', local_id: local.id } });
      if (!f.error) { const r2 = await supabase.rpc('mi_suscripcion', { p_local: local.id }); if (!r2.error) setS(r2.data); }
    }
  }
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('suscripcion');
    if (p === 'ok') setMsg('¡Listo! Tu tarjeta quedó registrada y la suscripción está activa.');
    if (p === 'error') setMsg('No se pudo registrar la tarjeta. Inténtalo de nuevo.');
    if (p) window.history.replaceState(null, '', window.location.pathname);
    leer(true);
  }, [local.id]);

  async function suscribirme() {
    setCargando(true); setMsg('');
    const { data, error } = await supabase.functions.invoke('flow', { body: { accion: 'iniciar', local_id: local.id } });
    setCargando(false);
    if (!error && data && data.sin_tarjeta) { setMsg(data.mensaje); leer(false); return; }
    if (error || !data || !data.url) {
      let detalle = (data && data.error) || '';
      if (!detalle && error && error.context && typeof error.context.json === 'function') { try { detalle = (await error.context.json()).error || ''; } catch (e) { /* sin cuerpo */ } }
      if (!detalle && error && /Failed to send a request/i.test(error.message || '')) detalle = 'La función "flow" no responde: revisa que esté creada en Supabase (Edge Functions) con ese nombre exacto y con "Verify JWT" apagado.';
      setMsg(detalle || (error && error.message) || 'No se pudo abrir Flow. Inténtalo en un rato.');
      return;
    }
    window.location.href = data.url; // Flow: registro de tarjeta
  }

  if (s === null || s === false) return null; // sin el SQL 030 todavía: no se muestra
  const hoy = new Date().toISOString().slice(0, 10);
  const gratis = s.gratis_hasta && s.gratis_hasta >= hoy;
  const fecha = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="tarjeta" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <b className="letrista" style={{ fontSize: 20 }}>MI SUSCRIPCIÓN</b>
        <span className="pildora" style={{ background: s.estado === 'activa' ? '#FFD100' : s.estado === 'morosa' ? '#E30A2F' : '#fff', color: s.estado === 'morosa' ? '#fff' : '#111' }}>
          {gratis && s.estado !== 'activa' ? `Gratis hasta el ${fecha(s.gratis_hasta)}` : TEXTO[s.estado] || s.estado}
        </span>
      </div>
      <span>Plan Droper Local · <b>{PRECIO}</b> · se cobra solo a tu tarjeta con Flow. Sin comisión por canje.</span>
      {s.tarjeta && <span className="ayuda">Tarjeta: {s.tarjeta}</span>}
      {s.estado === 'morosa' && <span style={{ fontWeight: 700 }}>Flow no pudo cobrar la última cuota. Revisa tu tarjeta o regístrala de nuevo.</span>}
      {!s.al_dia && <span style={{ fontWeight: 700 }}>Para publicar drops nuevos necesitas la suscripción activa.</span>}
      {s.estado !== 'activa' && (
        <button className="boton" onClick={suscribirme} disabled={cargando}>
          {cargando ? 'Abriendo Flow…' : s.estado === 'morosa' || s.estado === 'cancelada' ? 'Registrar tarjeta de nuevo' : gratis ? 'Dejar lista mi tarjeta' : 'Suscribirme'}
        </button>
      )}
      {msg && <span role="status" style={{ fontWeight: 700 }}>{msg}</span>}
    </div>
  );
}
