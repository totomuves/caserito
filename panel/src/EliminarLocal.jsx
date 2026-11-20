import React, { useState } from 'react';
import { supabase, explicar } from './supabase.js';

// Zona peligrosa: eliminar un local para siempre (dueño o admin). Pide escribir el nombre.
export default function EliminarLocal({ local, alEliminar, texto = 'Eliminar local' }) {
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [borrando, setBorrando] = useState(false);
  const coincide = confirmacion.trim().toLowerCase() === local.nombre.trim().toLowerCase();

  async function eliminar() {
    setBorrando(true); setError('');
    const { error } = await supabase.rpc('eliminar_local', { p_local: local.id, p_confirmacion: confirmacion });
    setBorrando(false);
    if (error) { setError(explicar(error)); return; }
    alEliminar && alEliminar();
  }

  if (!abierto) {
    return <button type="button" className="pildora" style={{ alignSelf: 'flex-start', borderColor: 'var(--rojo)', color: '#A50622' }} onClick={() => setAbierto(true)}>{texto}</button>;
  }
  return (
    <div className="tarjeta" style={{ borderColor: 'var(--rojo)', background: '#FDE2E6' }}>
      <b>¿Eliminar {local.nombre} para siempre?</b>
      <span>Se borran sus drops, canjes, reseñas, láminas del álbum y su equipo. <b>No se puede deshacer.</b> Si solo quieres parar un tiempo, mejor no sueltes drops (o pídele al admin que lo pause).</span>
      <label className="campo">Escribe «{local.nombre}» para confirmar
        <input value={confirmacion} onChange={(e) => { setConfirmacion(e.target.value); setError(''); }} autoComplete="off" />
      </label>
      {error && <div className="error" role="alert">{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="boton" style={{ background: 'var(--rojo)', color: '#fff' }} disabled={!coincide || borrando} onClick={eliminar}>
          {borrando ? 'Eliminando…' : 'Sí, eliminar para siempre'}
        </button>
        <button type="button" className="pildora" onClick={() => { setAbierto(false); setConfirmacion(''); setError(''); }}>Cancelar</button>
      </div>
    </div>
  );
}
