import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { traerTiendas, mismoNombre, dentroDe, tipoLegible } from './osm.js';
import MapaAdmin from './MapaAdmin.jsx';

// Admin · Tiendas del barrio desde OpenStreetMap: aparecen en el mapa de la app como "aún no está en Dropper"
// y quedan como lista de locales para invitar.
export default function Prospectos({ barrio, locales }) {
  const [tiendas, setTiendas] = useState(null);
  const [msg, setMsg] = useState('');
  const [trayendo, setTrayendo] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [n, setN] = useState(0);
  const [anillo, setAnillo] = useState(null);

  useEffect(() => {
    supabase.from('tiendas_osm').select('*').eq('barrio_id', barrio.id).is('lugar_id', null).order('nombre')
      .then(({ data, error }) => { if (error) setMsg(/tiendas_osm/.test(error.message || '') ? 'Para traer tiendas de OpenStreetMap, corre el SQL 028.' : explicar(error)); setTiendas(data || []); });
  }, [barrio.id, n]);

  async function traer() {
    setTrayendo(true); setMsg('Buscando tiendas en OpenStreetMap… (puede tardar unos segundos)');
    try {
      const { data: bs, error } = await supabase.rpc('barrios_mapa');
      if (error) throw error;
      const b = (bs || []).find((x) => x.id === barrio.id);
      const anillo = (b && b.limite && b.limite.coordinates && b.limite.coordinates[0]) || [];
      if (anillo.length < 3) throw new Error('Este barrio no tiene límites dibujados.');
      setAnillo(anillo);
      const lngs = anillo.map((p) => p[0]), lats = anillo.map((p) => p[1]);
      const todas = await traerTiendas({ bbox: [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)] });
      const aca = todas.filter((t) => dentroDe(t, anillo));
      const filas = aca.map((t) => {
        const l = locales.find((x) => mismoNombre(x.nombre, t.nombre));
        return { ...t, barrio_id: barrio.id, local_id: l ? l.id : null, actualizado_at: new Date().toISOString() };
      });
      for (let i = 0; i < filas.length; i += 400) {
        const up = await supabase.from('tiendas_osm').upsert(filas.slice(i, i + 400), { onConflict: 'osm_id' });
        if (up.error) throw up.error;
      }
      const ya = filas.filter((f) => f.local_id).length;
      setMsg(`Listo ✓ ${filas.length} tiendas en ${barrio.nombre}: ${ya} ya están en Dropper y ${filas.length - ya} para invitar. Ya aparecen en el mapa de la app como puntos grises.`);
      setAbierto(true); setN(n + 1);
    } catch (e) {
      setMsg(/tiendas_osm/.test(e.message || '') ? 'Falta correr el SQL 028 (tiendas de OpenStreetMap).' : explicar(e));
    }
    setTrayendo(false);
  }

  useEffect(() => {
    if (!abierto || anillo) return;
    supabase.rpc('barrios_mapa').then(({ data }) => {
      const b = (data || []).find((x) => x.id === barrio.id);
      const a = b && b.limite && b.limite.coordinates && b.limite.coordinates[0];
      if (a) setAnillo(a);
    });
  }, [abierto]);

  async function invitar(t) {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('invitaciones').insert({ nombre_local: t.nombre, creada_por: u.user.id }).select().single();
    if (error) { setMsg(explicar(error)); return; }
    const link = `${window.location.origin}/?invitacion=${data.codigo}`;
    const texto = `¡Hola ${t.nombre}! Te invito a Dropper, la app de drops de ${barrio.nombre}. Inscribe tu local aquí y queda aprobado al tiro: ${link}`;
    const fono = String(t.telefono || '').replace(/\D/g, '');
    if (fono.length >= 8) window.open(`https://wa.me/${fono.length <= 9 ? '56' + fono : fono}?text=${encodeURIComponent(texto)}`, '_blank');
    else { try { await navigator.clipboard.writeText(texto); setMsg(`Invitación para ${t.nombre} copiada ✓ Pégala donde quieras.`); } catch (e) { window.prompt('Copia la invitación:', texto); } }
  }
  async function ocultar(t) {
    const { error } = await supabase.from('tiendas_osm').update({ oculta: true }).eq('osm_id', t.osm_id);
    if (error) setMsg(explicar(error)); else setN(n + 1);
  }

  const lista = (tiendas || []).filter((t) => !t.local_id && !t.oculta && (!filtro || (t.nombre + ' ' + tipoLegible(t.tipo)).toLowerCase().includes(filtro.toLowerCase())));
  const total = (tiendas || []).filter((t) => !t.oculta).length;
  return (
    <div style={{ display: 'grid', gap: 8, borderTop: '1px solid #ddd', paddingTop: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <b>Tiendas de OpenStreetMap</b>
        <span className="ayuda">{total ? `${total} tiendas · ${total - lista.length} ya en Dropper u ocultas` : 'Todavía no traes tiendas'}</span>
        <button type="button" className="pildora" onClick={traer} disabled={trayendo}>{trayendo ? 'Trayendo…' : total ? 'Actualizar' : 'Traer tiendas'}</button>
        {total > 0 && <button type="button" className="pildora" onClick={() => setAbierto(!abierto)}>{abierto ? 'Esconder mapa y lista' : `Ver mapa y ${lista.length} para invitar`}</button>}
      </div>
      {msg && <span role="status" style={{ fontWeight: 700 }}>{msg}</span>}
      {abierto && (
        <>
          <MapaAdmin poligono={anillo}
            puntos={(tiendas || []).filter((t) => !t.oculta).map((t) => ({ lat: t.lat, lng: t.lng, nombre: t.nombre, detalle: t.local_id ? 'Ya está en Dropper' : `${tipoLegible(t.tipo)} · aún no está en Dropper`, color: t.local_id ? '#111111' : '#8A8A8A', grande: !!t.local_id }))} />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por nombre o tipo (café, ropa…)" style={{ minHeight: 40 }} />
          <div style={{ display: 'grid', gap: 6, maxHeight: 420, overflow: 'auto' }}>
            {lista.map((t) => (
              <div key={t.osm_id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', border: '1px solid #ddd', borderRadius: 10, padding: '6px 10px' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <b>{t.nombre}</b> <span className="ayuda">· {tipoLegible(t.tipo)}</span>
                  <div className="ayuda">{[t.direccion, t.telefono].filter(Boolean).join(' · ') || 'Sin dirección ni teléfono en OpenStreetMap'}</div>
                </div>
                <button type="button" className="pildora" onClick={() => invitar(t)}>{t.telefono ? 'Invitar por WhatsApp' : 'Copiar invitación'}</button>
                <button type="button" className="pildora" onClick={() => ocultar(t)} title="Cerró o el dato está malo">Ocultar</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
