import React, { useEffect, useMemo, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { frasesPara, formatoPrecio } from './frases.js';
import Entrega from './Entrega.jsx';

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

function horaDe(iso) {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// base: un drop para duplicar o editar (si trae editarId). Sin base: drop nuevo.
export default function Crear({ local, base, alTerminar }) {
  const editarId = base && base.editarId;
  const bloqueado = !!(editarId && base.anotados > 0); // ya hay gente anotada: no se cambia precio ni tipo
  const [tipo, setTipo] = useState(base ? base.tipo : 'normal');
  const [titulo, setTitulo] = useState(base ? base.titulo : '');
  const [precio, setPrecio] = useState(base && base.precio != null ? String(base.precio) : '');
  const [precioNormal, setPrecioNormal] = useState(base && base.precio_normal != null ? String(base.precio_normal) : '');
  const [cupo, setCupo] = useState(base ? String(base.cupo) : '20');
  const [hasta, setHasta] = useState(editarId ? horaDe(base.termina_at) : horaPorDefecto());
  const [niveles, setNiveles] = useState(NIVELES_BASE);
  const [i, setI] = useState(0);
  const [frase, setFrase] = useState(base && base.frase ? base.frase : '');
  const [editada, setEditada] = useState(!!(base && base.frase));
  const [aprobada, setAprobada] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [entrega, setEntrega] = useState(null);

  useEffect(() => {
    if (!base || base.tipo !== 'grupal') return;
    supabase.from('drop_niveles').select('umbral, beneficio').eq('drop_id', base.id).order('umbral')
      .then(({ data }) => { if (data && data.length) setNiveles(data.map((n) => ({ umbral: String(n.umbral), beneficio: n.beneficio }))); });
  }, [base && base.id]);

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
    if (editarId && Number(cupo) < (base.canjes || 0)) { setError(`Ya van ${base.canjes} canjes: el cupo no puede ser menor.`); return; }
    setEnviando(true);
    const campos = {
      tipo,
      titulo: titulo.trim(),
      precio: precio === '' ? null : Number(precio),
      precio_normal: precioNormal === '' ? null : Number(precioNormal),
      cupo: Number(cupo),
      frase: fraseActual,
      frase_aprobada: true,
      termina_at: termina.toISOString(),
    };
    const { data, error } = editarId
      ? await supabase.from('drops').update(campos).eq('id', editarId).select().single()
      : await supabase.from('drops').insert({ ...campos, local_id: local.id }).select().single();
    if (!error && editarId) await supabase.from('drop_niveles').delete().eq('drop_id', editarId);
    if (!error && tipo === 'grupal') {
      const r = await supabase.from('drop_niveles').insert(
        niveles.filter((n) => n.umbral > 0 && n.beneficio.trim()).map((n) => ({ drop_id: data.id, umbral: Number(n.umbral), beneficio: n.beneficio.trim() }))
      );
      if (r.error) { setEnviando(false); setError(explicar(r.error)); return; }
    }
    setEnviando(false);
    if (error) { setError(explicar(error)); return; }
    setAprobada(false);
    if (editarId && alTerminar) { alTerminar('Cambios guardados.'); return; }
    setListo(data);
    setEntrega(data);
  }

  const tipoActual = TIPOS.find((t) => t.id === tipo);

  return (
    <div className="contenido crear">
      <h1 className="letrista">{editarId ? 'EDITAR DROP' : base ? 'DUPLICAR DROP' : 'SOLTAR UN DROP'}</h1>
      {base && (
        <div className="tarjeta" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="ayuda">{editarId ? 'Editando' : 'Copia de'}: <b>{base.titulo}</b></span>
          <button type="button" className="pildora" onClick={() => alTerminar && alTerminar()}>Cancelar</button>
        </div>
      )}
      {bloqueado && <p className="ayuda">Ya hay caseritos anotados, así que el tipo y los precios no se pueden cambiar. Puedes cambiar la frase, la hora o subir el cupo.</p>}

      <div className="campo">Tipo de drop
        <div className="pildoras">
          {TIPOS.map((t) => (
            <button type="button" key={t.id} disabled={bloqueado} className={'pildora' + (tipo === t.id ? ' activa' : '')} onClick={() => { setTipo(t.id); setListo(null); }}>{t.texto}</button>
          ))}
        </div>
        <p className="ayuda">{tipoActual.ayuda}</p>
      </div>

      <label className="campo">¿Qué ofreces?
        <input value={titulo} onChange={cambio(setTitulo)} placeholder="Ej: arepa reina pepiada + jugo" />
      </label>

      <div className="fila">
        <label className="campo">Precio drop
          <input inputMode="numeric" disabled={bloqueado} value={precio} onChange={cambio((v) => setPrecio(v.replace(/\D/g, '')))} placeholder="2990" style={{ background: 'var(--amarillo)', fontWeight: 800 }} />
        </label>
        <label className="campo">Precio normal
          <input inputMode="numeric" disabled={bloqueado} value={precioNormal} onChange={cambio((v) => setPrecioNormal(v.replace(/\D/g, '')))} placeholder="4500" />
        </label>
        <label className="campo">¿Cuántos?
          <input inputMode="numeric" value={cupo} onChange={cambio((v) => setCupo(v.replace(/\D/g, '')))} />
        </label>
        <label className="campo">Hasta las
          <input type="time" value={hasta} onChange={cambio(setHasta)} />
        </label>
      </div>
      {!editarId && (
        <div className="pildoras">
          <button type="button" className="pildora roja" onClick={() => { const d = new Date(Date.now() + 30 * 60000); setHasta(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')); setAprobada(false); setListo(null); }}>⚡ Relámpago · 30 min</button>
          <span className="ayuda" style={{ alignSelf: 'center' }}>Dura media hora y la app muestra la cuenta regresiva.</span>
        </div>
      )}

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
      {entrega && <Entrega drop={entrega} alTerminar={() => setEntrega(null)} />}
      {listo && (
        <div className="exito">
          <b className="letrista" style={{ fontSize: 20 }}>¡DROP PUBLICADO!</b>
          <span>{listo.titulo} {listo.precio ? '· ' + formatoPrecio(listo.precio) : ''}</span>
          <span style={{ fontSize: 13 }}>Ya aparece en el mapa para los caseritos a menos de 2 cuadras.</span>
        </div>
      )}
      <button className="boton grande" disabled={!aprobada || enviando} onClick={publicar}>
        {enviando ? 'Guardando…' : editarId ? 'Guardar cambios' : 'Soltar drop'}
      </button>
      {!aprobada && <p className="ayuda" style={{ textAlign: 'center' }}>Aprueba la frase para poder publicar.</p>}
    </div>
  );
}
