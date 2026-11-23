import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Dirección pública de la app para caseritos (cámbiala aquí cuando esté caserito.cl)
export const URL_APP = 'https://dropper.site';

// QR listo para imprimir y descargar
export default function Qr({ url, titulo, bajada, archivo = 'caserito-qr.png' }) {
  const [img, setImg] = useState('');
  useEffect(() => {
    QRCode.toDataURL(url, { width: 900, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#FFFFFF' } })
      .then(setImg).catch(() => setImg(''));
  }, [url]);
  return (
    <div className="tarjeta" style={{ alignItems: 'center', textAlign: 'center' }}>
      {titulo && <b className="letrista" style={{ fontSize: 22 }}>{titulo}</b>}
      {img ? <img src={img} alt={`Código QR que abre ${url}`} style={{ width: 240, height: 240, border: '2.5px solid var(--negro)', borderRadius: 14 }} /> : <p className="ayuda">Generando…</p>}
      <span className="ayuda" style={{ wordBreak: 'break-all' }}>{url}</span>
      {bajada && <span style={{ lineHeight: 1.45 }}>{bajada}</span>}
      {img && <a className="boton" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={img} download={archivo}>Descargar QR</a>}
    </div>
  );
}
