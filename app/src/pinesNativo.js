import React from 'react';
import { Text, View } from 'react-native';
import { C, F, precio } from './tema';
import { ArteLocal } from './arteLocal';
import { PosterLugar } from './Poster';

// Pines del mapa en la app (mismos que en la web): lámina chica del local y póster del mall
export function LaminaPin({ l, d }) {
  return (
    <View style={{ alignItems: 'center', width: 58 }}>
      {d ? (
        <View style={{ backgroundColor: C.amarillo, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginBottom: 2 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 10, color: '#111111' }}>{d.tipo === 'sorpresa' ? '¿?' : (precio(d.precio) || 'DROP')}</Text>
        </View>
      ) : null}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 2, borderWidth: d ? 2 : 1, borderColor: d ? '#111111' : '#D9D9DF' }}>
        <ArteLocal id={l.id} categoria={l.categoria} pista={l.nombre} ancho={36} alto={36} borde={false} imagen={l.logo_url || (d && d.lamina_url)} />
      </View>
      <Text numberOfLines={1} style={{ fontFamily: F.negrita, fontSize: 8, maxWidth: 56, marginTop: 1, color: '#111111' }}>{l.nombre}</Text>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#111111', marginTop: 2 }} />
    </View>
  );
}
export function PosterPin({ g }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <PosterLugar lugar={g} ancho={54} compacto />
      <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#111111' }} />
    </View>
  );
}
