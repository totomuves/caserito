import React, { useState } from 'react';
import { supabase, explicar } from './supabase.js';

// Manual para locales: pasos cortos y respuestas a lo que más se pregunta
const PASOS = [
  ['Inscribe tu local', 'Crea tu cuenta, marca la ubicación estando DENTRO del local, elige hasta 3 categorías (la primera es la principal), tu cocina si das comida y sube tu logo. Si te llegó un link de invitación, tu local queda aprobado al tiro; si no, lo aprobamos el mismo día.'],
  ['Suelta un drop', 'En Crear: elige el tipo, escribe qué ofreces, el precio del drop y el normal, cuántos hay y hasta qué hora. Elige una frase (o edítala), apruébala y toca "Soltar drop". Aparece al tiro en el mapa.'],
  ['Atiende al caserito', 'Cuando llegue, abre Escanear y apunta a su QR (o escribe el código que te dicta). Te dice "¡Canjeado!" y cuánto cobrar. Cada código sirve una sola vez.'],
  ['Repite lo que funciona', 'En Mis drops: Duplicar copia un drop con todo para soltarlo otra vez. También puedes editarlo, terminarlo antes o eliminarlo si nadie se anotó.'],
  ['Mira tus números', 'En Resultados ves cuántos se anotaron, cuántos canjearon, cuánto te trajo Caserito, tu hora más tranquila y tus reseñas (y las puedes responder).'],
];

const TIPOS = [
  ['Normal', 'Precio fijo para los primeros que lleguen. El más simple para partir.'],
  ['Grupal', 'Mejora mientras más gente canjea (ej. 10 → 10%, 25 → 20%, 50 → 2x1). Los caseritos invitan amigos para subir de nivel. Al cobrar, aplica el nivel alcanzado en ese momento.'],
  ['Sorpresa', 'El caserito no sabe qué es hasta llegar. Genera curiosidad; ideal para fines de semana.'],
  ['Recién llegado', 'Sin descuento obligatorio: avisa que llegó mercadería nueva (vinilos, temporada, piezas únicas).'],
];

const DUDAS = [
  ['¿Qué son las láminas repetidas?', 'La primera vez que un caserito canjea en tu local gana tu lámina; cada canje siguiente es una repetida. En "Editar mi local" eliges cuántas repetidas pides (ej. 5) y qué das a cambio (ej. un cortado gratis). El caserito pide el cambio en su álbum, le sale un QR y tú lo escaneas como siempre: la pantalla te dice qué entregarle, sin cobro.'],
  ['¿Puedo sumar a mi equipo?', 'Sí. En "Mi equipo" creas roles (por ejemplo Administrador o Cajero), marcas qué puede hacer cada uno y mandas un link de invitación. Cada persona entra con su propio correo: un cajero solo ve Escanear; un administrador puede soltar drops y ver resultados. Solo tú, como dueño, editas el equipo.'],
  ['¿Cuándo conviene soltar un drop?', 'En tu hora más tranquila (mírala en Resultados). Un drop de 10 unidades por 2 horas funciona mejor que uno de 100 todo el día.'],
  ['¿A qué distancia lo ven?', 'Lo ven en el mapa quienes están cerca, y el código para canjear aparece cuando llegan a tu local (a unos 50 m, media cuadra). Además, cuando sueltas un drop, a los caseritos que andan cerca (hasta unas 15 cuadras) les llega una notificación al celular, máximo 3 al día por persona y nunca de noche.'],
  ['¿Puedo cambiar el precio después?', 'Solo si nadie se ha anotado. Si ya hay caseritos anotados, puedes cambiar la frase, la hora o subir el cupo, para no cambiarle las condiciones a quien ya se sumó.'],
  ['¿Qué pasa si alguien no viene?', 'Nada: anotarse no ocupa cupo. El cupo baja solo con los canjes reales en tu caja.'],
  ['¿Y las reseñas?', 'Solo puede reseñarte quien canjeó en tu local. Puedes responder cada una desde Resultados.'],
  ['¿El escáner no abre la cámara?', 'Dale permiso de cámara al navegador. Si igual no funciona, escribe el código que te dicta el caserito.'],
  ['¿Cómo lo tengo como app?', 'En iPhone, Safari → Compartir → "Agregar a pantalla de inicio". En Android, Chrome → menú ⋮ → "Agregar a la pantalla principal".'],
];

export default function Ayuda({ alCerrar }) {
  return (
    <div className="contenido">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="letrista">CÓMO FUNCIONA</h1>
        <button className="pildora" onClick={alCerrar}>Volver</button>
      </div>
      <p className="ayuda">Caserito reemplaza los flyers: sueltas una oferta con cupo y hora, la ven los vecinos que pasan cerca y sabes exactamente cuántos llegaron.</p>

      {PASOS.map(([t, d], i) => (
        <div className="tarjeta" key={t} style={{ flexDirection: 'row', gap: 12 }}>
          <span className="letrista" style={{ fontSize: 30, color: 'var(--rojo)', minWidth: 24 }}>{i + 1}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <b>{t}</b>
            <span style={{ lineHeight: 1.45 }}>{d}</span>
          </div>
        </div>
      ))}

      <h2 className="letrista">TIPOS DE DROP</h2>
      <div className="tarjeta">
        {TIPOS.map(([t, d]) => (
          <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <b>{t}</b>
            <span className="ayuda" style={{ color: 'var(--negro)' }}>{d}</span>
          </div>
        ))}
      </div>

      <div className="pizarra">
        <span className="etiqueta">Habla como en tu tierra</span>
        <span>Las frases usan modismos de tu cocina (venezolana, peruana, mexicana…). Son un guiño cariñoso: tú apruebas cada frase antes de publicarla y la puedes editar.</span>
      </div>

      <h2 className="letrista">PREGUNTAS FRECUENTES</h2>
      {DUDAS.map(([p, r]) => (
        <div key={p} style={{ borderTop: '2px dashed #CDBF9F', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <b>{p}</b>
          <span style={{ lineHeight: 1.45 }}>{r}</span>
        </div>
      ))}

      <Comentarios />
    </div>
  );
}

// Beta con locales amigos: ideas y errores le llegan al admin
function Comentarios() {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('');
  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEstado('enviando');
    const { error } = await supabase.from('comentarios').insert({ texto: texto.trim(), origen: 'panel', plataforma: 'web', version: 'beta' });
    if (error) setEstado(explicar(error)); else { setTexto(''); setEstado('ok'); }
  }
  return (
    <form className="pizarra" onSubmit={enviar}>
      <span className="etiqueta">Estamos en prueba</span>
      <span>Caserito lo están probando locales amigos. ¿Algo no funcionó o te falta algo? Cuéntanos.</span>
      <label className="campo" style={{ color: 'inherit' }}>Tu comentario
        <textarea value={texto} maxLength={1000} rows={3} onChange={(e) => { setTexto(e.target.value); setEstado(''); }}
          placeholder="Ej: no pude escanear con la cámara del iPhone" />
      </label>
      <button className="boton" type="submit" disabled={!texto.trim() || estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviar'}</button>
      {estado === 'ok' && <span role="status">¡Gracias! Lo leemos todo.</span>}
      {estado && estado !== 'ok' && estado !== 'enviando' && <span role="alert">{estado}</span>}
    </form>
  );
}
