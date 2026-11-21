import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import EliminarLocal from './EliminarLocal.jsx';
import ConfigurarLocal from './ConfigurarLocal.jsx';
import { LaminaLocal } from './arteLocal.jsx';
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
  { id: 'barrios', texto: 'Barrios y arte' },
  { id: 'qr', texto: 'QR' },
  { id: 'estilo', texto: 'Estilo de la app' },
];

export default function Admin({ usuario }) {
  const [seccion, setSeccion] = useState('resumen');
  return (
    <div className="contenido">
      <h1 className="letrista">ADMIN CASERITO</h1>
      <div className="pildoras">
        {SECCIONES.map((s) => (
          <button key={s.id} className={'pildora' + (seccion === s.id ? ' activa' : '')} onClick={() => setSeccion(s.id)}>{s.texto}</button>
        ))}
      </div>
      {seccion === 'resumen' && <Resumen irA={setSeccion} />}
      {seccion === 'locales' && <Locales usuario={usuario} />}
      {seccion === 'drops' && <Drops />}
      {seccion === 'resenas' && <Resenas />}
      {seccion === 'comentarios' && <Comentarios />}
      {seccion === 'barrios' && <Barrios />}
      {seccion === 'estilo' && <EstiloApp />}
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

function Resumen({ irA }) {
  const { datos, error } = useCarga(async () => {
    const t = await supabase.rpc('admin_tablero');
    if (!t.error) return { data: { tablero: t.data } };
    const r = await supabase.rpc('admin_resumen'); // sin el SQL 017: el resumen de antes
    return r.error ? r : { data: { viejo: r.data } };
  });
  if (error) return <div className="error">{error}</div>;
  if (!datos) return <p className="ayuda">Cargando…</p>;
  if (datos.viejo) return <ResumenSimple d={datos.viejo} />;
  const { kpis: k, serie, barrios, top_locales: top, alertas } = datos.tablero;
  const cambio = (a, b) => (!b ? (a ? 'nuevo' : '') : `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round(((a - b) / b) * 100))}% vs semana anterior`);
  const maxSerie = Math.max(1, ...(serie || []).map((x) => x.canjes));
  const conv = k.anotados_semana ? Math.round((k.canjes_semana / k.anotados_semana) * 100) : null;
  const nAlertas = (alertas.por_aprobar || []).length + (alertas.dormidos || []).length + (alertas.resenas_bajas || []).length + (alertas.comentarios ? 1 : 0);
  return (
    <>
      <div className="pizarra">
        <span className="etiqueta">Ventas por Caserito · últimos 7 días</span>
        <span className="precio" style={{ fontSize: 38 }}>{formatoPrecio(k.ventas_semana) || '$0'}</span>
        <span style={{ fontSize: 13 }}>{k.canjes_semana} canjes · {k.canjes_hoy} hoy · {cambio(k.canjes_semana, k.canjes_semana_ant)}</span>
      </div>

      <div className="stats">
        <div className="stat"><b>{k.caseritos_semana}</b><span>caseritos esta semana</span></div>
        <div className="stat"><b>{k.caseritos}</b><span>caseritos en total</span></div>
        <div className="stat"><b>{k.caseritos ? Math.round((k.caseritos_vuelven / k.caseritos) * 100) : 0}%</b><span>vuelve a canjear</span></div>
        <div className="stat"><b>{conv === null ? '–' : conv + '%'}</b><span>de los anotados canjea</span></div>
        <div className="stat"><b>{k.con_cuenta}</b><span>con cuenta guardada</span></div>
        <div className="stat"><b>{k.visitas_semana}</b><span>visitas nuevas (7 días)</span></div>
        <div className="stat"><b>{k.locales}</b><span>locales activos</span></div>
        <div className="stat" style={{ background: k.locales_pendientes ? 'var(--amarillo)' : undefined }}><b>{k.locales_pendientes}</b><span style={{ color: 'var(--negro)' }}>por aprobar</span></div>
        <div className="stat"><b>{k.drops_activos}</b><span>drops en vivo</span></div>
        <div className="stat"><b>{k.drops_semana}</b><span>drops (7 días)</span></div>
        <div className="stat"><b>{k.nota ?? '–'}</b><span>nota promedio · {k.resenas} reseñas</span></div>
        <div className="stat"><b>{nAlertas}</b><span>alertas</span></div>
      </div>

      <div className="tablero-cols">
        <section className="tablero-col" aria-labelledby="a-serie">
          <h2 id="a-serie" className="letrista">CANJES · 30 DÍAS</h2>
          <div className="tarjeta">
            <div className="barras" aria-hidden="true">
              {(serie || []).map((x) => <div key={x.dia} title={`${x.dia} · ${x.canjes} canjes · ${formatoPrecio(x.ventas) || '$0'}`} style={{ height: Math.max(4, (x.canjes / maxSerie) * 100) + '%' }} />)}
            </div>
            <div className="etiquetas-horas" aria-hidden="true">{(serie || []).map((x, i) => <span key={x.dia}>{i % 5 ? '' : Number(x.dia.slice(8))}</span>)}</div>
            <p className="ayuda">{(serie || []).reduce((a, x) => a + x.canjes, 0)} canjes y {formatoPrecio((serie || []).reduce((a, x) => a + x.ventas, 0)) || '$0'} en ventas en 30 días.</p>
          </div>

          <h2 className="letrista">BARRIOS</h2>
          <div className="tarjeta">
            <table className="tabla">
              <thead><tr><th scope="col">Barrio</th><th scope="col">Locales</th><th scope="col">En vivo</th><th scope="col">Canjes 7d</th><th scope="col">Ventas 7d</th></tr></thead>
              <tbody>
                {(barrios || []).map((b) => (
                  <tr key={b.id}>
                    <td><b>{b.nombre}</b><span className="ayuda" style={{ display: 'block' }}>{b.comuna}{b.lanzado ? '' : ' · pronto'}{b.pendientes ? ` · ${b.pendientes} por aprobar` : ''}</span></td>
                    <td>{b.locales}</td><td>{b.drops_activos}</td><td>{b.canjes_semana}</td><td>{formatoPrecio(b.ventas_semana) || '$0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="pildora" style={{ alignSelf: 'flex-start' }} onClick={() => irA('barrios')}>Barrios y arte</button>
          </div>

          <h2 className="letrista">LOCALES QUE MÁS MUEVEN · 7 DÍAS</h2>
          <div className="tarjeta">
            {!top || !top.length ? <span className="ayuda">Todavía no hay locales activos.</span> : (
              <table className="tabla">
                <thead><tr><th scope="col">Local</th><th scope="col">Canjes</th><th scope="col">Ventas</th><th scope="col">Drops</th></tr></thead>
                <tbody>
                  {top.map((l, i) => (
                    <tr key={l.id}>
                      <td>{i + 1}. {l.nombre}<span className="ayuda" style={{ display: 'block' }}>{l.barrio}</span></td>
                      <td>{l.canjes}</td><td>{formatoPrecio(l.ventas) || '$0'}</td><td>{l.drops}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="tablero-col" aria-labelledby="a-alertas">
          <h2 id="a-alertas" className="letrista">ALERTAS</h2>
          {nAlertas === 0 && <div className="tarjeta"><span>Todo en orden. ✓</span></div>}
          {(alertas.por_aprobar || []).length > 0 && (
            <div className="tarjeta" style={{ borderColor: 'var(--rojo)' }}>
              <b>{alertas.por_aprobar.length} {alertas.por_aprobar.length === 1 ? 'local espera' : 'locales esperan'} aprobación</b>
              {alertas.por_aprobar.slice(0, 5).map((l) => <span key={l.id}>· {l.nombre}{l.barrio ? ` (${l.barrio})` : ''}</span>)}
              <button className="pildora" style={{ alignSelf: 'flex-start' }} onClick={() => irA('locales')}>Ir a aprobar</button>
            </div>
          )}
          {(alertas.dormidos || []).length > 0 && (
            <div className="tarjeta">
              <b>{alertas.dormidos.length} {alertas.dormidos.length === 1 ? 'local lleva' : 'locales llevan'} 14 días sin soltar drops</b>
              {alertas.dormidos.slice(0, 6).map((l) => <span key={l.id}>· {l.nombre} <span className="ayuda">{l.ultimo_drop ? `(último: ${new Date(l.ultimo_drop).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })})` : '(nunca)'}</span></span>)}
              <span className="ayuda">Escríbeles: un drop en su hora más tranquila suele reactivarlos.</span>
            </div>
          )}
          {(alertas.resenas_bajas || []).length > 0 && (
            <div className="tarjeta">
              <b>Reseñas de 1–2 estrellas (30 días)</b>
              {alertas.resenas_bajas.slice(0, 4).map((r, i) => <span key={i}>· {r.local}: {'★'.repeat(r.estrellas)} {r.texto ? `“${r.texto}”` : ''}</span>)}
              <button className="pildora" style={{ alignSelf: 'flex-start' }} onClick={() => irA('resenas')}>Ver reseñas</button>
            </div>
          )}
          {alertas.comentarios > 0 && (
            <div className="tarjeta">
              <b>{alertas.comentarios} {alertas.comentarios === 1 ? 'comentario' : 'comentarios'} de la beta sin leer</b>
              <button className="pildora" style={{ alignSelf: 'flex-start' }} onClick={() => irA('comentarios')}>Leer</button>
            </div>
          )}
          <p className="ayuda">Caseritos: personas que canjearon al menos una vez. Visitas: teléfonos o navegadores que abrieron la app. No se cuentan locales ni admins.</p>
        </section>
      </div>
    </>
  );
}

function ResumenSimple({ d }) {
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
        <div className="stat"><b>{d.locales_pendientes}</b><span>por aprobar</span></div>
        <div className="stat"><b>{d.drops_activos}</b><span>drops ahora</span></div>
      </div>
      <p className="ayuda">Corre el SQL 017 en Supabase para ver el tablero completo.</p>
    </>
  );
}

function Locales({ usuario }) {
  const { datos, error, recargar } = useCarga(() => supabase.from('locales')
    .select('id, nombre, barrio, categoria, categorias, cocina_pais, direccion, aprobado, activo, creado_at')
    .order('aprobado').order('creado_at', { ascending: false }));
  const [msg, setMsg] = useState('');
  const [creando, setCreando] = useState(false);
  const [entregas, setEntregas] = useState({});
  const cargarEntregas = () => supabase.rpc('entregas_por_local').then(({ data, error: e }) => {
    if (!e) setEntregas(Object.fromEntries((data || []).map((x) => [x.local_id, x])));
  });
  useEffect(() => { cargarEntregas(); }, [datos]);
  const [busca, setBusca] = useState('');
  const [barrio, setBarrio] = useState('');
  const [estado, setEstado] = useState('');

  async function cambiar(l, campos) {
    setMsg('');
    const { error } = await supabase.from('locales').update(campos).eq('id', l.id);
    if (error) setMsg(explicar(error)); else recargar();
  }

  if (error) return <div className="error">{error}</div>;
  if (!datos) return <p className="ayuda">Cargando…</p>;
  if (creando) {
    return (
      <div>
        <div className="tarjeta" style={{ borderColor: 'var(--azul)', marginBottom: 12 }}>
          <b>Crear local para entregarlo después</b>
          <span className="ayuda">Queda a tu nombre mientras lo preparas (datos, ubicación, primer drop). Después generas el link de entrega y el dueño lo recibe con su cuenta.</span>
        </div>
        <ConfigurarLocal usuario={usuario} alGuardar={() => { setCreando(false); recargar(); }} alCancelar={() => setCreando(false)} />
      </div>
    );
  }
  return (
    <>
      {msg && <div className="error">{msg}</div>}
      <button className="boton" style={{ alignSelf: 'flex-start', marginBottom: 12 }} onClick={() => setCreando(true)}>+ Crear local para entregar</button>
      {datos.length === 0 && <div className="tarjeta">Todavía no se inscribe ningún local.</div>}
      {datos.length > 0 && (
        <div className="filtros">
          <label className="campo">Buscar<input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nombre o dirección" /></label>
          <label className="campo">Barrio
            <select value={barrio} onChange={(e) => setBarrio(e.target.value)}>
              <option value="">Todos</option>
              {[...new Set(datos.map((l) => l.barrio).filter(Boolean))].sort().map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="campo">Estado
            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos</option><option value="pendiente">Por aprobar</option><option value="activo">Activos</option><option value="pausado">Pausados</option>
            </select>
          </label>
        </div>
      )}
      {datos.filter((l) => (!busca || `${l.nombre} ${l.direccion || ''}`.toLowerCase().includes(busca.toLowerCase()))
        && (!barrio || l.barrio === barrio)
        && (!estado || (estado === 'pendiente' ? !l.aprobado : estado === 'activo' ? l.aprobado && l.activo : l.aprobado && !l.activo))).map((l) => (
        <div className="tarjeta" key={l.id} style={{ borderColor: l.aprobado ? 'var(--negro)' : 'var(--rojo)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LaminaLocal id={l.id} categoria={l.categoria} tam={34} />{l.nombre}{l.barrio ? <span className="ayuda" style={{ fontWeight: 600 }}> · {l.barrio}</span> : null}</b>
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
          <Entrega local={l} e={entregas[l.id]} alCambiar={cargarEntregas} />
          <EliminarLocal local={l} alEliminar={recargar} />
        </div>
      ))}
    </>
  );
}

// Entregar un local que creó el admin: link para que el dueño lo reciba con su cuenta
function Entrega({ local, e, alCambiar }) {
  const [msg, setMsg] = useState('');
  const [copiado, setCopiado] = useState(false);
  if (!e) return null;
  if (e.usado_at) return <span className="ayuda" style={{ fontWeight: 700, color: 'var(--azul)' }}>✓ Entregado a su dueño el {new Date(e.usado_at).toLocaleDateString('es-CL')}</span>;
  if (!e.dueno_es_admin) return null;
  const vigente = e.codigo && new Date(e.expira_at) > new Date();
  const link = vigente ? `${window.location.origin}/?entrega=${e.codigo}` : '';
  const texto = `¡Hola! Tu local ${local.nombre} ya está en Caserito. Entra con este link, crea tu cuenta y queda a tu nombre: ${link}`;
  async function crear() {
    setMsg('');
    const { error } = await supabase.rpc('crear_entrega', { p_local: local.id });
    if (error) setMsg(explicar(error)); else alCambiar();
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { window.prompt('Copia el link:', link); }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '2px dashed var(--negro)', paddingTop: 8 }}>
      <b style={{ fontSize: 14 }}>Este local está a tu nombre. Entrégaselo a su dueño:</b>
      {vigente ? (
        <>
          <code style={{ fontSize: 13, wordBreak: 'break-all', background: '#fff', border: '2px solid var(--negro)', padding: 6 }}>{link}</code>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="pildora" onClick={copiar}>{copiado ? '¡Copiado!' : 'Copiar link'}</button>
            <a className="pildora" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">Mandar por WhatsApp</a>
            <button className="pildora" onClick={crear}>Link nuevo</button>
          </div>
          <span className="ayuda">Vence el {new Date(e.expira_at).toLocaleDateString('es-CL')}. Cuando el dueño lo abra y entre con su cuenta, el local pasa a su nombre.</span>
        </>
      ) : (
        <button className="boton" style={{ alignSelf: 'flex-start', minHeight: 44 }} onClick={crear}>Crear link de entrega</button>
      )}
      {msg && <div className="error">{msg}</div>}
    </div>
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

// Barrios: lanzarlos y configurar su arte (lo que se gana juntando láminas del barrio)
function Barrios() {
  const { datos, error, recargar } = useCarga(async () => {
    const b = await supabase.from('barrios').select('id, nombre, comuna, lanzado, limites, arte_nombre, arte_descripcion, arte_laminas, arte_local_id, arte_imagen_url').order('orden');
    if (b.error) return b;
    const l = await supabase.from('locales').select('id, nombre, barrio_id').eq('aprobado', true).order('nombre');
    return { data: (b.data || []).map((x) => ({ ...x, locales: (l.data || []).filter((y) => y.barrio_id === x.id) })) };
  });
  if (error) return <div className="error">{error}</div>;
  if (!datos) return <p className="ayuda">Cargando…</p>;
  return (
    <>
      <p className="ayuda">Cada barrio puede tener su arte: una ilustración, póster o serigrafía de un artista del barrio. Quien junta las láminas lo pide en su álbum y lo retira con QR en el local que elijas.</p>
      {datos.map((b) => <BarrioForm key={b.id} b={b} alGuardar={recargar} />)}
    </>
  );
}

function BarrioForm({ b, alGuardar }) {
  const [f, setF] = useState({ lanzado: b.lanzado, arte_nombre: b.arte_nombre || '', arte_descripcion: b.arte_descripcion || '', arte_laminas: b.arte_laminas || '', arte_local_id: b.arte_local_id || '', arte_imagen_url: b.arte_imagen_url || '' });
  const [msg, setMsg] = useState('');
  const cambiar = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function guardar(e) {
    e.preventDefault();
    setMsg('');
    const conArte = f.arte_nombre.trim() && f.arte_laminas;
    const { error } = await supabase.from('barrios').update({
      lanzado: f.lanzado,
      arte_nombre: conArte ? f.arte_nombre.trim() : null,
      arte_descripcion: conArte && f.arte_descripcion.trim() ? f.arte_descripcion.trim() : null,
      arte_laminas: conArte ? Math.min(50, Math.max(2, Number(f.arte_laminas))) : null,
      arte_local_id: conArte && f.arte_local_id ? f.arte_local_id : null,
      arte_imagen_url: conArte && f.arte_imagen_url.trim() ? f.arte_imagen_url.trim() : null,
    }).eq('id', b.id);
    if (error) setMsg(explicar(error)); else { setMsg('Guardado ✓'); alGuardar(); }
  }
  return (
    <form className="tarjeta" onSubmit={guardar}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <b>{b.nombre} <span className="ayuda" style={{ fontWeight: 600 }}>· {b.comuna} · {b.locales.length} locales</span></b>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, fontWeight: 700 }}>
          <input type="checkbox" checked={f.lanzado} onChange={cambiar('lanzado')} style={{ width: 22, height: 22 }} /> Lanzado
        </label>
      </div>
      {b.limites && <span className="ayuda">Límites: {b.limites}</span>}
      <label className="campo">Arte del barrio: hay uno solo y lo gana el primero que junta las láminas (vacío = sin arte; si lo cambias, parte una carrera nueva)
        <input value={f.arte_nombre} maxLength={80} onChange={cambiar('arte_nombre')} placeholder="Ej: Serigrafía de Franklin por un artista del barrio" />
      </label>
      {f.arte_nombre.trim() && (
        <>
          <label className="campo">Descripción (opcional)
            <input value={f.arte_descripcion} maxLength={300} onChange={cambiar('arte_descripcion')} placeholder="Ej: Edición limitada de 100, firmada, tamaño carta" />
          </label>
          <label className="campo">¿Cuántas láminas distintas del barrio pide? (2 a 50)
            <input type="number" min={2} max={50} required value={f.arte_laminas} onChange={cambiar('arte_laminas')} />
          </label>
          <label className="campo">¿Dónde se retira?
            <select value={f.arte_local_id} required onChange={cambiar('arte_local_id')}>
              <option value="">Elige un local del barrio</option>
              {b.locales.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </label>
          <label className="campo">Foto del arte (link a la imagen, opcional)
            <input type="url" value={f.arte_imagen_url} onChange={cambiar('arte_imagen_url')} placeholder="https://…" />
          </label>
        </>
      )}
      {msg && <span role="status" style={{ fontWeight: 700 }}>{msg}</span>}
      <button className="boton">Guardar {b.nombre}</button>
    </form>
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
  const textoWsp = (n, c) => `¡Hola${n ? ' ' + n : ''}! Te invito a Caserito, la app de drops de tu barrio. Inscribe tu local aquí y queda aprobado al tiro: ${link(c)}`;

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


// Estilo gráfico de la app de clientes. Por ahora lo elige el admin para todos.
const ESTILOS = [
  { id: 'clasico', nombre: 'Clásico', desc: 'El primero: letras de pincel, esquinas redondas, olas y brillos.', fondo: '#FFD100', tinta: '#E30A2F', fuente: "'Luckiest Guy', sans-serif", italica: true },
  { id: 'bauhaus', nombre: 'Bauhaus', desc: 'Figuras geométricas, colores planos, esquinas rectas. Drops y láminas en pop art.', fondo: '#1E5AA8', tinta: '#FFD100', fuente: 'Jost, Archivo, sans-serif' },
  { id: 'diario', nombre: 'Diario', desc: 'El Inicio es la portada del diario popular del barrio: titulares, farándula y clasificados.', fondo: '#D7261E', tinta: '#FFFFFF', fuente: 'Anton, Archivo, sans-serif' },
];
function EstiloApp() {
  const [actual, setActual] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    supabase.from('ajustes').select('valor').eq('clave', 'estilo').maybeSingle().then(({ data, error }) => {
      if (error) setMsg('Falta correr el SQL 019 (tabla de ajustes).');
      setActual((data && data.valor) || 'bauhaus');
    });
  }, []);
  async function elegir(id) {
    setMsg('');
    const { error } = await supabase.rpc('fijar_estilo', { p_estilo: id });
    if (error) { setMsg(error.message); return; }
    setActual(id);
    setMsg('Listo. La app de clientes cambia al abrirla de nuevo.');
  }
  return (
    <div className="tarjeta" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 className="letrista" style={{ margin: 0 }}>Estilo de la app</h2>
      <p style={{ margin: 0 }}>Elige cómo se ve la app de clientes. El cambio es para todos.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {ESTILOS.map((e) => (
          <button key={e.id} onClick={() => elegir(e.id)} aria-pressed={actual === e.id}
            style={{ textAlign: 'left', cursor: 'pointer', border: '3px solid #111', borderRadius: e.id === 'clasico' ? 16 : 0, padding: 0, background: '#FFF6E5', boxShadow: actual === e.id ? '6px 6px 0 #111' : 'none', outline: actual === e.id ? '3px solid #E30A2F' : 'none', outlineOffset: 3 }}>
            <div style={{ background: e.fondo, padding: '18px 14px', borderBottom: '3px solid #111', borderRadius: e.id === 'clasico' ? '12px 12px 0 0' : 0 }}>
              <span style={{ fontFamily: e.fuente, fontStyle: e.italica ? 'italic' : 'normal', fontWeight: 800, fontSize: 30, color: e.tinta }}>{e.nombre.toUpperCase()}</span>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 800 }}>{actual === e.id ? '● En uso' : 'Usar este'}</div>
              <div style={{ fontSize: 14 }}>{e.desc}</div>
            </div>
          </button>
        ))}
      </div>
      {msg && <p style={{ margin: 0, fontWeight: 700 }}>{msg}</p>}
    </div>
  );
}
