import React, { useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { COCINAS } from './frases.js';

export const CATEGORIAS = [
  { id: 'comer', texto: 'Comer' },
  { id: 'cafe', texto: 'Café' },
  { id: 'musica', texto: 'Música' },
  { id: 'ropa', texto: 'Ropa' },
  { id: 'diseno', texto: 'Diseño y hogar' },
  { id: 'otros', texto: 'Otros' },
];

export default function ConfigurarLocal({ usuario, alGuardar }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('comer');
  const [cocina, setCocina] = useState('Chilena');
  const [estrella, setEstrella] = useState('');
  const [direccion, setDireccion] = useState('');
  const [pos, setPos] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function ubicar() {
    setError('');
    if (!navigator.geolocation) { setError('Este navegador no entrega la ubicación.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) }),
      () => setError('No pudimos leer la ubicación. Revisa que el navegador tenga permiso.'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function guardar(e) {
    e.preventDefault();
    if (!pos) { setError('Marca la ubicación estando dentro del local.'); return; }
    setGuardando(true); setError('');
    const { data, error } = await supabase.from('locales').insert({
      dueno_id: usuario.id,
      nombre: nombre.trim(),
      categoria,
      cocina_pais: categoria === 'comer' || categoria === 'cafe' ? cocina : null,
      producto_estrella: estrella.trim() || null,
      direccion: direccion.trim() || null,
      ubicacion: `SRID=4326;POINT(${pos.lng} ${pos.lat})`,
    }).select().single();
    if (!error) await supabase.from('perfiles').update({ rol: 'local' }).eq('id', usuario.id);
    setGuardando(false);
    if (error) { setError(explicar(error)); return; }
    alGuardar(data);
  }

  return (
    <form className="contenido" onSubmit={guardar}>
      <h1 className="letrista">TU LOCAL</h1>
      <label className="campo">Nombre del local
        <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Arepera La Chamita" />
      </label>
      <div className="campo">¿Qué es?
        <div className="pildoras">
          {CATEGORIAS.map((c) => (
            <button type="button" key={c.id} className={'pildora' + (categoria === c.id ? ' activa' : '')} onClick={() => setCategoria(c.id)}>{c.texto}</button>
          ))}
        </div>
      </div>
      {(categoria === 'comer' || categoria === 'cafe') && (
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
        <p className="ayuda">Aprieta el botón estando dentro del local. Así los caseritos te encuentran a la cuadra exacta.</p>
        <button type="button" className="boton negro" onClick={ubicar}>{pos ? 'Ubicación marcada ✓' : 'Estoy en mi local'}</button>
        {pos && <p className="ayuda">Precisión: ±{pos.precision} m</p>}
      </div>
      {error && <div className="error">{error}</div>}
      <button className="boton grande" disabled={guardando}>Guardar local</button>
    </form>
  );
}
