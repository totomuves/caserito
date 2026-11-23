import React from 'react';
import Svg, { Rect, Circle, Path, G } from 'react-native-svg';

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


// ---------- Láminas que se parecen al local ----------
// Cada rubro (o lo que dice el nombre: "pizzería", "heladería"…) tiene su pictograma Bauhaus:
// la taza del café, la copa del bar, el helado, el libro, el disco… armados solo con figuras planas.
// El fondo, los colores y el detalle siguen saliendo del id: dos cafés nunca quedan iguales.
const M = {
  taza: ([a, b, c, f]) => [rect(26, 44, 40, 34, a), circ(70, 58, 11, b), circ(70, 58, 5, f), rect(18, 78, 58, 6, c), rect(34, 20, 5, 16, c), rect(44, 14, 5, 22, c), rect(54, 20, 5, 16, c)],
  pizza: ([a, b, c, f]) => [circ(50, 52, 34, a), circ(50, 52, 27, b), tri(50, 52, 92, 34, 92, 70, f), circ(40, 42, 5, c), circ(56, 66, 5, c), circ(36, 62, 4, c), circ(60, 38, 4, c)],
  plato: ([a, b, c, f]) => [circ(50, 54, 32, a), circ(50, 54, 20, b), rect(10, 26, 5, 56, c), rect(8, 26, 9, 14, c), rect(85, 26, 5, 56, c), semi(87.5, 40, 6, true, c)],
  burger: ([a, b, c]) => [semi(50, 46, 30, true, a), rect(18, 48, 64, 7, c), rect(20, 57, 60, 9, b), rect(20, 68, 60, 9, a)],
  sushi: ([a, b, c]) => [circ(36, 52, 20, NEGRO), circ(36, 52, 14, a), circ(36, 52, 7, b), rect(60, 40, 30, 24, a), rect(60, 52, 30, 12, c)],
  copa: ([a, b, c]) => [tri(26, 18, 74, 18, 50, 54, a), rect(48, 54, 4, 24, c), rect(34, 78, 32, 6, c), circ(42, 28, 4, b), circ(52, 36, 3, b)],
  jarra: ([a, b, c, f]) => [rect(28, 30, 36, 50, a), rect(28, 22, 36, 12, b), circ(70, 54, 12, c), circ(70, 54, 6, f)],
  helado: ([a, b, c]) => [tri(34, 50, 66, 50, 50, 92, a), circ(50, 40, 17, b), circ(40, 28, 11, c), circ(60, 28, 9, b)],
  pan: ([a, b, c]) => [semi(50, 70, 36, true, a), rect(14, 70, 72, 10, a), rect(30, 46, 6, 18, b), rect(46, 42, 6, 22, b), rect(62, 46, 6, 18, b), rect(10, 82, 80, 5, c)],
  bolsa: ([a, b, c, f]) => [rect(26, 38, 48, 48, a), semi(50, 38, 14, true, b), semi(50, 38, 8, true, f), circ(64, 30, 9, c), rect(34, 24, 8, 16, c)],
  libros: ([a, b, c]) => [rect(18, 30, 14, 56, a), rect(34, 22, 14, 64, b), rect(50, 36, 12, 50, c), path('M66 86L80 30L92 33L78 89Z', a), rect(10, 86, 84, 5, NEGRO)],
  disco: ([a, b, c, f]) => [circ(50, 50, 38, NEGRO), circ(50, 50, 30, a), circ(50, 50, 13, b), circ(50, 50, 3, f), rect(80, 10, 6, 34, c)],
  ropa: ([a, b, c]) => [path('M30 26L42 18Q50 28 58 18L70 26L84 40L72 48L70 46L70 86L30 86L30 46L28 48L16 40Z', a), rect(30, 58, 40, 8, b), circ(50, 76, 4, c)],
  lentes: ([a, b, c, f]) => [circ(32, 52, 16, a), circ(32, 52, 9, f), circ(68, 52, 16, a), circ(68, 52, 9, f), rect(44, 48, 12, 5, b), rect(12, 46, 8, 4, c), rect(80, 46, 8, 4, c)],
  planta: ([a, b, c]) => [path('M32 64L68 64L62 90L38 90Z', a), cuarto(50, 64, 26, 3, b), cuarto(50, 64, 20, 2, c), rect(48, 30, 4, 34, NEGRO)],
  flor: ([a, b, c]) => [rect(48, 50, 4, 40, NEGRO), circ(50, 26, 10, a), circ(64, 36, 10, a), circ(50, 46, 10, a), circ(36, 36, 10, a), circ(50, 36, 7, b), semi(40, 70, 10, true, c)],
  paleta: ([a, b, c, f]) => [circ(46, 54, 32, a), circ(34, 44, 6, b), circ(48, 36, 6, c), circ(60, 46, 6, b), circ(40, 70, 8, f), path('M66 70L90 16L94 18L72 74Z', c)],
  lampara: ([a, b, c]) => [tri(30, 44, 70, 44, 50, 14, a), rect(48, 44, 4, 36, NEGRO), rect(34, 80, 32, 8, b), circ(50, 50, 5, c)],
  silla: ([a, b, c]) => [rect(28, 18, 10, 70, a), rect(28, 50, 46, 10, b), rect(64, 50, 10, 38, a), circ(33, 18, 7, c)],
  reloj: ([a, b, c, f]) => [circ(50, 50, 34, a), circ(50, 50, 27, f), rect(48, 28, 4, 24, NEGRO), rect(48, 48, 18, 4, b), circ(50, 50, 4, c), rect(46, 10, 8, 8, a)],
  escuadra: ([a, b, c]) => [tri(18, 84, 18, 20, 82, 84, a), tri(28, 74, 28, 46, 56, 74, b), circ(70, 32, 14, c)],
  tijeras: ([a, b, c, f]) => [circ(32, 70, 12, a), circ(32, 70, 6, f), circ(60, 74, 12, a), circ(60, 74, 6, f), path('M38 60L78 14L82 18L44 66Z', c), path('M54 64L26 16L22 20L48 70Z', b)],
  loto: ([a, b, c]) => [semi(50, 66, 30, true, a), semi(36, 66, 14, true, b), semi(64, 66, 14, true, b), semi(50, 66, 12, true, c), rect(14, 70, 72, 6, NEGRO)],
  pata: ([a, b]) => [circ(50, 62, 18, a), circ(28, 40, 8, b), circ(42, 28, 8, b), circ(58, 28, 8, b), circ(72, 40, 8, b)],
};
const MOTIVO_RUBRO = {
  cafe: 'taza', comer: 'plato', tomar: 'copa', dulce: 'helado', almacen: 'bolsa', libros: 'libros', musica: 'disco', ropa: 'ropa',
  accesorios: 'lentes', plantas: 'planta', arte: 'paleta', deco: 'lampara', antiguedades: 'reloj', diseno: 'escuadra', belleza: 'tijeras',
  bienestar: 'loto', mascotas: 'pata',
};
const PALABRAS = [
  [/pizz/, 'pizza'], [/sushi|nikkei|japon/, 'sushi'], [/burger|hamburg|sanguch|sandw/, 'burger'], [/helad|gelat|ice ?cream/, 'helado'],
  [/panad|bakery|pan |masa madre|pasteler|reposter|torta/, 'pan'], [/cervec|beer|chopp|pub/, 'jarra'], [/vino|wine|bar\b|cocktail|coctel/, 'copa'],
  [/caf[eé]|coffee|espresso|tostad/, 'taza'], [/flor|florer/, 'flor'], [/libr|book/, 'libros'], [/vinil|disco|record|music/, 'disco'],
  [/silla|mueble|furniture/, 'silla'], [/optic|lente/, 'lentes'], [/peluq|barber|sal[oó]n/, 'tijeras'], [/veterin|mascot|pet\b|perr|gat/, 'pata'],
  [/plant|vivero|jard[ií]n/, 'planta'], [/galer[ií]a|arte\b|taller/, 'paleta'], [/antig[uü]/, 'reloj'], [/yoga|spa\b|masaj/, 'loto'],
];
function motivoDe(categoria, pista) {
  const p = String(pista || '').toLowerCase() + ' ';
  for (const [re, m] of PALABRAS) if (re.test(p)) return m;
  return MOTIVO_RUBRO[categoria] || null;
}
// Fondo detrás del pictograma (varía por local)
const FONDOS = [
  (k) => [circ(50, 52, 44, k)],
  (k) => [tri(0, 100, 100, 0, 100, 100, k)],
  (k) => [rect(0, 62, 100, 38, k)],
  (k) => [cuarto(0, 100, 70, 0, k)],
  (k) => [rect(0, 0, 50, 100, k)],
  () => [],
];
function composicionMotivo(s, r, motivo) {
  const [f, k, a, b, c] = colores(r, 5); // cinco colores distintos: fondo, figura de fondo y tres del pictograma
  const fondo = FONDOS[(s >>> 3) % FONDOS.length](k);
  const figuras = [rect(0, 0, 100, 100, f), ...fondo, ...M[motivo]([a, b, c, f])];
  const espejo = (s >>> 6) % 2 && !['libros', 'taza', 'jarra', 'paleta', 'silla'].includes(motivo) ? 'translate(100 0) scale(-1 1)' : '';
  return { figuras, sello: rect(0, 0, 0, 0, 'none'), ojos: false, transform: espejo };
}

// Composición del local: lista de figuras + si lleva ojos (pocas veces, como guiño)
export function composicion(id, categoria, pista = '') {
  const s = semilla(id);
  const r = azar(s);
  const motivo = motivoDe(categoria, pista);
  if (motivo) return composicionMotivo(s, r, motivo);
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

// Componente (iOS, Android y web)
export function ArteLocal({ id, categoria, pista = '', ancho = 80, alto = 80, borde = true }) {
  const { figuras, sello, ojos, transform } = composicion(id, categoria, pista);
  const dibujar = (f, i) => {
    if (f.t === 'rect') return <Rect key={i} {...f.a} />;
    if (f.t === 'circle') return <Circle key={i} {...f.a} />;
    return <Path key={i} {...f.a} />;
  };
  return (
    <Svg width={ancho} height={alto} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <G>
        <G transform={transform || undefined}>{figuras.map(dibujar)}</G>
        {dibujar(sello, 'sello')}
        {ojos ? (
          <G>
            <Circle cx={42} cy={50} r={8} fill="#FFFFFF" stroke={NEGRO} strokeWidth={2.5} /><Circle cx={40} cy={53} r={3.5} fill={NEGRO} />
            <Circle cx={60} cy={50} r={8} fill="#FFFFFF" stroke={NEGRO} strokeWidth={2.5} /><Circle cx={62} cy={47} r={3.5} fill={NEGRO} />
          </G>
        ) : null}
        {borde ? <Rect x={0} y={0} width={100} height={100} fill="none" stroke={NEGRO} strokeWidth={4} /> : null}
      </G>
    </Svg>
  );
}

// Versión en texto SVG (para los pines HTML del mapa web)
export function arteHtml(id, categoria, pista = '') {
  const { figuras, sello, ojos, transform } = composicion(id, categoria, pista);
  const attrs = (a) => Object.entries(a).map(([k, v]) => `${k}="${typeof v === 'number' ? Math.round(v * 10) / 10 : v}"`).join(' ');
  const cuerpo = `<g${transform ? ` transform="${transform}"` : ''}>${figuras.map((f) => `<${f.t} ${attrs(f.a)}/>`).join('')}</g><${sello.t} ${attrs(sello.a)}/>`
    + (ojos ? `<circle cx="42" cy="50" r="8" fill="#fff" stroke="${NEGRO}" stroke-width="2.5"/><circle cx="40" cy="53" r="3.5" fill="${NEGRO}"/><circle cx="60" cy="50" r="8" fill="#fff" stroke="${NEGRO}" stroke-width="2.5"/><circle cx="62" cy="47" r="3.5" fill="${NEGRO}"/>` : '');
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%">${cuerpo}</svg>`;
}

export { CREMA };
