import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { F } from './tema';

// Póster Bauhaus de un patio o mall: más grande que una lámina (2:3), para el álbum.
// El diseño sale del id del lugar: siempre el mismo, distinto para cada uno.
const AM = '#FFD100', RO = '#E30A2F', AZ = '#1E5AA8', NE = '#111111', PA = '#FFF6E5';
function semilla(t) { let h = 2166136261; for (const ch of String(t)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export function PosterLugar({ lugar, ancho = 180, bloqueado = false }) {
  const s = semilla(lugar.id);
  const paletas = [[AM, RO, AZ, NE], [RO, AM, NE, AZ], [AZ, AM, RO, NE], [PA, RO, AZ, NE], [NE, AM, RO, AZ]];
  const [f, a, b, c] = bloqueado ? ['#E4E4E9', '#CFCFD6', '#BDBDC6', '#9A9AA5'] : paletas[s % paletas.length];
  const tinta = f === NE || f === AZ || f === RO ? '#FFFFFF' : NE;
  const pisos = (lugar.pisos || []).length || 1;
  const alto = ancho * 1.5;
  const v = (s >>> 5) % 3;
  return (
    <View style={{ width: ancho, height: alto, backgroundColor: f, overflow: 'hidden', borderWidth: 2.5, borderColor: NE }} accessibilityRole="image" accessibilityLabel={`Póster de ${lugar.nombre}`}>
      <Svg width={ancho} height={alto} viewBox="0 0 100 150" style={{ position: 'absolute', left: 0, top: 0 }}>
        {v === 0 ? (<>
          <Circle cx={68} cy={46} r={34} fill={a} />
          <Rect x={0} y={78} width={100} height={14} fill={b} />
          <Path d="M0 150L0 100L46 150Z" fill={c} />
        </>) : v === 1 ? (<>
          <Path d="M0 0H100V70A50 50 0 0 1 0 70Z" fill={a} />
          <Circle cx={30} cy={40} r={16} fill={b} />
          <Rect x={62} y={86} width={30} height={30} fill={c} />
        </>) : (<>
          <Rect x={12} y={12} width={48} height={70} fill={a} />
          <Circle cx={66} cy={70} r={26} fill={b} />
          <Path d="M100 0L100 40L60 0Z" fill={c} />
        </>)}
        {/* Los pisos del lugar, como barras apiladas */}
        {Array.from({ length: Math.min(pisos, 8) }).map((_, i) => (
          <Rect key={i} x={84} y={140 - i * 7} width={10} height={5} fill={i % 2 ? a : c} />
        ))}
      </Svg>
      <View style={{ position: 'absolute', left: ancho * 0.07, right: ancho * 0.2, bottom: ancho * 0.08 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: ancho * 0.055, letterSpacing: 2, color: tinta }}>{lugar.tipo === 'mall' ? `MALL · ${pisos} ${pisos === 1 ? 'PISO' : 'PISOS'}` : 'PATIO'}</Text>
        <Text style={{ fontFamily: F.negrita, fontSize: ancho * 0.15, lineHeight: ancho * 0.15, letterSpacing: -1, color: tinta }} numberOfLines={3}>{String(lugar.nombre).toUpperCase()}</Text>
      </View>
      {bloqueado ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: alto * 0.42, alignItems: 'center' }}>
          <Text style={{ fontFamily: F.negrita, fontSize: ancho * 0.07, color: NE, backgroundColor: '#FFFFFFCC', paddingHorizontal: 8, paddingVertical: 3 }}>VISÍTALO 🔒</Text>
        </View>
      ) : null}
    </View>
  );
}

// Lugares visitados (el póster se gana al estar adentro)
const CLAVE = 'droper_lugares_vistos';
export async function marcarVisitado(id) {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(CLAVE)) || '[]');
    if (!v.includes(id)) { v.push(id); await AsyncStorage.setItem(CLAVE, JSON.stringify(v)); }
  } catch (e) { /* sin almacenamiento: no pasa nada */ }
}
export function useVisitados() {
  const [v, setV] = useState([]);
  useEffect(() => { AsyncStorage.getItem(CLAVE).then((x) => setV(JSON.parse(x || '[]'))).catch(() => {}); }, []);
  return v;
}
