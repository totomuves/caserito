import React, { useMemo, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { frasesPara, formatoPrecio } from './frases.js';

const TIPOS = [
  { id: 'normal', texto: 'Normal', ayuda: 'Precio fijo para los primeros que lleguen.' },
  { id: 'grupal', texto: 'Grupal', ayuda: 'Mejora mientras más gente canjea. Tú defines los niveles.' },
  { id: 'sorpresa', texto: 'Sorpresa', ayuda: 'El cliente no sabe qué es hasta que llega al local.' },
  { id: 'recien_llegado', texto: 'Recién llegado', ayuda: 'Avisa que llegó mercadería nueva (vinilos, temporada, piezas únicas).' },
];

const NIVELES_BASE = [
  { umbral: 10, beneficio: '10%' },
  { umbral: 25, beneficio: '20%' },
  { umbral: 50, beneficio: '2x1' },
];

function horaPorDefecto() {
  const d = new Date(Date.now() + 2 * 3600 * 1000);
  return String(d.getHours()).padStart(2, '0') + ':00';
}

export default function Crear({ local }) {
  const [tipo, setTipo] = useState('normal');
  const [titulo, setTitulo] = useState('');
  const [precio, setPrecio] = useState('');
  const [precioNormal, setPrecioNormal] = useState('');
  const [cupo, setCupo] = useState('20');
  const [hasta, setHasta] = useState(horaPorDefecto());
  const [niveles, setNiveles] = useState(NIVELES_BASE);
  const [i, setI] = useState(0);
  const [frase, setFrase] = useState('');
  const [editada, setEditada] = useState(false);
  const [aprobada, setAprobada] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const opciones = useMemo(
    () => frasesPara(local.cocina_pais || 'Otra', { producto: titulo.trim(), precio, cupo, hora: hasta }),
    [local.cocina_pais, titulo, precio, cupo, hasta]
  );
  const fraseActual = editada ? frase : opciones[i % opciones.length];

  function cambio(setter) {
    return (e) => { setter(e.target.value); setAprobada(false); setListo(null); };
  }

  function terminaEn() {
    const [h, m] = hasta.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  async function publicar() {
    setError('');
    const termina = terminaEn();
    if (!titulo.trim()) { setError('Escribe qué ofreces.'); return; }
    if (termina <= new Date()) { setError('La hora de término ya pasó. Elige una hora más tarde.'); return; }
    if (!(Number(cupo) > 0)) { setError('Indica cuántos hay.'); return; }
    setEnviando(true);
    const { data, error } = await supabase.from('drops').insert({
      local_id: local.id,
      tipo,
      titulo: titulo.trim(),
      precio: precio === '' ? null : Number(precio),
      precio_normal: precioNormal === '' ? null : Number(precioNormal),
      cupo: Number(cupo),
      frase: fraseActual,
      frase_aprobada: true,
      termina_at: termina.toISOString(),
    }).select().single();
    if (!error && tipo === 'grupal') {
      const r = await supabase.from('drop_niveles').insert(
        niveles.filter((n) => n.umbral > 0 && n.beneficio.trim()).map((n) => ({ drop_id: data.id, umbral: Number(n.umbral), beneficio: n.beneficio.trim() }))
      );
      if (r.error) { setEnviando(false); setError(explicar(r.error)); return; }
    }
    setEnviando(false);
    if (error) { setError(explicar(error)); return; }
    setListo(data);
    setAprobada(false);
  }

  const tipoActual = TIPOS.find((t) => t.id === tipo);

  return (
    <div className="contenido">
      <h1 className="letrista">SOLTAR UN DROP</h1>

      <div className="campo">Tipo de drop
        <div className="pildoras">
          {TIPOS.map((t) => (
            <button type="button" key={t.id} className={'pildora' + (tipo === t.id ? ' activa' : '')} onClick={() => { setTipo(t.id); setListo(null); }}>{t.texto}</button>
          ))}
        </div>
        <p className="ayuda">{tipoActual.ayuda}</p>
      </div>

      <label className="campo">¿Qué ofreces?
        <input value={titulo} onChange={cambio(setTitulo)} placeholder="Ej: arepa reina pepiada + jugo" />
      </label>

      <div className="fila">
        <label className="campo">Precio drop
          <input inputMode="numeric" value={precio} onChange={cambio((v) => setPrecio(v.replace(/\D/g, '')))} placeholder="2990" style={{ background: 'var(--amarillo)', fontWeight: 800 }} />
        </label>
        <label className="campo">Precio normal
          <input inputMode="numeric" value={precioNormal} onChange={cambio((v) => setPrecioNormal(v.replace(/\D/g, '')))} placeholder="4500" />
        </label>
        <label className="campo">¿Cuántos?
          <input inputMode="numeric" value={cupo} onChange={cambio((v) => setCupo(v.replace(/\D/g, '')))} />
        </label>
        <label className="campo">Hasta las
          <input type="time" value={hasta} onChange={cambio(setHasta)} />
        </label>
      </div>

      {tipo === 'grupal' && (
        <div className="tarjeta">
          <b>Niveles (por canjes reales)</b>
          {niveles.map((n, k) => (
            <div className="fila" key={k}>
              <label className="campo">Con
                <input inputMode="numeric" value={n.umbral} onChange={(e) => setNiveles(niveles.map((x, j) => j === k ? { ...x, umbral: e.target.value.replace(/\D/g, '') } : x))} />
              </label>
              <label className="campo">Beneficio
                <input value={n.beneficio} onChange={(e) => setNiveles(niveles.map((x, j) => j === k ? { ...x, beneficio: e.target.value } : x))} />
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="pizarra">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="etiqueta">Así lo verán tus caseritos{local.cocina_pais ? ` · ${local.cocina_pais}` : ''}</span>
          <button type="button" className="pildora" style={{ background: 'transparent', color: 'var(--papel)', borderColor: 'var(--papel)' }}
            onClick={() => { setEditada(false); setI(i + 1); setAprobada(false); }}>Otra frase</button>
        </div>
        {editada ? (
          <textarea value={frase} onChange={(e) => { setFrase(e.target.value); setAprobada(false); }}
            style={{ borderRadius: 12, border: '2px solid var(--papel)', background: 'transparent', color: 'var(--papel)', padding: 10, fontSize: 18, minHeight: 90 }} />
        ) : (
          <p className="frase letrista">“{fraseActual}”</p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {!editada && <button type="button" className="pildora" onClick={() => { setFrase(fraseActual); setEditada(true); setAprobada(false); }}>Editar</button>}
          <button type="button" className={'pildora' + (aprobada ? ' activa' : '')} style={{ flex: 1 }} onClick={() => setAprobada(!aprobada)}>
            {aprobada ? 'Frase aprobada ✓' : 'Apruebo esta frase'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {listo && (
        <div className="exito">
          <b className="letrista" style={{ fontSize: 20 }}>¡DROP PUBLICADO!</b>
          <span>{listo.titulo} {listo.precio ? '· ' + formatoPrecio(listo.precio) : ''}</span>
          <span style={{ fontSize: 13 }}>Ya aparece en el mapa para los caseritos a menos de 2 cuadras.</span>
        </div>
      )}
      <button className="boton grande" disabled={!aprobada || enviando} onClick={publicar}>
        {enviando ? 'Publicando…' : 'Soltar drop'}
      </button>
      {!aprobada && <p className="ayuda" style={{ textAlign: 'center' }}>Aprueba la frase para poder publicar.</p>}
    </div>
  );
}
