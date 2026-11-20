import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';

// Equipo del local: solo el dueño. Roles con permisos, personas e invitaciones.
export const PERMISOS = [
  { id: 'drops', texto: 'Crear y editar drops', ayuda: 'Soltar, editar, duplicar y terminar drops.' },
  { id: 'escanear', texto: 'Escanear QR', ayuda: 'Canjear el código de los caseritos en la caja.' },
  { id: 'resultados', texto: 'Ver resultados', ayuda: 'Cuántos vieron, se anotaron y canjearon.' },
  { id: 'resenas', texto: 'Responder reseñas', ayuda: 'Ver y contestar lo que opinan los clientes.' },
  { id: 'local', texto: 'Editar el local', ayuda: 'Nombre, logo, categorías y ubicación.' },
];
const textoPermiso = (id) => (PERMISOS.find((p) => p.id === id) || { texto: id }).texto;

export default function Equipo({ local, alCerrar }) {
  const [roles, setRoles] = useState(null);
  const [gente, setGente] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(null); // rol que se edita o {} para uno nuevo

  async function cargar() {
    const [r, g, i] = await Promise.all([
      supabase.rpc('roles_del_local', { p_local: local.id }),
      supabase.rpc('equipo_del_local', { p_local: local.id }),
      supabase.rpc('invitaciones_del_local', { p_local: local.id }),
    ]);
    const e = r.error || g.error || i.error;
    if (e) { setError(explicar(e)); return; }
    setError(''); setRoles(r.data || []); setGente(g.data || []); setInvitaciones(i.data || []);
  }
  useEffect(() => { cargar(); }, [local.id]);

  async function llamar(fn, args) {
    const { error } = await supabase.rpc(fn, args);
    if (error) { setError(explicar(error)); return false; }
    await cargar();
    return true;
  }

  return (
    <div className="contenido">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h1 className="letrista">MI EQUIPO</h1>
        <button className="pildora" onClick={alCerrar}>Volver</button>
      </div>
      <p className="ayuda">Suma a tu gente con un link. Cada persona entra con su propio correo y solo ve lo que su rol le permite. Tú, como dueño, puedes hacer todo.</p>
      {error && <div className="error" role="alert">{error}</div>}
      {!roles ? <p className="ayuda">Cargando…</p> : (
        <>
          <Invitar local={local} roles={roles} alCrear={cargar} />

          <h2 className="letrista">PERSONAS</h2>
          {gente.length === 0 && <div className="tarjeta"><span className="ayuda">Todavía no hay nadie en tu equipo. Invita a alguien con el link de arriba.</span></div>}
          {gente.map((p) => (
            <div className="tarjeta" key={p.usuario_id}>
              <b style={{ wordBreak: 'break-all' }}>{p.correo || 'Sin correo'}</b>
              <span className="ayuda">En el equipo desde el {new Date(p.desde).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</span>
              <label className="campo">Rol
                <select value={p.rol_id} onChange={(e) => llamar('cambiar_rol_equipo', { p_local: local.id, p_usuario: p.usuario_id, p_rol: e.target.value })}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </label>
              <QuitarBoton texto="Sacar del equipo" pregunta={`¿Sacar a ${p.correo || 'esta persona'} del equipo?`}
                alConfirmar={() => llamar('quitar_del_equipo', { p_local: local.id, p_usuario: p.usuario_id })} />
            </div>
          ))}

          {invitaciones.length > 0 && (
            <>
              <h2 className="letrista">LINKS SIN USAR</h2>
              {invitaciones.map((i) => (
                <div className="tarjeta" key={i.codigo}>
                  <b>{i.rol}</b>
                  <span className="ayuda">Vence el {new Date(i.expira_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</span>
                  <CopiarLink codigo={i.codigo} local={local} rol={i.rol} />
                  <QuitarBoton texto="Anular link" pregunta="¿Anular este link? Ya no va a servir." alConfirmar={() => llamar('anular_invitacion_equipo', { p_codigo: i.codigo })} />
                </div>
              ))}
            </>
          )}

          <h2 className="letrista">ROLES Y PERMISOS</h2>
          <p className="ayuda">Crea los roles que necesites y marca qué puede hacer cada uno. Si cambias un rol, cambia para todos los que lo tienen.</p>
          {roles.map((r) => (editando && editando.id === r.id ? (
            <EditarRol key={r.id} local={local} rol={r} alGuardar={async () => { setEditando(null); await cargar(); }} alCancelar={() => setEditando(null)} />
          ) : (
            <div className="tarjeta" key={r.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <b>{r.nombre}</b>
                <span className="ayuda">{r.miembros} {Number(r.miembros) === 1 ? 'persona' : 'personas'}</span>
              </div>
              <span>{r.permisos.map(textoPermiso).join(' · ')}</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="pildora" onClick={() => setEditando(r)}>Editar permisos</button>
                {Number(r.miembros) === 0 && (
                  <QuitarBoton texto="Borrar rol" pregunta={`¿Borrar el rol ${r.nombre}?`} alConfirmar={() => llamar('borrar_rol', { p_local: local.id, p_id: r.id })} />
                )}
              </div>
            </div>
          )))}
          {editando && !editando.id ? (
            <EditarRol local={local} rol={{ nombre: '', permisos: ['escanear'] }} alGuardar={async () => { setEditando(null); await cargar(); }} alCancelar={() => setEditando(null)} />
          ) : (
            <button className="boton" onClick={() => setEditando({})}>+ Crear un rol</button>
          )}
        </>
      )}
    </div>
  );
}

function Invitar({ local, roles, alCrear }) {
  const [rol, setRol] = useState(() => (roles.find((r) => r.nombre === 'Cajero') || roles[0] || {}).id || '');
  const [codigo, setCodigo] = useState(null);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const nombreRol = (roles.find((r) => r.id === rol) || {}).nombre;

  async function crear() {
    setCreando(true); setError('');
    const { data, error } = await supabase.rpc('invitar_al_equipo', { p_local: local.id, p_rol: rol });
    setCreando(false);
    if (error) { setError(explicar(error)); return; }
    setCodigo(data);
    alCrear();
  }

  return (
    <div className="pizarra">
      <span className="etiqueta">Invitar a alguien</span>
      <label className="campo" style={{ color: 'inherit' }}>¿Con qué rol?
        <select value={rol} onChange={(e) => { setRol(e.target.value); setCodigo(null); }}>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
      </label>
      {codigo ? (
        <>
          <span>Listo. Mándale este link: sirve una sola vez y dura 7 días.</span>
          <CopiarLink codigo={codigo} local={local} rol={nombreRol} />
          <button className="pildora" style={{ alignSelf: 'flex-start' }} onClick={() => setCodigo(null)}>Crear otro link</button>
        </>
      ) : (
        <button className="boton" disabled={!rol || creando} onClick={crear}>{creando ? 'Creando…' : 'Crear link de invitación'}</button>
      )}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

function CopiarLink({ codigo, local, rol }) {
  const [copiado, setCopiado] = useState(false);
  const link = `${window.location.origin}/?equipo=${codigo}`;
  const texto = `Hola! Te invito al equipo de ${local.nombre} en Caserito${rol ? ` como ${rol}` : ''}. Entra con este link y crea tu cuenta: ${link}`;
  async function copiar() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* nada */ }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <code style={{ wordBreak: 'break-all', background: 'var(--papel)', color: 'var(--negro)', border: '2px solid var(--negro)', borderRadius: 12, padding: '8px 10px', fontSize: 13 }}>{link}</code>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="pildora" onClick={copiar}>{copiado ? '¡Copiado!' : 'Copiar link'}</button>
        <a className="pildora" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'var(--negro)' }}
          href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">Mandar por WhatsApp</a>
      </div>
    </div>
  );
}

function EditarRol({ local, rol, alGuardar, alCancelar }) {
  const [nombre, setNombre] = useState(rol.nombre);
  const [permisos, setPermisos] = useState(rol.permisos);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function alternar(id) {
    setPermisos(permisos.includes(id) ? permisos.filter((p) => p !== id) : [...permisos, id]);
  }
  async function guardar(e) {
    e.preventDefault();
    setGuardando(true); setError('');
    const { error } = await supabase.rpc('guardar_rol', { p_local: local.id, p_id: rol.id || null, p_nombre: nombre, p_permisos: permisos });
    setGuardando(false);
    if (error) setError(explicar(error)); else alGuardar();
  }

  return (
    <form className="tarjeta" onSubmit={guardar} style={{ borderColor: 'var(--azul)' }}>
      <label className="campo">Nombre del rol
        <input value={nombre} maxLength={30} required placeholder="Ej: Cajero, Barista, Encargado de turno" onChange={(e) => setNombre(e.target.value)} />
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>¿Qué puede hacer?</legend>
        {PERMISOS.map((p) => (
          <label key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minHeight: 44, cursor: 'pointer' }}>
            <input type="checkbox" checked={permisos.includes(p.id)} onChange={() => alternar(p.id)} style={{ width: 22, height: 22, marginTop: 2, accentColor: 'var(--negro)' }} />
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <b>{p.texto}</b>
              <span className="ayuda">{p.ayuda}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {error && <div className="error" role="alert">{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="boton" disabled={guardando || !nombre.trim() || permisos.length === 0}>{guardando ? 'Guardando…' : 'Guardar rol'}</button>
        <button type="button" className="pildora" onClick={alCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

function QuitarBoton({ texto, pregunta, alConfirmar }) {
  const [seguro, setSeguro] = useState(false);
  if (!seguro) return <button className="pildora" style={{ alignSelf: 'flex-start' }} onClick={() => setSeguro(true)}>{texto}</button>;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontWeight: 700 }}>{pregunta}</span>
      <button className="pildora roja activa" onClick={async () => { await alConfirmar(); setSeguro(false); }}>Sí</button>
      <button className="pildora" onClick={() => setSeguro(false)}>No</button>
    </div>
  );
}
