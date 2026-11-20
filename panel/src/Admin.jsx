import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { formatoPrecio } from './frases.js';
import { textoCategoria } from './categorias.js';

const SECCIONES = [
  { id: 'resumen', texto: 'Resumen' },
  { id: 'locales', texto: 'Locales' },
  { id: 'drops', texto: 'Drops' },
  { id: 'resenas', texto: 'Reseñas' },
];

export default function Admin() {
  const [seccion, setSeccion] = useState('resumen');
  return (
    <div className="contenido">
      <h1 className="letrista">ADMIN CASERITO</h1>
      <div className="pildoras">
        {SECCIONES.map((s) => (
          <button key={s.id} className={'pildora' + (seccion === s.id ? ' activa' : '')} onClick={() => setSeccion(s.id)}>{s.texto}</button>
        ))}
      </div>
      {seccion === 'resumen' && <Resumen />}
      {seccion === 'locales' && <Locales />}
      {seccion === 'drops' && <Drops />}
      {seccion === 'resenas' && <Resenas />}
    </div>
  );
}

function useCarga(fn, deps = []) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [n, setN] = useState(0);
  useEffect(() => {
    fn().then(({ data, error }) => (error ? setError(explicar(error)) : (setError(''), setDatos(data))));
  }, [...deps, n]);
  return { datos, error, recargar: () => setN(n + 1) };
}

function Resumen() {
  const { datos, error } = useCarga(() => supabase.rpc('admin_resumen'));
  if (error) return <div className="error">{error}</div>;
  if (!datos) return <p className="ayuda">Cargando…</p>;
  const d = datos;
  return (
    <>
      <div className="pizarra">
        <span className="etiqueta">Ventas por Caserito · últimos 7 días</span>
        <span className="precio" style={{ fontSize: 38 }}>{formatoPrecio(d.ventas_semana) || '$0'}</span>
        <span style={{ fontSize: 13 }}>{d.canjes_semana} canjes · {d.canjes_hoy} hoy</span>
      </div>
      <div className="stats">
        <div className="stat"><b>{d.caseritos}</b><span>caseritos</span></div>
        <div className="stat"><b>{d.locales_aprobados}</b><span>locales activos</span></div>
        <div className="stat" style={{ background: d.locales_pendientes ? 'var(--amarillo)' : undefined }}><b>{d.locales_pendientes}</b><span style={{ color: 'var(--negro)' }}>por aprobar</span></div>
        <div className="stat"><b>{d.drops_activos}</b><span>drops ahora</span></div>
        <div className="stat"><b>{d.drops_semana}</b><span>drops semana</span></div>
        <div className="stat"><b>{d.resenas}</b><span>reseñas</span></div>
      </div>
    </>
  );
}

function Locales() {
  const { datos, error, recargar } = useCarga(() => supabase.from('locales')
    .select('id, nombre, categoria, categorias, cocina_pais, direccion, aprobado, activo, creado_at')
    .order('aprobado').order('creado_at', { ascending: false }));
  const [msg, setMsg] = useState('');

  async function cambiar(l, campos) {
    setMsg('');
    const { error } = await supabase.from('locales').update(campos).eq('id', l.id);
    if (error) setMsg(explicar(error)); else recargar();
  }

  if (error) return <div className="error">{error}</div>;
  if (!datos) return <p className="ayuda">Cargando…</p>;
  return (
    <>
      {msg && <div className="error">{msg}</div>}
      {datos.length === 0 && <div className="tarjeta">Todavía no se inscribe ningún local.</div>}
      {datos.map((l) => (
        <div className="tarjeta" key={l.id} style={{ borderColor: l.aprobado ? 'var(--negro)' : 'var(--rojo)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <b>{l.nombre}</b>
            <span style={{ fontSize: 12, fontWeight: 800, color: l.aprobado ? (l.activo ? 'var(--azul)' : 'var(--gris)') : '#C20826' }}>
              {!l.aprobado ? 'POR APROBAR' : l.activo ? 'ACTIVO' : 'PAUSADO'}
            </span>
          </div>
          <span className="ayuda">
            {(l.categorias && l.categorias.length ? l.categorias : [l.categoria]).map(textoCategoria).join(', ')}{l.cocina_pais ? ' · ' + l.cocina_pais : ''}{l.direccion ? ' · ' + l.direccion : ''}
            {' · inscrito ' + new Date(l.creado_at).toLocaleDateString('es-CL')}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {!l.aprobado
              ? <button className="boton" style={{ flex: 1, minHeight: 44 }} onClick={() => cambiar(l, { aprobado: true })}>Aprobar</button>
              : <button className="pildora" style={{ flex: 1 }} onClick={() => cambiar(l, { activo: !l.activo })}>{l.activo ? 'Pausar' : 'Reactivar'}</button>}
          </div>
        </div>
      ))}
    </>
  );
}

function Drops() {
  const { datos, error, recargar } = useCarga(() => supabase.from('drops')
    .select('id, titulo, tipo, precio, cupo, frase, inicia_at, termina_at, locales(nombre), participaciones(canjeado_at)')
    .gte('termina_at', new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString())
    .order('termina_at', { ascending: false }));
  const [msg, setMsg] = useState('');

  async function bajar(d) {
    if (!window.confirm(`¿Bajar el drop "${d.titulo}"? Deja de verse al tiro.`)) return;
    const { error } = await supabase.from('drops').update({ termina_at: new Date().toISOString() }).eq('id', d.id);
    if (error) setMsg(explicar(error)); else recargar();
  }

  if (error) return <div className="error">{error}</div>;
  if (!datos) return <p className="ayuda">Cargando…</p>;
  const ahora = Date.now();
  return (
    <>
      {msg && <div className="error">{msg}</div>}
      {datos.length === 0 && <div className="tarjeta">No hay drops en los últimos 2 días.</div>}
      {datos.map((d) => {
        const vivo = new Date(d.termina_at).getTime() > ahora;
        const canjes = (d.participaciones || []).filter((p) => p.canjeado_at).length;
        return (
          <div className="tarjeta" key={d.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b>{d.titulo}</b>
              <span style={{ fontSize: 12, fontWeight: 800, color: vivo ? 'var(--azul)' : 'var(--gris)' }}>{vivo ? 'EN VIVO' : 'TERMINADO'}</span>
            </div>
            <span className="ayuda">{d.locales ? d.locales.nombre : ''} · {d.tipo} · {formatoPrecio(d.precio)} · {canjes}/{d.cupo} canjes</span>
            {d.frase && <span className="letrista" style={{ fontSize: 15 }}>“{d.frase}”</span>}
            {vivo && <button className="pildora" onClick={() => bajar(d)}>Bajar drop</button>}
          </div>
        );
      })}
    </>
  );
}

function Resenas() {
  const { datos, error, recargar } = useCarga(() => supabase.from('resenas')
    .select('id, estrellas, texto, respuesta, oculta, creado_at, locales(nombre)')
    .order('creado_at', { ascending: false }).limit(100));
  const [msg, setMsg] = useState('');

  async function alternar(r) {
    const { error } = await supabase.from('resenas').update({ oculta: !r.oculta }).eq('id', r.id);
    if (error) setMsg(explicar(error)); else recargar();
  }

  if (error) return <div className="error">{error}</div>;
  if (!datos) return <p className="ayuda">Cargando…</p>;
  return (
    <>
      {msg && <div className="error">{msg}</div>}
      {datos.length === 0 && <div className="tarjeta">Todavía no hay reseñas.</div>}
      {datos.map((r) => (
        <div className="tarjeta" key={r.id} style={{ opacity: r.oculta ? 0.6 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <b>{r.locales ? r.locales.nombre : ''}</b>
            <Estrellas n={r.estrellas} />
          </div>
          {r.texto && <span>{r.texto}</span>}
          {r.respuesta && <span className="ayuda">Respuesta del local: {r.respuesta}</span>}
          <button className="pildora" onClick={() => alternar(r)}>{r.oculta ? 'Mostrar de nuevo' : 'Ocultar reseña'}</button>
        </div>
      ))}
    </>
  );
}

export function Estrellas({ n }) {
  return (
    <span aria-label={`${n} de 5 estrellas`} style={{ color: 'var(--rojo)', fontWeight: 800, letterSpacing: 1, whiteSpace: 'nowrap' }}>
      {'★'.repeat(n)}<span style={{ color: '#CDBF9F' }}>{'★'.repeat(5 - n)}</span>
    </span>
  );
}
