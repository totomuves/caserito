import QRCode from 'qrcode';
import { arteHtml } from './arteLocal.jsx';
import { URL_APP } from './Qr.jsx';

// Kit imprimible de un local: póster para la vitrina, hoja de stickers y tarjeta de mesa.
// Se abre en una pestaña lista para imprimir o "Guardar como PDF".
const esc = (x) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function abrirKit(local) {
  const ventana = window.open('', '_blank');
  if (!ventana) { alert('Permite las ventanas emergentes para abrir el kit.'); return; }
  ventana.document.write('<p style="font:16px Arial;padding:24px">Armando el kit…</p>');
  const url = `${URL_APP}/?local=${local.id}`;
  const qr = await QRCode.toDataURL(url, { width: 1000, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#FFFFFF' } });
  const lamina = (tam) => `<div class="lam" style="width:${tam};height:${tam}">${arteHtml(local.id, local.categoria, local.nombre)}</div>`;
  const logo = `${window.location.origin}/droper-logo.svg`;
  const nombre = esc(local.nombre);
  const sticker = `<div class="sticker">${lamina('22mm')}<img class="qr" src="${qr}" alt=""><b>ESCANEA</b><span>${nombre}</span></div>`;
  const mitadMesa = (giro) => `<div class="mesa-mitad" style="transform:rotate(${giro}deg)">
      <div>${lamina('34mm')}<img src="${logo}" class="logo-chico" alt="Droper"></div>
      <div class="mesa-texto"><h2>¿Ya viste el drop de hoy?</h2><p>Escanea, súmate y gana la lámina de <b>${nombre}</b> para tu álbum.</p></div>
      <img class="qr" src="${qr}" alt="">
    </div>`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Kit Droper · ${nombre}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Archivo', 'Helvetica Neue', Arial, sans-serif; color: #111; background: #ddd; }
  .hoja { width: 210mm; height: 297mm; margin: 10mm auto; background: #fff; position: relative; overflow: hidden; page-break-after: always; }
  .lam { position: relative; overflow: hidden; border: 1.2mm solid #111; background: #FFF6E5; }
  .lam svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .barra { position: sticky; top: 0; background: #111; color: #fff; padding: 12px 20px; display: flex; gap: 16px; align-items: center; font-size: 15px; z-index: 9; }
  .barra button { background: #FFD100; border: 0; border-radius: 10px; padding: 10px 16px; font-weight: 800; font-size: 15px; cursor: pointer; }
  /* Póster vitrina */
  .poster { background: #FFD100; padding: 18mm 16mm; display: flex; flex-direction: column; }
  .poster .circulo { position: absolute; right: -40mm; top: -40mm; width: 130mm; height: 130mm; border-radius: 50%; background: #E30A2F; }
  .poster .cuadro { position: absolute; left: 0; bottom: 0; width: 70mm; height: 40mm; background: #1E5AA8; }
  .poster h1 { position: relative; font-size: 30mm; line-height: .86; letter-spacing: -1.5mm; margin: 0; font-weight: 900; }
  .poster .fila { position: relative; display: flex; gap: 10mm; align-items: flex-end; margin-top: 14mm; }
  .poster .qr { width: 88mm; height: 88mm; border: 1.5mm solid #111; background: #fff; padding: 3mm; }
  .poster p { position: relative; font-size: 7mm; line-height: 1.2; font-weight: 700; margin: 12mm 0 0; max-width: 150mm; }
  .poster .pie { position: absolute; right: 16mm; bottom: 14mm; text-align: right; }
  .poster .pie img { width: 70mm; display: block; margin-left: auto; }
  .poster .pie span { font-size: 4.2mm; font-weight: 700; }
  /* Stickers */
  .stickers { padding: 12mm; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8mm; align-content: start; }
  .stickers h3 { grid-column: 1 / -1; margin: 0; font-size: 5mm; }
  .sticker { height: 80mm; border: .4mm dashed #999; border-radius: 6mm; display: grid; grid-template-columns: 24mm 1fr; grid-template-rows: auto auto 1fr; column-gap: 5mm; padding: 6mm; align-items: start; }
  .sticker .lam { grid-row: 1 / 3; }
  .sticker .qr { grid-column: 2; grid-row: 1 / 4; width: 58mm; height: 58mm; justify-self: end; }
  .sticker b { grid-column: 1; font-size: 5mm; font-weight: 900; margin-top: 3mm; }
  .sticker span { grid-column: 1; font-size: 3.4mm; font-weight: 700; }
  /* Mesa (doblar al medio) */
  .mesa { display: grid; grid-template-rows: 1fr 1fr; }
  .mesa-mitad { padding: 14mm 16mm; display: grid; grid-template-columns: 38mm 1fr 62mm; gap: 8mm; align-items: center; border-bottom: .4mm dashed #999; }
  .mesa-mitad .qr { width: 62mm; height: 62mm; }
  .mesa-mitad h2 { font-size: 8mm; line-height: 1; margin: 0 0 3mm; font-weight: 900; letter-spacing: -.3mm; }
  .mesa-mitad p { font-size: 4.6mm; line-height: 1.3; margin: 0; }
  .logo-chico { width: 34mm; margin-top: 4mm; display: block; }
  @media print { body { background: none; } .hoja { margin: 0 !important; } .barra { display: none !important; } }
  .nota { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; font-size: 3mm; color: #999; }
</style></head><body>
<div class="barra"><b>Kit Droper · ${nombre}</b><span>3 hojas A4: póster de vitrina, stickers y tarjeta de mesa.</span><button onclick="print()">Imprimir o guardar PDF</button></div>
<section class="hoja poster"><div class="circulo"></div><div class="cuadro"></div>
  <h1>AQUÍ<br>HAY<br>DROPS</h1>
  <div class="fila"><img class="qr" src="${qr}" alt="QR">${lamina('52mm')}</div>
  <p>Escanea con la cámara, súmate al drop del día y gana la lámina de ${nombre} para tu álbum. Sin descargar nada.</p>
  <div class="pie"><img src="${logo}" alt="Droper"><span>${esc(url.replace('https://', ''))}</span></div>
</section>
<section class="hoja stickers"><h3>Stickers · recórtalos para la caja, la puerta y las mesas</h3>${sticker.repeat(6)}</section>
<section class="hoja mesa">${mitadMesa(180)}${mitadMesa(0)}<div class="nota">— doblar aquí —</div></section>
</body></html>`;
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}
