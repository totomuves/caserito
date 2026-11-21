import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, F, letrista } from './tema';
import { Ola } from './componentes';
import { useIdioma, FraseGlosario } from './idioma';

// Manual para caseritos: corto, en pasos, con lo que más se pregunta
const PASOS = [
  ['Mira los drops', 'Un drop es una oferta de un local del barrio, con cupo y hora de término. Los ves en Inicio, en la pizarra y en el Mapa.'],
  ['Súmate', 'Toca un drop y "Me sumo". No necesitas estar en el local para anotarte.'],
  ['Llega al local', 'Cuando llegas al local (a unos 50 m, media cuadra), aparece tu código QR. Muéstralo en la caja (o dicta el código) y te cobran el precio del drop.'],
  ['Junta láminas', 'Tu primer canje en cada local te da su lámina del álbum de tu barrio. Al juntar varias hay premios.'],
  ['Deja tu reseña', 'Después de canjear puedes poner estrellas y un comentario. Solo reseña quien compró: por eso son reseñas de verdad.'],
];

const DUDAS = [
  ['¿Qué es un drop grupal?', 'Una oferta que mejora mientras más gente canjea: por ejemplo 10% con 10 personas, 20% con 25. Invita a tus amigos para subir de nivel.'],
  ['¿Qué es un drop sorpresa?', 'No sabes qué es hasta que llegas al local. Puede ser un descuento, un regalo o la lámina dorada.'],
  ['¿Por qué no me aparece el QR?', 'El QR aparece cuando estás en el local (a unos 50 m). Revisa que Caserito tenga permiso de ubicación precisa; si estás adentro y no aparece, sal a la puerta un momento para que el GPS te ubique.'],
  ['¿Me avisan cuando hay un drop?', 'Sí, si activas los avisos en Inicio. Te llega una notificación cuando un local a pocas cuadras de donde andas suelta un drop (máximo 3 al día y nunca entre las 22:00 y las 9:00), y otra cuando llegas a la puerta de un local con drop, con tu QR listo. Se apagan en Ajustes del teléfono → Caserito → Notificaciones.'],
  ['¿Y las láminas repetidas?', 'Tu primer canje en un local te da su lámina; cada canje siguiente ahí es una repetida. Si el local las cambia, en tu álbum ves qué te dan (ej. 5 repetidas = 1 cortado) y pides el cambio: te sale un QR para mostrar en la caja.'],
  ['¿Qué es el arte del barrio?', 'Algunos barrios tienen su arte: una ilustración o póster de un artista del barrio. Si juntas las láminas que pide (de locales distintos del barrio), lo pides en tu álbum y lo retiras con un QR en el local que se indica. Uno por persona.'],
  ['¿Necesito cuenta?', 'No para empezar: Caserito te reconoce en este teléfono. Pero te conviene guardar tu cuenta en "Tú" con tu correo (sin clave, te llega un código): así no pierdes tus láminas si cambias de teléfono o borras la app.'],
  ['¿Qué datos guardan de mí?', 'Tus drops, láminas y gustos, para mostrarte primero lo que te tinca. Los locales no ven quién eres; solo cuántos canjearon.'],
  ['¿Cómo apago lo que Caserito aprendió?', 'En Inicio, abajo, en "Caserito aprendió que…": toca un gusto para apagarlo.'],
];

const PASOS_TUR = [
  ['Mira los drops', 'Un drop is a deal de un local del barrio: pocas unidades, termina pronto. Los ves en Inicio (la pizarra) y en el Mapa.'],
  ['Súmate · Join', 'Toca un drop y "Me sumo". No necesitas estar en el local yet.'],
  ['Camina pa’llá', 'Cuando llegas al local (~50 m, media cuadra), aparece tu código QR. Muéstralo en la caja y paga el precio del drop.'],
  ['Junta láminas', 'Tu primer canje en cada local te da su lámina for the álbum del barrio. Más láminas, más premios.'],
  ['Deja tu reseña', 'Después de canjear puedes calificar el local. Solo opinan quienes compraron: reseñas reales, nada de fakes.'],
];

const DUDAS_TUR = [
  ['¿Qué es un drop grupal?', 'Un deal que mejora mientras más gente canjea: ej. 10% con 10 personas, 20% con 25. ¡Trae a tus amigos!'],
  ['¿Y un drop sorpresa?', 'Lo descubres en el local: un descuento, un regalo o la lámina dorada.'],
  ['¿Me avisan?', 'Sí, si activas los avisos en Inicio. Te llega uno cuando un local a pocas cuadras suelta un drop (max 3 al día, nunca entre 22:00 y 9:00), y otro cuando llegas a la puerta con tu QR listo.'],
  ['¿Y las palabras subrayadas?', 'Los locales escriben con sus modismos (chilenos, venezolanos, peruanos…). Toca una palabra subrayada y te sale qué significa. ¡Bacán!'],
  ['¿Cuánto es una cuadra?', 'Unos 100 m, 1–2 minutos caminando. Te mostramos metros y minutos al lado.'],
  ['¿Y las repetidas?', 'Tu primer canje en un local te da su lámina; cada canje siguiente ahí es una repetida (duplicate). Si el local las cambia, en tu álbum ves qué te dan (ej. 5 repetidas = 1 cortado) y pides el cambio: te sale un QR para la caja.'],
  ['¿Y el arte del barrio?', 'Algunos barrios tienen su arte (ilustración o póster de un artista local). Junta las láminas que pide, pídelo en tu álbum y retíralo con un QR en el local indicado. Uno por persona.'],
  ['¿Necesito account?', 'No para empezar. Pero guarda tu account en "Tú" con tu email (sin password, te mandamos un código) y no pierdes tus láminas si cambias de phone.'],
  ['¿Precios?', 'Todo en pesos chilenos (CLP). Pagas en el local, como siempre.'],
];

export default function Ayuda({ alCerrar }) {
  const web = Platform.OS === 'web';
  const { tur, t } = useIdioma();
  const pasos = tur ? PASOS_TUR : PASOS;
  const dudas = tur ? DUDAS_TUR : DUDAS;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={alCerrar} accessibilityRole="button" accessibilityLabel={t('Volver', "Volver · Back")}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: C.negro, backgroundColor: C.papel, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.negro} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 18l-6-6 6-6" /></Svg>
        </Pressable>
        <Text style={{ ...letrista, fontSize: 26, color: C.rojo, textShadowColor: C.azul, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 }}>{t('¿CÓMO FUNCIONA?', "CÓMO FUNCIONA · HOW IT WORKS")}</Text>
      </View>
      <Ola color={C.amarillo} />

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {pasos.map(([titulo, d], i) => (
          <View key={titulo} style={{ flexDirection: 'row', gap: 12, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.negro, borderRadius: 16, padding: 14 }}>
            <Text style={{ ...letrista, fontSize: 30, color: C.rojo, width: 26 }}>{i + 1}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: F.negrita, fontSize: 16 }}>{titulo}</Text>
              <FraseGlosario texto={d} colorAyuda={C.rojoTexto} style={{ fontFamily: F.normal, fontSize: 15, lineHeight: 21 }} />
            </View>
          </View>
        ))}

        {web && (
          <View style={{ backgroundColor: C.negro, borderRadius: 16, padding: 14, gap: 4 }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 15, color: C.amarillo }}>{t('Tenla a mano', "Tenla a mano")}</Text>
            <Text style={{ fontFamily: F.normal, fontSize: 14, lineHeight: 20, color: C.papel }}>
              {t('En iPhone: botón Compartir → "Agregar a pantalla de inicio". En Android: menú ⋮ → "Agregar a la pantalla principal". Queda como una app.', "iPhone: Share → \"Add to Home Screen\". Android: menú ⋮ → \"Add to Home screen\". Funciona like an app, al tiro.")}
            </Text>
          </View>
        )}

        <Text style={{ ...letrista, fontSize: 21, marginTop: 8 }}>{t('PREGUNTAS FRECUENTES', "PREGUNTAS · FAQ")}</Text>
        {dudas.map(([p, r]) => (
          <View key={p} style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#CDBF9F', paddingTop: 10, gap: 4 }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 15 }}>{p}</Text>
            <FraseGlosario texto={r} colorAyuda={C.rojoTexto} style={{ fontFamily: F.normal, fontSize: 15, lineHeight: 21 }} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
