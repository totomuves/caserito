import React, { useState } from 'react';
import { supabase, explicar, leerInvitacion } from './supabase.js';

export default function Login() {
  const [invitado] = useState(() => !!leerInvitacion());
  const [modo, setModo] = useState(invitado ? 'crear' : 'entrar');
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
      <header className="barra"><span className="marca letrista">Caserito · Local</span></header>
      <div className="toldo" />
      <form className="contenido" onSubmit={enviar}>
        <h1 className="letrista">{modo === 'entrar' ? 'ENTRA A TU LOCAL' : modo === 'crear' ? 'INSCRIBE TU LOCAL' : 'RECUPERA TU CLAVE'}</h1>
        <p className="ayuda">Suelta drops para que los caseritos del barrio lleguen a tu local.</p>
        {invitado && <div className="tarjeta" style={{ borderColor: 'var(--azul)' }}><b>¡Te invitaron a Caserito!</b><span className="ayuda">Crea tu cuenta e inscribe tu local: queda aprobado al tiro.</span></div>}
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
          {modo === 'entrar' ? '¿Primera vez? Inscribe tu local' : 'Ya tengo cuenta'}
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
