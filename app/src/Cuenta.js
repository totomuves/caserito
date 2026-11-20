import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { supabase, explicar } from './supabase';
import { C, F, letrista } from './tema';
import { Ola, Boton } from './componentes';
import { useIdioma } from './idioma';

// "Tú": cuenta del caserito, apodo, idioma y comentarios de la beta
const campo = { minHeight: 48, borderWidth: 2, borderColor: C.negro, borderRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 12, fontFamily: F.normal, fontSize: 16, color: C.negro };
const tarjeta = { marginHorizontal: 16, backgroundColor: C.papel, borderWidth: 2.5, borderColor: C.negro, borderRadius: 18, padding: 16, gap: 10 };
const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.trim());

export default function Cuenta({ usuario, alAyuda }) {
  const { t, tur, setTur } = useIdioma();
  const anonimo = !!usuario.is_anonymous || !usuario.email;
  const [apodo, setApodo] = useState('');
  const [apodoGuardado, setApodoGuardado] = useState('');
  const [laminas, setLaminas] = useState(0);

  useEffect(() => {
    supabase.rpc('mi_perfil').then(({ data }) => { const n = (data && data.nombre) || ''; setApodo(n); setApodoGuardado(n); });
    supabase.from('laminas').select('local_id', { count: 'exact', head: true }).eq('usuario_id', usuario.id)
      .then(({ count }) => setLaminas(count || 0));
  }, [usuario.id]);

  async function guardarApodo() {
    const { error } = await supabase.rpc('guardar_apodo', { p_apodo: apodo });
    if (!error) setApodoGuardado(apodo.trim());
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: 14 }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: C.amarillo, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
        <Text style={{ ...letrista, fontSize: 30 }}>{apodoGuardado ? apodoGuardado.toUpperCase() : t('TÚ', 'YOU · TÚ')}</Text>
        <Text style={{ fontFamily: F.negrita, fontSize: 14 }}>
          {anonimo ? t('Caserito de prueba · sin cuenta', 'Guest caserito · no account yet') : usuario.email}
          {' · '}{laminas} {laminas === 1 ? t('lámina', 'sticker') : t('láminas', 'stickers')}
        </Text>
      </View>
      <Ola color={C.amarillo} />

      <View style={tarjeta}>
        <Text style={{ ...letrista, fontSize: 18 }}>{t('TU APODO', 'YOUR NICKNAME')}</Text>
        <Text style={{ fontFamily: F.normal, fontSize: 14 }}>{t('Así te ven los locales cuando dejas una reseña.', 'Shops see this when you leave a review.')}</Text>
        <TextInput value={apodo} onChangeText={setApodo} maxLength={30} placeholder={t('Ej: La Pancha', 'E.g. Sam')}
          placeholderTextColor={C.gris} style={campo} accessibilityLabel={t('Apodo', 'Nickname')} />
        <Boton texto={apodo.trim() === apodoGuardado ? t('Guardado', 'Saved') : t('Guardar apodo', 'Save nickname')}
          deshabilitado={apodo.trim() === apodoGuardado} onPress={guardarApodo} />
      </View>

      {anonimo ? <CrearCuenta laminas={laminas} apodo={apodo} /> : <MiCuenta usuario={usuario} />}

      <View style={tarjeta}>
        <Text style={{ ...letrista, fontSize: 18 }}>{t('IDIOMA', 'LANGUAGE')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton texto="Español" fondo={tur ? C.papel : C.negro} color={tur ? C.negro : C.papel} onPress={() => setTur(false)} style={{ flex: 1 }} />
          <Boton texto="Tourist (Spanglish)" fondo={tur ? C.negro : C.papel} color={tur ? C.papel : C.negro} onPress={() => setTur(true)} style={{ flex: 1 }} />
        </View>
        <Boton texto={t('¿Cómo funciona Caserito?', 'How does Caserito work?')} fondo={C.papel} color={C.negro} onPress={alAyuda} />
      </View>

      <Comentarios />
    </ScrollView>
  );
}

// Caserito anónimo: guardar su cuenta con un correo, o entrar a una que ya tiene
function CrearCuenta({ laminas, apodo }) {
  const { t } = useIdioma();
  const [modo, setModo] = useState('guardar'); // 'guardar' | 'entrar'
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [paso, setPaso] = useState('correo');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);

  function cambiarModo(m) { setModo(m); setPaso('correo'); setCodigo(''); setMsg(''); }

  async function pedirCodigo() {
    if (!correoValido(correo)) { setMsg(t('Ese correo no parece válido.', 'That email doesn’t look right.')); return; }
    setOcupado(true); setMsg('');
    const email = correo.trim().toLowerCase();
    const r = modo === 'guardar'
      ? await supabase.auth.updateUser({ email })
      : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setOcupado(false);
    if (r.error) { setMsg(explicar(r.error)); return; }
    // Si el proyecto no pide confirmar correos, la cuenta queda guardada al tiro
    if (modo === 'guardar' && r.data && r.data.user && r.data.user.email === email) {
      if (apodo.trim()) await supabase.rpc('guardar_apodo', { p_apodo: apodo });
      await supabase.auth.refreshSession();
      return;
    }
    setPaso('codigo');
  }

  async function verificar() {
    const token = codigo.replace(/\D/g, '');
    if (token.length < 6) { setMsg(t('El código tiene 6 números o más.', 'The code has at least 6 digits.')); return; }
    setOcupado(true); setMsg('');
    const { error } = await supabase.auth.verifyOtp({ email: correo.trim().toLowerCase(), token, type: modo === 'guardar' ? 'email_change' : 'email' });
    setOcupado(false);
    if (error) { setMsg(explicar(error)); return; }
    if (modo === 'guardar' && apodo.trim()) await supabase.rpc('guardar_apodo', { p_apodo: apodo });
    await supabase.auth.refreshSession();
  }

  return (
    <View style={tarjeta}>
      <Text style={{ ...letrista, fontSize: 18 }}>{modo === 'guardar' ? t('GUARDA TU CUENTA', 'SAVE YOUR ACCOUNT') : t('ENTRA A TU CUENTA', 'LOG IN')}</Text>
      <Text style={{ fontFamily: F.normal, fontSize: 14 }}>
        {modo === 'guardar'
          ? t('Con tu correo no pierdes tus láminas ni tus drops si cambias de teléfono o borras la app. No necesitas clave: te mandamos un código.', 'Add your email so you keep your stickers if you switch phones. No password: we email you a code.')
          : t('Te mandamos un código a tu correo para entrar.', 'We’ll email you a code to log in.')}
      </Text>
      {modo === 'entrar' && laminas > 0 && (
        <Text style={{ fontFamily: F.negrita, fontSize: 13, color: C.rojoTexto }}>
          {t(`Ojo: las ${laminas} láminas de este teléfono no se pasan a esa cuenta. Si quieres guardarlas, mejor usa "Guardar mi cuenta".`, `Heads up: the ${laminas} stickers on this phone won’t move to that account.`)}
        </Text>
      )}
      {paso === 'correo' ? (
        <>
          <TextInput value={correo} onChangeText={(v) => { setCorreo(v); setMsg(''); }} placeholder="tu@correo.cl" placeholderTextColor={C.gris}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
            style={campo} accessibilityLabel={t('Correo', 'Email')} onSubmitEditing={pedirCodigo} />
          <Boton texto={ocupado ? t('Mandando…', 'Sending…') : t('Mandarme el código', 'Email me the code')} deshabilitado={ocupado || !correo.trim()} fondo={C.rojo} onPress={pedirCodigo} />
        </>
      ) : (
        <>
          <Text style={{ fontFamily: F.negrita, fontSize: 14 }}>{t(`Revisa ${correo.trim()} (y la carpeta de spam) y escribe el código.`, `Check ${correo.trim()} (and spam) and type the code.`)}</Text>
          <TextInput value={codigo} onChangeText={(v) => { setCodigo(v); setMsg(''); }} placeholder="123456" placeholderTextColor={C.gris}
            keyboardType="number-pad" maxLength={10} autoComplete="one-time-code" textContentType="oneTimeCode"
            style={{ ...campo, fontSize: 22, letterSpacing: 4, textAlign: 'center' }} accessibilityLabel={t('Código', 'Code')} onSubmitEditing={verificar} />
          <Boton texto={ocupado ? t('Revisando…', 'Checking…') : t('Confirmar', 'Confirm')} deshabilitado={ocupado} fondo={C.rojo} onPress={verificar} />
          <Pressable onPress={() => { setPaso('correo'); setCodigo(''); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.negrita, fontSize: 14, color: C.azul }}>{t('Cambiar correo o pedir otro código', 'Change email or get a new code')}</Text>
          </Pressable>
        </>
      )}
      {msg ? <Text style={{ fontFamily: F.negrita, fontSize: 14, color: C.rojoTexto }} accessibilityLiveRegion="polite">{msg}</Text> : null}
      <Pressable onPress={() => cambiarModo(modo === 'guardar' ? 'entrar' : 'guardar')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.negrita, fontSize: 14, color: C.azul }}>
          {modo === 'guardar' ? t('¿Ya tienes cuenta? Entra aquí', 'Already have an account? Log in') : t('No tengo cuenta: guardar la de este teléfono', 'No account: save this one')}
        </Text>
      </Pressable>
    </View>
  );
}

function MiCuenta({ usuario }) {
  const { t } = useIdioma();
  const [seguro, setSeguro] = useState(false);
  return (
    <View style={tarjeta}>
      <Text style={{ ...letrista, fontSize: 18 }}>{t('TU CUENTA', 'YOUR ACCOUNT')}</Text>
      <Text style={{ fontFamily: F.normal, fontSize: 14 }}>
        {t(`Tu cuenta está guardada con ${usuario.email}. Para entrar en otro teléfono, usa "Ya tengo cuenta" y te llega un código.`, `Saved with ${usuario.email}. On another phone, use "Log in" and we’ll email you a code.`)}
      </Text>
      {seguro ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: F.negrita, fontSize: 14 }}>{t('¿Cerrar sesión en este teléfono? Tus láminas quedan guardadas en tu cuenta.', 'Log out on this phone? Your stickers stay in your account.')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Boton texto={t('Sí, cerrar', 'Yes, log out')} fondo={C.rojo} onPress={() => supabase.auth.signOut()} style={{ flex: 1 }} />
            <Boton texto={t('No', 'No')} fondo={C.papel} color={C.negro} onPress={() => setSeguro(false)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Boton texto={t('Cerrar sesión', 'Log out')} fondo={C.papel} color={C.negro} onPress={() => setSeguro(true)} />
      )}
    </View>
  );
}

// Beta con amigos: ideas y errores llegan al admin
function Comentarios() {
  const { t } = useIdioma();
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('');
  async function enviar() {
    if (!texto.trim()) return;
    setEstado('enviando');
    const { error } = await supabase.from('comentarios').insert({ texto: texto.trim(), origen: 'app', plataforma: Platform.OS, version: 'beta' });
    if (error) setEstado(explicar(error)); else { setTexto(''); setEstado('ok'); }
  }
  return (
    <View style={[tarjeta, { backgroundColor: C.negro }]}>
      <Text style={{ ...letrista, fontSize: 18, color: C.amarillo }}>{t('ESTAMOS EN PRUEBA', 'BETA · EN PRUEBA')}</Text>
      <Text style={{ fontFamily: F.normal, fontSize: 14, color: C.papel }}>
        {t('Caserito lo están probando amigos y locales amigos de Barrio Italia. ¿Algo no funcionó o se te ocurre algo? Cuéntanos.', 'Friends and friendly shops in Barrio Italia are testing Caserito. Something broke or got an idea? Tell us.')}
      </Text>
      <TextInput value={texto} onChangeText={(v) => { setTexto(v); setEstado(''); }} maxLength={1000} multiline
        placeholder={t('Ej: no me apareció el QR en el café de la esquina', 'E.g. my QR didn’t show up at the café')} placeholderTextColor={C.gris}
        style={{ ...campo, minHeight: 90, paddingTop: 10, textAlignVertical: 'top' }} accessibilityLabel={t('Comentario', 'Feedback')} />
      <Boton texto={estado === 'enviando' ? t('Enviando…', 'Sending…') : t('Enviar', 'Send')} fondo={C.amarillo} color={C.negro}
        deshabilitado={!texto.trim() || estado === 'enviando'} onPress={enviar} />
      {estado === 'ok' ? <Text style={{ fontFamily: F.negrita, color: C.amarillo }}>{t('¡Gracias! Lo leemos todo.', 'Thanks! We read everything.')}</Text>
        : estado && estado !== 'enviando' ? <Text style={{ fontFamily: F.negrita, color: '#FF8A8A' }}>{estado}</Text> : null}
    </View>
  );
}
