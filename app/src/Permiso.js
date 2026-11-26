import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { ICONO } from './Cargando';
import { pedirPermisoRumbo, guardarBrujula } from './rumbo';
import { F } from './tema';

// Una sola pregunta al abrir por primera vez: ubicación y brújula de una vez
export default function Permiso({ t = (a) => a, alListo }) {
  async function activar() {
    // Primero la brújula: en iPhone tiene que ir pegada al toque
    const ok = await pedirPermisoRumbo().catch(() => false);
    guardarBrujula(ok);
    alListo(true);
  }
  const fila = (icono, texto) => (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: '#111111', paddingHorizontal: 14, paddingVertical: 12 }}>
      {icono}
      <Text style={{ flex: 1, fontFamily: F.negrita, fontSize: 14 }}>{texto}</Text>
    </View>
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFD100' }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32, gap: 20 }}>
      <View style={{ alignSelf: 'center', borderWidth: 4, borderColor: '#111111', backgroundColor: '#F9F2E5', shadowColor: '#111111', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6, marginTop: 10 }}>
        <SvgXml xml={ICONO} width={150} height={150} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 28, lineHeight: 31, letterSpacing: -0.8 }}>{t('Para mostrarte los drops a tu alrededor', 'To show you the drops around you')}</Text>
        <Text style={{ fontFamily: F.media, fontSize: 15, lineHeight: 21 }}>{t('Activamos tu ubicación y la brújula de una vez. El mapa gira contigo y siempre sabes hacia dónde caminar.', 'We turn on your location and compass at once. The map turns with you.')}</Text>
      </View>
      <View style={{ gap: 10 }}>
        {fila(<Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M21 3L3 10.5l7.5 2.5L13 21z" fill="#2F7BF6" /></Svg>, t('Ubicación: los drops a 2 cuadras, 1 km…', 'Location: drops 2 blocks, 1 km away…'))}
        {fila(<Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M12 2l4 10h-8z" fill="#E30A2F" /><Path d="M12 22l-4-10h8z" fill="none" stroke="#111111" strokeWidth={2} strokeLinejoin="round" /></Svg>, t('Brújula: el mapa mira hacia donde miras tú', 'Compass: the map faces where you face'))}
      </View>
      <View style={{ flex: 1 }} />
      <Pressable onPress={activar} accessibilityRole="button"
        style={{ minHeight: 58, borderWidth: 3, borderColor: '#111111', backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center', shadowColor: '#E30A2F', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 18, color: '#FFD100' }}>{t('Activar y ver drops', 'Turn on and see drops')}</Text>
      </Pressable>
      <Pressable onPress={() => { guardarBrujula(false); alListo(false); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 14, textDecorationLine: 'underline' }}>{t('Ahora no', 'Not now')}</Text>
      </Pressable>
    </ScrollView>
  );
}
