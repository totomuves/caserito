import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { formatoPrecio } from './frases.js';
import { Estrellas } from './Admin.jsx';

const HORAS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

export default function Resultados({ local }) {
  const [drops, setDrops] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const desde = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('drops')
        .select('id, titulo, tipo, precio, cupo, frase, creado_at, termina_at, participaciones(anotado_at, canjeado_at)')
        .eq('local_id', local.id)
        .gte('creado_at', desde)
        .order('creado_at', { ascending: false });
      if (error) setError(explicar(error)); else setDrops(data);
    })();
  }, [local.id]);

  if (error) return <div className="contenido"><div className="error">{error}</div></div>;
  if (!drops) return <div className="contenido"><p className="ayuda">Cargando…</p></div>;

  let anotados = 0, canjes = 0, ventas = 0;
  const porHora = Object.fromEntries(HORAS.map((h) => [h, 0]));
  const porDrop = drops.map((d) => {
    const ps = d.participaciones || [];
    const c = ps.filter((p) => p.canjeado_at);
    anotados += ps.length;
    canjes += c.length;
    ventas += (d.precio || 0) * c.length;
    c.forEach((p) => { const h = new Date(p.canjeado_at).getHours(); if (h in porHora) porHora[h] += 1; });
    return { ...d, anotados: ps.length, canjes: c.length };
  });
  const max = Math.max(1, ...Object.values(porHora));
  const conCanjes = HORAS.filter((h) => porHora[h] > 0);
  const muerta = conCanjes.length >= 3 ? HORAS.filter((h) => h >= conCanjes[0] && h <= conCanjes[conCanjes.length - 1]).sort((a, b) => porHora[a] - porHora[b])[0] : null;
  const mejor = porDrop.filter((d) => d.anotados > 0).sort((a, b) => b.canjes / b.anotados - a.canjes / a.anotados)[0];

  return (
    <div className="contenido">
      <h1 className="letrista">ESTA SEMANA</h1>
      {drops.length === 0 && <div className="tarjeta">Todavía no sueltas drops esta semana. Parte por uno en tu hora más tranquila.</div>}

      <div className="pizarra">
        <span className="etiqueta">Te trajo Caserito</span>
        <span className="precio" style={{ fontSize: 38 }}>{formatoPrecio(ventas) || '$0'}</span>
        <span style={{ fontSize: 13 }}>{canjes} ventas en {drops.length} drops</span>
      </div>

      <div className="stats">
        <div className="stat"><b>{drops.length}</b><span>drops</span></div>
        <div className="stat"><b>{anotados}</b><span>se anotaron</span></div>
        <div className="stat" style={{ background: 'var(--amarillo)' }}><b>{canjes}</b><span style={{ color: 'var(--negro)' }}>canjearon</span></div>
      </div>

      <div className="tarjeta">
        <b>¿A qué hora llegan?</b>
        <div className="barras">
          {HORAS.map((h) => (
            <div key={h} title={`${h}:00 · ${porHora[h]}`} style={{ height: Math.max(6, (porHora[h] / max) * 110) + 'px', background: h === muerta ? 'var(--rojo)' : undefined }} />
          ))}
        </div>
        <div className="etiquetas-horas">{HORAS.map((h) => <span key={h}>{h}</span>)}</div>
        {muerta !== null
          ? <p className="ayuda">Tu hora más tranquila es a las <b>{muerta}:00</b>. Suelta ahí tu próximo drop.</p>
          : <p className="ayuda">Con más canjes te mostramos tu hora más tranquila.</p>}
      </div>

      {mejor && (
        <div className="tarjeta">
          <span style={{ fontSize: 12, fontWeight: 800, color: '#C20826', textTransform: 'uppercase' }}>La frase que más funcionó</span>
          <span className="letrista" style={{ fontSize: 17 }}>“{mejor.frase || mejor.titulo}”</span>
          <span className="ayuda">{mejor.canjes} de {mejor.anotados} anotados canjearon</span>
        </div>
      )}

      <ResenasLocal local={local} />

      {porDrop.map((d) => (
        <div className="tarjeta" key={d.id}>
          <b>{d.titulo}</b>
          <span className="ayuda">{d.tipo} · {d.canjes} canjes de {d.cupo} · {d.anotados} anotados · terminó {new Date(d.termina_at).toLocaleString('es-CL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      ))}
    </div>
  );
}

function ResenasLocal({ local }) {
  const [resenas, setResenas] = useState(null);
  const [nota, setNota] = useState(null);
  const [borrador, setBorrador] = useState({});
  const [msg, setMsg] = useState('');

  async function cargar() {
    const r = await supabase.from('resenas').select('id, estrellas, texto, respuesta, oculta, creado_at')
      .eq('local_id', local.id).order('creado_at', { ascending: false }).limit(50);
    const c = await supabase.from('calificaciones').select('promedio, cantidad').eq('local_id', local.id).maybeSingle();
    if (r.error) setMsg(explicar(r.error)); else setResenas(r.data);
    setNota(c.data || null);
  }
  useEffect(() => { cargar(); }, [local.id]);

  async function responder(id) {
    const { error } = await supabase.rpc('responder_resena', { p_resena: id, p_respuesta: borrador[id] || '' });
    if (error) setMsg(explicar(error)); else { setBorrador({ ...borrador, [id]: undefined }); cargar(); }
  }

  if (!resenas) return null;
  return (
    <div className="tarjeta">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <b>Reseñas de tus caseritos</b>
        {nota && <span><Estrellas n={Math.round(nota.promedio)} /> {nota.promedio} ({nota.cantidad})</span>}
      </div>
      <p className="ayuda">Solo pueden reseñar quienes canjearon en tu local: son reseñas verificadas.</p>
      {msg && <div className="error">{msg}</div>}
      {resenas.length === 0 && <p className="ayuda">Todavía no tienes reseñas.</p>}
      {resenas.map((r) => (
        <div key={r.id} style={{ borderTop: '2px dashed #CDBF9F', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6, opacity: r.oculta ? 0.5 : 1 }}>
          <Estrellas n={r.estrellas} />
          {r.texto && <span>{r.texto}</span>}
          {r.respuesta ? (
            <span className="ayuda">Tu respuesta: {r.respuesta}</span>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input aria-label="Responder reseña" placeholder="Responder…" value={borrador[r.id] || ''}
                onChange={(e) => setBorrador({ ...borrador, [r.id]: e.target.value })}
                style={{ flex: 1, height: 42, borderRadius: 12, border: '2px solid var(--negro)', background: '#fff', padding: '0 12px' }} maxLength={280} />
              <button className="pildora activa" onClick={() => responder(r.id)} disabled={!borrador[r.id]}>Enviar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
