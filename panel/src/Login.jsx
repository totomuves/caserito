import React, { useState } from 'react';
import { supabase, explicar } from './supabase.js';

export default function Login() {
  const [modo, setModo] = useState('entrar');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError(''); setMsg(''); setEnviando(true);
    const r = modo === 'entrar'
      ? await supabase.auth.signInWithPassword({ email: correo, password: clave })
      : await supabase.auth.signUp({ email: correo, password: clave });
    setEnviando(false);
    if (r.error) { setError(explicar(r.error)); return; }
    if (modo === 'crear' && !r.data.session) setMsg('Te mandamos un correo para confirmar tu cuenta. Confírmala y vuelve a entrar.');
  }

  return (
    <div className="app">
      <header className="barra"><span className="marca letrista">Caserito · Local</span></header>
      <div className="toldo" />
      <form className="contenido" onSubmit={enviar}>
        <h1 className="letrista">{modo === 'entrar' ? 'ENTRA A TU LOCAL' : 'INSCRIBE TU LOCAL'}</h1>
        <p className="ayuda">Suelta drops para que los caseritos del barrio lleguen a tu local.</p>
        <label className="campo">Correo
          <input type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label className="campo">Contraseña
          <input type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} minLength={6} required value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        {msg && <div className="tarjeta">{msg}</div>}
        <button className="boton grande" disabled={enviando}>{modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
        <button type="button" className="pildora" onClick={() => setModo(modo === 'entrar' ? 'crear' : 'entrar')}>
          {modo === 'entrar' ? '¿Primera vez? Inscribe tu local' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  );
}
