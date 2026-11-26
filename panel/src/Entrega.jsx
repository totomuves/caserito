import React, { useEffect } from 'react';
import { formatoPrecio } from './frases.js';

// El repartidor de Dropper entrega el flyer del drop recién soltado
export default function Entrega({ drop, alTerminar }) {
  useEffect(() => {
    const t = setTimeout(alTerminar, 3200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="entrega" role="status" aria-live="polite" onClick={alTerminar}>
      <div className="escena" aria-hidden="true">
        <div className="repartidor"><img src="/icono.svg?v=3" alt="" /></div>
        <div className="flyer">
          <span className="tag">DROP</span>
          <div>{drop.titulo}</div>
          {drop.precio ? <span className="precio">{formatoPrecio(drop.precio)}</span> : null}
        </div>
        <div className="mini" /><div className="mini" /><div className="mini" />
      </div>
      <h2>¡DROP SOLTADO!</h2>
      <p>Ya lo están viendo en el barrio.</p>
    </div>
  );
}
