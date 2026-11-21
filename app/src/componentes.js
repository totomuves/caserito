import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, F, letrista } from './tema';

// Borde ondulado entre bandas de color, como los lienzos de feria
// Corte entre el encabezado y el contenido: franja Bauhaus (línea negra con figuras)
export function Ola({ color, fondo = C.crema, abajo = true }) {
  return (
    <View style={{ backgroundColor: fondo }} accessibilityElementsHidden importantForAccessibility="no">
      {abajo ? <View style={{ height: 6, backgroundColor: color }} /> : null}
      <View style={{ height: 3, backgroundColor: C.negro }} />
      <View style={{ flexDirection: 'row', height: 10 }}>
        {[C.rojo, C.amarillo, C.azul, C.negro, C.papel, C.rojo, C.azul, C.amarillo].map((c, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: c, borderRightWidth: i < 7 ? 3 : 0, borderBottomWidth: 3, borderColor: C.negro }} />
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

export function Pildora({ texto, activa, onPress, color = C.negro }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!activa }}
      style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 2.5, borderColor: C.negro, backgroundColor: activa ? color : C.papel, justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.negrita, fontSize: 13, color: activa ? (color === C.negro ? C.amarillo : '#FFFFFF') : C.negro }}>{texto}</Text>
    </Pressable>
  );
}

export function Boton({ texto, onPress, fondo = C.negro, color = C.papel, deshabilitado, grande, style }) {
  return (
    <Pressable onPress={deshabilitado ? undefined : onPress} accessibilityRole="button" accessibilityState={{ disabled: !!deshabilitado }}
      style={({ pressed }) => [{ minHeight: grande ? 52 : 44, borderRadius: 0, borderWidth: 3, borderColor: C.negro, backgroundColor: deshabilitado ? '#E7DCC4' : fondo, shadowColor: fondo === C.negro ? C.rojo : C.negro, shadowOffset: { width: 4, height: 4 }, shadowOpacity: deshabilitado ? 0 : 1, shadowRadius: 0, elevation: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, opacity: pressed ? 0.85 : 1 }, style]}>
      <Text style={[grande ? { ...letrista, fontSize: 19 } : { fontFamily: F.negrita, fontSize: 15 }, { color: deshabilitado ? C.gris : color }]}>{texto}</Text>
    </Pressable>
  );
}

export function EtiquetaPrecio({ valor, giro = '4deg' }) {
  if (!valor) return null;
  return (
    <View style={{ position: 'absolute', top: -12, right: 8, transform: [{ rotate: giro }], backgroundColor: C.amarillo, borderWidth: 2.5, borderColor: C.negro, borderRadius: 8, paddingHorizontal: 9, paddingTop: 4 }}>
      <Text style={{ ...letrista, fontSize: 21, color: C.negro }}>{valor}</Text>
    </View>
  );
}
