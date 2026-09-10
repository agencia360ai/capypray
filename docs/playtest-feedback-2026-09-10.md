# Playtest v0.1 — Hallazgos de Ariel + diagnóstico técnico + recomendaciones

**Fecha:** 10 sep 2026 · Playtester: Ariel · Diagnóstico: revisión del código del repo (`apps/mobile`, `packages/avatar-web`) contra cada impresión
**Nota:** el playtest se hizo sobre el clone local en `dccbaee`; el repo en GitHub iba 9 commits adelante (`02f2834`: poses de oración horneadas, historias, lugares, pipeline de voz "Arthur"). Las secciones 5 y 7 se corrigieron tras actualizar. Lo implementado está en `docs/playtest-changes-2026-09-10.md`.
**Cómo leerlo:** cada hallazgo tiene *qué se sintió* → *por qué pasa (en el código)* → *qué hacer* → prioridad. P0 = toca el "aha" del día 0; P1 = pre-beta; P2 = puede esperar.

**Principios que guían las recomendaciones** (los puntos del estudio que Ariel marcó como norte): bedtime como caso de uso ancla ("los padres la usan para dormir a los hijos"), la confianza de cobro como diferenciador #1 del vertical, profundidad pedagógica sobre mecánica superficial, y el dato de que el mercado ya castiga la gamificación sin propósito. Todo lo de abajo se filtra por ahí.

---

## 1. Onboarding del padre: se siente cuestionario, sin Capy · **P0**

**Qué se sintió.** Seis preguntas planas, sin motion, sin saber qué utilidad se está obteniendo, y sin el capibara — que es el activo de mayor peso emocional del producto.

**Por qué pasa.** `app/parent/onboarding.tsx` es un `ScrollView` con fondo sólido (`#FFF3DC`) que tapa por completo el stage del avatar (el `AvatarProvider` está montado en el root, así que Capy está *ahí detrás*, cargado y listo — solo está cubierto). No hay transiciones entre pasos (cambia `step` y re-renderiza en seco), no hay barra de progreso visual (solo el texto "1 / 6"), y el "plan personalizado" del GDD §10.3 se reduce a una línea de texto en el último paso.

**Qué hacer.**
- **Meter a Capy al onboarding.** Es el cambio de mayor palanca y es barato: hacer el fondo del onboarding translúcido/parcial para que Capy sea visible, y que reaccione a cada respuesta (`wave_hello` al escribir el nombre, `heart` al elegir personas, `yawn`/`sleep` al elegir bedtime). El patrón Duolingo/Finch es exactamente este: el mascot te acompaña desde la pregunta 1, y cada respuesta produce una reacción — la personalización se *siente* en vez de declararse.
- **Mostrar la utilidad mientras se responde.** Después de cada respuesta, una línea de payoff inmediato: eliges bedtime 7pm → "Capy will be ready every night at 7 🌙"; eliges a Grandma → "Capy will remember to pray for Grandma". Al final, el plan personalizado como pantalla propia ("Capy's 4-week plan for Mia") con las 4 semanas visibles, no como línea de texto.
- **Motion mínimo viable:** transición slide/fade entre pasos (con `LayoutAnimation` o `react-native-reanimated`), barra de progreso que se llena, y micro-scale/bounce al seleccionar una opción. Nada de esto requiere diseño nuevo, solo animación de lo que ya existe.

**Evidencia de por qué es P0:** 50% de las conversiones pagas y ~40–55% de las cancelaciones de trial ocurren el día 0 (RevenueCat 2026). El onboarding ES la primera sesión del padre; si se siente formulario, el paywall que viene después hereda esa frialdad.

---

## 2. El paywall "Unlock the whole path" · **P0**

**Qué se sintió.** Aparece demasiado seco al comienzo; falta saber cómo lo hacen otros o cómo suavizarlo.

**Por qué pasa.** `app/parent/paywall.tsx` es un placeholder explícito (el comentario del archivo lo dice: el real será el template de RevenueCat Paywalls). Hoy es: título, dos cajas de precio, botón sandbox, "later". Llega inmediatamente después del último paso del onboarding, sin transición de valor.

**Qué hacen los demás (y qué dice la data).**
- La data de RevenueCat es contundente a favor de mantener el paywall en el onboarding: apps que lo movieron *dentro* del onboarding multiplicaron trials ×4–5 (casos Greg y Rootd), y el hard paywall convierte 5x el freemium. **La posición no es el problema; la transición sí.**
- El patrón ganador es "aha primero, paywall inmediatamente después": PhotoRoom te deja completar la acción core UNA vez y ahí te muestra el paywall. Traducido a Capy: el paywall convence más después de que el padre *vio* a Capy saludar al niño por su nombre, no antes.
- Blinkist popularizó el **trial timeline** ("hoy: acceso total → día 5: te recordamos → día 7: se cobra") y es el patrón que más reduce la ansiedad de trial — y el que mejor encaja con nuestra bandera de confianza de cobro, la queja #1 del vertical (Hallow/Moshi).

**Qué hacer (propuesta concreta de flujo).**
1. Onboarding (con Capy, punto 1) termina en la pantalla del plan personalizado.
2. **Momento aha:** handoff breve — Capy saluda con el nombre del niño y dice una línea del plan ("I can't wait to pray with Mia!"). 10–15 segundos, no una lección entera.
3. Paywall con estructura: recap del plan personalizado arriba (lo que ya me prometiste) → **timeline del trial estilo Blinkist** → precios con anual default → y visible, en la misma pantalla: "Cancel anytime in 1 tap · We'll remind you before charging". Eso último no es copy decorativo: es nuestra arma competitiva documentada.
4. El "later" se mantiene (bedtime gratis para siempre existe justo para eso), pero renombrado a algo honesto tipo "Start with free bedtime prayers" — así el escape refuerza el freemium honesto en vez de sentirse como un dark pattern de fuga.

Todo esto es compatible con el template de RevenueCat Paywalls (header custom + footer de compra), así que no rompe el plan del GDD.

---

## 3. La voz: cómo se está generando (respuesta directa) · **P1**

**Qué se sintió.** "Voz AI normal, pero podría ser mejor."

**Lo que encontré — importante:** la voz que escuchaste **no es la voz final; es el fallback**. El pipeline tiene dos niveles (`src/audio/voice.ts`):

1. **Audio pre-renderizado con ElevenLabs** (`tools/tts-batch.ts`: modelo `eleven_multilingual_v2`, stability 0.6, un mp3 por línea del pack, idempotente por hash). **Este pipeline existe pero nunca se ha corrido:** `src/audio/manifest.ts` dice literalmente "0 pre-rendered lines". No hay ni un mp3 en el bundle.
2. **Fallback: TTS del sistema operativo** (`expo-speech`) para que la app nunca quede muda. Es lo que escuchaste. El código intenta elegir la mejor voz instalada (prefiere las "premium/enhanced" de iOS) con rate lento y pitch +5%, pero en un device sin voces premium descargadas suena a Siri de hace años.

**Qué hacer:** elegir la voz en equipo (**en hold por decisión de Ariel**). Dato del repo actualizado: el commit `02f2834` ya trae una voz candidata ("Arthur", generada con Higgsfield) para las 348 líneas del pack — las URLs están en `packages/content/packs/christian-us-en-v1/audio/urls.json` y `docs/TESTING.md` explica cómo bajarlas al bundle (`node tools/audio-fetch.mjs …` + `node tools/audio-manifest.mjs`). Vale la pena escucharla junto a 2–3 candidatas de ElevenLabs con las mismas 5 líneas antes de decidir. Nota de diseño ya resuelta en el código: las variables se hablan con placeholder neutro ("friend") y el nombre del niño solo aparece en subtítulo, así el audio pre-renderizado no necesita una versión por nombre.

---

## 4. Capy se ve sobrepuesto y "no fijo al piso" · **P0**

**Qué se sintió.** El escenario gusta, pero el avatar flota sobre el fondo y se mueve raro con las animaciones.

**Por qué pasa (tres causas que se suman, `CapyScene.tsx` + `AvatarView.tsx`):**
1. **Son dos mundos pegados:** Capy vive en un WebView transparente encima de un PNG 2D (`ImageBackground` del bioma). El único punto de contacto visual es un `ContactShadows` genérico en y=0 que no coincide con la línea de horizonte ni la perspectiva pintada del fondo → el ojo lee "sticker sobre postal".
2. **La cámara persigue al esqueleto:** el auto-framing recalcula el bounding box de los huesos cada 6 frames y mueve la cámara con lerp para mantener a Capy en la banda visible entre los paneles de UI. Está pensado para que `sleep`/`chill_lie` no se salgan de cuadro, pero el efecto colateral es que en clips con desplazamiento (walk, rise, celebrate con saltito) **la cámara se mueve con él** → parece que el mundo se resbala y que Capy no pisa nada.
3. ~~Root motion residual en los clips~~ — descartado al medir los tracks: los pies están plantados en todos los clips (traslación 0 en `DEF-foot`); el balanceo de cadera del idle es lo único que "movía" la cámara.

**Qué hacer.**
- **Anclar la cámara:** cámara fija por defecto (encuadre calculado una vez al cargar y al cambiar insets de UI), y reservar el follow SOLO para el chain de lights_out (yawn→lie→sleep), que es para lo que se diseñó. Es un cambio pequeño en `useFrame` y elimina el 70% de la sensación de flotado.
- **Vender el contacto con el piso:** en vez del ContactShadows genérico, una sombra/base elíptica diseñada que combine con el arte del bioma (o un pequeño "muelle/pasto" 3D simple donde Capy para), y alinear el y=0 del canvas con la línea de suelo del PNG por bioma (un offset por bioma en el pack).
- ~~Limpiar root motion~~ — no hace falta (ver arriba).

---

## 5. Animaciones y diálogos no matchean; falta praying; no loopean · **P0 (praying) / P1 (resto)**

**Qué se sintió.** Los clips no siempre corresponden a lo que Capy dice, se cortan (no loop), y no hay animación de orar.

**Por qué pasa (corregido tras revisar el repo actualizado a HEAD `02f2834`).**
- **El "praying" existía pero no se veía.** Hay dos versiones: un gesto procedural `pray_hands` (3 s, aditivo, sobre el clip de hablar) y una pose completa horneada en Blender (`pray_hands_full`, commit "Baked kneel_pray, pray_hands_full…"). El gesto se **soltaba a los 3 s** aunque la línea de oración durara más (las manos subían y bajaban a mitad de frase), y la pose horneada era **código muerto**: `play("pray_hands")` entraba siempre por la rama de gestos y nunca llegaba a `pray_hands_full`. `kneel_pray` sí es un clip real y funciona.
- **El desfase con el diálogo:** el loop de hablar se cierra por dos vías — la voz real (`SpeechBubble` manda `idle` cuando termina el audio/TTS) y un timer de seguridad de `estimado × 2`. Con el TTS del sistema a velocidad lenta, el timer ganaba a veces y la boca se detenía antes que la voz.
- **El fallback era silencioso:** un clip que no existe cae a `idle_breathe` sin avisar a nadie.

**Qué se hizo:** `pray_hands` (y `heart`, `think`) ahora se **sostienen** mientras Capy habla (sub-clip recortado antes de la fase de soltar, clamped), y al terminar cada línea de oración Capy descansa en la pose completa `pray_hands_full` en vez de volver a idle; el timer pasó a `estimado × 3` como tope (la voz real sigue mandando); y cuando un pack pide un clip que el rig no tiene, la app hace `console.warn` en dev (`clipFallback`). Lo que sigue en manos del animador: clips reales para reemplazar los gestos procedurales (wave, think, heart, clap, listen_nod, celebrate) — se enchufan por nombre en `tools/avatar/clip-map.json` sin tocar código.

---

## 6. Cards de respuesta: grandes y con emoji bien, falta vida al aparecer/seleccionar · **P1**

**Por qué pasa.** `BeatView.tsx` renderiza el `Grid` de `IconCard`s en seco: sin stagger de entrada, y la selección solo cambia borde/fondo (más un haptic). El panel (`Sheet`) tampoco anima su aparición entre beats.

**Qué hacer.** Tres micro-animaciones con `react-native-reanimated` (ya es dependencia del stack Expo): entrada en cascada (stagger 40–60ms por card, fade+slide-up), bounce/scale al seleccionar (spring de 1.0→1.08→1.0) con la reacción de Capy ya existente (`mood: happy`), y el `Sheet` entrando con slide-up suave en cada beat. Regla de presupuesto: <300ms todo, porque el ritmo de la sesión de 3 min manda.

---

## 7. La celebración de la linterna se queda corta · **P1**

**Por qué pasa.** `RewardBeat` era: haptic + confetti de 18 emojis + burbuja "🏮 +1" + auto-advance en 2.6 s. El runner sí le pide a Capy `celebrate`, pero la linterna —el objeto que el niño acaba de ganar— nunca aparecía en escena: solo cambiaba un contador en el estanque que el niño ve después.

**Qué se hizo (`RewardBurst`, ~3.4 s, en el escenario):** una linterna grande sube frente a Capy → se enciende con un anillo de luz y chispas (haptic) → el confetti dispara justo ahí, no al abrir el paso → la linterna vuela a su lugar en el estanque y se queda encendida. Conecta el reward con el Estanque de Luz en el momento de ganarlo: la celebración refuerza *qué* lograste (oraste hoy), no puntos abstractos.

---

## 8. Top bar y main menu confusos · **P1 (top bar) / P2 (rediseño del home)**

**Por qué pasa.** El home (`app/index.tsx`) tiene: arriba, medidor de linternas + chip ⭐ (beacons) que juntos navegan al estanque, chip 🔥 (streak) y botón 👤 (parent gate) — cuatro conceptos sin etiqueta para un usuario de 4–8 años que no lee. Abajo, la card "de hoy" + botón bedtime + trail horizontal de nodos con labels tipo "W1·1", que es notación de desarrollador, no de niño.

**Qué hacer ahora (barato):** reducir la top bar a dos elementos — el estanque (linternas+beacons como un solo botón con forma de estanque/linterna) y el acceso de padres (que además debería ser discreto por diseño de Kids Category). El streak puede vivir dentro del estanque o aparecer como saludo de Capy ("3 days in a row!") en vez de chip permanente. En el trail, quitar "W1·1" y dejar solo número o icono del skill.

**De acuerdo con dejarlo para después:** el rediseño completo del home y el replanteo de minijuegos merecen su propia sesión — los minijuegos son el corazón pedagógico y hay que evaluarlos contra el currículo (¿cada uno refuerza la idea del día o es relleno?), no solo contra la UI. Propongo que sea el siguiente playtest enfocado, idealmente con un niño real observado.

---

## Resumen priorizado

| # | Hallazgo | Prioridad | Esfuerzo | Impacto |
|---|---|---|---|---|
| 3 | Correr batch de ElevenLabs (la voz actual es el fallback) | P1 | Horas | Enorme |
| 5a | Auditar GLB: pray_hands y media librería probablemente faltan | **P0** | Horas–1d | Enorme |
| 4 | Anclar cámara + contacto con el piso | **P0** | 1d | Alto |
| 1 | Capy en el onboarding + payoff por respuesta + motion | **P0** | 2–3d | Alto (día 0) |
| 2 | Paywall: aha primero + trial timeline + confianza de cobro visible | **P0** | 1–2d | Alto (día 0) |
| 5b | Duración real de audio → talk animation | P1 | Horas | Medio |
| 7 | Celebración de linterna con secuencia + Capy celebra | P1 | 1d | Medio |
| 6 | Micro-animaciones de cards/sheet | P1 | 1d | Medio |
| 8 | Simplificar top bar | P1 | Horas | Medio |
| — | Rediseño home + evaluación de minijuegos | P2 | Sesión propia | — |

Hilo conductor: **casi todo lo P0 converge en la primera sesión** (onboarding → aha → paywall → primera lección con Capy sonando y orando bien), que es donde la data dice que se decide la conversión y donde se forma la primera impresión de "esto es real" vs "esto es un cash grab con fe".

---

**Fuentes de mercado citadas:** [RevenueCat — paywall placement](https://www.revenuecat.com/blog/growth/paywall-placement) · [RevenueCat — State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) · informe competitivo previo (`docs/informe-competitivo-kpis.md`). Diagnósticos técnicos: código del repo en `apps/mobile/` y `packages/avatar-web/` (rutas exactas en cada sección).
