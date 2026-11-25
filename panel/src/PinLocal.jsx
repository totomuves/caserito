import React, { useEffect, useRef, useState } from 'react';
import { cargarLeaflet } from './MapaAdmin.jsx';

// Mapa para ajustar la ubicación del local arrastrando el pin (o tocando el mapa)
export default function PinLocal({ punto, alCambiar }) {
  const caja = useRef(null);
  const mapa = useRef(null);
  const pin = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    cargarLeaflet().then((L) => {
      if (!vivo || !caja.current || mapa.current) return;
      const centro = punto || { lat: -33.4445, lng: -70.6265 };
      const m = L.map(caja.current, { zoomControl: true }).setView([centro.lat, centro.lng], punto ? 18 : 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
      const icono = L.divIcon({ className: '', iconSize: [34, 46], iconAnchor: [17, 44],
        html: '<svg width="34" height="46" viewBox="0 0 34 46"><path d="M17 45C17 45 2 27 2 16a15 15 0 0 1 30 0c0 11-15 29-15 29z" fill="#E30A2F" stroke="#111" stroke-width="3"/><circle cx="17" cy="16" r="6" fill="#FFD100" stroke="#111" stroke-width="2"/></svg>' });
      pin.current = L.marker([centro.lat, centro.lng], { draggable: true, icon: icono, autoPan: true }).addTo(m);
      const mover = (ll) => alCambiar({ lat: ll.lat, lng: ll.lng, precision: 0, manual: true });
      pin.current.on('dragend', () => mover(pin.current.getLatLng()));
      m.on('click', (e) => { pin.current.setLatLng(e.latlng); mover(e.latlng); });
      mapa.current = m;
      setTimeout(() => m.invalidateSize(), 60);
    }).catch((e) => setError(e.message));
    return () => { vivo = false; if (mapa.current) { mapa.current.remove(); mapa.current = null; } };
  }, []);

  // Si llega una ubicación nueva por GPS ("Estoy en mi local"), el pin se mueve ahí
  useEffect(() => {
    if (!punto || !pin.current || !mapa.current || punto.manual) return;
    pin.current.setLatLng([punto.lat, punto.lng]);
    mapa.current.setView([punto.lat, punto.lng], 18);
  }, [punto && punto.lat, punto && punto.lng]);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div ref={caja} style={{ height: 280, borderRadius: 12, border: '2px solid #111', overflow: 'hidden', background: '#eee' }} />
      <span className="ayuda">{error || 'Arrastra el pin rojo hasta la puerta de tu local (o toca el mapa). Puedes acercar con + y −.'}</span>
    </div>
  );
}
