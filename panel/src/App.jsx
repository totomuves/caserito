import React, { useEffect, useState } from 'react';
import { supabase, explicar, leerInvitacion, olvidarInvitacion, leerInvitacionEquipo, olvidarInvitacionEquipo, leerEntrega, olvidarEntrega } from './supabase.js';
import Equipo from './Equipo.jsx';
import Resumen from './Resumen.jsx';

const TODOS = ['drops', 'escanear', 'resultados', 'resenas', 'local', 'equipo'];
import Login from './Login.jsx';
import ConfigurarLocal from './ConfigurarLocal.jsx';
import Crear from './Crear.jsx';
import Escanear from './Escanear.jsx';
import Resultados from './Resultados.jsx';
import Admin from './Admin.jsx';
import MisDrops from './MisDrops.jsx';
import Ayuda from './Ayuda.jsx';
import Qr, { URL_APP } from './Qr.jsx';

export default function App() {
  const [sesion, setSesion] = useState(undefined);
  const [local, setLocal] = useState(undefined);
  // En el computador parte en el tablero; en el celular, en Crear
  const [pestana, setPestana] = useState(() => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 960px)').matches ? 'resumen' : 'crear'));
  const [error, setError] = useState('');
  const [admin, setAdmin] = useState(false);
  const [soloAdmin, setSoloAdmin] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [editandoLocal, setEditandoLocal] = useState(false);
  const [base, setBase] = useState(null);
  const [aviso, setAviso] = useState('');
  const [avisoInv, setAvisoInv] = useState('');
  const [ayuda, setAyuda] = useState(false);
  const [verQr, setVerQr] = useState(false);
  const [verEquipo, setVerEquipo] = useState(false);
  const [permisos, setPermisos] = useState(TODOS);
  const [rol, setRol] = useState('Dueño');
  const puede = (p) => permisos.includes(p);

  useEffect(() => { leerInvitacion(); leerInvitacionEquipo(); }, []);

  // Si llegó con link de invitación, al tener local se aprueba solo
  useEffect(() => {
    if (!local || local.aprobado || rol !== 'Dueño') return;
    const codigo = leerInvitacion();
    if (!codigo) return;
    supabase.rpc('usar_invitacion', { p_codigo: codigo }).then(async ({ error }) => {
      if (error && /Primero inscribe/.test(error.message)) return;
      olvidarInvitacion();
      if (error) { setAvisoInv(explicar(error)); return; }
      const r = await supabase.from('locales').select('*').eq('id', local.id).single();
      if (r.data) setLocal(r.data);
      setAvisoInv('¡Bienvenido a Caserito! Tu local quedó aprobado y tus drops ya se ven en el mapa.');
    });
  }, [local]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true);
      setSesion(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sesion) { setLocal(undefined); return; }
    (async () => {
      setError('');
      const p = await supabase.rpc('mi_perfil');
      if (p.error) { setError(explicar(p.error)); return; }
      const a = await supabase.rpc('es_admin');
      setAdmin(!a.error && a.data === true);
      // Llegó con link para sumarse al equipo de un local
      const codigoEq = leerInvitacionEquipo();
      if (codigoEq) {
        const u = await supabase.rpc('usar_invitacion_equipo', { p_codigo: codigoEq });
        olvidarInvitacionEquipo();
        setAvisoInv(u.error ? explicar(u.error) : '¡Listo! Ya eres parte del equipo del local.');
      }
      // Llegó con link para recibir un local que creó Caserito
      let recibido = null;
      const codigoEnt = leerEntrega();
      if (codigoEnt) {
        const r = await supabase.rpc('recibir_local', { p_codigo: codigoEnt });
        olvidarEntrega();
        if (r.error) setAvisoInv(explicar(r.error));
        else { recibido = r.data; setAvisoInv('¡Listo! El local quedó a tu nombre. Revisa los datos y suelta tu primer drop.'); }
      }
      // Mis locales: como dueño o como parte de un equipo
      const m = await supabase.rpc('mis_locales');
      if (m.error) {
        // Sin el SQL 011 todavía: solo dueños, como antes
        const { data, error } = await supabase.from('locales').select('*').eq('dueno_id', sesion.user.id).limit(1).maybeSingle();
        if (error) { setError(explicar(error)); return; }
        setPermisos(TODOS); setRol('Dueño'); setLocal(data || null);
        return;
      }
      const filas = m.data || [];
      const fila = (recibido && filas.find((f) => f.local_id === recibido)) || filas.find((f) => f.rol === 'Dueño') || filas[0];
      if (!fila) { setPermisos(TODOS); setRol('Dueño'); setLocal(null); return; }
      const l = await supabase.from('locales').select('*').eq('id', fila.local_id).single();
      if (l.error) { setError(explicar(l.error)); return; }
      setPermisos(fila.permisos || []); setRol(fila.rol); setLocal(l.data);
    })();
  }, [sesion]);

  if (sesion === undefined) return <Cargando />;
  if (recuperando && sesion) return <NuevaClave alTerminar={() => setRecuperando(false)} />;
  if (!sesion) return <Login />;
  if (error) return <Marco><div className="contenido"><div className="error">{error}</div></div></Marco>;
  if (local === undefined) return <Cargando />;
  if (admin && (soloAdmin || !local)) {
    return (
      <Marco>
        <Admin usuario={sesion.user} />
        {!local && (
          <div className="contenido" style={{ paddingTop: 0 }}>
            <button className="pildora" onClick={() => { setSoloAdmin(false); setLocal(null); setAdmin(false); }}>Inscribir un local con esta cuenta</button>
          </div>
        )}
        {local && <div className="contenido" style={{ paddingTop: 0 }}><button className="pildora" onClick={() => setSoloAdmin(false)}>Volver a mi local</button></div>}
      </Marco>
    );
  }
  if (verQr && local) {
    return (
      <Marco local={local}>
        <div className="contenido">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="letrista">MI QR</h1>
            <button className="pildora" onClick={() => setVerQr(false)}>Volver</button>
          </div>
          <Qr url={`${URL_APP}/?local=${local.id}`} titulo={local.nombre} archivo={`caserito-qr-${local.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
            bajada="Imprímelo y ponlo en la caja y en la vitrina. Quien lo escanea abre Caserito directo, sin instalar nada, y ve tus drops." />
        </div>
      </Marco>
    );
  }
  if (ayuda) return <Marco local={local} rol={rol}><Ayuda alCerrar={() => setAyuda(false)} /></Marco>;
  if (verEquipo && local && puede('equipo')) return <Marco local={local} rol={rol}><Equipo local={local} alCerrar={() => setVerEquipo(false)} /></Marco>;
  if (!local) return <Marco alAyuda={() => setAyuda(true)}><ConfigurarLocal usuario={sesion.user} alGuardar={setLocal} /></Marco>;
  if (editandoLocal && puede('local')) {
    return (
      <Marco local={local}>
        <ConfigurarLocal usuario={sesion.user} local={local}
          alGuardar={(l) => { setLocal(l); setEditandoLocal(false); }} alCancelar={() => setEditandoLocal(false)}
          esDueno={rol === 'Dueño'} alEliminar={() => window.location.reload()} />
      </Marco>
    );
  }

  const pestanas = [
    puede('resultados') && 'resumen', puede('drops') && 'crear', puede('drops') && 'drops', puede('escanear') && 'escanear',
    (puede('resultados') || puede('resenas')) && 'resultados',
  ].filter(Boolean);
  const vista = pestanas.includes(pestana) ? pestana : pestanas[0];

  return (
    <Marco local={local} rol={rol} alAyuda={() => setAyuda(true)}>
      {avisoInv && <div className="tarjeta" style={{ margin: '16px 16px 0', borderColor: 'var(--azul)' }}>{avisoInv}</div>}
      {!local.aprobado && puede('drops') && (
        <div className="tarjeta" style={{ margin: '16px 16px 0', borderColor: 'var(--rojo)' }}>
          <b>Tu local está en revisión</b>
          <span className="ayuda">Puedes preparar drops, pero los caseritos los verán cuando aprobemos tu local. Normalmente es el mismo día.</span>
        </div>
      )}
      <div style={{ margin: '12px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {puede('local') && <button className="pildora" onClick={() => setEditandoLocal(true)}>Editar mi local</button>}
        {puede('equipo') && <button className="pildora" onClick={() => setVerEquipo(true)}>Mi equipo</button>}
        <button className="pildora" onClick={() => setVerQr(true)}>Mi QR</button>
        {admin && <button className="pildora activa" onClick={() => setSoloAdmin(true)}>Ir al admin</button>}
      </div>
      {pestanas.length === 0 && <div className="contenido"><div className="tarjeta">Tu rol todavía no tiene permisos para drops ni para escanear. Pídele al dueño del local que te los dé.</div></div>}
      {vista === 'resumen' && <Resumen local={local} alCrear={puede('drops') ? () => { setBase(null); setPestana('crear'); } : null} />}
      {vista === 'crear' && (
        <Crear key={base ? base.id + (base.editarId ? '-e' : '-d') : 'nuevo'} local={local} base={base}
          alTerminar={(m) => { setBase(null); setAviso(m || ''); setPestana('drops'); }} />
      )}
      {vista === 'drops' && (
        <MisDrops key={aviso} local={local} aviso={aviso}
          alDuplicar={(d) => { setAviso(''); setBase(d); setPestana('crear'); }}
          alEditar={(d) => { setAviso(''); setBase({ ...d, editarId: d.id }); setPestana('crear'); }} />
      )}
      {vista === 'escanear' && <Escanear />}
      {vista === 'resultados' && <Resultados local={local} />}
      {pestanas.length > 1 && <nav className="nav" aria-label="Secciones">
        {pestanas.includes('resumen') && <Tab id="resumen" actual={vista} setear={setPestana} texto="Resumen" icono="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />}
        {pestanas.includes('crear') && <Tab id="crear" actual={vista} setear={(p) => { setBase(null); setPestana(p); }} texto="Crear" icono="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 8v8M8 12h8" />}
        {pestanas.includes('drops') && <Tab id="drops" actual={vista} setear={(p) => { setAviso(''); setPestana(p); }} texto="Mis drops" icono="M4 6h16M4 12h16M4 18h10" />}
        {pestanas.includes('escanear') && <Tab id="escanear" actual={vista} setear={setPestana} texto="Escanear" icono="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />}
        {pestanas.includes('resultados') && <Tab id="resultados" actual={vista} setear={setPestana} texto="Resultados" icono="M5 20V10M12 20V4M19 20v-7" />}
      </nav>}
    </Marco>
  );
}

function Marco({ local, rol, children, alAyuda }) {
  // El correo con que está conectado, para que no haya dudas de qué cuenta es
  const [correo, setCorreo] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCorreo((data.session && data.session.user.email) || ''));
  }, []);
  return (
    <div className="app">
      <header className="barra">
        <div>
          <span className="marca"><img src="/logo.svg" alt="Caserito" style={{ height: 30, display: 'block' }} /><small style={{ color: 'var(--amarillo)', fontWeight: 800 }}>Local</small></span>
          {local && <small>{local.nombre}{rol && rol !== 'Dueño' ? ` · ${rol}` : ''}</small>}
          {correo && <small className="correo-sesion" title={correo}>Conectado como {correo}</small>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {alAyuda && <button className="pildora" style={{ background: 'transparent', color: 'var(--amarillo)', borderColor: 'var(--amarillo)' }} onClick={alAyuda}>Ayuda</button>}
          <button className="pildora" style={{ background: 'transparent', color: 'var(--papel)', borderColor: 'var(--papel)' }}
            onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>
      <div className="toldo" />
      {children}
    </div>
  );
}

function Tab({ id, actual, setear, texto, icono }) {
  const activa = id === actual;
  return (
    <button className={activa ? 'activa' : ''} onClick={() => setear(id)} aria-current={activa ? 'page' : undefined}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icono} /></svg>
      {texto}
    </button>
  );
}

function Cargando() {
  return <div className="app"><div className="contenido"><p className="ayuda">Cargando…</p></div></div>;
}

function NuevaClave({ alTerminar }) {
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function guardar(e) {
    e.preventDefault();
    setEnviando(true); setError('');
    const { error } = await supabase.auth.updateUser({ password: clave });
    setEnviando(false);
    if (error) setError(explicar(error)); else alTerminar();
  }
  return (
    <Marco>
      <form className="contenido" onSubmit={guardar}>
        <h1 className="letrista">CLAVE NUEVA</h1>
        <label className="campo">Escribe tu contraseña nueva
          <input type="password" autoComplete="new-password" minLength={6} required value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="boton grande" disabled={enviando}>Guardar y entrar</button>
      </form>
    </Marco>
  );
}
