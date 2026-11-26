// Pines del mapa web compartidos (mapa del inicio y mapa grande): lámina chica del local y póster del mall
import { arteHtml } from './arteLocal';
import { precio } from './tema';
import { semillaPoster, paletaPoster } from './Poster';

const esc = (x) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const CSS_PINES = `
  .mini-lam { display:flex; flex-direction:column; align-items:center; cursor:pointer; transform: rotate(var(--contra, 0deg)); transition: transform .3s ease-out; }
  .mini-lam .carta { position:relative; width:40px; height:40px; box-sizing:border-box; overflow:hidden; background:#fff; border:1px solid #D9D9DF; border-radius:8px; padding:2px; box-shadow:0 3px 8px rgba(17,17,17,.18); }
  .mini-lam.con-drop .carta { border:2px solid #111; }
  .mini-lam .nom { font:800 8px Archivo, sans-serif; color:#111; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:56px; margin-top:1px; text-shadow:0 0 3px #fff, 0 0 3px #fff; }
  .mini-lam .precio { font:800 10px Archivo, sans-serif; background:#FFD100; color:#111; border-radius:8px; padding:1px 6px; margin-bottom:2px; box-shadow:0 2px 5px rgba(17,17,17,.2); white-space:nowrap; }
  .mini-lam .punta { width:6px; height:6px; border-radius:3px; background:#111; margin-top:2px; }
  /* A menos de 20 m del drop: la lámina tintinea */
  @keyframes droper-tintineo { 0%,100% { transform: rotate(0deg) scale(1); } 15% { transform: rotate(-9deg) scale(1.12); } 30% { transform: rotate(8deg) scale(1.12); } 45% { transform: rotate(-6deg) scale(1.08); } 60% { transform: rotate(4deg) scale(1.05); } 75% { transform: rotate(0deg) scale(1); } }
  @keyframes droper-brillo { 0%,100% { box-shadow: 0 0 0 0 rgba(255,209,0,.9), 0 3px 8px rgba(17,17,17,.18); } 50% { box-shadow: 0 0 0 10px rgba(255,209,0,0), 0 3px 8px rgba(17,17,17,.18); } }
  .mini-lam.tintinea .carta { animation: droper-tintineo 1.1s ease-in-out infinite, droper-brillo 1.1s ease-out infinite; border-color: #E30A2F; }
  .mini-lam.tintinea .precio { background: #E30A2F; color: #fff; animation: droper-tintineo 1.1s ease-in-out infinite; }
  .poster-pin { display:flex; flex-direction:column; align-items:center; cursor:pointer; transform: rotate(var(--contra, 0deg)); }
  .poster-pin .p { position:relative; width:54px; height:81px; border:2px solid #111; box-shadow:0 6px 14px rgba(17,17,17,.3); overflow:hidden; }
  .poster-pin .p svg { position:absolute; inset:0; width:100%; height:100%; }
  .poster-pin .p b { position:absolute; left:4px; right:4px; bottom:4px; font:900 9px/1 Archivo, sans-serif; letter-spacing:-.2px; text-transform:uppercase; }
  .poster-pin .p i { position:absolute; left:4px; top:4px; font:800 6px Archivo, sans-serif; font-style:normal; letter-spacing:1px; }
  .poster-pin .punta { width:0; height:0; border-left:7px solid transparent; border-right:7px solid transparent; border-top:9px solid #111; }
`;

export function laminaPinHtml(l, d, tintinea = false) {
  return `<div class="mini-lam${d ? ' con-drop' : ''}${tintinea ? ' tintinea' : ''}" title="${esc(l.nombre)}">`
    + (d ? `<div class="precio">${d.tipo === 'sorpresa' ? '¿?' : esc(precio(d.precio) || 'DROP')}</div>` : '')
    + `<div class="carta">${arteHtml(l.id, l.categoria, l.nombre, l.logo_url || (d && d.lamina_url))}</div><div class="nom">${esc(l.nombre)}</div><div class="punta"></div></div>`;
}
export const tamLamina = (d) => ({ iconSize: [58, d ? 78 : 62], iconAnchor: [29, d ? 76 : 60] });

export function posterPinHtml(g) {
  const s = semillaPoster(g.id);
  const { f, a, b, c, tinta, v } = paletaPoster(s);
  const formas = v === 0
    ? `<circle cx="68" cy="46" r="34" fill="${a}"/><rect x="0" y="78" width="100" height="14" fill="${b}"/><path d="M0 150L0 100L46 150Z" fill="${c}"/>`
    : v === 1 ? `<path d="M0 0H100V70A50 50 0 0 1 0 70Z" fill="${a}"/><circle cx="30" cy="40" r="16" fill="${b}"/><rect x="62" y="86" width="30" height="30" fill="${c}"/>`
    : `<rect x="12" y="12" width="48" height="70" fill="${a}"/><circle cx="66" cy="70" r="26" fill="${b}"/><path d="M100 0L100 40L60 0Z" fill="${c}"/>`;
  return `<div class="poster-pin"><div class="p" style="background:${f}"><svg viewBox="0 0 100 150" preserveAspectRatio="none">${formas}</svg>`
    + `<i style="color:${tinta}">${g.tipo === 'mall' ? 'MALL' : 'PATIO'}</i><b style="color:${tinta}">${esc(g.nombre)}</b></div><div class="punta"></div></div>`;
}
export const tamPoster = { iconSize: [58, 92], iconAnchor: [29, 92] };
