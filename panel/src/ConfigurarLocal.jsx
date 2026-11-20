import React, { useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { COCINAS } from './frases.js';
import { GRUPOS, CON_COCINA, MAX_CATEGORIAS } from './categorias.js';

// Sirve para inscribir un local nuevo o editar el propio (si recibe "local")
export default function ConfigurarLocal({ usuario, local, alGuardar, alCancelar }) {
  const editando = !!local;
  const [nombre, setNombre] = useState(local ? local.nombre : '');
  const [categorias, setCategorias] = useState(local ? (local.categorias && local.categorias.length ? local.categorias : [local.categoria]) : []);
  const [cocina, setCocina] = useState((local && local.cocina_pais) || 'Chilena');
  const [estrella, setEstrella] = useState((local && local.producto_estrella) || '');
  const [direccion, setDireccion] = useState((local && local.direccion) || '');
  const [pos, setPos] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function alternar(id) {
    setError('');
    if (categorias.includes(id)) setCategorias(categorias.filter((c) => c !== id));
    else if (categorias.length >= MAX_CATEGORIAS) setError(`Elige hasta ${MAX_CATEGORIAS}. La primera que marques es la principal.`);
    else setCategorias([...categorias, id]);
  }

  function ubicar() {
    setError('');
    if (!navigator.geolocation) { setError('Este navegador no entrega la ubicación.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) }),
      () => setError('No pudimos leer la ubicación. Revisa que el navegador tenga permiso.'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const usaCocina = categorias.some((c) => CON_COCINA.includes(c));

  async function guardar(e) {
    e.preventDefault();
    if (!categorias.length) { setError('Elige al menos una categoría.'); return; }
    if (!editando && !pos) { setError('Marca la ubicación estando dentro del local.'); return; }
    setGuardando(true); setError('');
    const campos = {
      nombre: nombre.trim(),
      categorias,
      categoria: categorias[0],
      cocina_pais: usaCocina ? cocina : null,
      producto_estrella: estrella.trim() || null,
      direccion: direccion.trim() || null,
    };
    if (pos) campos.ubicacion = `SRID=4326;POINT(${pos.lng} ${pos.lat})`;
    const r = editando
      ? await supabase.from('locales').update(campos).eq('id', local.id).select().single()
      : await supabase.from('locales').insert({ ...campos, dueno_id: usuario.id }).select().single();
    if (!r.error && !editando) await supabase.from('perfiles').update({ rol: 'local' }).eq('id', usuario.id);
    setGuardando(false);
    if (r.error) { setError(explicar(r.error)); return; }
    alGuardar(r.data);
  }

  return (
    <form className="contenido" onSubmit={guardar}>
      <h1 className="letrista">{editando ? 'EDITAR MI LOCAL' : 'TU LOCAL'}</h1>
      <label className="campo">Nombre del local
        <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Arepera La Chamita" />
      </label>

      <div className="campo">¿Qué es? Elige hasta {MAX_CATEGORIAS} (la primera es la principal)
        {GRUPOS.map((g) => (
          <div key={g.titulo} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--gris)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{g.titulo}</span>
            <div className="pildoras">
              {g.items.map((c) => {
                const i = categorias.indexOf(c.id);
                return (
                  <button type="button" key={c.id} className={'pildora' + (i >= 0 ? ' activa' : '')} aria-pressed={i >= 0} onClick={() => alternar(c.id)}>
                    {i >= 0 ? `${i + 1}. ` : ''}{c.texto}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {usaCocina && (
        <div className="campo">Habla como en tu tierra (cocina)
          <div className="pildoras">
            {COCINAS.map((c) => (
              <button type="button" key={c} className={'pildora roja' + (cocina === c ? ' activa' : '')} onClick={() => setCocina(c)}>{c}</button>
            ))}
          </div>
        </div>
      )}
      <label className="campo">Tu producto estrella (para la lámina del álbum)
        <input value={estrella} onChange={(e) => setEstrella(e.target.value)} placeholder="Ej: arepa, cortado, vinilo, chaqueta vintage" />
      </label>
      <label className="campo">Dirección
        <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: Av. Italia 1234" />
      </label>
      <div className="tarjeta">
        <b>Ubicación del local</b>
        <p className="ayuda">{editando ? 'Solo si cambió: aprieta el botón estando dentro del local.' : 'Aprieta el botón estando dentro del local. Así los caseritos te encuentran a la cuadra exacta.'}</p>
        <button type="button" className="boton negro" onClick={ubicar}>{pos ? 'Ubicación marcada ✓' : 'Estoy en mi local'}</button>
        {pos && <p className="ayuda">Precisión: ±{pos.precision} m</p>}
      </div>
      {error && <div className="error">{error}</div>}
      <button className="boton grande" disabled={guardando}>{editando ? 'Guardar cambios' : 'Guardar local'}</button>
      {editando && <button type="button" className="pildora" onClick={alCancelar}>Cancelar</button>}
    </form>
  );
}
