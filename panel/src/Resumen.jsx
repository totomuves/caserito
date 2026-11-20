import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { formatoPrecio } from './frases.js';

// Tablero del local: todo en una pantalla (pensado para el computador, funciona en el celular).
// Se actualiza solo cada 20 segundos.
const DIAS = 14;
const TIPO = { normal: 'Normal', grupal: 'Grupal', sorpresa: 'Sorpresa', recien_llegado: 'Recién llegado' };

function mismoDia(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function hora(f) { return new Date(f).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); }
function faltan(f) {
  const m = Math.round((new Date(f).getTime() - Date.now()) / 60000);
  if (m < 60) return `${Math.max(0, m)} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min` : `${Math.floor(h / 24)} días`;
}

export default function Resumen({ local, alCrear }) {
  const [drops, setDrops] = useState(null);
  const [nota, setNota] = useState(null);
  const [error, setError] = useState('');
  const [cuando, setCuando] = useState(null);
  const [, setTic] = useState(0);

  async function cargar() {
    const desde = new Date(Date.now() - DIAS * 24 * 3600 * 1000).toISOString();
    const [d, c] = await Promise.all([
      supabase.from('drops')
        .select('id, titulo, tipo, precio, cupo, inicia_at, termina_at, participaciones(anotado_at, canjeado_at)')
        .eq('local_id', local.id).gte('termina_at', desde).order('inicia_at', { ascending: false }),
      supabase.from('calificaciones').select('promedio, cantidad').eq('local_id', local.id).maybeSingle(),
    ]);
    if (d.error) { setError(explicar(d.error)); return; }
    setError(''); setDrops(d.data || []); setNota(c.data || null); setCuando(new Date());
  }
  useEffect(() => {
    cargar();
    const a = setInterval(cargar, 20000);
    const b = setInterval(() => setTic((x) => x + 1), 5000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [local.id]);

  if (error && !drops) return <div className="contenido"><div className="error">{error}</div></div>;
  if (!drops) return <div className="contenido"><p className="ayuda">Cargando…</p></div>;

  const ahora = new Date();
  const hace7 = Date.now() - 7 * 24 * 3600 * 1000;
  let ventasHoy = 0, canjesHoy = 0, anotadosHoy = 0, ventas7 = 0, canjes7 = 0, porLlegar = 0;
  const canjes = [];
  const porDia = Array.from({ length: DIAS }, (_, i) => { const f = new Date(); f.setHours(0, 0, 0, 0); f.setDate(f.getDate() - (DIAS - 1 - i)); return { f, n: 0 }; });

  const enVivo = [], proximos = [];
  drops.forEach((d) => {
    const ps = d.participaciones || [];
    const c = ps.filter((p) => p.canjeado_at);
    const vivo = new Date(d.inicia_at) <= ahora && new Date(d.termina_at) > ahora;
    if (vivo) { enVivo.push({ ...d, anotados: ps.length, canjes: c.length }); porLlegar += ps.length - c.length; }
    else if (new Date(d.inicia_at) > ahora) proximos.push(d);
    ps.forEach((p) => { if (mismoDia(new Date(p.anotado_at), ahora)) anotadosHoy += 1; });
    c.forEach((p) => {
      const f = new Date(p.canjeado_at);
      canjes.push({ f, titulo: d.titulo, precio: d.precio });
      if (mismoDia(f, ahora)) { canjesHoy += 1; ventasHoy += d.precio || 0; }
      if (f.getTime() > hace7) { canjes7 += 1; ventas7 += d.precio || 0; }
      const dia = porDia.find((x) => mismoDia(x.f, f));
      if (dia) dia.n += 1;
    });
  });
  canjes.sort((a, b) => b.f - a.f);
  proximos.sort((a, b) => new Date(a.inicia_at) - new Date(b.inicia_at));
  const maxDia = Math.max(1, ...porDia.map((x) => x.n));
  const segundos = cuando ? Math.round((Date.now() - cuando.getTime()) / 1000) : 0;

  return (
    <div className="contenido tablero">
      <div className="tablero-titulo">
        <h1 className="letrista">HOY EN {local.nombre.toUpperCase()}</h1>
        <span className="ayuda" aria-live="polite"><span className="en-vivo" aria-hidden="true" /> Se actualiza solo · hace {segundos < 10 ? 'un momento' : `${segundos} s`}</span>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="stats tablero-stats">
        <div className="stat" style={{ background: 'var(--amarillo)' }}><b>{formatoPrecio(ventasHoy) || '$0'}</b><span style={{ color: 'var(--negro)' }}>ventas hoy</span></div>
        <div className="stat"><b>{canjesHoy}</b><span>canjes hoy</span></div>
        <div className="stat"><b>{porLlegar}</b><span>anotados por llegar</span></div>
        <div className="stat"><b>{formatoPrecio(ventas7) || '$0'}</b><span>ventas 7 días</span></div>
        <div className="stat"><b>{canjes7}</b><span>canjes 7 días</span></div>
        <div className="stat"><b>{nota && nota.cantidad ? Number(nota.promedio).toFixed(1) : '–'}</b><span>{nota && nota.cantidad ? `nota · ${nota.cantidad} reseñas` : 'sin reseñas aún'}</span></div>
      </div>

      <div className="tablero-cols">
        <section className="tablero-col" aria-labelledby="t-vivo">
          <h2 id="t-vivo" className="letrista">DROPS EN VIVO</h2>
          {enVivo.length === 0 && (
            <div className="tarjeta">
              <span>No tienes drops en vivo ahora.</span>
              {alCrear && <button className="boton" style={{ alignSelf: 'flex-start' }} onClick={alCrear}>Soltar un drop</button>}
            </div>
          )}
          {enVivo.map((d) => {
            const pct = Math.min(100, Math.round((d.canjes / d.cupo) * 100));
            return (
              <div className="tarjeta" key={d.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b>{d.titulo}</b>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--azul)', whiteSpace: 'nowrap' }}>TERMINA EN {faltan(d.termina_at).toUpperCase()}</span>
                </div>
                <div className="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={d.cupo} aria-valuenow={d.canjes} aria-label={`${d.canjes} de ${d.cupo} canjeados`}>
                  <div style={{ width: pct + '%' }} />
                </div>
                <span className="ayuda">{TIPO[d.tipo] || d.tipo} · {d.canjes} de {d.cupo} canjeados · quedan {Math.max(0, d.cupo - d.canjes)} · {d.anotados - d.canjes} anotados por llegar</span>
              </div>
            );
          })}

          {proximos.length > 0 && (
            <>
              <h2 className="letrista">PRÓXIMOS</h2>
              {proximos.map((d) => (
                <div className="tarjeta" key={d.id}>
                  <b>{d.titulo}</b>
                  <span className="ayuda">Parte en {faltan(d.inicia_at)} · {new Date(d.inicia_at).toLocaleString('es-CL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · cupo {d.cupo}</span>
                </div>
              ))}
            </>
          )}

          <h2 className="letrista">CANJES · ÚLTIMOS {DIAS} DÍAS</h2>
          <div className="tarjeta">
            <div className="barras" aria-hidden="true">
              {porDia.map((x) => (
                <div key={x.f.toISOString()} title={`${x.f.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })} · ${x.n}`}
                  style={{ height: Math.max(6, (x.n / maxDia) * 100) + '%', background: mismoDia(x.f, ahora) ? 'var(--rojo)' : undefined }} />
              ))}
            </div>
            <div className="etiquetas-horas" aria-hidden="true">{porDia.map((x) => <span key={x.f.toISOString()}>{x.f.getDate()}</span>)}</div>
            <p className="ayuda">{porDia.reduce((s, x) => s + x.n, 0)} canjes en {DIAS} días · hoy en rojo.</p>
          </div>
        </section>

        <section className="tablero-col" aria-labelledby="t-ultimos">
          <h2 id="t-ultimos" className="letrista">ÚLTIMOS CANJES</h2>
          <div className="tarjeta">
            {canjes.length === 0 ? <span className="ayuda">Todavía no hay canjes. Cuando un caserito canjee, aparece aquí al tiro.</span> : (
              <ul className="feed">
                {canjes.slice(0, 12).map((c, i) => (
                  <li key={i}>
                    <span className="feed-hora">{mismoDia(c.f, ahora) ? hora(c.f) : c.f.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</span>
                    <span className="feed-texto">{c.titulo}</span>
                    <span className="feed-precio">{formatoPrecio(c.precio) || ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
