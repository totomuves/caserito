import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import EliminarLocal from './EliminarLocal.jsx';
import { formatoPrecio } from './frases.js';
import { textoCategoria } from './categorias.js';
import Qr, { URL_APP } from './Qr.jsx';

const SECCIONES = [
  { id: 'resumen', texto: 'Resumen' },
  { id: 'locales', texto: 'Locales' },
  { id: 'drops', texto: 'Drops' },
  { id: 'resenas', texto: 'Reseñas' },
  { id: 'comentarios', texto: 'Comentarios beta' },
  { id: 'invitar', texto: 'Invitar locales' },
  { id: 'qr', texto: 'QR' },
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
      {seccion === 'comentarios' && <Comentarios />}
      {seccion === 'invitar' && <Invitar />}
      {seccion === 'qr' && (
        <Qr url={URL_APP} titulo="CASERITO" archivo="caserito-qr-app.png"
          bajada="QR general de la app para caseritos: one-pager, flyers, redes y el 'último flyer'." />
      )}
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
        <div className="stat"><b>{d.con_cuenta ?? 0}</b><span>con cuenta</span></div>
        <div className="stat"><b>{d.visitas ?? '–'}</b><span>visitas ({d.visitas_semana ?? 0} esta semana)</span></div>
        <div className="stat"><b>{d.locales_aprobados}</b><span>locales activos</span></div>
        <div className="stat" style={{ background: d.locales_pendientes ? 'var(--amarillo)' : undefined }}><b>{d.locales_pendientes}</b><span style={{ color: 'var(--negro)' }}>por aprobar</span></div>
        <div className="stat"><b>{d.drops_activos}</b><span>drops ahora</span></div>
        <div className="stat"><b>{d.drops_semana}</b><span>drops semana</span></div>
        <div className="stat"><b>{d.resenas}</b><span>reseñas</span></div>
      </div>
      <p className="ayuda">Caseritos: se sumaron a al menos un drop. Visitas: teléfonos o navegadores que abrieron la app (cada uno cuenta aparte, también tus pruebas). No se cuentan locales ni admins.</p>
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
          <EliminarLocal local={l} alEliminar={recargar} />
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

function Comentarios() {
  const { datos, error, recargar } = useCarga(() => supabase.from('comentarios')
    .select('id, origen, texto, plataforma, leido, creado_at, perfiles(nombre)')
    .order('creado_at', { ascending: false }).limit(200));
  const [msg, setMsg] = useState('');

  async function marcar(c) {
    const { error } = await supabase.from('comentarios').update({ leido: !c.leido }).eq('id', c.id);
    if (error) setMsg(explicar(error)); else recargar();
  }

  if (error) return <div className="error">{error}</div>;
  if (!datos) return <p className="ayuda">Cargando…</p>;
  const nuevos = datos.filter((c) => !c.leido).length;
  return (
    <>
      {msg && <div className="error">{msg}</div>}
      <p className="ayuda">{datos.length === 0 ? 'Todavía no llegan comentarios.' : `${nuevos} sin leer de ${datos.length}.`}</p>
      {datos.map((c) => (
        <div className="tarjeta" key={c.id} style={{ opacity: c.leido ? 0.6 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <b>{c.origen === 'panel' ? 'Local' : 'Caserito'}{c.perfiles && c.perfiles.nombre ? ` · ${c.perfiles.nombre}` : ''}</b>
            <span className="ayuda">{new Date(c.creado_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{c.plataforma ? ` · ${c.plataforma}` : ''}</span>
          </div>
          <span style={{ whiteSpace: 'pre-wrap' }}>{c.texto}</span>
          <button className="pildora" onClick={() => marcar(c)}>{c.leido ? 'Marcar como no leído' : 'Marcar como leído'}</button>
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

function Invitar() {
  const { datos, error, recargar } = useCarga(() => supabase.from('invitaciones')
    .select('codigo, nombre_local, creada_at, usada_at').order('creada_at', { ascending: false }).limit(50));
  const [nombre, setNombre] = useState('');
  const [msg, setMsg] = useState('');
  const [nueva, setNueva] = useState(null);

  const link = (c) => `${window.location.origin}/?invitacion=${c}`;
  const textoWsp = (n, c) => `¡Hola${n ? ' ' + n : ''}! Te invito a Caserito, la app de drops de Barrio Italia. Inscribe tu local aquí y queda aprobado al tiro: ${link(c)}`;

  async function crear(e) {
    e.preventDefault();
    setMsg('');
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('invitaciones')
      .insert({ nombre_local: nombre.trim() || null, creada_por: u.user.id }).select().single();
    if (error) { setMsg(explicar(error)); return; }
    setNueva(data); setNombre(''); recargar();
  }

  async function copiar(c) {
    try { await navigator.clipboard.writeText(link(c)); setMsg('Link copiado.'); } catch { setMsg(link(c)); }
  }

  if (error) return <div className="error">{error}</div>;
  return (
    <>
      <form className="tarjeta" onSubmit={crear}>
        <b>Nuevo link de invitación</b>
        <p className="ayuda">El local que se inscribe con este link queda aprobado al tiro. Cada link sirve para un local.</p>
        <label className="campo">Nombre del local (opcional, para que lo reconozcas)
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Arepera La Chamita" />
        </label>
        <button className="boton">Crear link</button>
      </form>
      {msg && <div className="tarjeta">{msg}</div>}
      {nueva && (
        <div className="exito">
          <b>Link listo{nueva.nombre_local ? ' para ' + nueva.nombre_local : ''}</b>
          <span style={{ wordBreak: 'break-all', fontSize: 13 }}>{link(nueva.codigo)}</span>
          <div className="pildoras">
            <a className="pildora" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              href={`https://wa.me/?text=${encodeURIComponent(textoWsp(nueva.nombre_local, nueva.codigo))}`} target="_blank" rel="noreferrer">Mandar por WhatsApp</a>
            <button className="pildora" onClick={() => copiar(nueva.codigo)}>Copiar link</button>
          </div>
        </div>
      )}
      {datos && datos.map((i) => (
        <div className="tarjeta" key={i.codigo} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span><b>{i.nombre_local || 'Sin nombre'}</b><br /><span className="ayuda">{i.codigo} · {new Date(i.creada_at).toLocaleDateString('es-CL')}</span></span>
          {i.usada_at
            ? <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--azul)' }}>USADA</span>
            : <button className="pildora" onClick={() => copiar(i.codigo)}>Copiar</button>}
        </div>
      ))}
    </>
  );
}
