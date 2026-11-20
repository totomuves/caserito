import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { formatoPrecio } from './frases.js';

const TIPO = { normal: 'Normal', grupal: 'Grupal', sorpresa: 'Sorpresa', recien_llegado: 'Recién llegado' };

export default function MisDrops({ local, alEditar, alDuplicar, aviso }) {
  const [drops, setDrops] = useState(null);
  const [msg, setMsg] = useState(aviso || '');
  const [error, setError] = useState('');

  async function cargar() {
    const desde = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase.from('drops')
      .select('id, tipo, titulo, precio, precio_normal, cupo, frase, inicia_at, termina_at, participaciones(canjeado_at)')
      .eq('local_id', local.id).gte('termina_at', desde).order('termina_at', { ascending: false });
    if (error) setError(explicar(error));
    else setDrops((data || []).map((d) => ({
      ...d,
      anotados: (d.participaciones || []).length,
      canjes: (d.participaciones || []).filter((p) => p.canjeado_at).length,
    })));
  }
  useEffect(() => { cargar(); }, [local.id]);

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

  return (
    <div className="contenido lista">
      <h1 className="letrista">MIS DROPS</h1>
      {msg && <div className="tarjeta" style={{ borderColor: 'var(--azul)' }}>{msg}</div>}
      {error && <div className="error">{error}</div>}
      {drops.length === 0 && <div className="tarjeta">Todavía no tienes drops en las últimas dos semanas.</div>}
      {drops.map((d) => {
        const vivo = new Date(d.termina_at).getTime() > ahora;
        return (
          <div className="tarjeta" key={d.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b>{d.titulo}</b>
              <span style={{ fontSize: 12, fontWeight: 800, color: vivo ? 'var(--azul)' : 'var(--gris)', whiteSpace: 'nowrap' }}>{vivo ? 'EN VIVO' : 'TERMINADO'}</span>
            </div>
            <span className="ayuda">
              {TIPO[d.tipo]} · {formatoPrecio(d.precio) || 'sin precio'} · {d.canjes}/{d.cupo} canjes · {d.anotados} anotados
              {' · '}{vivo ? 'hasta' : 'terminó'} {new Date(d.termina_at).toLocaleString('es-CL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            {d.frase && <span className="letrista" style={{ fontSize: 15 }}>“{d.frase}”</span>}
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
