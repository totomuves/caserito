import React, { useEffect, useState } from 'react';
import { supabase, explicar, leerInvitacion, leerInvitacionEquipo, leerEntrega } from './supabase.js';

export default function Login() {
  const [invitado] = useState(() => !!leerInvitacion());
  const [codigoEquipo] = useState(() => leerInvitacionEquipo());
  const [equipo, setEquipo] = useState(null);
  const [codigoEntrega] = useState(() => leerEntrega());
  const [entrega, setEntrega] = useState(null);
  useEffect(() => {
    if (!codigoEntrega) return;
    supabase.rpc('ver_entrega', { p_codigo: codigoEntrega }).then(({ data }) => setEntrega((data && data[0]) || { vigente: false }));
  }, [codigoEntrega]);
  const [modo, setModo] = useState(invitado || codigoEquipo || leerEntrega() ? 'crear' : 'entrar');

  useEffect(() => {
    if (!codigoEquipo) return;
    supabase.rpc('ver_invitacion_equipo', { p_codigo: codigoEquipo }).then(({ data }) => setEquipo((data && data[0]) || { vigente: false }));
  }, [codigoEquipo]);
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError(''); setMsg(''); setEnviando(true);
    if (modo === 'olvide') {
      const o = await supabase.auth.resetPasswordForEmail(correo, { redirectTo: window.location.origin });
      setEnviando(false);
      if (o.error) setError(explicar(o.error));
      else setMsg('Te mandamos un correo para crear una contraseña nueva. Ábrelo desde este mismo teléfono.');
      return;
    }
    const r = modo === 'entrar'
      ? await supabase.auth.signInWithPassword({ email: correo, password: clave })
      : await supabase.auth.signUp({ email: correo, password: clave, options: { emailRedirectTo: window.location.origin } });
    setEnviando(false);
    if (r.error) { setError(explicar(r.error)); return; }
    if (modo === 'crear' && !r.data.session) setMsg('Te mandamos un correo para confirmar tu cuenta. Confírmala y vuelve a entrar.');
  }

  return (
    <div className="app">
      <header className="barra"><span className="marca"><img src="/dropper-logo.svg?v=2" alt="Dropper" style={{ height: 30, display: 'block' }} /><small style={{ color: 'var(--amarillo)', fontWeight: 800 }}>Local</small></span></header>
      <div className="toldo" />
      <form className="contenido" onSubmit={enviar}>
        <h1 className="letrista">{codigoEquipo && modo === 'crear' ? 'CREA TU CUENTA' : modo === 'entrar' ? 'ENTRA A TU LOCAL' : modo === 'crear' ? 'INSCRIBE TU LOCAL' : 'RECUPERA TU CLAVE'}</h1>
        <p className="ayuda">Suelta drops para que los caseritos del barrio lleguen a tu local.</p>
        {codigoEquipo && equipo && (equipo.vigente ? (
          <div className="tarjeta" style={{ borderColor: 'var(--azul)' }}>
            <b>Te invitaron al equipo de {equipo.local_nombre}</b>
            <span className="ayuda">Tu rol: {equipo.rol}. Crea tu cuenta con tu correo (o entra si ya tienes una) y quedas en el equipo.</span>
          </div>
        ) : (
          <div className="error">Esa invitación ya se usó o venció. Pídele al dueño del local un link nuevo.</div>
        ))}
        {codigoEntrega && entrega && (entrega.vigente ? (
          <div className="tarjeta" style={{ borderColor: 'var(--rojo)' }}>
            <b>¡Tu local {entrega.local_nombre} ya está en Dropper!</b>
            <span className="ayuda">Lo dejamos listo{entrega.barrio ? ` en ${entrega.barrio}` : ''}. Crea tu cuenta con tu correo (o entra si ya tienes una) y queda a tu nombre.</span>
          </div>
        ) : (
          <div className="error">Ese link de entrega ya se usó o venció. Pídele uno nuevo a Dropper.</div>
        ))}
        {invitado && !codigoEquipo && !codigoEntrega && <div className="tarjeta" style={{ borderColor: 'var(--azul)' }}><b>¡Te invitaron a Dropper!</b><span className="ayuda">Crea tu cuenta e inscribe tu local: queda aprobado al tiro.</span></div>}
        <label className="campo">Correo
          <input type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        {modo !== 'olvide' && (
          <label className="campo">Contraseña
            <input type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} minLength={6} required value={clave} onChange={(e) => setClave(e.target.value)} />
          </label>
        )}
        {error && <div className="error">{error}</div>}
        {msg && <div className="tarjeta">{msg}</div>}
        <button className="boton grande" disabled={enviando}>{modo === 'entrar' ? 'Entrar' : modo === 'crear' ? 'Crear cuenta' : 'Mandarme el correo'}</button>
        <button type="button" className="pildora" onClick={() => { setModo(modo === 'entrar' ? 'crear' : 'entrar'); setError(''); setMsg(''); }}>
          {modo === 'entrar' ? (codigoEquipo ? '¿Primera vez? Crea tu cuenta' : '¿Primera vez? Inscribe tu local') : 'Ya tengo cuenta'}
        </button>
        {modo === 'entrar' && (
          <button type="button" className="pildora" style={{ background: 'transparent' }} onClick={() => { setModo('olvide'); setError(''); setMsg(''); }}>
            Olvidé mi contraseña
          </button>
        )}
      </form>
    </div>
  );
}
