# Caserito

*Tu barrio te tiene ofertas.* App de marketing de barrio: los locales sueltan **drops** (ofertas limitadas en cantidad y tiempo) y los caseritos los ven en el mapa y los canjean con un QR. Piloto: **Barrio Italia**.

## Partes

| Carpeta | Qué es | Tecnología |
|---|---|---|
| `app/` | App del cliente (Inicio con pizarra, Mapa, Drop con QR, Álbum) | Expo SDK 58 (React Native) |
| `panel/` | Panel del local (crear drop con frases con modismos, escanear QR, resultados y reseñas) y admin general | React + Vite (web/PWA) |
| `supabase/` | Base de datos (schema `caserito`) | Supabase / Postgres + PostGIS |

## Supabase

Proyecto: `https://mkmcfeezspgjdygustpd.supabase.co` (compartido con otra app; todo Caserito vive en el schema `caserito`).

1. SQL Editor → pegar `supabase/002_caserito_en_schema_propio.sql` → Run (una vez).
2. Settings → API → **Exposed schemas** → agregar `caserito`.
3. Authentication → **Allow anonymous sign-ins** (los caseritos entran sin registrarse).
4. SQL Editor → pegar `supabase/003_admin_y_resenas.sql` → Run (admin, aprobación de locales y reseñas verificadas).
5. Crear tu cuenta en el panel del local y hacerte admin:
   `insert into caserito.admins (user_id) select id from auth.users where email = 'TU_CORREO';`

6. SQL Editor → pegar `supabase/004_categorias_multiples.sql` → Run (hasta 3 categorías por local y categorías nuevas).

Los locales nuevos quedan **en revisión** hasta que el admin los aprueba desde el panel.

La llave del cliente es la *publishable* (pública por diseño). La `service_role`/`secret` nunca va en el repo.

## Probar

- **Panel:** `cd panel && npm install && npm run dev`.
- **App:** `cd app && npm install && npx expo start`, y abrir con **Expo Go** en el celular.

Cada push corre **Revisar build** (GitHub Actions): compila el panel y empaqueta la app para Android.
