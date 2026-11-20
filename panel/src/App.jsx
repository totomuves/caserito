import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import Login from './Login.jsx';
import ConfigurarLocal from './ConfigurarLocal.jsx';
import Crear from './Crear.jsx';
import Escanear from './Escanear.jsx';
import Resultados from './Resultados.jsx';
import Admin from './Admin.jsx';

export default function App() {
  const [sesion, setSesion] = useState(undefined);
  const [local, setLocal] = useState(undefined);
  const [pestana, setPestana] = useState('crear');
  const [error, setError] = useState('');
  const [admin, setAdmin] = useState(false);
  const [soloAdmin, setSoloAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
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
      const { data, error } = await supabase
        .from('locales').select('*').eq('dueno_id', sesion.user.id).limit(1).maybeSingle();
      if (error) { setError(explicar(error)); return; }
      setLocal(data || null);
    })();
  }, [sesion]);

  if (sesion === undefined) return <Cargando />;
  if (!sesion) return <Login />;
  if (error) return <Marco><div className="contenido"><div className="error">{error}</div></div></Marco>;
  if (local === undefined) return <Cargando />;
  if (admin && (soloAdmin || !local)) {
    return (
      <Marco>
        <Admin />
        {!local && (
          <div className="contenido" style={{ paddingTop: 0 }}>
            <button className="pildora" onClick={() => { setSoloAdmin(false); setLocal(null); setAdmin(false); }}>Inscribir un local con esta cuenta</button>
          </div>
        )}
        {local && <div className="contenido" style={{ paddingTop: 0 }}><button className="pildora" onClick={() => setSoloAdmin(false)}>Volver a mi local</button></div>}
      </Marco>
    );
  }
  if (!local) return <Marco><ConfigurarLocal usuario={sesion.user} alGuardar={setLocal} /></Marco>;

  return (
    <Marco local={local}>
      {!local.aprobado && (
        <div className="tarjeta" style={{ margin: '16px 16px 0', borderColor: 'var(--rojo)' }}>
          <b>Tu local está en revisión</b>
          <span className="ayuda">Puedes preparar drops, pero los caseritos los verán cuando aprobemos tu local. Normalmente es el mismo día.</span>
        </div>
      )}
      {admin && <div style={{ margin: '12px 16px 0' }}><button className="pildora activa" onClick={() => setSoloAdmin(true)}>Ir al admin</button></div>}
      {pestana === 'crear' && <Crear local={local} />}
      {pestana === 'escanear' && <Escanear />}
      {pestana === 'resultados' && <Resultados local={local} />}
      <nav className="nav" aria-label="Secciones">
        <Tab id="crear" actual={pestana} setear={setPestana} texto="Crear" icono="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 8v8M8 12h8" />
        <Tab id="escanear" actual={pestana} setear={setPestana} texto="Escanear" icono="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
        <Tab id="resultados" actual={pestana} setear={setPestana} texto="Resultados" icono="M5 20V10M12 20V4M19 20v-7" />
      </nav>
    </Marco>
  );
}

function Marco({ local, children }) {
  return (
    <div className="app">
      <header className="barra">
        <div>
          <span className="marca letrista">Caserito · Local</span>
          {local && <small>{local.nombre}</small>}
        </div>
        <button className="pildora" style={{ background: 'transparent', color: 'var(--papel)', borderColor: 'var(--papel)' }}
          onClick={() => supabase.auth.signOut()}>Salir</button>
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
