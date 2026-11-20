import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Notificaciones push: avisan cuando un local cercano suelta un drop.
// El envío lo hace la base de datos (SQL 008) a través del servicio de Expo.
const PROYECTO_EXPO = 'ad8f9042-40e8-4c50-ad1f-c9075bf93abd';
const CLAVE_DESCARTADO = 'caserito_avisos_descartado';

export const avisosDisponibles = true;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

async function prepararCanal() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Drops cerca', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 200, 120, 200],
  });
}

// 'activo' | 'pendiente' | 'descartado' | 'bloqueado'
export async function estadoAvisos() {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return 'activo';
    if (await AsyncStorage.getItem(CLAVE_DESCARTADO)) return 'descartado';
    return p.canAskAgain === false ? 'bloqueado' : 'pendiente';
  } catch {
    return 'descartado';
  }
}

export async function descartarAvisos() {
  await AsyncStorage.setItem(CLAVE_DESCARTADO, '1').catch(() => {});
}

// Pide permiso (si preguntar=true), saca el token del teléfono y lo guarda con la última ubicación
export async function activarAvisos({ idioma, pos, preguntar }) {
  await prepararCanal();
  let p = await Notifications.getPermissionsAsync();
  if (!p.granted && preguntar) p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return { ok: false, motivo: p.canAskAgain === false ? 'bloqueado' : 'permiso' };
  let token;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId: PROYECTO_EXPO })).data;
  } catch {
    // Expo Go en Android no recibe notificaciones push: funcionan en la app instalada desde la tienda
    return { ok: false, motivo: 'no_soportado' };
  }
  const conPos = pos && !pos.aprox;
  const { error } = await supabase.rpc('guardar_aviso', {
    p_token: token, p_plataforma: Platform.OS, p_idioma: idioma,
    p_lat: conPos ? pos.lat : null, p_lng: conPos ? pos.lng : null,
  });
  if (error) return { ok: false, motivo: 'error' };
  ultima = conPos ? { ...pos, cuando: Date.now() } : null;
  return { ok: true };
}

// Guarda dónde anda el caserito (como máximo cada 150 m o cada 10 minutos)
let ultima = null;
export async function ubicarAviso(pos) {
  if (!pos || pos.aprox) return;
  if (ultima) {
    const m = Math.hypot((pos.lat - ultima.lat) * 111000, (pos.lng - ultima.lng) * 93000);
    if (m < 150 && Date.now() - ultima.cuando < 10 * 60 * 1000) return;
  }
  ultima = { ...pos, cuando: Date.now() };
  await supabase.rpc('ubicar_aviso', { p_lat: pos.lat, p_lng: pos.lng }).then(() => {}, () => {});
}

// Al tocar una notificación, abre ese drop
let ultimaTocada = null;
export function alTocarAviso(abrir) {
  const leer = (r) => r && r.notification && r.notification.request.content.data && r.notification.request.content.data.drop_id;
  const sub = Notifications.addNotificationResponseReceivedListener((r) => { const id = leer(r); if (id) abrir(id); });
  Notifications.getLastNotificationResponseAsync().then((r) => {
    const id = leer(r);
    const clave = r && r.notification.request.identifier;
    if (id && clave !== ultimaTocada) { ultimaTocada = clave; abrir(id); }
  }).catch(() => {});
  return () => sub.remove();
}
