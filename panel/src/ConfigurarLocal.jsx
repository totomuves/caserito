import PinLocal from './PinLocal.jsx';
import React, { useState } from 'react';
import { LaminaLocal } from './arteLocal.jsx';
import { supabase, explicar } from './supabase.js';
import { subirImagen } from './imagenes.js';
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
  const puntoActual = (() => { const h = local && local.ubicacion; if (!h || typeof h !== 'string' || h.length < 50) return null; try { const b = new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16))); const v = new DataView(b.buffer); const le = b[0] === 1; let o = 5; if (v.getUint32(1, le) & 0x20000000) o += 4; return { lng: v.getFloat64(o, le), lat: v.getFloat64(o + 8, le) }; } catch (e) { return null; } })();
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
    e.target.value = '';
    if (!archivo) return;
    setError(''); setSubiendo(true);
    try { setLogo(await subirImagen(archivo, 'lamina', 600)); } catch (err) { setError(explicar(err)); }
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
      <div className="tarjeta" style={{ boxShadow: '5px 5px 0 var(--negro)', gap: 12 }}>
        <b className="letrista" style={{ fontSize: 20 }}>TU LÁMINA</b>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {local || logo ? (
            <span style={{ background: '#fff', border: '3px solid var(--negro)', boxShadow: '4px 4px 0 var(--negro)', padding: 5, transform: 'rotate(-2deg)', flexShrink: 0 }}>
              {local ? <LaminaLocal id={local.id} categoria={categorias[0] || local.categoria} pista={nombre} tam={96} imagen={logo || null} style={{ boxShadow: 'none', border: 0 }} />
                : <img src={logo} alt="" style={{ width: 96, height: 96, objectFit: 'cover', display: 'block' }} />}
            </span>
          ) : (
            <span style={{ width: 96, height: 96, border: '2.5px dashed var(--negro)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26, flexShrink: 0 }}>?</span>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <span className="ayuda">La que ganan tus clientes en el álbum y la que se ve en el mapa. Un dibujo, tu producto estrella o tu fachada. Cuadrada, idealmente.</span>
            <label className="boton" style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: '3px 3px 0 var(--negro)' }}>
              {subiendo ? 'Subiendo…' : logo ? 'Cambiar imagen' : 'Subir imagen'}
              <input type="file" accept="image/*" onChange={subirLogo} disabled={subiendo} style={{ display: 'none' }} />
            </label>
            {logo ? <button type="button" className="pildora" onClick={() => setLogo('')}>Usar la que hace Dropper</button> : null}
          </div>
        </div>
        {logo && local && logo !== local.logo_url ? <span className="ayuda">Aprieta “Guardar cambios” para dejarla.</span> : null}
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
        <p className="ayuda">{editando ? 'Si quedó mal, arrastra el pin hasta la puerta del local, o aprieta el botón estando adentro.' : 'Aprieta el botón estando dentro del local. Así los caseritos te encuentran a la cuadra exacta.'}</p>
        <button type="button" className="boton negro" onClick={ubicar}>{pos ? 'Ubicación marcada ✓' : 'Estoy en mi local'}</button>
        {pos && !pos.manual && <p className="ayuda">Precisión: ±{pos.precision} m</p>}
        {pos && pos.manual && <p className="ayuda">Ubicación ajustada a mano ✓ (se guarda al apretar Guardar)</p>}
        <PinLocal punto={pos || puntoActual} alCambiar={setPos} />
        {editando && !pos && local.barrio && <p className="ayuda">Tu local está en <b>{local.barrio}</b>{local.barrio_id === null ? ' (fuera de los barrios de Dropper por ahora)' : ''}. El barrio se reconoce solo por la ubicación.</p>}
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
