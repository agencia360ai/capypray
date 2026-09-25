# Lanzamiento v1.0 — paso a paso

Decisiones (2026-09-25): sin backend, sin cuenta de padre, GA4 sin SDK para analytics, RevenueCat para suscripciones,
Meta Pixel solo en la landing de padres (nunca SDK de Meta en el app). Cuenta de Google Play = empresa.

## 0. Antes de todo (tú)
- [ ] Íconos en `apps/mobile/assets/brand/`: `icon.png` (1024², **sin transparencia**), `adaptive-icon.png` (1024², Capy dentro del 66 % central), `splash-icon.png` (transparente).
- [ ] Hostear la política de privacidad (`docs/legal/privacy-policy.md`, completar los `[ ]` y que la revise un abogado) en una URL pública, p. ej. `https://capyprayer.com/privacy`.
- [ ] Email de soporte (p. ej. `hello@capyprayer.com`) y una página de soporte (puede ser la misma landing con el email).

## 1. GA4 (analytics del app, 10 min)
1. analytics.google.com → Crear propiedad "Capy Prayer" → flujo de datos **Web** (sí, Web: el app manda por Measurement Protocol). URL: tu landing.
2. En el flujo: copia el **Measurement ID** (`G-…`) → "Measurement Protocol API secrets" → Crear → copia el secreto.
3. Admin → Recopilación de datos: **Google Signals OFF**, **personalización de anuncios OFF**, **datos granulares de ubicación y dispositivo OFF** (todas las regiones).
4. Admin → Retención de datos: 2 meses. Admin → Configuración de uso compartido de datos: todo OFF.
5. Eventos que verás: `page_view` (pantallas), `app_launch`, `app_foreground`, `lesson_start`, `lesson_complete`, `intention`, `ask_answer`, `minigame_complete`, `game_open`, `game_level_win`, `game_level_lose`, `story_replay`, `place_visit`, `beacon`, `parent_onboarding_step`, `gate_pass`, `paywall_view`, `trial_start`, `purchase_cancel`, `purchase_error`, `restore_purchases`. Dimensiones de usuario: `premium`, `onboarded`, `age_band`, `app_version`, `platform`.
6. Márcalos como dimensiones personalizadas en Admin → Definiciones personalizadas (`lessonId`, `game`, `level`, `plan`, `step`) para poder filtrar. Embudo sugerido en Explorar: `app_launch → lesson_complete → paywall_view → trial_start`.

## 2. Apple (App Store Connect)
- [ ] Apple Developer Program (empresa, con D-U-N-S).
- [ ] Acuerdos, impuestos y banca → **Paid Applications Agreement** activo (sin esto no hay suscripciones).
- [ ] Nueva app: nombre "Capy Prayer", bundle `com.looplab.capyprayer`, SKU `capyprayer`, idioma English (U.S.).
- [ ] Suscripciones → grupo "Capy Premium": `capy_annual` $49.99/año y `capy_monthly` $7.99/mes, cada una con **oferta introductoria gratis 7 días**. Llenar nombre y descripción de cada una + captura del paywall (`docs/screenshots/paywall-legal.png`).
- [ ] Usuarios y acceso → Integraciones → **In-App Purchase key** (.p8) → para RevenueCat.
- [ ] App Privacy (etiqueta nutricional):
  - Datos recolectados: **Uso → Interacción con el producto** (GA4) y **Compras → Historial de compras** (RevenueCat).
  - Ambos: **no vinculados a la identidad**, **no usados para rastreo**. Propósito: Analytics / Funcionalidad del app.
- [ ] Clasificación por edad: responder "No" a todo el cuestionario → 4+. **Kids Category: Ages 6–8**.
- [ ] URLs: privacidad, soporte. Términos: puedes usar la EULA estándar de Apple (ya enlazada en el paywall).
- [ ] Notas para revisión: "No login. Parental gate: solve the math question and hold the button 3 s. Subscriptions are only reachable behind the gate. No third-party analytics SDKs: anonymous usage events are sent to Google Analytics via the Measurement Protocol with no device or advertising identifiers."

## 3. Google Play Console (cuenta de empresa: sin prueba cerrada obligatoria)
- [ ] Crear app "Capy Prayer", paquete `com.looplab.capyprayer`, gratis con compras.
- [ ] Monetizar → Suscripciones: `capy_annual` y `capy_monthly` con plan base + oferta de prueba 7 días.
- [ ] Contenido de la app: Público objetivo **5 y menos / 6–8** (Diseñado para familias), sin anuncios, Seguridad de datos:
  - Recolecta: **Actividad en la app (interacciones)** y **Historial de compras**; no se comparte, cifrado en tránsito, no se puede pedir borrado individual (anónimo) → explicar en la política.
- [ ] Clasificación de contenido (IARC): todo "No".
- [ ] Cuenta de servicio de Google Cloud con permisos de finanzas → JSON para RevenueCat (tarda hasta 36 h en activarse).
- [ ] La **primera** subida del `.aab` debe hacerse a mano en Prueba interna; después `eas submit` funciona solo.

## 4. RevenueCat
- [ ] Proyecto "Capy Prayer" → app iOS (bundle + .p8) → app Android (paquete + JSON).
- [ ] Productos `capy_annual`, `capy_monthly` → entitlement **`premium`** con ambos → offering **`default`** (current) con paquetes Annual y Monthly.
- [ ] **No** activar integraciones de anuncios/atribución (Meta, AppsFlyer, etc.) — app de niños.
- [ ] Copiar las public SDK keys (`appl_…`, `goog_…`).

## 5. Builds (PowerShell, en `C:\Users\jofgu\capypray`)
```powershell
git pull
pnpm install
npm install -g eas-cli
cd apps/mobile
eas login
eas init                          # crea el proyecto en expo.dev y agrega projectId a app.json
# variables (una vez; repetir con --environment preview/development si quieres)
eas env:create --environment production --name EXPO_PUBLIC_GA4_MEASUREMENT_ID --value G-XXXX --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_GA4_API_SECRET --value XXXX --visibility sensitive
eas env:create --environment production --name EXPO_PUBLIC_RC_IOS_KEY --value appl_XXXX --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_RC_ANDROID_KEY --value goog_XXXX --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_PRIVACY_URL --value https://capyprayer.com/privacy --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SUPPORT_EMAIL --value hello@capyprayer.com --visibility plaintext
# builds de producción (en la nube de Expo; iOS funciona desde Windows)
eas build --platform ios --profile production
eas build --platform android --profile production
# enviar
eas submit --platform ios --latest      # → TestFlight
eas submit --platform android --latest  # (después de la primera subida manual)
```
El servidor de EAS construye el avatar y baja los 465 audios del pirata automáticamente (`eas-build-post-install`).
Si un audio no baja, el build falla a propósito (nunca se publica con voces a medias).

Para probar compras reales antes de publicar: `eas build --profile development` (dev client) + cuenta sandbox de Apple / tester de licencia en Google. En Expo Go el paywall sigue en "Preview mode".

## 6. Revisión final y envío
- [ ] TestFlight: prueba completa (intro → primera oración → onboarding → gate → paywall → compra sandbox → lección premium desbloqueada → restaurar).
- [ ] GA4 → Tiempo real: ver que llegan los eventos.
- [ ] Capturas (iPhone 6.9", iPad 13", Android) y textos de la ficha (abajo) → Enviar a revisión.

## Ficha de la tienda (borrador, inglés US)
- **Name:** Capy Prayer
- **Subtitle (30):** Bedtime prayers for kids
- **Promotional text:** Capy the capybara helps your child learn to pray — a few gentle minutes a day, with Bible stories, little games and bedtime prayers that stay free forever.
- **Keywords (100):** kids prayer,bedtime,bible stories,christian,family,faith,children,devotional,lord's prayer,sleep
- **Description:**
  Meet Capy, a gentle capybara who loves to pray. In a few minutes a day, Capy walks your child (ages 4–8) through simple prayers — hello, thank you, sorry, please help, praying for others and listening — with warm stories, little games and a cozy bedtime routine.
  • Guided prayer moments, one small step a day
  • Bible stories told for little ears
  • A bedtime prayer every night — free forever
  • Four calm puzzle games to play with Capy
  • Made for kids: no ads, no chat, no voice recording, parental gate for purchases and settings
  Subscription: start with a 7-day free trial, then $49.99/year or $7.99/month. Cancel any time in your App Store / Google Play settings.
