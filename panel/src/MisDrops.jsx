import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { formatoPrecio } from './frases.js';

const TIPO = { normal: 'Normal', grupal: 'Grupal', sorpresa: 'Sorpresa', recien_llegado: 'Recién llegado' };

export default function MisDrops({ local, alEditar, alDuplicar, aviso }) {
  const [drops, setDrops] = useState(null);
  const [msg, setMsg] = useState(aviso || '');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  async function cargar() {
    const desde = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase.from('drops')
      .select('id, tipo, titulo, precio, precio_normal, cupo, frase, foto_url, inicia_at, termina_at, participaciones(canjeado_at)')
      .eq('local_id', local.id).gte('termina_at', desde).order('termina_at', { ascending: false });
    if (error) setError(explicar(error));
    else setDrops((data || []).map((d) => ({
      ...d,
      anotados: (d.participaciones || []).length,
      canjes: (d.participaciones || []).filter((p) => p.canjeado_at).length,
    })));
  }
  useEffect(() => { cargar(); }, [local.id]);
  // Estadísticas (SQL 033). Si todavía no está, el panel sigue igual que antes.
  useEffect(() => {
    supabase.rpc('estadisticas_local', { p_local: local.id }).then(({ data, error }) => { if (!error && data) setStats(data); });
  }, [local.id]);

  async function terminar(d) {
    if (!window.confirm(`¿Terminar ahora "${d.titulo}"? Deja de verse al tiro.`)) return;
    setError(''); setMsg('');
    const { error } = await supabase.from('drops').update({ termina_at: new Date().toISOString() }).eq('id', d.id);
    if (error) setError(explicar(error)); else { setMsg('Drop terminado.'); cargar(); }
  }

  async function eliminar(d) {
    if (!window.confirm(`¿Eliminar "${d.titulo}"? No se puede deshacer.`)) return;
    setError(''); setMsg('');
    const { error } = await supabase.from('drops').delete().eq('id', d.id);
    if (error) setError(explicar(error)); else { setMsg('Drop eliminado.'); cargar(); }
  }

  if (error && !drops) return <div className="contenido"><div className="error">{error}</div></div>;
  if (!drops) return <div className="contenido"><p className="ayuda">Cargando…</p></div>;
  const ahora = Date.now();
  const porDrop = {};
  ((stats && stats.drops) || []).forEach((x) => { porDrop[x.id] = x; });
  const semana = ((stats && stats.drops) || []).filter((x) => new Date(x.termina_at).getTime() > ahora - 7 * 24 * 3600 * 1000)
    .reduce((a, x) => ({ vistas: a.vistas + x.vistas, como_llegar: a.como_llegar + x.como_llegar, pedidos: a.pedidos + x.pedidos, canjes: a.canjes + x.canjes }), { vistas: 0, como_llegar: 0, pedidos: 0, canjes: 0 });

  return (
    <div className="contenido lista">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h1 className="letrista">MIS DROPS</h1>
        {stats && <span style={{ background: 'var(--amarillo)', border: '2px solid var(--negro)', padding: '4px 10px', fontWeight: 800, fontSize: 13 }}><span style={{ color: 'var(--rojo)' }}>♥</span> {stats.seguidores} te siguen</span>}
      </div>
      {stats && (
        <div className="pizarra">
          <span className="etiqueta">Últimos 7 días</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, textAlign: 'center' }}>
            {[['vieron', semana.vistas], ['fueron', semana.como_llegar], ['pidieron', semana.pedidos], ['canjearon', semana.canjes]].map(([k, v], i) => (
              <div key={k}><div style={{ fontSize: 24, fontWeight: 900, color: i === 3 ? 'var(--amarillo)' : 'inherit' }}>{v}</div><div style={{ fontSize: 11, fontWeight: 700, color: '#D9CFBC' }}>{k}</div></div>
            ))}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{semana.canjes === 1 ? '1 persona entró al local gracias a Dropper.' : `${semana.canjes} personas entraron al local gracias a Dropper.`}</span>
        </div>
      )}
      {msg && <div className="tarjeta" style={{ borderColor: 'var(--azul)' }}>{msg}</div>}
      {error && <div className="error">{error}</div>}
      {drops.length === 0 && <div className="tarjeta">Todavía no tienes drops en las últimas dos semanas.</div>}
      {drops.map((d) => {
        const vivo = new Date(d.termina_at).getTime() > ahora;
        return (
          <div className="tarjeta" key={d.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b>{d.titulo}</b>
              <span style={{ fontSize: 12, fontWeight: 800, color: vivo ? 'var(--azul)' : 'var(--gris)', whiteSpace: 'nowrap' }}>{!vivo ? 'TERMINADO' : new Date(d.inicia_at).getTime() > ahora ? `PROGRAMADO · ${new Date(d.inicia_at).toLocaleString('es-CL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : 'EN VIVO'}</span>
            </div>
            <span className="ayuda">
              {TIPO[d.tipo]} · {formatoPrecio(d.precio) || 'sin precio'} · {d.canjes}/{d.cupo} canjes · {d.anotados} anotados
              {' · '}{vivo ? 'hasta' : 'terminó'} {new Date(d.termina_at).toLocaleString('es-CL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            {d.frase && <span className="letrista" style={{ fontSize: 15 }}>“{d.frase}”</span>}
            {porDrop[d.id] && <Embudo s={porDrop[d.id]} cupo={d.cupo} />}
            <div className="pildoras">
              <button className="pildora activa" onClick={() => alDuplicar(d)}>Duplicar</button>
              {vivo && <button className="pildora" onClick={() => alEditar(d)}>Editar</button>}
              {vivo && <button className="pildora" onClick={() => terminar(d)}>Terminar ahora</button>}
              {d.anotados === 0 && <button className="pildora" style={{ color: '#C20826', borderColor: '#C20826' }} onClick={() => eliminar(d)}>Eliminar</button>}
            </div>
            {d.anotados > 0 && vivo && <span className="ayuda">Tiene caseritos anotados: en vez de eliminarlo, termínalo.</span>}
          </div>
        );
      })}
    </div>
  );
}

// Cuatro barras: de cuántos lo vieron a cuántos canjearon
function Embudo({ s, cupo }) {
  const max = Math.max(1, s.vistas, s.como_llegar, s.pedidos, s.canjes);
  const filas = [
    ['Lo vieron', s.vistas, 'var(--negro)'],
    ['Cómo llegar', s.como_llegar, 'var(--azul)'],
    ['Lo pidieron', s.pedidos, 'var(--rojo)'],
    ['Canjearon', s.canjes, 'var(--amarillo)'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {filas.map(([nombre, n, color], i) => (
        <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
          <span style={{ width: 88, flexShrink: 0 }}>{nombre}</span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', height: 14, width: `${Math.max(n ? 4 : 0, (n / max) * 100)}%`, background: color, outline: i === 3 ? '2px solid var(--negro)' : 'none', outlineOffset: -2 }} /></span>
          <span style={{ minWidth: 56, textAlign: 'right' }}>{i === 3 ? `${n} de ${cupo}` : n}</span>
        </div>
      ))}
      {s.compartidos ? <span className="ayuda">Lo compartieron {s.compartidos} {s.compartidos === 1 ? 'vez' : 'veces'}</span> : null}
    </div>
  );
}
