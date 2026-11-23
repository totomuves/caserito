import React, { useEffect, useState } from 'react';
import { supabase, explicar } from './supabase.js';
import { formatoPrecio } from './frases.js';

// Tablero del local: todo en una pantalla (pensado para el computador, funciona en el celular).
// Métricas por período (hoy, 7 días, 30 días, este mes, 3 meses) comparadas con el período anterior.
// Se actualiza solo cada 20 segundos.
const PERIODOS = [
  { id: 'hoy', texto: 'Hoy', antes: 'ayer a esta hora' },
  { id: '7', texto: '7 días', antes: 'los 7 días anteriores' },
  { id: '30', texto: '30 días', antes: 'los 30 días anteriores' },
  { id: 'mes', texto: 'Este mes', antes: 'el mes pasado a esta fecha' },
  { id: '90', texto: '3 meses', antes: 'los 3 meses anteriores' },
];
const TIPO = { normal: 'Normal', grupal: 'Grupal', sorpresa: 'Sorpresa', recien_llegado: 'Recién llegado' };
const CLAVE = 'caserito_periodo';
const DIA = 24 * 3600 * 1000;

function inicioDia(f) { const x = new Date(f); x.setHours(0, 0, 0, 0); return x; }
function mismoDia(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function hora(f) { return new Date(f).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); }
function faltan(f) {
  const m = Math.round((new Date(f).getTime() - Date.now()) / 60000);
  if (m < 60) return `${Math.max(0, m)} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min` : `${Math.floor(h / 24)} días`;
}

// [desde, hasta] del período y del anterior (mismo largo, para comparar)
function rangos(periodo, ahora) {
  if (periodo === 'hoy') {
    const d = inicioDia(ahora);
    return { desde: d, hasta: ahora, pDesde: new Date(d - DIA), pHasta: new Date(ahora - DIA) };
  }
  if (periodo === 'mes') {
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const pDesde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const pHasta = new Date(pDesde.getTime() + (ahora - d));
    return { desde: d, hasta: ahora, pDesde, pHasta };
  }
  const n = Number(periodo);
  const d = inicioDia(new Date(ahora - (n - 1) * DIA));
  return { desde: d, hasta: ahora, pDesde: new Date(d - n * DIA), pHasta: d };
}

function Cambio({ ahora, antes }) {
  if (!antes && !ahora) return null;
  if (!antes) return <small className="cambio sube">nuevo</small>;
  const pct = Math.round(((ahora - antes) / antes) * 100);
  if (pct === 0) return <small className="cambio">= igual</small>;
  return <small className={'cambio ' + (pct > 0 ? 'sube' : 'baja')}>{pct > 0 ? '▲' : '▼'} {Math.abs(pct)}%</small>;
}

export default function Resumen({ local, alCrear }) {
  const [periodo, setPeriodo] = useState(() => { try { return localStorage.getItem(CLAVE) || '7'; } catch { return '7'; } });
  const [drops, setDrops] = useState(null);
  const [nota, setNota] = useState(null);
  const [historia, setHistoria] = useState(null);
  const [resenas, setResenas] = useState([]);
  const [error, setError] = useState('');
  const [cuando, setCuando] = useState(null);
  const [, setTic] = useState(0);

  function elegir(p) { setPeriodo(p); try { localStorage.setItem(CLAVE, p); } catch { /* nada */ } }

  async function cargar() {
    const { pDesde } = rangos(periodo, new Date());
    const [d, c, h, r] = await Promise.all([
      supabase.from('drops')
        .select('id, titulo, tipo, precio, cupo, inicia_at, termina_at, participaciones(usuario_id, anotado_at, canjeado_at)')
        .eq('local_id', local.id).gte('termina_at', pDesde.toISOString()).order('inicia_at', { ascending: false }),
      supabase.from('calificaciones').select('promedio, cantidad').eq('local_id', local.id).maybeSingle(),
      // Historia completa de canjes del local: para saber quién es nuevo y quién vuelve
      supabase.from('participaciones').select('usuario_id, canjeado_at, drops!inner(local_id)')
        .eq('drops.local_id', local.id).not('canjeado_at', 'is', null).limit(5000),
      supabase.from('resenas').select('estrellas, texto, creado_at').eq('local_id', local.id).eq('oculta', false).order('creado_at', { ascending: false }).limit(3),
    ]);
    if (d.error) { setError(explicar(d.error)); return; }
    setError(''); setDrops(d.data || []); setNota(c.data || null); setCuando(new Date());
    setHistoria(h.error ? null : h.data || []); setResenas(r.error ? [] : r.data || []);
  }
  useEffect(() => {
    cargar();
    const a = setInterval(cargar, 20000);
    const b = setInterval(() => setTic((x) => x + 1), 5000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [local.id, periodo]);

  const per = PERIODOS.find((p) => p.id === periodo) || PERIODOS[1];
  const encabezado = (
    <div className="tablero-titulo">
      <h1 className="letrista">{local.nombre.toUpperCase()}</h1>
      <div className="pildoras" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <button key={p.id} className={'pildora' + (p.id === periodo ? ' activa' : '')} aria-pressed={p.id === periodo} onClick={() => elegir(p.id)}>{p.texto}</button>
        ))}
      </div>
    </div>
  );

  if (error && !drops) return <div className="contenido">{encabezado}<div className="error">{error}</div></div>;
  if (!drops) return <div className="contenido">{encabezado}<p className="ayuda">Cargando…</p></div>;

  const ahora = new Date();
  const { desde, hasta, pDesde, pHasta } = rangos(periodo, ahora);
  const dentro = (f, a, b) => f >= a && f <= b;
  const m = { ventas: 0, canjes: 0, anotados: 0, drops: 0 };
  const p = { ventas: 0, canjes: 0, anotados: 0, drops: 0 };
  let porLlegar = 0;
  const canjes = [], enVivo = [], proximos = [];

  // Gráfico: por hora si es hoy; por día hasta 31 días; por semana si es más largo
  const modo = periodo === 'hoy' ? 'hora' : (hasta - desde) / DIA > 31 ? 'semana' : 'dia';
  const barras = [];
  if (modo === 'hora') for (let h = 8; h <= 23; h++) barras.push({ clave: h, etiqueta: String(h), titulo: `${h}:00`, n: 0 });
  else {
    const paso = modo === 'semana' ? 7 : 1;
    for (let f = inicioDia(desde); f <= hasta; f = new Date(f.getTime() + paso * DIA)) {
      barras.push({ clave: f.getTime(), desde: f, hasta: new Date(f.getTime() + paso * DIA), etiqueta: String(f.getDate()),
        titulo: modo === 'semana' ? `semana del ${f.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}` : f.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }), n: 0 });
    }
  }

  drops.forEach((d) => {
    const ps = d.participaciones || [];
    const inicio = new Date(d.inicia_at);
    const vivo = inicio <= ahora && new Date(d.termina_at) > ahora;
    if (vivo) {
      const c = ps.filter((x) => x.canjeado_at).length;
      enVivo.push({ ...d, anotados: ps.length, canjes: c });
      porLlegar += ps.length - c;
    } else if (inicio > ahora) proximos.push(d);
    if (dentro(inicio, desde, hasta)) m.drops += 1;
    if (dentro(inicio, pDesde, pHasta)) p.drops += 1;
    ps.forEach((x) => {
      const a = new Date(x.anotado_at);
      if (dentro(a, desde, hasta)) m.anotados += 1;
      if (dentro(a, pDesde, pHasta)) p.anotados += 1;
      if (!x.canjeado_at) return;
      const f = new Date(x.canjeado_at);
      canjes.push({ f, titulo: d.titulo, precio: d.precio });
      if (dentro(f, desde, hasta)) {
        m.canjes += 1; m.ventas += d.precio || 0;
        const b = modo === 'hora' ? barras.find((y) => y.clave === f.getHours()) : barras.find((y) => f >= y.desde && f < y.hasta);
        if (b) b.n += 1;
      }
      if (dentro(f, pDesde, pHasta)) { p.canjes += 1; p.ventas += d.precio || 0; }
    });
  });
  canjes.sort((a, b) => b.f - a.f);
  proximos.sort((a, b) => new Date(a.inicia_at) - new Date(b.inicia_at));
  const tasa = m.anotados ? Math.round((m.canjes / m.anotados) * 100) : null;

  // ¿Quién viene? Nuevos (primer canje en el período), vuelven (2+ canjes en total), únicos del período
  const primerCanje = {}, totalPorPersona = {};
  (historia || []).forEach((x) => {
    const f = new Date(x.canjeado_at);
    if (!primerCanje[x.usuario_id] || f < primerCanje[x.usuario_id]) primerCanje[x.usuario_id] = f;
    totalPorPersona[x.usuario_id] = (totalPorPersona[x.usuario_id] || 0) + 1;
  });
  const unicosPeriodo = new Set();
  drops.forEach((d) => (d.participaciones || []).forEach((x) => { if (x.canjeado_at && dentro(new Date(x.canjeado_at), desde, hasta)) unicosPeriodo.add(x.usuario_id); }));
  const nuevos = [...unicosPeriodo].filter((u) => primerCanje[u] && dentro(primerCanje[u], desde, hasta)).length;
  const historicos = Object.keys(totalPorPersona).length;
  const vuelven = Object.values(totalPorPersona).filter((n) => n >= 2).length;

  // Mejores drops del período, por canjes
  const ranking = drops.filter((d) => dentro(new Date(d.inicia_at), desde, hasta) || (d.participaciones || []).some((x) => x.canjeado_at && dentro(new Date(x.canjeado_at), desde, hasta)))
    .map((d) => {
      const ps = d.participaciones || [];
      const c = ps.filter((x) => x.canjeado_at && dentro(new Date(x.canjeado_at), desde, hasta)).length;
      return { id: d.id, titulo: d.titulo, anotados: ps.length, canjes: c, conv: ps.length ? Math.round((c / ps.length) * 100) : 0, ventas: c * (d.precio || 0), agotado: ps.filter((x) => x.canjeado_at).length >= d.cupo };
    })
    .sort((a, b) => b.canjes - a.canjes).slice(0, 5);

  // ¿Cuándo vienen? Por día de la semana y por hora, en el período
  const DIAS_SEM = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  const porDiaSem = DIAS_SEM.map((x) => ({ x, n: 0 }));
  const porHora = Array.from({ length: 16 }, (_, i) => ({ x: String(i + 8), n: 0 }));
  drops.forEach((d) => (d.participaciones || []).forEach((x) => {
    if (!x.canjeado_at) return;
    const f = new Date(x.canjeado_at);
    if (!dentro(f, desde, hasta)) return;
    porDiaSem[(f.getDay() + 6) % 7].n += 1;
    const hh = f.getHours();
    if (hh >= 8 && hh <= 23) porHora[hh - 8].n += 1;
  }));
  const maxSem = Math.max(1, ...porDiaSem.map((x) => x.n));
  const maxHora = Math.max(1, ...porHora.map((x) => x.n));
  const diaTop = porDiaSem.reduce((a, b) => (b.n > a.n ? b : a));
  const horaTop = porHora.reduce((a, b) => (b.n > a.n ? b : a));
  const horasConDatos = porHora.filter((x) => x.n > 0);
  const horaTranquila = horasConDatos.length >= 3 ? porHora.filter((x) => +x.x >= 10 && +x.x <= 20).reduce((a, b) => (b.n < a.n ? b : a)) : null;
  const maxBarra = Math.max(1, ...barras.map((x) => x.n));
  const mejor = barras.reduce((a, b) => (b.n > (a ? a.n : 0) ? b : a), null);
  const segundos = cuando ? Math.round((Date.now() - cuando.getTime()) / 1000) : 0;

  return (
    <div className="contenido tablero">
      {encabezado}
      <span className="ayuda" aria-live="polite"><span className="en-vivo" aria-hidden="true" /> Se actualiza solo · hace {segundos < 10 ? 'un momento' : `${segundos} s`} · comparado con {per.antes}</span>
      {error && <div className="error">{error}</div>}

      <div className="stats tablero-stats">
        <div className="stat" style={{ background: 'var(--amarillo)' }}><b>{formatoPrecio(m.ventas) || '$0'}</b><span style={{ color: 'var(--negro)' }}>ventas</span><Cambio ahora={m.ventas} antes={p.ventas} /></div>
        <div className="stat"><b>{m.canjes}</b><span>canjes</span><Cambio ahora={m.canjes} antes={p.canjes} /></div>
        <div className="stat"><b>{m.anotados}</b><span>se anotaron</span><Cambio ahora={m.anotados} antes={p.anotados} /></div>
        <div className="stat"><b>{tasa === null ? '–' : `${tasa}%`}</b><span>de los anotados canjeó</span></div>
        <div className="stat"><b>{m.drops}</b><span>drops soltados</span><Cambio ahora={m.drops} antes={p.drops} /></div>
        <div className="stat"><b>{nota && nota.cantidad ? Number(nota.promedio).toFixed(1) : '–'}</b><span>{nota && nota.cantidad ? `nota · ${nota.cantidad} reseñas` : 'sin reseñas aún'}</span></div>
      </div>

      <div className="tablero-cols">
        <section className="tablero-col" aria-labelledby="t-grafico">
          <h2 id="t-grafico" className="letrista">CANJES {modo === 'hora' ? 'POR HORA' : modo === 'semana' ? 'POR SEMANA' : 'POR DÍA'}</h2>
          <div className="tarjeta">
            <div className="barras" aria-hidden="true">
              {barras.map((x) => <div key={x.clave} title={`${x.titulo} · ${x.n}`} style={{ height: Math.max(4, (x.n / maxBarra) * 100) + '%', background: mejor === x && x.n > 0 ? 'var(--rojo)' : undefined }} />)}
            </div>
            <div className="etiquetas-horas" aria-hidden="true">{barras.map((x, i) => <span key={x.clave}>{barras.length > 16 && i % 2 ? '' : x.etiqueta}</span>)}</div>
            <p className="ayuda">
              {m.canjes} canjes en {per.texto.toLowerCase()}.
              {mejor && mejor.n > 0 ? ` El mejor ${modo === 'hora' ? 'horario' : modo === 'semana' ? 'semana' : 'día'} (en rojo): ${mejor.titulo}, con ${mejor.n}.` : ''}
            </p>
          </div>

          <h2 className="letrista">DROPS EN VIVO{porLlegar ? ` · ${porLlegar} POR LLEGAR` : ''}</h2>
          {enVivo.length === 0 && (
            <div className="tarjeta">
              <span>No tienes drops en vivo ahora.</span>
              {alCrear && <button className="boton" style={{ alignSelf: 'flex-start' }} onClick={alCrear}>Soltar un drop</button>}
            </div>
          )}
          {enVivo.map((d) => {
            const pct = Math.min(100, Math.round((d.canjes / d.cupo) * 100));
            return (
              <div className="tarjeta" key={d.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b>{d.titulo}</b>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--azul)', whiteSpace: 'nowrap' }}>TERMINA EN {faltan(d.termina_at).toUpperCase()}</span>
                </div>
                <div className="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={d.cupo} aria-valuenow={d.canjes} aria-label={`${d.canjes} de ${d.cupo} canjeados`}>
                  <div style={{ width: pct + '%' }} />
                </div>
                <span className="ayuda">{TIPO[d.tipo] || d.tipo} · {d.canjes} de {d.cupo} canjeados · quedan {Math.max(0, d.cupo - d.canjes)} · {d.anotados - d.canjes} anotados por llegar</span>
              </div>
            );
          })}

          {proximos.length > 0 && (
            <>
              <h2 className="letrista">PRÓXIMOS</h2>
              {proximos.map((d) => (
                <div className="tarjeta" key={d.id}>
                  <b>{d.titulo}</b>
                  <span className="ayuda">Parte en {faltan(d.inicia_at)} · {new Date(d.inicia_at).toLocaleString('es-CL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · cupo {d.cupo}</span>
                </div>
              ))}
            </>
          )}
        </section>

        <section className="tablero-col" aria-labelledby="t-ultimos">
          <h2 id="t-ultimos" className="letrista">ÚLTIMOS CANJES</h2>
          <div className="tarjeta">
            {canjes.length === 0 ? <span className="ayuda">Todavía no hay canjes. Cuando un caserito canjee, aparece aquí al tiro.</span> : (
              <ul className="feed">
                {canjes.slice(0, 12).map((c, i) => (
                  <li key={i}>
                    <span className="feed-hora">{mismoDia(c.f, ahora) ? hora(c.f) : c.f.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</span>
                    <span className="feed-texto">{c.titulo}</span>
                    <span className="feed-precio">{formatoPrecio(c.precio) || ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className="letrista">TUS CASERITOS</h2>
          <div className="tarjeta">
            {historia === null ? <span className="ayuda">No se pudo cargar la historia de canjes.</span> : (
              <div className="mini-stats">
                <div><b>{unicosPeriodo.size}</b><span>vinieron en {per.texto.toLowerCase()}</span></div>
                <div><b>{nuevos}</b><span>nuevos (primera vez)</span></div>
                <div><b>{historicos ? Math.round((vuelven / historicos) * 100) : 0}%</b><span>vuelve a canjear</span></div>
                <div><b>{historicos}</b><span>caseritos en total · tu lámina entregada</span></div>
              </div>
            )}
            <span className="ayuda">{historicos && vuelven / historicos < 0.25 ? 'Pocos vuelven: prueba un premio por láminas repetidas en "Editar mi local".' : historicos ? '¡Buena fidelidad! Los que vuelven son tus mejores caseritos.' : 'Cuando lleguen tus primeros caseritos, aquí ves cuántos son nuevos y cuántos vuelven.'}</span>
          </div>

          <h2 className="letrista">¿CUÁNDO VIENEN?</h2>
          <div className="tarjeta">
            <b style={{ fontSize: 13 }}>Por día</b>
            <div className="barras chicas" aria-hidden="true">{porDiaSem.map((x) => <div key={x.x} title={`${x.x}: ${x.n}`} style={{ height: Math.max(4, (x.n / maxSem) * 100) + '%', background: x === diaTop && x.n ? 'var(--rojo)' : undefined }} />)}</div>
            <div className="etiquetas-horas" aria-hidden="true">{porDiaSem.map((x) => <span key={x.x}>{x.x}</span>)}</div>
            <b style={{ fontSize: 13, marginTop: 6 }}>Por hora</b>
            <div className="barras chicas" aria-hidden="true">{porHora.map((x) => <div key={x.x} title={`${x.x}:00 · ${x.n}`} style={{ height: Math.max(4, (x.n / maxHora) * 100) + '%', background: x === horaTop && x.n ? 'var(--rojo)' : undefined }} />)}</div>
            <div className="etiquetas-horas" aria-hidden="true">{porHora.map((x, i) => <span key={x.x}>{i % 2 ? '' : x.x}</span>)}</div>
            <p className="ayuda">
              {m.canjes ? `Tu mejor día es el ${diaTop.x.toLowerCase()} y tu mejor hora las ${horaTop.x}:00.` : 'Todavía no hay canjes en este período.'}
              {horaTranquila ? ` La hora más tranquila es las ${horaTranquila.x}:00: buen momento para soltar un drop.` : ''}
            </p>
          </div>

          <h2 className="letrista">TUS MEJORES DROPS</h2>
          <div className="tarjeta">
            {ranking.length === 0 ? <span className="ayuda">No hay drops en este período.</span> : (
              <table className="tabla">
                <thead><tr><th scope="col">Drop</th><th scope="col">Canjes</th><th scope="col">Convierte</th><th scope="col">Ventas</th></tr></thead>
                <tbody>
                  {ranking.map((r) => (
                    <tr key={r.id}>
                      <td>{r.titulo}{r.agotado ? <span className="pilita">agotado</span> : null}</td>
                      <td>{r.canjes}/{r.anotados}</td>
                      <td>{r.conv}%</td>
                      <td>{formatoPrecio(r.ventas) || '$0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <span className="ayuda">Convierte = de los que se anotaron, cuántos llegaron a canjear. Si un drop se agota rápido, súbele el cupo o repítelo con "Duplicar".</span>
          </div>

          <Premios local={local} desde={desde} hasta={hasta} />

          <h2 className="letrista">LO QUE DICEN</h2>
          <div className="tarjeta">
            {resenas.length === 0 ? <span className="ayuda">Todavía no tienes reseñas. Solo pueden opinar quienes canjearon.</span> : resenas.map((r, i) => (
              <div key={i} style={{ borderBottom: i < resenas.length - 1 ? '2px dashed #CDBF9F' : 0, paddingBottom: 8 }}>
                <b aria-label={`${r.estrellas} de 5 estrellas`}>{'★'.repeat(r.estrellas)}{'☆'.repeat(5 - r.estrellas)}</b>
                {r.texto ? <div>{r.texto}</div> : null}
                <span className="ayuda">{new Date(r.creado_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}


// Premios que entregó el local: cambios de láminas repetidas y el arte del barrio (SQL 023)
function Premios({ local, desde, hasta }) {
  const [filas, setFilas] = useState(null);
  const [falta, setFalta] = useState(false);
  useEffect(() => {
    supabase.rpc('premios_del_local', { p_local: local.id }).then(({ data, error }) => {
      if (error) { setFalta(true); setFilas([]); } else setFilas(data || []);
    });
  }, [local.id]);
  if (!filas) return null;
  const enPeriodo = filas.filter((f) => f.entregado_at && new Date(f.entregado_at) >= desde && new Date(f.entregado_at) <= hasta);
  const pendientes = filas.filter((f) => f.estado === 'pendiente');
  const laminas = enPeriodo.reduce((s, f) => s + (f.tipo === 'repetidas' ? f.cantidad : 0), 0);
  const fecha = (x) => new Date(x).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <>
      <h2 className="letrista">PREMIOS ENTREGADOS</h2>
      <div className="tarjeta" style={{ gap: 10 }}>
        {falta ? <span className="ayuda">Para ver los premios entregados, falta correr el SQL 023.</span> : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="mini-stat"><b>{enPeriodo.length}</b><span>premios entregados</span></div>
              <div className="mini-stat"><b>{laminas}</b><span>láminas repetidas recibidas</span></div>
              <div className="mini-stat"><b>{pendientes.length}</b><span>por retirar</span></div>
            </div>
            {!local.repetidas_premio && <span className="ayuda">Todavía no ofreces premio por repetidas. Ponlo en "Editar mi local" para que tus caseritos vuelvan.</span>}
            {filas.length === 0 ? <span className="ayuda">Aquí vas a ver cada premio que entregues: quién, qué y cuándo.</span> : (
              <table className="tabla">
                <thead><tr><th>Dropper</th><th>Premio</th><th>Pidió</th><th>Estado</th></tr></thead>
                <tbody>
                  {filas.slice(0, 12).map((f, i) => (
                    <tr key={i}>
                      <td>{f.caserito}</td>
                      <td>{f.tipo === 'arte' ? '🎨 ' : `${f.cantidad} repetidas → `}{f.premio}</td>
                      <td>{fecha(f.pedido_at)}</td>
                      <td style={{ fontWeight: 800, color: f.estado === 'entregado' ? 'var(--azul)' : f.estado === 'pendiente' ? 'var(--rojo)' : '#8A7A66' }}>
                        {f.estado === 'entregado' ? `✓ ${fecha(f.entregado_at)}` : f.estado === 'pendiente' ? 'Por retirar' : 'Venció'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </>
  );
}
