import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Ellipse } from 'react-native-svg';
import { IconoCategoria } from './componentes';

// Láminas con onda de álbum noventero: cada local es un "monstruito" con ojos saltones
// y un apodo chistoso. Diseño propio de Caserito (no copia personajes de otros álbumes).

const PREFIJOS = ['Súper', 'Mega', 'Turbo', 'Ultra', 'Híper', 'Maxi', 'Archi', 'Requete', 'Mini', 'Giga'];
const COLETILLAS = ['el Terrible', 'la Leyenda', 'Sin Frenos', 'de Otro Planeta', 'Recargado', 'al Cubo', 'Edición Picante', 'Modo Dios', 'Nivel Pro', 'Versión Barrio'];

function hash(t) {
  let h = 0;
  for (const c of String(t || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
const titulo = (t) => String(t || '').trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// Apodo de la lámina: "Turbo Cortado" o "Empanada Sin Frenos", según el producto estrella del local
export function apodoLamina(local) {
  const base = titulo(local.producto_estrella) || titulo(local.nombre);
  const h = hash(local.id || local.nombre);
  return h % 2 ? `${PREFIJOS[h % PREFIJOS.length]} ${base}` : `${base} ${COLETILLAS[h % COLETILLAS.length]}`;
}

// Letra de la lámina, como en los álbumes de antes: 7a o 7b
export function letraLamina(local) {
  return hash(local.id) % 2 ? 'b' : 'a';
}

// Carita sobre el ícono del rubro: ojos saltones, cejas y boca que cambian con cada local
export function Monstruito({ categoria, tam = 56, fondo = '#FFF6E5', local }) {
  const h = hash(local && local.id);
  const bizco = h % 3 === 0;
  const boca = ['M8 17 Q12 21 16 17', 'M8 18 L16 18', 'M8 19 Q12 15 16 19', 'M9 17 Q12 22 15 17 Z'][h % 4];
  const ceja = h % 2;
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: fondo, borderWidth: 2.5, borderColor: '#111111', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', opacity: 0.35 }}><IconoCategoria categoria={categoria} tam={tam * 0.8} /></View>
      <Svg width={tam * 0.9} height={tam * 0.9} viewBox="0 0 24 24">
        <Ellipse cx="8" cy="10" rx="3.6" ry="4" fill="#FFFFFF" stroke="#111111" strokeWidth="1.2" />
        <Ellipse cx="16" cy="10" rx="3.6" ry="4" fill="#FFFFFF" stroke="#111111" strokeWidth="1.2" />
        <Circle cx={bizco ? 9.2 : 8.6} cy="11" r="1.6" fill="#111111" />
        <Circle cx={bizco ? 14.8 : 16.6} cy={bizco ? 9.4 : 11} r="1.6" fill="#111111" />
        <Path d={ceja ? 'M4.5 5 L10 6.5 M14 6.5 L19.5 5' : 'M4.5 6.5 L10 5 M14 5 L19.5 6.5'} stroke="#111111" strokeWidth="1.4" strokeLinecap="round" />
        <Path d={boca} stroke="#111111" strokeWidth="1.5" fill={h % 4 === 3 ? '#E30A2F' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
