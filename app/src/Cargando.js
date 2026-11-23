import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Pantalla de carga con el ícono de Droper (la D sobre la lámina), latiendo suave
const ICONO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#FFD100"/><path d="M100 100L100 52A48 48 0 0 0 52 100Z" fill="#E30A2F"/><rect width="30" height="30" fill="#1E5AA8"/><rect x="26" y="22" width="16" height="56" fill="#1E5AA8" stroke="#111" stroke-width="2.2"/><path d="M42 22A28 28 0 0 1 42 78Z" fill="#1E5AA8" stroke="#111" stroke-width="2.2"/><circle cx="51" cy="50" r="8" fill="#FFF6E5" stroke="#111" stroke-width="2.2"/></svg>`;

export default function Cargando({ texto = 'Buscando drops cerca…', fuente }) {
  const latido = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(latido, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(latido, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);
  const escala = latido.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const giro = latido.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] });
  return (
    <View style={{ flex: 1, backgroundColor: '#FFD100', alignItems: 'center', justifyContent: 'center', gap: 22 }} accessibilityRole="progressbar" accessibilityLabel={texto}>
      <Animated.View style={{ transform: [{ scale: escala }, { rotate: giro }], borderWidth: 4, borderColor: '#111111', shadowColor: '#111111', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 0 }}>
        <SvgXml xml={ICONO} width={132} height={132} />
      </Animated.View>
      <Text style={{ fontFamily: fuente, fontWeight: fuente ? undefined : '800', fontSize: 16, color: '#111111' }}>{texto}</Text>
    </View>
  );
}
