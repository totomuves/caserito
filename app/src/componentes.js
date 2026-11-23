import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { C, F, letrista, R, ESTILO } from './tema';

// Borde ondulado entre bandas de color, como los lienzos de feria
// Corte entre el encabezado y el contenido: franja Bauhaus (línea negra con figuras)
export function Ola({ color, fondo = C.crema, abajo = true }) {
  const { width } = useWindowDimensions();
  if (ESTILO === 'clasico') {
    const d = abajo ? 'M0 0H390V8Q341 22 292 12T195 12T97 12T0 8Z' : 'M0 14Q48 0 97 10T195 10T292 10T390 14V22H0Z';
    return (
      <Svg width={width} height={22} viewBox="0 0 390 22" preserveAspectRatio="none" style={{ backgroundColor: fondo }}>
        <Path d={d} fill={color} />
      </Svg>
    );
  }
  if (ESTILO === 'moderno') {
    // Moderno: el encabezado termina con esquinas redondeadas, sin adornos
    return (
      <View style={{ backgroundColor: fondo }} accessibilityElementsHidden importantForAccessibility="no">
        <View style={{ height: 18, backgroundColor: color, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }} />
      </View>
    );
  }
  if (ESTILO === 'diario') {
    return (
      <View style={{ backgroundColor: fondo }} accessibilityElementsHidden importantForAccessibility="no">
        {abajo ? <View style={{ height: 4, backgroundColor: color }} /> : null}
        <View style={{ height: 3, backgroundColor: C.negro }} /><View style={{ height: 2 }} /><View style={{ height: 1, backgroundColor: C.negro }} />
        {!abajo ? <View style={{ height: 4, backgroundColor: color }} /> : null}
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: fondo }} accessibilityElementsHidden importantForAccessibility="no">
      {abajo ? <View style={{ height: 6, backgroundColor: color }} /> : null}
      <View style={{ height: 3, backgroundColor: C.negro }} />
      <View style={{ flexDirection: 'row', height: 10 }}>
        {[C.rojo, C.amarillo, C.azul, C.negro, C.papel, C.rojo, C.azul, C.amarillo].map((c, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: c, borderRightWidth: i < 7 ? 3 : 0, borderBottomWidth: 3, borderColor: C.borde }} />
        ))}
      </View>
      {!abajo ? <View style={{ height: 6, backgroundColor: color }} /> : null}
    </View>
  );
}

export function Brillo({ tam = 20, color = C.papel, style }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" style={style}>
      <Path d="M12 0L13.6 10.4 24 12 13.6 13.6 12 24 10.4 13.6 0 12 10.4 10.4Z" fill={color} />
    </Svg>
  );
}

const ICONOS = {
  comer: 'M3 11h18a9 7 0 0 1-18 0zM8 7c0-2 1-2 1-4M12 7c0-2 1-2 1-4M16 7c0-2 1-2 1-4',
  cafe: 'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3',
  musica: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
  ropa: 'M8 3l-5 4 3 4 2-1v11h8V10l2 1 3-4-5-4c-1 2-2.5 3-4 3s-3-1-4-3z',
  diseno: 'M12 21v-8M12 13c-4 0-6-3-6-6 4 0 6 2 6 6zM12 13c4 0 6-3 6-6-4 0-6 2-6 6z',
  otros: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  tomar: 'M6 3h12l-1 6a5 5 0 0 1-10 0zM12 14v7M8 21h8',
  dulce: 'M8 10a4 4 0 0 1 8 0zM8 10l4 11 4-11',
  almacen: 'M4 15c0-4 3-7 8-7s8 3 8 7v2H4zM9 9.5l1 3M14 9.5l-1 3',
  deco: 'M9 3h6l3 8H6zM12 11v8M8 21h8',
  antiguedades: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM12 8v4l3 2',
  accesorios: 'M12 9a6 6 0 1 0 0 12a6 6 0 1 0 0-12zM9 3h6l-3 6z',
  libros: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h6',
  arte: 'M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4',
  plantas: 'M12 21v-8M12 13c-4 0-6-3-6-6 4 0 6 2 6 6zM12 13c4 0 6-3 6-6-4 0-6 2-6 6zM8 21h8',
  belleza: 'M6 6a3 3 0 1 0 0 .1M6 18a3 3 0 1 0 0 .1M8.5 7.5L20 18M8.5 16.5L20 6',
  bienestar: 'M12 21c-5-3-8-7-8-11a8 8 0 0 1 8-6 8 8 0 0 1 8 6c0 4-3 8-8 11zM12 9v8',
  mascotas: 'M12 21c-3 0-5-2-5-4s2-4 5-4 5 2 5 4-2 4-5 4zM6 10a2 2 0 1 0 0 .1M10 6a2 2 0 1 0 0 .1M14 6a2 2 0 1 0 0 .1M18 10a2 2 0 1 0 0 .1',
};

export function IconoCategoria({ categoria, tam = 28, color = C.negro }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d={ICONOS[categoria] || ICONOS.otros} />
    </Svg>
  );
}

export function Pildora({ texto, activa, onPress, color = C.negro, categoria }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!activa }}
      style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: R(16), borderWidth: 2.5, borderColor: C.borde, backgroundColor: activa ? color : C.papel, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {categoria && categoria !== 'todo' ? <Figura forma={figuraDe(categoria)} color={colorDe(categoria)} tam={11} borde={activa ? C.papel : C.negro} /> : null}
      <Text style={{ fontFamily: F.negrita, fontSize: 13, color: activa ? (color === C.negro ? C.amarillo : '#FFFFFF') : C.negro }}>{texto}</Text>
    </Pressable>
  );
}

// ——— Recursos Bauhaus ———
// Cada rubro tiene su figura: círculo = comer y tomar, cuadrado = café, triángulo = tiendas, cuarto = servicios
const COMIDA = ['comer', 'tomar', 'dulce', 'almacen'];
const SERVICIOS = ['belleza', 'bienestar', 'mascotas', 'otros'];
export function figuraDe(cat) {
  if (COMIDA.includes(cat)) return 'circulo';
  if (cat === 'cafe') return 'cuadrado';
  if (SERVICIOS.includes(cat)) return 'cuarto';
  return 'triangulo';
}
export function colorDe(cat) {
  if (COMIDA.includes(cat)) return C.rojo;
  if (cat === 'cafe') return C.azul;
  if (SERVICIOS.includes(cat)) return C.negro;
  return C.amarillo;
}
const RUTAS = {
  circulo: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z',
  cuadrado: 'M2 2h20v20H2z',
  triangulo: 'M12 2L22 22H2z',
  cuarto: 'M2 22A20 20 0 0 1 22 2V22z',
  rombo: 'M12 1L23 12L12 23L1 12z',
  semi: 'M2 22A10 10 0 0 1 22 22z',
};
export function Figura({ forma = 'circulo', color = C.rojo, tam = 24, borde = C.negro, grosor = 2.5, style }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" style={style} accessibilityElementsHidden importantForAccessibility="no">
      <Path d={RUTAS[forma]} fill={color} stroke={borde} strokeWidth={grosor * (24 / Math.max(tam, 12))} strokeLinejoin="miter" />
    </Svg>
  );
}
// Composición de figuras grandes para el fondo de un encabezado (detrás del texto)
export function FondoBauhaus({ variante = 'inicio' }) {
  if (ESTILO === 'diario' || ESTILO === 'moderno') return null;
  if (ESTILO === 'clasico') {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        <Brillo tam={20} style={{ position: 'absolute', left: 14, top: 18 }} />
        <Brillo tam={14} style={{ position: 'absolute', right: 40, top: 12 }} />
      </View>
    );
  }
  const V = {
    inicio: [
      { forma: 'circulo', color: C.rojo, tam: 190, style: { right: -70, top: -70 } },
      { forma: 'triangulo', color: C.azul, tam: 70, style: { right: 64, bottom: -6 } },
    ],
    album: [
      { forma: 'triangulo', color: C.amarillo, tam: 150, style: { right: -30, top: 30 } },
      { forma: 'circulo', color: C.rojo, tam: 76, style: { right: 90, top: -30 } },
    ],
    drop: [
      { forma: 'circulo', color: C.amarillo, tam: 150, style: { right: -46, top: -46 } },
      { forma: 'cuadrado', color: C.azul, tam: 56, style: { right: 96, bottom: -8 } },
    ],
  }[variante] || [];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
      {V.map((f, i) => <Figura key={i} forma={f.forma} color={f.color} tam={f.tam} grosor={3} style={{ position: 'absolute', ...f.style }} />)}
    </View>
  );
}

export function Boton({ texto, onPress, fondo = C.negro, color = C.papel, deshabilitado, grande, style }) {
  return (
    <Pressable onPress={deshabilitado ? undefined : onPress} accessibilityRole="button" accessibilityState={{ disabled: !!deshabilitado }}
      style={({ pressed }) => [{ minHeight: grande ? 52 : 44, borderRadius: R(16), borderWidth: 3, borderColor: C.borde, backgroundColor: deshabilitado ? '#E7DCC4' : fondo, shadowColor: fondo === C.negro ? C.rojo : C.negro, shadowOffset: { width: 4, height: 4 }, shadowOpacity: deshabilitado || ESTILO === 'moderno' ? 0 : 1, shadowRadius: 0, elevation: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, opacity: pressed ? 0.85 : 1 }, style]}>
      <Text style={[grande ? { ...letrista, fontSize: 19 } : { fontFamily: F.negrita, fontSize: 15 }, { color: deshabilitado ? C.gris : color }]}>{texto}</Text>
    </Pressable>
  );
}

export function EtiquetaPrecio({ valor, giro = '4deg' }) {
  if (!valor) return null;
  return (
    <View style={{ position: 'absolute', top: -14, right: 8, backgroundColor: C.amarillo, borderWidth: 3, borderColor: C.borde, paddingHorizontal: 10, paddingVertical: 2, shadowColor: C.sombra, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}>
      <Text style={{ ...letrista, fontSize: 22, color: C.negro }}>{valor}</Text>
    </View>
  );
}


// ——— Drops estilo Lichtenstein (pop art): puntos Ben-Day, globo de diálogo y estallido ———
let idPuntos = 0;
export function PuntosPop({ color = C.rojo, fondo = C.papel, tam = 3, sep = 9, style }) {
  const [id] = React.useState(() => `bd${++idPuntos}`);
  return (
    <Svg width="100%" height="100%" style={[{ position: 'absolute', left: 0, top: 0 }, style]} accessibilityElementsHidden importantForAccessibility="no" pointerEvents="none">
      <Defs>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={sep} height={sep}>
          <Rect x="0" y="0" width={sep} height={sep} fill={fondo} />
          <Circle cx={sep / 4} cy={sep / 4} r={tam} fill={color} />
          <Circle cx={(sep * 3) / 4} cy={(sep * 3) / 4} r={tam} fill={color} />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

// Globo de diálogo de cómic: la frase del local "dicha" por el drop
export function GloboPop({ children, cola = 'izquierda', style }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <View style={{ backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: C.borde, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }}>{children}</View>
      <Svg width={26} height={16} viewBox="0 0 26 16" style={{ position: 'absolute', bottom: -13, [cola === 'izquierda' ? 'left' : 'right']: 22 }}>
        <Path d="M2 0 L24 0 L4 15 Z" fill="#FFFFFF" stroke={C.negro} strokeWidth={3} strokeLinejoin="miter" />
        <Path d="M3 -1 L23 -1" stroke="#FFFFFF" strokeWidth={4} />
      </Svg>
    </View>
  );
}

// Estallido con onomatopeya (¡ZAS!, ¡PUM!, ¡YA!)
const PUNTAS = (() => {
  const n = 12; let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? 31 : 50; const a = (Math.PI * i) / n - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${(50 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)} `;
  }
  return d + 'Z';
})();
export function Estallido({ texto = '¡ZAS!', tam = 74, color = C.amarillo, colorTexto = C.rojo, style }) {
  return (
    <View style={[{ width: tam, height: tam, alignItems: 'center', justifyContent: 'center' }, style]} pointerEvents="none">
      <Svg width={tam} height={tam} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <Path d={PUNTAS} fill={color} stroke={C.negro} strokeWidth={4} strokeLinejoin="miter" />
      </Svg>
      <Text style={{ ...letrista, fontSize: tam * 0.24, color: colorTexto, textShadowColor: C.negro, textShadowOffset: { width: 1.5, height: 1.5 }, textShadowRadius: 0, transform: [{ rotate: '-8deg' }] }}>{texto}</Text>
    </View>
  );
}
export const ONOMATOPEYAS = ['¡ZAS!', '¡PUM!', '¡YA!', '¡WOW!', '¡PAF!'];

// Protege una parte de la pantalla: si falla, desaparece sola en vez de botar la app entera
export class Seguro extends React.Component {
  constructor(p) { super(p); this.state = { error: false }; }
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(e) { console.warn('Parte de la pantalla falló:', e && e.message); }
  render() { return this.state.error ? null : this.props.children; }
}
