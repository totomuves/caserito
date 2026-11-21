import React from 'react';

// Arte generativo Bauhaus: cada local tiene su propia composición, siempre la misma
// (sale de su id). Diez familias de composiciones × colores × posiciones = una distinta por local.

const AMARILLO = '#FFD100';
const ROJO = '#E30A2F';
const AZUL = '#1E5AA8';
const NEGRO = '#111111';
const PAPEL = '#FFF6E5';
const CREMA = '#F3E6CC';
const COLORES = [AMARILLO, ROJO, AZUL, NEGRO, PAPEL];

function semilla(texto) {
  let h = 2166136261;
  for (const ch of String(texto)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function azar(seed) {
  let a = seed || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const elegir = (r, lista) => lista[Math.floor(r() * lista.length)];
function colores(r, n) {
  const l = [...COLORES];
  const out = [];
  while (out.length < n) {
    const c = l.splice(Math.floor(r() * l.length), 1)[0];
    out.push(c);
    if (!l.length) l.push(...COLORES.filter((x) => x !== out[out.length - 1]));
  }
  return out;
}

// Figuras (viewBox 0 0 100 100)
const rect = (x, y, w, h, fill, extra = {}) => ({ t: 'rect', a: { x, y, width: w, height: h, fill, ...extra } });
const circ = (cx, cy, r, fill, extra = {}) => ({ t: 'circle', a: { cx, cy, r, fill, ...extra } });
const path = (d, fill, extra = {}) => ({ t: 'path', a: { d, fill, ...extra } });
const tri = (x1, y1, x2, y2, x3, y3, fill) => path(`M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}Z`, fill);
const cuarto = (cx, cy, r, giro, fill) => {
  // cuarto de círculo con el vértice en (cx, cy), girado en pasos de 90°
  const p = [[r, 0, 0, r], [0, r, -r, 0], [-r, 0, 0, -r], [0, -r, r, 0]][giro % 4];
  return path(`M${cx} ${cy}L${cx + p[0]} ${cy + p[1]}A${r} ${r} 0 0 1 ${cx + p[2]} ${cy + p[3]}Z`, fill);
};
const semi = (cx, cy, r, arriba, fill) => path(`M${cx - r} ${cy}A${r} ${r} 0 0 ${arriba ? 1 : 0} ${cx + r} ${cy}Z`, fill);
const RUBRO = {
  comer: 'circulo', tomar: 'circulo', dulce: 'circulo', almacen: 'circulo',
  cafe: 'cuadrado', belleza: 'cuarto', bienestar: 'cuarto', mascotas: 'cuarto', otros: 'cuarto',
};

const FAMILIAS = [
  // 1. Diagonal partida con sol
  (r, [f, a, b, c]) => [rect(0, 0, 100, 100, f), tri(0, 100, 100, 0, 100, 100, a), circ(30 + r() * 20, 30 + r() * 15, 18 + r() * 8, b), rect(62, 62, 22, 22, c)],
  // 2. Círculos concéntricos descentrados
  (r, [f, a, b, c]) => { const x = 35 + r() * 30; const y = 35 + r() * 30; return [rect(0, 0, 100, 100, f), circ(x, y, 46, a), circ(x, y, 30, b), circ(x, y, 14, c)]; },
  // 3. Franjas + círculo
  (r, [f, a, b, c]) => { const v = r() > 0.5; const out = [rect(0, 0, 100, 100, f)]; [0, 1, 2].forEach((i) => out.push(v ? rect(12 + i * 28, 0, 14, 100, i === 1 ? b : a) : rect(0, 12 + i * 28, 100, 14, i === 1 ? b : a))); out.push(circ(30 + r() * 40, 30 + r() * 40, 20, c)); return out; },
  // 4. Baldosa de cuartos de círculo
  (r, [f, a, b, c]) => [rect(0, 0, 100, 100, f), cuarto(0, 0, 50, 0, a), cuarto(100, 0, 50, 1, b), cuarto(100, 100, 50, 2, c), cuarto(0, 100, 50, 3, a), circ(50, 50, 12, b)],
  // 5. Sol naciente con rayos
  (r, [f, a, b, c]) => { const out = [rect(0, 0, 100, 100, f)]; for (let i = 0; i < 7; i++) { const ang = Math.PI * (i / 6); out.push(path(`M50 78L${50 + Math.cos(ang) * 70} ${78 - Math.sin(ang) * 70}L${50 + Math.cos(ang + 0.12) * 70} ${78 - Math.sin(ang + 0.12) * 70}Z`, a)); } out.push(semi(50, 78, 30, true, b), rect(0, 78, 100, 22, c)); return out; },
  // 6. Torre: cuadrado, círculo y triángulo apilados
  (r, [f, a, b, c]) => { const x = 25 + r() * 20; return [rect(0, 0, 100, 100, f), rect(x, 56, 44, 44, a), circ(x + 22, 38, 20, b), tri(x + 22, 4, x + 40, 22, x + 4, 22, c)]; },
  // 7. Arcos como puerta
  (r, [f, a, b, c]) => [rect(0, 0, 100, 100, f), semi(50, 60, 40, true, a), rect(10, 60, 80, 40, a), semi(50, 64, 24, true, b), rect(26, 64, 48, 36, b), rect(44, 70, 12, 30, c)],
  // 8. Damero con una pieza redonda
  (r, [f, a, b, c]) => { const out = [rect(0, 0, 100, 100, f)]; const hueco = Math.floor(r() * 9); for (let i = 0; i < 9; i++) { const x = (i % 3) * 33.3; const y = Math.floor(i / 3) * 33.3; if (i === hueco) out.push(circ(x + 16.6, y + 16.6, 14, c)); else if ((i + Math.floor(r() * 2)) % 2) out.push(rect(x, y, 33.4, 33.4, i % 3 === 1 ? b : a)); } return out; },
  // 9. Medias lunas en fila
  (r, [f, a, b, c]) => { const out = [rect(0, 0, 100, 100, f), rect(0, 50, 100, 50, c)]; [0, 1, 2].forEach((i) => out.push(semi(17 + i * 33, 50, 16, i % 2 === 0, i === 1 ? b : a))); out.push(circ(75, 22, 12, b)); return out; },
  // 10. Bloques cruzados
  (r, [f, a, b, c]) => [rect(0, 0, 100, 100, f), rect(0, 30 + r() * 20, 100, 22, a), rect(20 + r() * 30, 0, 22, 100, b), circ(70, 70, 16, c), tri(6, 6, 30, 6, 6, 30, c)],
  // 11. Lunares con una pieza distinta
  (r, [f, a, b, c]) => { const out = [rect(0, 0, 100, 100, f)]; const dist = Math.floor(r() * 9); for (let i = 0; i < 9; i++) { const x = 18 + (i % 3) * 32; const y = 18 + Math.floor(i / 3) * 32; out.push(i === dist ? rect(x - 12, y - 12, 24, 24, c) : circ(x, y, 12, i % 2 ? a : b)); } return out; },
  // 12. Cerro y luna
  (r, [f, a, b, c]) => [rect(0, 0, 100, 100, f), circ(25 + r() * 50, 26, 14, c), tri(-10, 100, 40 + r() * 20, 30, 110, 100, a), tri(40, 100, 80, 55, 120, 100, b)],
  // 13. Arcoíris de medias lunas
  (r, [f, a, b, c]) => [rect(0, 0, 100, 100, f), semi(50, 85, 46, true, a), semi(50, 85, 34, true, b), semi(50, 85, 22, true, c), semi(50, 85, 10, true, f), rect(0, 85, 100, 15, NEGRO)],
  // 14. Molinete de triángulos
  (r, [f, a, b, c]) => [rect(0, 0, 100, 100, f), tri(50, 50, 0, 0, 50, 0, a), tri(50, 50, 100, 0, 100, 50, b), tri(50, 50, 100, 100, 50, 100, a), tri(50, 50, 0, 100, 0, 50, b), circ(50, 50, 10, c)],
];

// Variante de la composición: giro y espejo (8 versiones por familia)
const GIROS = ['', 'rotate(90 50 50)', 'rotate(180 50 50)', 'rotate(270 50 50)'];
function transformDe(s) {
  const g = GIROS[(s >>> 4) % 4];
  const espejo = (s >>> 6) % 2 ? 'translate(100 0) scale(-1 1)' : '';
  return [espejo, g].filter(Boolean).join(' ');
}

// Composición del local: lista de figuras + si lleva ojos (pocas veces, como guiño)
export function composicion(id, categoria) {
  const s = semilla(id);
  const r = azar(s);
  const fam = FAMILIAS[((s ^ (s >>> 11)) >>> 0) % FAMILIAS.length];
  const cols = colores(r, 4);
  const figuras = fam(r, cols);
  // la figura del rubro como sello en una esquina
  const forma = RUBRO[categoria] || 'triangulo';
  const sello = cols[0] === NEGRO ? AMARILLO : NEGRO;
  if (forma === 'circulo') figuras.push(circ(88, 12, 7, sello));
  else if (forma === 'cuadrado') figuras.push(rect(81, 5, 14, 14, sello));
  else if (forma === 'cuarto') figuras.push(cuarto(81, 19, 14, 3, sello));
  else figuras.push(tri(88, 4, 96, 19, 80, 19, sello));
  return { figuras: figuras.slice(0, -1), sello: figuras[figuras.length - 1], ojos: s % 13 === 0, transform: transformDe(s) };
}

// Versión en texto SVG (para los pines HTML del mapa web)
export function arteHtml(id, categoria) {
  const { figuras, sello, ojos, transform } = composicion(id, categoria);
  const attrs = (a) => Object.entries(a).map(([k, v]) => `${k}="${typeof v === 'number' ? Math.round(v * 10) / 10 : v}"`).join(' ');
  const cuerpo = `<g${transform ? ` transform="${transform}"` : ''}>${figuras.map((f) => `<${f.t} ${attrs(f.a)}/>`).join('')}</g><${sello.t} ${attrs(sello.a)}/>`
    + (ojos ? `<circle cx="42" cy="50" r="8" fill="#fff" stroke="${NEGRO}" stroke-width="2.5"/><circle cx="40" cy="53" r="3.5" fill="${NEGRO}"/><circle cx="60" cy="50" r="8" fill="#fff" stroke="${NEGRO}" stroke-width="2.5"/><circle cx="62" cy="47" r="3.5" fill="${NEGRO}"/>` : '');
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%">${cuerpo}</svg>`;
}

export { CREMA };

// La lámina del local es su logo (mismo arte que en la app)
export function LaminaLocal({ id, categoria, tam = 44, style }) {
  if (!id) return null;
  return (
    <span role="img" aria-label="Lámina del local" style={{ position: 'relative', display: 'inline-block', width: tam, height: tam, border: '2.5px solid #111', boxShadow: '2px 2px 0 #111', overflow: 'hidden', flexShrink: 0, background: '#FFF6E5', ...style }}
      dangerouslySetInnerHTML={{ __html: arteHtml(id, categoria) }} />
  );
}
