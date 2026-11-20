import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, F, letrista } from './tema';
import { Ola } from './componentes';
import { useIdioma } from './idioma';

// Manual para caseritos: corto, en pasos, con lo que más se pregunta
const PASOS = [
  ['Mira los drops', 'Un drop es una oferta de un local del barrio, con cupo y hora de término. Los ves en Inicio, en la pizarra y en el Mapa.'],
  ['Súmate', 'Toca un drop y "Me sumo". No necesitas estar en el local para anotarte.'],
  ['Llega al local', 'Cuando llegas al local (a unos 50 m, media cuadra), aparece tu código QR. Muéstralo en la caja (o dicta el código) y te cobran el precio del drop.'],
  ['Junta láminas', 'Tu primer canje en cada local te da su lámina del álbum de Barrio Italia. Al juntar varias hay premios.'],
  ['Deja tu reseña', 'Después de canjear puedes poner estrellas y un comentario. Solo reseña quien compró: por eso son reseñas de verdad.'],
];

const DUDAS = [
  ['¿Qué es un drop grupal?', 'Una oferta que mejora mientras más gente canjea: por ejemplo 10% con 10 personas, 20% con 25. Invita a tus amigos para subir de nivel.'],
  ['¿Qué es un drop sorpresa?', 'No sabes qué es hasta que llegas al local. Puede ser un descuento, un regalo o la lámina dorada.'],
  ['¿Por qué no me aparece el QR?', 'El QR aparece cuando estás en el local (a unos 50 m). Revisa que Caserito tenga permiso de ubicación precisa; si estás adentro y no aparece, sal a la puerta un momento para que el GPS te ubique.'],
  ['¿Me avisan cuando hay un drop?', 'Sí, si activas los avisos en Inicio. Te llega una notificación cuando un local a pocas cuadras de donde andas suelta un drop (máximo 3 al día y nunca entre las 22:00 y las 9:00), y otra cuando llegas a la puerta de un local con drop, con tu QR listo. Se apagan en Ajustes del teléfono → Caserito → Notificaciones.'],
  ['¿Necesito cuenta?', 'No para empezar: Caserito te reconoce en este teléfono. Pero te conviene guardar tu cuenta en "Tú" con tu correo (sin clave, te llega un código): así no pierdes tus láminas si cambias de teléfono o borras la app.'],
  ['¿Qué datos guardan de mí?', 'Tus drops, láminas y gustos, para mostrarte primero lo que te tinca. Los locales no ven quién eres; solo cuántos canjearon.'],
  ['¿Cómo apago lo que Caserito aprendió?', 'En Inicio, abajo, en "Caserito aprendió que…": toca un gusto para apagarlo.'],
];

const PASOS_TUR = [
  ['Check the drops', 'A drop is a deal from a local shop in Barrio Italia: few units, ends soon. Find them on Home (the pizarra) and on the Map.'],
  ['Join · Súmate', 'Tap a drop and "Join". You don’t need to be at the shop yet.'],
  ['Walk there', 'When you get to the shop (~50 m, half a cuadra), your QR code shows up. Show it at the counter (la caja) and pay the drop price.'],
  ['Collect láminas', 'Your first redeem at each shop gives you its sticker for the Barrio Italia album. Collect more, win prizes.'],
  ['Leave a review', 'After redeeming you can rate the shop. Only buyers can review: real reviews, no fakes.'],
];

const DUDAS_TUR = [
  ['What’s a “group drop”?', 'A deal that gets better the more people redeem it: e.g. 10% with 10 people, 20% with 25. Bring your friends!'],
  ['What’s a “mystery drop”?', 'You find out what it is at the shop: a discount, a gift or the golden sticker.'],
  ['Do you send notifications?', 'Yes, if you turn on pings on Home. You get one when a shop a few blocks from you drops a deal (max 3 a day, never between 10 pm and 9 am), and another when you reach the door of a shop with a drop, with your QR ready.'],
  ['What do the underlined words mean?', 'Shops write in their own slang (Chilean, Venezuelan, Peruvian…). Tap an underlined word to see its meaning. ¡Bacán!'],
  ['How far is a cuadra?', 'About 100 m, around a 1–2 minute walk. We show meters and minutes next to it.'],
  ['Do I need an account?', 'Not to start. But save your account in "Me" with your email (no password, we send a code) so you keep your stickers if you switch phones.'],
  ['Prices?', 'All prices are in Chilean pesos (CLP). Pay at the shop as usual.'],
];

export default function Ayuda({ alCerrar }) {
  const web = Platform.OS === 'web';
  const { tur, t } = useIdioma();
  const pasos = tur ? PASOS_TUR : PASOS;
  const dudas = tur ? DUDAS_TUR : DUDAS;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={alCerrar} accessibilityRole="button" accessibilityLabel={t('Volver', 'Back')}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: C.negro, backgroundColor: C.papel, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.negro} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 18l-6-6 6-6" /></Svg>
        </Pressable>
        <Text style={{ ...letrista, fontSize: 26, color: C.rojo, textShadowColor: C.azul, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 }}>{t('¿CÓMO FUNCIONA?', 'HOW IT WORKS')}</Text>
      </View>
      <Ola color={C.amarillo} />

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {pasos.map(([titulo, d], i) => (
          <View key={titulo} style={{ flexDirection: 'row', gap: 12, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.negro, borderRadius: 16, padding: 14 }}>
            <Text style={{ ...letrista, fontSize: 30, color: C.rojo, width: 26 }}>{i + 1}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: F.negrita, fontSize: 16 }}>{titulo}</Text>
              <Text style={{ fontFamily: F.normal, fontSize: 15, lineHeight: 21 }}>{d}</Text>
            </View>
          </View>
        ))}

        {web && (
          <View style={{ backgroundColor: C.negro, borderRadius: 16, padding: 14, gap: 4 }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 15, color: C.amarillo }}>{t('Tenla a mano', 'Keep it handy')}</Text>
            <Text style={{ fontFamily: F.normal, fontSize: 14, lineHeight: 20, color: C.papel }}>
              {t('En iPhone: botón Compartir → "Agregar a pantalla de inicio". En Android: menú ⋮ → "Agregar a la pantalla principal". Queda como una app.', 'iPhone: Share → "Add to Home Screen". Android: menu ⋮ → "Add to Home screen". It works like an app.')}
            </Text>
          </View>
        )}

        <Text style={{ ...letrista, fontSize: 21, marginTop: 8 }}>{t('PREGUNTAS FRECUENTES', 'FAQ · PREGUNTAS')}</Text>
        {dudas.map(([p, r]) => (
          <View key={p} style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#CDBF9F', paddingTop: 10, gap: 4 }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 15 }}>{p}</Text>
            <Text style={{ fontFamily: F.normal, fontSize: 15, lineHeight: 21 }}>{r}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
