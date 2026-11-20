import React, { useEffect, useRef, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { formatoPrecio } from './frases.js';
import jsQR from 'jsqr';

export default function Escanear() {
  const video = useRef(null);
  const ocupado = useRef(false);
  const [camara, setCamara] = useState('iniciando');
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream, timer, cancelado = false;
    (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setCamara('sin-lector'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelado) return;
        video.current.srcObject = stream;
        await video.current.play();
        setCamara('lista');
        // Android/Chrome trae lector nativo; iPhone/Safari no, ahí usamos jsQR.
        const nativo = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
        const lienzo = document.createElement('canvas');
        const ctx = lienzo.getContext('2d', { willReadFrequently: true });
        timer = setInterval(async () => {
          const v = video.current;
          if (ocupado.current || !v || v.readyState < 2 || !v.videoWidth) return;
          try {
            if (nativo) {
              const codigos = await nativo.detect(v);
              if (codigos.length) canjear(codigos[0].rawValue);
            } else {
              const escala = Math.min(1, 640 / v.videoWidth);
              lienzo.width = Math.round(v.videoWidth * escala);
              lienzo.height = Math.round(v.videoHeight * escala);
              ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height);
              const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
              const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
              if (qr && qr.data) canjear(qr.data);
            }
          } catch { /* sigue intentando */ }
        }, 350);
      } catch {
        setCamara('sin-permiso');
      }
    })();
    return () => {
      cancelado = true;
      clearInterval(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function canjear(valor) {
    const limpio = String(valor || '').replace(/\s/g, '').toUpperCase();
    if (!limpio || ocupado.current) return;
    ocupado.current = true;
    setError(''); setResultado(null);
    const { data, error } = await supabase.rpc('canjear', { p_codigo: limpio });
    if (error) {
      setError(explicar(error));
    } else {
      const fila = Array.isArray(data) ? data[0] : data;
      const extra = fila && fila.tipo === 'repetidas' ? { data: null }
        : await supabase.from('participaciones').select('drops(precio, cupo)').eq('codigo', limpio).maybeSingle();
      const drop = extra.data && extra.data.drops;
      setResultado({ ...fila, precio: drop ? drop.precio : null, cupo: drop ? drop.cupo : null });
      setCodigo('');
      if (navigator.vibrate) navigator.vibrate(150);
    }
    setTimeout(() => { ocupado.current = false; }, 2500);
  }

  return (
    <div className="contenido">
      <h1 className="letrista">ESCANEAR</h1>
      <div className="camara">
        <video ref={video} playsInline muted />
        <div className="marco" aria-hidden="true" />
        {camara !== 'lista' && (
          <p style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--papel)', textAlign: 'center', padding: 24, margin: 0, fontWeight: 700 }}>
            {camara === 'iniciando' && 'Abriendo cámara…'}
            {camara === 'sin-permiso' && 'Dale permiso a la cámara en el navegador, o escribe el código abajo.'}
            {camara === 'sin-lector' && 'Este navegador no deja usar la cámara. Abre el panel en Safari o Chrome, o escribe el código abajo.'}
          </p>
        )}
      </div>

      <form style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); canjear(codigo); }}>
        <label className="campo" style={{ flex: 1 }}>¿No lee? Escribe el código
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: K7Q2M9XA" style={{ letterSpacing: 2, textTransform: 'uppercase' }} />
        </label>
        <button className="boton negro">Canjear</button>
      </form>

      {error && <div className="error">{error}</div>}
      {resultado && (
        <div className="exito">
          <b className="letrista" style={{ fontSize: 22 }}>¡CANJEADO!</b>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{resultado.titulo}</span>
          {resultado.tipo === 'repetidas' ? (
            <span style={{ fontSize: 18 }}>Entrégale: <b>{resultado.beneficio}</b> · sin cobro</span>
          ) : resultado.beneficio && <span>Nivel grupal alcanzado: <b>{resultado.beneficio}</b></span>}
          {resultado.precio ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>Cobrar</span><span className="precio">{formatoPrecio(resultado.precio)}</span>
            </div>
          ) : null}
          {resultado.tipo !== 'repetidas' && <span style={{ fontSize: 13 }}>
            Van {resultado.canjeados}{resultado.cupo ? ` de ${resultado.cupo}` : ''}
            {resultado.lamina_nueva ? ' · ¡Este caserito ganó tu lámina del álbum!' : ''}
          </span>}
        </div>
      )}
    </div>
  );
}
