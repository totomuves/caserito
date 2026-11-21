import React, { useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { COCINAS } from './frases.js';
import { GRUPOS, CON_COCINA, MAX_CATEGORIAS } from './categorias.js';
import EliminarLocal from './EliminarLocal.jsx';

// Sirve para inscribir un local nuevo o editar el propio (si recibe "local")
export default function ConfigurarLocal({ usuario, local, alGuardar, alCancelar, esDueno, alEliminar }) {
  const editando = !!local;
  const [nombre, setNombre] = useState(local ? local.nombre : '');
  const [categorias, setCategorias] = useState(local ? (local.categorias && local.categorias.length ? local.categorias : [local.categoria]) : []);
  const [cocina, setCocina] = useState((local && local.cocina_pais) || 'Chilena');
  const [estrella, setEstrella] = useState((local && local.producto_estrella) || '');
  const [repNecesarias, setRepNecesarias] = useState((local && local.repetidas_necesarias) || '');
  const [repPremio, setRepPremio] = useState((local && local.repetidas_premio) || '');
  const [direccion, setDireccion] = useState((local && local.direccion) || '');
  const [pos, setPos] = useState(null);
  const [logo, setLogo] = useState((local && local.logo_url) || '');
  const [subiendo, setSubiendo] = useState(false);
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

  // Achica el logo a 400 px en WebP antes de subirlo (pesa ~20 KB)
  async function subirLogo(e) {
    const archivo = e.target.files && e.target.files[0];
    if (!archivo) return;
    setError(''); setSubiendo(true);
    try {
      const img = await createImageBitmap(archivo);
      const lado = 400, escala = Math.min(1, lado / Math.max(img.width, img.height));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(img.width * escala);
      lienzo.height = Math.round(img.height * escala);
      lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
      const blob = await new Promise((r) => lienzo.toBlob(r, 'image/webp', 0.85));
      const tipo = blob && blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      const final = tipo === 'image/webp' ? blob : await new Promise((r) => lienzo.toBlob(r, 'image/jpeg', 0.85));
      const ruta = `${usuario.id}/logo-${Date.now()}.${tipo === 'image/webp' ? 'webp' : 'jpg'}`;
      const up = await supabase.storage.from('caserito-logos').upload(ruta, final, { contentType: tipo, upsert: true });
      if (up.error) throw up.error;
      setLogo(supabase.storage.from('caserito-logos').getPublicUrl(ruta).data.publicUrl);
    } catch (err) {
      setError(explicar(err));
    }
    setSubiendo(false);
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
      logo_url: logo || null,
    };
    // Repetidas: solo si ya existe la columna (SQL 014) o si el local las configuró
    if ((local && 'repetidas_necesarias' in local) || repNecesarias) {
      campos.repetidas_necesarias = repNecesarias && repPremio.trim() ? Math.min(20, Math.max(2, Number(repNecesarias))) : null;
      campos.repetidas_premio = repNecesarias && repPremio.trim() ? repPremio.trim() : null;
    }
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
      <div className="tarjeta" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, border: '2.5px solid var(--negro)', background: 'var(--crema)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {logo ? <img src={logo} alt="Logo del local" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="letrista" style={{ fontSize: 26 }}>{(nombre || '?').slice(0, 1).toUpperCase()}</span>}
        </div>
        <label className="pildora" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
          {subiendo ? 'Subiendo…' : logo ? 'Cambiar logo' : 'Subir logo (opcional)'}
          <input type="file" accept="image/*" onChange={subirLogo} style={{ display: 'none' }} />
        </label>
      </div>
      <label className="campo">Tu producto estrella (para la lámina del álbum)
        <input value={estrella} onChange={(e) => setEstrella(e.target.value)} placeholder="Ej: arepa, cortado, vinilo, chaqueta vintage" />
      </label>
      <label className="campo">Dirección
        <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: Av. Italia 1234" />
      </label>
      <div className="tarjeta">
        <b>Láminas repetidas</b>
        <p className="ayuda">Cada vez que un caserito vuelve a canjear en tu local, gana una lámina repetida. Elige qué le das cuando junta varias: es un buen motivo para que vuelva.</p>
        <label className="campo">¿Cuántas repetidas pides para el cambio? (de 2 a 20; vacío = no cambio repetidas)
          <input type="number" inputMode="numeric" min={2} max={20} value={repNecesarias} placeholder="Ej: 5"
            onChange={(e) => setRepNecesarias(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </label>
        {repNecesarias && (
          <label className="campo">¿Qué das a cambio?
            <input value={repPremio} maxLength={80} required onChange={(e) => setRepPremio(e.target.value)} placeholder="Ej: un cortado gratis, 20% en tu compra, un sticker" />
          </label>
        )}
      </div>
      <div className="tarjeta">
        <b>Ubicación del local</b>
        <p className="ayuda">{editando ? 'Solo si cambió: aprieta el botón estando dentro del local.' : 'Aprieta el botón estando dentro del local. Así los caseritos te encuentran a la cuadra exacta.'}</p>
        <button type="button" className="boton negro" onClick={ubicar}>{pos ? 'Ubicación marcada ✓' : 'Estoy en mi local'}</button>
        {pos && <p className="ayuda">Precisión: ±{pos.precision} m</p>}
        {editando && !pos && local.barrio && <p className="ayuda">Tu local está en <b>{local.barrio}</b>{local.barrio_id === null ? ' (fuera de los barrios de Caserito por ahora)' : ''}. El barrio se reconoce solo por la ubicación.</p>}
      </div>
      {error && <div className="error">{error}</div>}
      <button className="boton grande" disabled={guardando || subiendo}>{editando ? 'Guardar cambios' : 'Guardar local'}</button>
      {editando && <button type="button" className="pildora" onClick={alCancelar}>Cancelar</button>}
      {editando && esDueno && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px dashed #CDBF9F', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <b>Zona peligrosa</b>
          <EliminarLocal local={local} texto="Eliminar mi local" alEliminar={alEliminar} />
        </div>
      )}
    </form>
  );
}
