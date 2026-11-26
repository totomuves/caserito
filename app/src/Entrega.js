import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ICONO } from './Cargando';
import { C, F, precio } from './tema';

// Aparece un drop nuevo: el repartidor de Dropper te entrega el flyer
export default function Entrega({ drop, t = (a) => a, alAbrir, alCerrar }) {
  const llega = useRef(new Animated.Value(0)).current;
  const flyer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    llega.setValue(0); flyer.setValue(0);
    Animated.sequence([
      Animated.spring(llega, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(flyer, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
    ]).start();
    const id = setTimeout(alCerrar, 6000);
    return () => clearTimeout(id);
  }, [drop.drop_id]);
  const x = llega.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] });
  const fx = flyer.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] });
  const fs = flyer.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const fr = flyer.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '-3deg'] });
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: 96, zIndex: 2000 }}>
      <Pressable onPress={alAbrir} accessibilityRole="button" accessibilityLiveRegion="polite"
        accessibilityLabel={t(`Nuevo drop en ${drop.local_nombre}. Toca para verlo.`, `New drop at ${drop.local_nombre}`)}
        style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Animated.View style={{ transform: [{ translateX: x }], borderWidth: 3, borderColor: C.negro, backgroundColor: '#F9F2E5', shadowColor: C.negro, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}>
          <SvgXml xml={ICONO} width={72} height={72} />
        </Animated.View>
        <Animated.View style={{ flex: 1, marginLeft: -6, marginBottom: 18, transform: [{ translateX: fx }, { scale: fs }, { rotate: fr }], opacity: flyer,
          backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.negro, padding: 10, gap: 2, shadowColor: C.negro, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 10, color: '#FFFFFF', backgroundColor: C.rojo, paddingHorizontal: 5, paddingVertical: 1 }}>{t('NUEVO DROP', 'NEW DROP')}</Text>
            {drop.precio ? <Text style={{ fontFamily: F.negrita, fontSize: 12, backgroundColor: C.amarillo, paddingHorizontal: 5 }}>{precio(drop.precio)}</Text> : null}
          </View>
          <Text style={{ fontFamily: F.negrita, fontSize: 14 }} numberOfLines={1}>{drop.local_nombre}</Text>
          <Text style={{ fontFamily: F.media, fontSize: 12, color: C.gris }} numberOfLines={1}>{drop.titulo}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}
