import React from 'react';
import { View } from 'react-native';

// Cada barrio es una edición del Álbum de Chile, con su propia identidad:
// colores de las láminas, un motivo gráfico y el nombre de la edición.
export const IDENTIDAD = {
  'barrio-italia': {
    edicion: 'Edición Italiana', motivo: 'tricolor', principal: '#1F7A4D', acento: '#C8102E',
    marcos: [
      { fondo: '#1F7A4D', num: '#FFF6E5', texto: '#FFFFFF' },
      { fondo: '#FFF6E5', num: '#C8102E', texto: '#111111' },
      { fondo: '#C8102E', num: '#FFF6E5', texto: '#FFFFFF' },
    ],
  },
  franklin: {
    edicion: 'Edición Persa', motivo: 'galpon', principal: '#5B3A1E', acento: '#B5462B',
    marcos: [
      { fondo: '#D9B98A', num: '#5B3A1E', texto: '#2B1A0C' },
      { fondo: '#5B3A1E', num: '#F2D9A9', texto: '#FFF6E5' },
      { fondo: '#B5462B', num: '#F2D9A9', texto: '#FFFFFF' },
    ],
  },
  'matta-sur': {
    edicion: 'Edición Patrimonial', motivo: 'cite', principal: '#2F4E7A', acento: '#C2603A',
    marcos: [
      { fondo: '#2F4E7A', num: '#F4D9A0', texto: '#FFFFFF' },
      { fondo: '#F4E3C3', num: '#2F4E7A', texto: '#1C2C44' },
      { fondo: '#C2603A', num: '#FFF6E5', texto: '#FFFFFF' },
    ],
  },
  'el-golf': {
    edicion: 'Edición Ejecutiva', motivo: 'rayas', principal: '#1E4D2F', acento: '#C9A227',
    marcos: [
      { fondo: '#1E4D2F', num: '#E9CF6B', texto: '#FFFFFF' },
      { fondo: '#111111', num: '#E9CF6B', texto: '#FFFFFF' },
      { fondo: '#F3EAD3', num: '#1E4D2F', texto: '#111111' },
    ],
  },
  defecto: {
    edicion: 'Edición Barrio', motivo: 'tricolor', principal: '#1E5AA8', acento: '#E30A2F',
    marcos: [
      { fondo: '#FFD100', num: '#111111', texto: '#111111' },
      { fondo: '#E30A2F', num: '#FFD100', texto: '#FFFFFF' },
      { fondo: '#1E5AA8', num: '#FFD100', texto: '#FFFFFF' },
    ],
  },
};

export function identidadDe(id) {
  return IDENTIDAD[id] || IDENTIDAD.defecto;
}

// Franja con el motivo del barrio (va arriba de cada lámina y en la edición especial)
export function Motivo({ tipo, a, b, alto = 6 }) {
  const base = { height: alto, flexDirection: 'row', overflow: 'hidden', borderRadius: 2 };
  if (tipo === 'tricolor') {
    return <View style={base} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ flex: 1, backgroundColor: '#1F7A4D' }} /><View style={{ flex: 1, backgroundColor: '#FFF6E5' }} /><View style={{ flex: 1, backgroundColor: '#C8102E' }} />
    </View>;
  }
  // galpón: franjas diagonales tipo cinta; cité: puntos como puertas; rayas: diplomático
  const n = tipo === 'cite' ? 7 : 9;
  return (
    <View style={[base, { backgroundColor: a, gap: tipo === 'rayas' ? 3 : 2, paddingHorizontal: 1 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={tipo === 'cite'
          ? { width: alto, height: alto, borderRadius: alto / 2, backgroundColor: b }
          : { width: tipo === 'rayas' ? 1.5 : 4, height: alto, backgroundColor: b, transform: tipo === 'galpon' ? [{ skewX: '-30deg' }] : [] }} />
      ))}
    </View>
  );
}
