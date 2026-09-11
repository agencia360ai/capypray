# Cambios tras el playtest del 10 sep 2026

Implementa `docs/playtest-feedback-2026-09-10.md` (todo menos la voz — en hold hasta elegirla en equipo — y los clips que hará el animador). Base: GitHub HEAD `02f2834`. Verificado en contenedor: `pnpm typecheck` (4/4), `pnpm test` (32/32), `pnpm content:validate`, `pnpm --filter @capy/avatar-web build`, screenshots del avatar con `scripts/shot.mjs`.

## Cómo probarlo (Expo Go)

```bash
git status                              # verás ~18 archivos modificados + 2 nuevos
pnpm --filter @capy/mobile start -c     # el bundle del avatar ya está en apps/mobile/assets/avatar (rebuild opcional: pnpm --filter @capy/avatar-web build)
```

Para volver a ver el onboarding: Parent Corner → "Delete my child's data" (borra el perfil y vuelve al primer arranque).

## Qué cambió y dónde

### Onboarding con Capy (`apps/mobile/app/parent/onboarding.tsx`, `src/parent/strings.ts`)
- Capy está en escena todo el tiempo; **hace las preguntas él** en la burbuja (muda: zona de adultos) y **reacciona a cada respuesta** (saluda con el nombre, bosteza al elegir bedtime, manos al corazón con las personas, celebra el plan).
- Cada respuesta muestra **qué compra** ("Capy will be ready for bedtime prayer every night at 7:00 pm").
- Barra de progreso animada en vez de "1 / 6"; cada paso entra con slide+fade; las opciones aparecen en cascada, se aplastan al presionar y rebotan al quedar seleccionadas; botón Back.
- Paso final nuevo: **"Capy's 4-week plan for Mia"** como pantalla (bedtime, personas, mundo/semanas, tradición, y los skills como pills) → "Meet Capy".

### Paywall (`apps/mobile/app/parent/paywall.tsx`, `src/parent/strings.ts`)
- Capy saluda por el nombre del niño ("I can't wait to pray with Mia!") — el "aha" antes del precio.
- **Recap del plan** que el padre acaba de armar → **timeline del trial** (Hoy: acceso total · Día 5: te recordamos · Día 7: primer cobro, cancela antes en 1 tap) → planes (anual default, "BEST VALUE") → CTA "Start 7 days free" con el precio y "cancel any time" debajo → línea de confianza (sin ads, sin datos del niño, cancelación en 1 tap).
- El escape ya no es "Not now": es **"Start with free bedtime prayers"** (el freemium honesto del GDD, dicho como tal).
- Sigue siendo el placeholder de sandbox; el template de RevenueCat Paywalls envuelve esta misma estructura (header/footer).

### Capy pegado al piso (`packages/avatar-web/src/CapyScene.tsx`)
- **Cámara fija** para todos los clips de pie: se encuadra una caja canónica (pies en y=0, 1.98 de alto) dentro de la banda libre de UI, en vez de perseguir el bounding box del esqueleto cada 6 frames. Adiós al "mundo que se resbala" con el balanceo de cadera, los saltitos y los brazos. Solo los clips acostados (`to_sleep`, `sleep`, `wake`, `chill_lie`) siguen al cuerpo, con lerp lento.
- Cámara ~16° por encima del objetivo: antes estaba casi a nivel del piso, y por eso **la sombra de contacto de drei nunca se veía** (el plano quedaba de canto).
- `ContactShadows` (2 pases de render por frame) reemplazado por una **sombra pintada** (`BlobShadow`: gradiente radial en un plano). Cero costo por frame en WebView Android y es lo que ancla a Capy al fondo 2D.
- Preview: `?ui=0.12,0.5` simula los insets de la pantalla de lección; `window.__capySend` para mandar mensajes desde scripts.

### Animación ↔ diálogo (`stateMachine.ts`, `lessonRunner.ts`, `components.tsx`, `BeatView.tsx`)
- **`pray_hands`, `heart` y `think` se sostienen mientras Capy habla** (sub-clip recortado antes de la fase de soltar, clamped) en vez de soltarse a los 3 s a mitad de la oración.
- Al terminar cada línea de oración, Capy **descansa en la pose completa `pray_hands_full`** (horneada en Blender en `4043e34`, que hasta hoy era código muerto: `play("pray_hands")` nunca llegaba a ella) en vez de volver a idle. `SpeechBubble` tiene prop `rest`.
- Nuevo `sm.cue()` para las órdenes externas de `play`: corta el habla, apaga el loop de boca y entonces reproduce (antes un `celebrate` podía quedar encima de una boca hablando).
- Timer de habla = `estimado × 3` como tope de seguridad (`speakCapMs`); el cierre real lo da la voz (`SpeechBubble` → idle/rest).
- **Fallback ya no es silencioso:** evento `clipFallback` (bridge + `IAvatarRenderer`) → `console.warn` en dev cuando un pack pide un clip que el rig no tiene.

### Celebración de la linterna (`src/ui/RewardBurst.tsx`, `StageDecor.tsx`, `lesson/[id].tsx`, `BeatView.tsx`)
- Secuencia de ~3.4 s en el escenario: la linterna sube frente a Capy → se enciende con anillo de luz + chispas (haptic) → el confetti dispara en ese instante → vuela a su lugar en el estanque y **se queda encendida** (`StageDecor` recibe `extraLit` con las linternas ganadas en la lección).
- `LANTERN_SLOTS` / `lanternSlot()` exportados para que la linterna aterrice exactamente donde flota la de la semana.

### Micro-animaciones (`src/ui/components.tsx`)
- `Sheet` entra con slide-up en cada beat; `IconCard` se aplasta al presionar y rebota al quedar seleccionada (además de la cascada que ya tenía el `Grid`).

### Home (`apps/mobile/app/index.tsx`, `schema.ts`, `pack.json`)
- Top bar de **dos elementos**: linternas de la semana (→ estanque) y la puerta de adultos, más discreta. Los beacons viven en el estanque; **la racha pasó al saludo de Capy** ("Hi Mia! 🔥 3 days in a row!", string nuevo `ui.streak` en el pack, opcional).
- Se quitó la notación "W1·1" del eyebrow de la lección de hoy.

## Pendiente / decisiones abiertas
- **Voz:** en hold. Candidata "Arthur" (Higgsfield) ya renderizada en `audio/urls.json`; comparar con 2–3 voces de ElevenLabs antes de decidir.
- **Clips del animador:** reemplazan por nombre los gestos procedurales (`wave_hello`, `think`, `heart`, `clap`, `listen_nod`, `celebrate`) vía `tools/avatar/clip-map.json`. Con clips reales, el `_full`/hold sigue funcionando igual.
- **RevenueCat:** cuando entre el template real, el header (Capy + recap + timeline) y el footer (confianza + "free bedtime") de `paywall.tsx` son lo que hay que conservar.
- **`apps/mobile/package.json`** tiene un cambio local sin commitear (`expo.autolinking.exclude` de reanimated/gesture-handler/worklets): no se tocó. Si Expo Go arranca sin él, se puede revertir.
- **Rediseño del home y evaluación de minijuegos:** sesión propia (acordado).

---

## Segunda pasada (misma fecha, tras probar en Expo Go)

- **Onboarding:** Capy habla cada pregunta (voz + boca en loop + gesto); las opciones aparecen solo cuando termina, con pop escalonado; todo centrado; sin scroll; **Capy no se mueve**: el bloque burbuja+tarjeta tiene altura fija (56 % de la pantalla) y la cámara recibe un solo viewport para todo el flujo. Fuera la fila "weeks in the Meadow".
- **Paywall:** Capy dice su línea en voz; "Start with free bedtime prayers" subrayado. Layout con scroll intacto (Ariel: se ve bien).
- **Voz — probar "Sam" de ElevenLabs.** `tools/tts-batch.ts` quedó reescrito y probado contra un mock del API: ajustes del screenshot (stability 0.3 · similarity 0.52 · style 0.5 · speaker boost · speed 1.0 · `eleven_multilingual_v2`), escribe directo en `apps/mobile/assets/audio`, regenera el manifest, y también renderiza las 8 líneas del onboarding/paywall (`CAPY_LINES` en `src/parent/strings.ts`, con "your little one" donde la pantalla muestra el nombre). El script viejo no corría (top-level await en CJS); este sí.

  ```powershell
  $env:ELEVENLABS_API_KEY = "…"                                  # elevenlabs.io → Profile → API keys
  pnpm tsx tools/tts-batch.ts --list-voices                      # confirma que "Sam" está en tu librería
  pnpm tsx tools/tts-batch.ts packages/content/packs/christian-us-en-v1 --voice Sam --only ob_,pw_   # 8 líneas: ~1 min, casi gratis
  pnpm --filter @capy/mobile start -c
  ```

  Si gusta, sin `--only` renderiza las 358 del pack (idempotente: re-correr solo regenera lo que cambió). Formato por defecto `mp3_44100_64` (~40 KB/línea, ~15 MB el pack completo); `ELEVENLABS_FORMAT=mp3_22050_32` lo baja a la mitad si el bundle pesa.
