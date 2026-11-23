import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { C, F, letrista, R } from './tema';
import { Boton } from './componentes';

const VISITAS = 7;

// Caserito de Honor: a la 7ª visita a un local, tu selfie se vuelve lámina del álbum (Gemini / Nano Banana)
export default function Honor({ usuario, t }) {
  const [lista, setLista] = useState([]);
  const [abierto, setAbierto] = useState(null);
  const [acepto, setAcepto] = useState(false);
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');

  async function cargar() {
    const { data } = await supabase.rpc('mis_honores');
    setLista(data || []);
  }
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

  async function hacer(local) {
    setError('');
    let r;
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      const opciones = { mediaTypes: ['images'], allowsEditing: true, aspect: [2, 3], quality: 0.6, base64: true, cameraType: ImagePicker.CameraType.front };
      r = permiso.granted ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
    } catch (e) {
      r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [2, 3], quality: 0.6, base64: true });
    }
    if (!r || r.canceled || !r.assets || !r.assets[0]) return;
    const a = r.assets[0];
    let foto = a.base64;
    if (!foto && a.uri && a.uri.startsWith('data:')) foto = a.uri.split(',')[1];
    if (!foto) { setError(t('No pudimos leer la foto. Prueba con otra.', 'No pudimos leer la foto. Try another one.')); return; }
    setEstado(t('Dibujando tu lámina… (tarda como 20 segundos)', 'Dibujando tu lámina… (~20 seconds)'));
    const { data, error: e } = await supabase.functions.invoke('retrato', {
      body: { local_id: local.local_id, foto, mime: a.mimeType || 'image/jpeg', acepto: true },
    });
    setEstado('');
    if (e) {
      let msg = e.message;
      try { const cuerpo = await e.context.json(); if (cuerpo && cuerpo.error) msg = cuerpo.error; } catch (_) {}
      setError(msg);
      return;
    }
    if (data && data.imagen_url) { setAbierto(null); setAcepto(false); cargar(); }
  }

  if (!lista.length) return null;
  return (
    <View style={{ marginTop: 18, marginHorizontal: 16, gap: 10 }}>
      <Text style={{ ...letrista, fontSize: 22 }}>{t('CASERITO DE HONOR', 'CASERITO DE HONOR')}</Text>
      <Text style={{ fontFamily: F.media, fontSize: 14 }}>
        {t(`Con ${VISITAS} visitas a un local, tu foto se vuelve lámina del álbum.`, `${VISITAS} visitas a un local = your selfie se vuelve lámina.`)}
      </Text>
      {lista.map((l) => {
        const listo = l.visitas >= VISITAS;
        return (
          <View key={l.local_id} style={{ backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.borde, borderRadius: R(16), padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {l.imagen_url ? (
                <View style={{ borderWidth: 3, borderColor: C.borde, borderRadius: 10, backgroundColor: C.amarillo, padding: 3, transform: [{ rotate: '-3deg' }] }}>
                  <Image source={{ uri: l.imagen_url }} style={{ width: 84, height: 126, borderRadius: 6 }} accessibilityLabel={t('Tu lámina de honor', 'Tu lámina de honor')} />
                  <Text style={{ ...letrista, fontSize: 11, textAlign: 'center', marginTop: 2 }}>{l.local_nombre.toUpperCase()}</Text>
                </View>
              ) : (
                <View style={{ width: 84, height: 126, borderWidth: 2.5, borderStyle: 'dashed', borderColor: C.borde, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: listo ? C.amarillo : C.crema }}>
                  <Text style={{ ...letrista, fontSize: 26 }}>{listo ? '★' : `${l.visitas}/${VISITAS}`}</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: F.negrita, fontSize: 16 }}>{l.local_nombre}</Text>
                <Text style={{ fontFamily: F.media, fontSize: 13, color: C.gris }}>
                  {l.imagen_url ? t('¡Ya eres Caserito de Honor!', '¡Ya eres Caserito de Honor!')
                    : listo ? t('¡Desbloqueaste tu lámina de honor!', '¡Unlocked tu lámina de honor!')
                    : t(`Te faltan ${VISITAS - l.visitas} visitas`, `Te faltan ${VISITAS - l.visitas} visitas`)}
                </Text>
                <View style={{ height: 8, borderRadius: 4, borderWidth: 2, borderColor: C.borde, backgroundColor: C.amarilloSuave, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, Math.round((l.visitas / VISITAS) * 100))}%`, height: '100%', backgroundColor: C.amarillo }} />
                </View>
              </View>
            </View>
            {listo && abierto !== l.local_id ? (
              <Boton texto={l.imagen_url ? t('Hacer otra', 'Hacer otra') : t('Hazte lámina 📸', 'Hazte lámina 📸')} onPress={() => { setAbierto(l.local_id); setError(''); }} />
            ) : null}
            {abierto === l.local_id ? (
              <View style={{ gap: 8 }}>
                <Pressable onPress={() => setAcepto(!acepto)} accessibilityRole="checkbox" accessibilityState={{ checked: acepto }} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={{ width: 24, height: 24, borderWidth: 2.5, borderColor: C.borde, borderRadius: 6, backgroundColor: acepto ? C.amarillo : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                    {acepto ? <Text style={{ fontFamily: F.negrita }}>✓</Text> : null}
                  </View>
                  <Text style={{ flex: 1, fontFamily: F.media, fontSize: 13 }}>
                    {t('Soy mayor de 18, la foto es mía y acepto que una IA de Google la transforme en caricatura. La foto original no se guarda; la lámina queda en mi álbum y la puede ver el local.',
                      'Soy mayor de 18, la foto es mía y acepto que la IA de Google la transforme. La foto original no se guarda; la lámina queda en mi álbum y el local la puede ver.')}
                  </Text>
                </Pressable>
                {estado ? (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <ActivityIndicator color={C.negro} />
                    <Text style={{ fontFamily: F.negrita, fontSize: 13 }}>{estado}</Text>
                  </View>
                ) : (
                  <Boton texto={t('Sacar la foto', 'Sacar la foto')} onPress={() => acepto && hacer(l)} deshabilitado={!acepto} />
                )}
                <Text style={{ fontFamily: F.media, fontSize: 12, color: C.gris }}>{t('Tip: de frente, con buena luz y solo tú en la foto.', 'Tip: de frente, buena luz, solo tú.')}</Text>
              </View>
            ) : null}
            {error && abierto === l.local_id ? <Text style={{ fontFamily: F.negrita, color: C.rojoTexto }}>{error}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}
