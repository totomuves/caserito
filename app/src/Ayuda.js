import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, F, letrista } from './tema';
import { Ola } from './componentes';

// Manual para caseritos: corto, en pasos, con lo que más se pregunta
const PASOS = [
  ['Mira los drops', 'Un drop es una oferta de un local del barrio, con cupo y hora de término. Los ves en Inicio, en la pizarra y en el Mapa.'],
  ['Súmate', 'Toca un drop y "Me sumo". No necesitas estar en el local para anotarte.'],
  ['Llega al local', 'Cuando estás a 1 cuadra, aparece tu código QR. Muéstralo en la caja (o dicta el código) y te cobran el precio del drop.'],
  ['Junta láminas', 'Tu primer canje en cada local te da su lámina del álbum de Barrio Italia. Al juntar varias hay premios.'],
  ['Deja tu reseña', 'Después de canjear puedes poner estrellas y un comentario. Solo reseña quien compró: por eso son reseñas de verdad.'],
];

const DUDAS = [
  ['¿Qué es un drop grupal?', 'Una oferta que mejora mientras más gente canjea: por ejemplo 10% con 10 personas, 20% con 25. Invita a tus amigos para subir de nivel.'],
  ['¿Qué es un drop sorpresa?', 'No sabes qué es hasta que llegas al local. Puede ser un descuento, un regalo o la lámina dorada.'],
  ['¿Por qué no me aparece el QR?', 'El QR aparece solo cuando estás a 1 cuadra del local. Revisa que Caserito tenga permiso de ubicación.'],
  ['¿Necesito cuenta?', 'No. Caserito te reconoce en este teléfono sin pedirte correo ni clave. Si borras la app o los datos del navegador, pierdes tus láminas.'],
  ['¿Qué datos guardan de mí?', 'Tus drops, láminas y gustos, para mostrarte primero lo que te tinca. Los locales no ven quién eres; solo cuántos canjearon.'],
  ['¿Cómo apago lo que Caserito aprendió?', 'En Inicio, abajo, en "Caserito aprendió que…": toca un gusto para apagarlo.'],
];

export default function Ayuda({ alCerrar }) {
  const web = Platform.OS === 'web';
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={alCerrar} accessibilityRole="button" accessibilityLabel="Volver"
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: C.negro, backgroundColor: C.papel, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.negro} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 18l-6-6 6-6" /></Svg>
        </Pressable>
        <Text style={{ ...letrista, fontSize: 26, color: C.rojo, textShadowColor: C.azul, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 }}>¿CÓMO FUNCIONA?</Text>
      </View>
      <Ola color={C.amarillo} />

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {PASOS.map(([t, d], i) => (
          <View key={t} style={{ flexDirection: 'row', gap: 12, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.negro, borderRadius: 16, padding: 14 }}>
            <Text style={{ ...letrista, fontSize: 30, color: C.rojo, width: 26 }}>{i + 1}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: F.negrita, fontSize: 16 }}>{t}</Text>
              <Text style={{ fontFamily: F.normal, fontSize: 15, lineHeight: 21 }}>{d}</Text>
            </View>
          </View>
        ))}

        {web && (
          <View style={{ backgroundColor: C.negro, borderRadius: 16, padding: 14, gap: 4 }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 15, color: C.amarillo }}>Tenla a mano</Text>
            <Text style={{ fontFamily: F.normal, fontSize: 14, lineHeight: 20, color: C.papel }}>
              En iPhone: botón Compartir → "Agregar a pantalla de inicio". En Android: menú ⋮ → "Agregar a la pantalla principal". Queda como una app.
            </Text>
          </View>
        )}

        <Text style={{ ...letrista, fontSize: 21, marginTop: 8 }}>PREGUNTAS FRECUENTES</Text>
        {DUDAS.map(([p, r]) => (
          <View key={p} style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#CDBF9F', paddingTop: 10, gap: 4 }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 15 }}>{p}</Text>
            <Text style={{ fontFamily: F.normal, fontSize: 15, lineHeight: 21 }}>{r}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
