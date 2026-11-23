import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { traerTiendas, mismoNombre } from './osm.js';

// Admin · Patios y malls: lugares con plano propio (patio de comida, mercado, galería, mall con pisos)
export default function Lugares() {
  const [lugares, setLugares] = useState(null);
  const [barrios, setBarrios] = useState([]);
  const [locales, setLocales] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [error, setError] = useState('');
  const [n, setN] = useState(0);
  const recargar = () => setN(n + 1);

  useEffect(() => {
    (async () => {
      const g = await supabase.from('lugares').select('*, pisos(*)').order('creado_at');
      if (g.error) { setError(/lugares/.test(g.error.message || '') ? 'Falta correr el SQL 026 (patios y malls).' : explicar(g.error)); return; }
      setError('');
      setLugares((g.data || []).map((x) => ({ ...x, pisos: (x.pisos || []).sort((a, b) => a.nivel - b.nivel) })));
      const b = await supabase.from('barrios').select('id, nombre').order('orden');
      setBarrios(b.data || []);
      const l = await supabase.from('locales').select('id, nombre, barrio_id, piso_id, plano_x, plano_y').eq('aprobado', true).order('nombre');
      setLocales(l.data || []);
      const t = await supabase.from('tiendas_osm').select('osm_id, nombre, piso_id, plano_x, plano_y, local_id').not('piso_id', 'is', null).eq('oculta', false);
      setTiendas(t.data || []);
    })();
  }, [n]);

  if (error) return <div className="error">{error}</div>;
  if (!lugares) return <p className="ayuda">Cargando…</p>;
  return (
    <>
      <p className="ayuda">Un patio de comida, mercado, galería o mall tiene su propio plano. En la app aparece en el mapa como una tarjeta negra, y cuando alguien está adentro, el inicio muestra el plano en vez de las calles. Los malls pueden tener varios pisos.</p>
      <NuevoLugar barrios={barrios} alCrear={recargar} />
      {lugares.map((g) => <Lugar key={g.id} g={g} barrios={barrios} locales={locales} tiendas={tiendas} alCambiar={recargar} />)}
    </>
  );
}

function NuevoLugar({ barrios, alCrear }) {
  const [f, setF] = useState({ nombre: '', tipo: 'patio', barrio_id: '', coords: '', radio_m: 60 });
  const [msg, setMsg] = useState('');
  const cambiar = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function crear(e) {
    e.preventDefault();
    setMsg('');
    const m = f.coords.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!m) { setMsg('Pega las coordenadas como "-33.4430, -70.6250" (en Google Maps: clic derecho sobre el lugar → copiar las coordenadas).'); return; }
    const { data, error } = await supabase.from('lugares').insert({
      nombre: f.nombre.trim(), tipo: f.tipo, barrio_id: f.barrio_id || null,
      lat: Number(m[1]), lng: Number(m[2]), radio_m: Math.min(400, Math.max(15, Number(f.radio_m) || 60)),
    }).select('id').single();
    if (error) { setMsg(explicar(error)); return; }
    await supabase.from('pisos').insert({ lugar_id: data.id, nivel: 1, nombre: f.tipo === 'mall' ? 'Piso 1' : 'Planta' });
    setF({ nombre: '', tipo: 'patio', barrio_id: '', coords: '', radio_m: 60 });
    setMsg('Creado ✓ Ahora sube el plano y ubica los locales.');
    alCrear();
  }
  return (
    <form className="tarjeta" onSubmit={crear}>
      <b>+ Nuevo patio o mall</b>
      <label className="campo">Nombre
        <input required minLength={2} maxLength={60} value={f.nombre} onChange={cambiar('nombre')} placeholder="Ej: Patio Italia · Costanera Center" />
      </label>
      <label className="campo">Tipo
        <select value={f.tipo} onChange={cambiar('tipo')}>
          <option value="patio">Patio, mercado o galería (un plano)</option>
          <option value="mall">Mall (varios pisos)</option>
        </select>
      </label>
      <label className="campo">Barrio
        <select value={f.barrio_id} onChange={cambiar('barrio_id')}>
          <option value="">Sin barrio</option>
          {barrios.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </label>
      <label className="campo">Coordenadas de la entrada (de Google Maps)
        <input required value={f.coords} onChange={cambiar('coords')} placeholder="-33.4430, -70.6250" />
      </label>
      <label className="campo">Tamaño: "estás adentro" a menos de… metros (patio: 30–60, mall: 120–250)
        <input type="number" min={15} max={400} value={f.radio_m} onChange={cambiar('radio_m')} />
      </label>
      {msg && <span role="status" style={{ fontWeight: 700 }}>{msg}</span>}
      <button className="boton">Crear</button>
    </form>
  );
}

function Lugar({ g, barrios, locales, tiendas, alCambiar }) {
  const [pisoId, setPisoId] = useState(g.pisos[0] && g.pisos[0].id);
  const piso = g.pisos.find((p) => p.id === pisoId) || g.pisos[0];
  const [msg, setMsg] = useState('');
  const [nivel, setNivel] = useState('');
  const barrio = barrios.find((b) => b.id === g.barrio_id);

  async function agregarPiso(e) {
    e.preventDefault();
    const nv = Number(nivel);
    if (!Number.isInteger(nv)) return;
    const { error } = await supabase.from('pisos').insert({ lugar_id: g.id, nivel: nv, nombre: nv < 0 ? `Subterráneo ${-nv}` : `Piso ${nv}` });
    if (error) setMsg(explicar(error)); else { setNivel(''); alCambiar(); }
  }
  const [trayendo, setTrayendo] = useState(false);
  // Trae las tiendas del mall desde OpenStreetMap: crea los pisos, arma el plano base y ubica a los locales de Droper que calcen por nombre
  async function traerDeOsm() {
    setTrayendo(true); setMsg('Buscando tiendas en OpenStreetMap…');
    try {
      const tiendas = await traerTiendas({ centro: { lat: g.lat, lng: g.lng }, radio: Math.max(g.radio_m, 40) });
      if (!tiendas.length) { setMsg('OpenStreetMap no tiene tiendas con nombre en este lugar. Tendrás que ubicarlas a mano.'); setTrayendo(false); return; }
      // Pisos: los niveles que vengan; lo que no trae piso va al piso más bajo que exista (o al 1)
      const niveles = [...new Set(tiendas.map((t) => t.nivel).filter((n) => n != null))].sort((a, b) => a - b);
      const sinPiso = tiendas.filter((t) => t.nivel == null).length;
      const existentes = new Map(g.pisos.map((p) => [p.nivel, p]));
      for (const n of niveles) {
        if (existentes.has(n)) continue;
        const r = await supabase.from('pisos').insert({ lugar_id: g.id, nivel: n, nombre: n < 0 ? `Subterráneo ${-n}` : `Nivel ${n}` }).select('*').single();
        if (r.error) throw r.error;
        existentes.set(n, r.data);
      }
      if (!existentes.size) {
        const r = await supabase.from('pisos').insert({ lugar_id: g.id, nivel: 1, nombre: 'Planta' }).select('*').single();
        if (r.error) throw r.error;
        existentes.set(1, r.data);
      }
      const nivelBase = [...existentes.keys()].sort((a, b) => a - b).find((n) => n >= 0) ?? [...existentes.keys()][0];
      // Plano base: posiciones reales normalizadas a la caja de todas las tiendas (con un margen)
      const lats = tiendas.map((t) => t.lat), lngs = tiendas.map((t) => t.lng);
      let s0 = Math.min(...lats), n0 = Math.max(...lats), w0 = Math.min(...lngs), e0 = Math.max(...lngs);
      const mLat = 111320, mLng = 111320 * Math.cos((g.lat * Math.PI) / 180);
      let alto = (n0 - s0) * mLat, ancho = (e0 - w0) * mLng;
      const minimo = 30; // metros
      if (alto < minimo) { const d = (minimo - alto) / 2 / mLat; s0 -= d; n0 += d; alto = minimo; }
      if (ancho < minimo) { const d = (minimo - ancho) / 2 / mLng; w0 -= d; e0 += d; ancho = minimo; }
      const pad = 0.08;
      const xy = (t) => ({ x: pad + (1 - 2 * pad) * ((t.lng - w0) / (e0 - w0)), y: pad + (1 - 2 * pad) * ((n0 - t.lat) / (n0 - s0)) });
      const proporcion = Math.min(2.5, Math.max(0.6, ancho / alto));
      for (const p of existentes.values()) if (!p.plano_url) await supabase.from('pisos').update({ proporcion }).eq('id', p.id);
      // Locales de Droper que calzan por nombre
      let ubicados = 0;
      const filas = tiendas.map((t) => {
        const p = existentes.get(t.nivel != null ? t.nivel : nivelBase);
        const { x, y } = xy(t);
        const local = locales.find((l) => mismoNombre(l.nombre, t.nombre));
        return { ...t, lugar_id: g.id, barrio_id: g.barrio_id, piso_id: p.id, plano_x: x, plano_y: y, local_id: local ? local.id : null, actualizado_at: new Date().toISOString() };
      });
      for (const f of filas.filter((f) => f.local_id)) {
        const r = await supabase.rpc('ubicar_en_plano', { p_local: f.local_id, p_piso: f.piso_id, p_x: f.plano_x, p_y: f.plano_y });
        if (!r.error) ubicados++;
      }
      const up = await supabase.from('tiendas_osm').upsert(filas, { onConflict: 'osm_id' });
      if (up.error) throw up.error;
      setMsg(`Listo ✓ ${tiendas.length} tiendas en ${existentes.size} ${existentes.size === 1 ? 'piso' : 'pisos'}${sinPiso ? ` (${sinPiso} sin piso en OpenStreetMap: quedaron en ${existentes.get(nivelBase).nombre})` : ''}. ${ubicados} locales de Droper ubicados solos.`);
      alCambiar();
    } catch (e) {
      setMsg(/tiendas_osm/.test(e.message || '') ? 'Falta correr el SQL 028 (tiendas de OpenStreetMap).' : explicar(e));
    }
    setTrayendo(false);
  }

  async function activar() {
    const { error } = await supabase.from('lugares').update({ activo: !g.activo }).eq('id', g.id);
    if (error) setMsg(explicar(error)); else alCambiar();
  }
  async function borrar() {
    if (!window.confirm(`¿Borrar ${g.nombre}? Sus locales siguen existiendo, solo salen del plano.`)) return;
    const { error } = await supabase.from('lugares').delete().eq('id', g.id);
    if (error) setMsg(explicar(error)); else alCambiar();
  }

  return (
    <div className="tarjeta">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <b>{g.nombre} <span className="ayuda" style={{ fontWeight: 600 }}>· {g.tipo === 'mall' ? 'Mall' : 'Patio'}{barrio ? ` · ${barrio.nombre}` : ''} · {g.radio_m} m{g.activo ? '' : ' · OCULTO'}</span></b>
        <span style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="pildora" onClick={traerDeOsm} disabled={trayendo}>{trayendo ? 'Trayendo…' : 'Traer tiendas de OpenStreetMap'}</button>
          <button type="button" className="pildora" onClick={activar}>{g.activo ? 'Ocultar' : 'Mostrar'}</button>
          <button type="button" className="pildora" onClick={borrar}>Borrar</button>
        </span>
      </div>
      <div className="pildoras">
        {g.pisos.map((p) => (
          <button key={p.id} type="button" className={'pildora' + (piso && p.id === piso.id ? ' activa' : '')} onClick={() => setPisoId(p.id)}>{p.nombre}</button>
        ))}
        {g.tipo === 'mall' && (
          <form onSubmit={agregarPiso} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="number" value={nivel} onChange={(e) => setNivel(e.target.value)} placeholder="Nivel (-1, 2…)" style={{ width: 120, minHeight: 40 }} />
            <button className="pildora">+ Piso</button>
          </form>
        )}
      </div>
      {piso && <EditorPiso key={piso.id} piso={piso} g={g} locales={locales} tiendas={tiendas} alCambiar={alCambiar} />}
      {msg && <span role="status" style={{ fontWeight: 700 }}>{msg}</span>}
    </div>
  );
}

function EditorPiso({ piso, g, locales, tiendas = [], alCambiar }) {
  const [elegido, setElegido] = useState('');
  const [msg, setMsg] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [nombre, setNombre] = useState(piso.nombre);
  const enEste = locales.filter((l) => l.piso_id === piso.id && l.plano_x != null);
  const candidatos = locales.filter((l) => l.piso_id !== piso.id && (!g.barrio_id || l.barrio_id === g.barrio_id || !l.barrio_id));

  async function subirPlano(e) {
    const archivo = e.target.files && e.target.files[0];
    if (!archivo) return;
    setSubiendo(true); setMsg('');
    const proporcion = await new Promise((ok) => {
      const img = new Image();
      img.onload = () => ok(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.4);
      img.onerror = () => ok(1.4);
      img.src = URL.createObjectURL(archivo);
    });
    const ext = (archivo.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const ruta = `${g.id}/${piso.id}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from('caserito-planos').upload(ruta, archivo, { contentType: archivo.type || 'image/png', upsert: true });
    if (up.error) { setSubiendo(false); setMsg(explicar(up.error)); return; }
    const url = supabase.storage.from('caserito-planos').getPublicUrl(ruta).data.publicUrl;
    const { error } = await supabase.from('pisos').update({ plano_url: url, proporcion: Math.round(proporcion * 1000) / 1000 }).eq('id', piso.id);
    setSubiendo(false);
    if (error) setMsg(explicar(error)); else { setMsg('Plano subido ✓'); alCambiar(); }
  }

  async function ubicar(e) {
    if (!elegido) { setMsg('Primero elige qué local vas a ubicar.'); return; }
    const caja = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - caja.left) / caja.width;
    const y = (e.clientY - caja.top) / caja.height;
    const { error } = await supabase.rpc('ubicar_en_plano', { p_local: elegido, p_piso: piso.id, p_x: x, p_y: y });
    if (error) setMsg(explicar(error)); else { setMsg('Ubicado ✓'); setElegido(''); alCambiar(); }
  }
  async function quitar(id) {
    const { error } = await supabase.rpc('ubicar_en_plano', { p_local: id, p_piso: null, p_x: 0, p_y: 0 });
    if (error) setMsg(explicar(error)); else alCambiar();
  }
  async function renombrar() {
    if (!nombre.trim() || nombre === piso.nombre) return;
    const { error } = await supabase.from('pisos').update({ nombre: nombre.trim() }).eq('id', piso.id);
    if (error) setMsg(explicar(error)); else alCambiar();
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label className="campo">Nombre del piso
        <input value={nombre} maxLength={30} onChange={(e) => setNombre(e.target.value)} onBlur={renombrar} />
      </label>
      <label className="campo">{piso.plano_url ? 'Cambiar plano (imagen)' : 'Sube el plano de este piso (imagen PNG o JPG, idealmente horizontal y simple)'}
        <input type="file" accept="image/*" onChange={subirPlano} disabled={subiendo} />
      </label>
      {subiendo && <span className="ayuda">Subiendo…</span>}
      <label className="campo">Ubicar un local: elígelo y después toca su lugar en el plano
        <select value={elegido} onChange={(e) => setElegido(e.target.value)}>
          <option value="">Elige un local</option>
          {candidatos.map((l) => <option key={l.id} value={l.id}>{l.nombre}{l.piso_id ? ' (está en otro piso)' : ''}</option>)}
        </select>
      </label>
      <div onClick={ubicar} role="button" aria-label="Plano: toca para ubicar el local elegido"
        style={{ position: 'relative', width: '100%', aspectRatio: String(piso.proporcion || 1.4), background: '#FFF3B0', border: '2px solid #111', borderRadius: 12, overflow: 'hidden', cursor: elegido ? 'crosshair' : 'default' }}>
        {piso.plano_url
          ? <img src={piso.plano_url} alt={`Plano ${piso.nombre}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
          : <span className="ayuda" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>Sin plano todavía (igual puedes ubicar locales)</span>}
        {tiendas.filter((t) => t.piso_id === piso.id && !t.local_id && t.plano_x != null).map((t) => (
          <span key={t.osm_id} title={t.nombre} style={{ position: 'absolute', left: `${t.plano_x * 100}%`, top: `${t.plano_y * 100}%`, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: 3, pointerEvents: 'none', font: '600 9px Archivo, sans-serif', color: '#555', whiteSpace: 'nowrap' }}>
            <i style={{ width: 7, height: 7, borderRadius: 4, background: '#9A9A9A', display: 'inline-block' }} />{t.nombre}
          </span>
        ))}
        {enEste.map((l) => (
          <span key={l.id} style={{ position: 'absolute', left: `${l.plano_x * 100}%`, top: `${l.plano_y * 100}%`, transform: 'translate(-50%, -100%)', background: '#111', color: '#FFD100', font: '800 11px Archivo, sans-serif', padding: '3px 7px', borderRadius: 8, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            {l.nombre}
          </span>
        ))}
      </div>
      {enEste.length > 0 && (
        <div className="pildoras">
          {enEste.map((l) => <button key={l.id} type="button" className="pildora" onClick={() => quitar(l.id)}>Quitar {l.nombre} ✕</button>)}
        </div>
      )}
      {msg && <span role="status" style={{ fontWeight: 700 }}>{msg}</span>}
    </div>
  );
}
