# GDD — "Capy Prayer — Prayer Buddy for Kids" (working title)

v0.1 · 7 sep 2026 · Owner: Joe (Looplab) · Uso: spec de entrada para Claude Code (copiar a `/docs/GDD.md` del repo y referenciar desde `CLAUDE.md`).
Idioma del GDD: español. Idioma del contenido del Pack v1: inglés (mercado USA).

---

## 0. TL;DR (decisiones cerradas)

| Tema | Decisión |
|---|---|
| Producto | App iOS/Android donde **Capy, un capibara 3D chibi**, guía a niños 4–8 a orar en "Prayer Moments" diarios de 3–5 min. Self-RPG: el niño avanza por un camino, Capy y su estanque crecen. |
| Comprador / usuario | Padre/madre cristiano en USA compra y configura; el niño usa (con o sin padre). |
| Modelo | Suscripción (RevenueCat): $7.99/mes · $49.99/año · trial 7 días · 1 sub = hasta 4 perfiles de niño. Kids Category → paywall detrás de parental gate. |
| Stack | Expo (React Native, expo-router, TS) + `AvatarView` (WebView con Three.js/R3F, bundle local) + Supabase + RevenueCat. Cero analytics de terceros (eventos propios en Supabase). |
| Contenido | 100% data-driven: **Content Packs** JSON (religión, idioma, avatar, voz, lecciones, oraciones, minijuegos, rewards, calendario). Cambiar religión/avatar = cambiar pack, no código. |
| Avatar 3D | Capibara **bípedo estilizado** (rig humanoid, no cuadrúpedo). Meshy (gen + auto-rig) → Mixamo (clips) → `gltf-transform` (merge + compress) → 1 GLB < 5 MB con 16 clips. Lip-sync: v1 gestos + subtítulos; v2 jaw/blendshapes. |
| MVP | 4 semanas de contenido (28 sesiones), 6 tipos de minijuego, Estanque de Luz (Capy's Pond) + linternas, streak con "Grace Days", bedtime routine, paywall, Parent Corner v1. |
| Manual (no Claude Code) | Apple/Google consoles, elegir el mejor modelo en Meshy UI, probar en device, beta con 10 familias. Todo lo demás lo hace Claude Code. |

---

## 1. Visión y tesis

- **Tesis Looplab (Self-RPG):** "Duolingo para convertirte en…" aplicado a fe infantil: orar es una habilidad que se aprende con práctica diaria corta, feedback inmediato y progresión visible.
- **Insight de mercado:** las apps cristianas para niños son casi todas *video/streaming pasivo* (Minno ~$7.99/mes, Superbook gratis, Bible App for Kids gratis). Hallow domina adultos ($69.99/año) y tiene "kids content" como sección, no como producto. **No existe el "compañero que te enseña a orar"** con avatar 3D, currículo progresivo y loop diario gamificado.
- **Posicionamiento:** *"The calmest prayer buddy in the world."* Capy (capibara) = calma + amigo de todos; no es Biblia ilustrada ni videos: es práctica guiada.
- **Modularidad como estrategia:** el engine es agnóstico; el Pack v1 es "Christian · US · English · ages 4–8". Packs futuros: Catholic add-on, Español LATAM, Jewish, Muslim, Mindfulness secular, Ages 9–11.

## 2. Target y JTBD

| Persona | Job to be done | Señal de éxito |
|---|---|---|
| Madre/padre 28–42, cristiano practicante (evangélico o católico), USA, 1–3 hijos | "Quiero que mi hijo aprenda a hablar con Dios por su cuenta, sin que yo tenga que inventar qué decir cada noche." | Rutina de bedtime/mealtime sin fricción; ve progreso; el niño pide "Capy time". |
| Niño 4–8 ("Sprout") | "Quiero jugar con Capy y que mi estanque crezca." | Vuelve solo; recuerda oraciones; ora por personas reales. |
| Kids ministry director (B2B, fase 2) | "Necesito algo que las familias usen en casa entre domingos." | Compra licencias para 50–500 familias. |

Kids Category (Apple) exige elegir banda: **"Ages 6–8"** como primaria; UX audio-first para que 4–5 funcione con un padre al lado.

## 3. Pilares de diseño

1. **3 minutos que se sienten como un juego, no como una clase.** Cada sesión tiene un momento de risa y un momento de calma.
2. **Capy es amigo, no maestro.** Modela la oración ("I'll go first!"), nunca corrige la fe del niño. Es lento, calmado y nunca se frustra: la personalidad capibara ES la pedagogía.
3. **Gracia > castigo.** Nada se pierde por faltar (Grace Days). El estanque nunca se marchita.
4. **Real > abstracto.** El niño ora por personas concretas (Mom, Grandma, mi perro) que él agregó.
5. **El padre siempre ve valor.** Cada semana el padre recibe evidencia ("Prayed for Grandma 4 times").
6. **Todo es dato.** Ninguna oración, texto, clip o reward está hardcodeado.

## 4. Core loop

### 4.1 Sesión diaria ("Prayer Moment", 3–5 min)

```
[Hola] Capy saluda según hora (morning / anytime / bedtime) y contexto (racha, evento)
  → [Lección micro 20–40s] Capy actúa el concepto del día (1 idea, 1 frase clave)
  → [Práctica guiada 60–90s] "Repeat after me" línea por línea; el niño toca para avanzar (o dice en voz alta; no grabamos)
  → [Minijuego 45–60s] refuerza la idea (gratitude garden, ordenar el Padre Nuestro, elegir por quién orar…)
  → [Reward] se enciende 1 linterna flotante en el Estanque de Capy; a 7 linternas → "Beacon" (faro) → unlock (outfit/decoración/sticker)
  → [Cierre] Capy dice una bendición corta; en bedtime: modo "lights out" (pantalla oscura, voz suave, 30s)
```

### 4.2 Loops por horizonte

| Horizonte | Loop | Hook |
|---|---|---|
| Sesión | Aprender → practicar → jugar → reward | Variedad de minijuego + reacción de Capy |
| Día | Morning (opcional) + Bedtime (ancla principal) | Notificación local "Capy is ready for bedtime prayer" |
| Semana | 7 linternas → Beacon → unlock + Parent Report | Coleccionables + evidencia para el padre |
| Mes | Completar "World" (4 semanas) → badge de habilidad + nuevo bioma del estanque | Progresión visible en mapa |
| Estacional | Eventos: Thanksgiving (26 nov 2026), Advent (29 nov 2026), Lent (10 feb 2027), Easter (28 mar 2027) | Contenido limitado en el tiempo |

## 5. Progresión

### 5.1 Habilidades de oración ("Prayer Skills") — árbol del niño

| Skill | Idea para el niño | Frase ancla (EN) |
|---|---|---|
| 1. Hello | God always listens; talking to Him is easy | "Hi God, it's me!" |
| 2. Thank You | Gratitude: notice good things | "Thank you for…" |
| 3. I'm Sorry | Say sorry, receive forgiveness, try again | "I'm sorry for… please help me…" |
| 4. Please Help | Ask for what you need (self) | "Please help me with…" |
| 5. Pray for Others | Intercession: people you love | "Please be with…" |
| 6. Listen | Quiet 30–60s, breathe, be still | "I'm listening, God." |
| 7. Pray with the Bible (World 2) | Short verses as prayers | Psalm 23 / Psalm 139 (WEB, dominio público) |
| 8. Prayers We Share (World 2) | Lord's Prayer memorizado por partes, mealtime grace, bedtime classic | "Our Father…" |

Esto es ACTS (Adoration/Confession/Thanksgiving/Supplication) + Listening, en lenguaje de niño y sin teología divisiva. Denominación-neutral en base; Catholic add-on agrega Hail Mary, Glory Be, Guardian Angel, intro al Rosario.

### 5.2 Mapa

- **World 1 "The Meadow"** (semanas 1–4, MVP): Skills 1–6.
- **World 2 "The River"** (semanas 5–8): Skills 7–8 + oraciones para situaciones (scared, sad, before a test, when I fight with my sibling).
- **World 3 "The Mountain"** (semanas 9–12): oración por el mundo, gratitud avanzada, "pray without words" (drawing prayer).
- Niveles de Capy: cada Beacon sube 1 nivel → título ("Little Capy" → "Calm Capy" → "Prayer Pal" → "Capy Champion").

### 5.3 Streak con gracia ("Capy Streak")

- Racha = días consecutivos con ≥1 Prayer Moment.
- **Grace Days:** 2 días de gracia automáticos por semana (no se compran, no se ganan: se regalan). La racha no se rompe; Capy dice "That's okay, I'm glad you're back."
- Racha larga solo desbloquea cosméticos, nunca contenido (sin dark patterns).

## 6. Sistema de contenido modular (el "framework")

### 6.1 Principio
El app es un **runner de packs**. Un Pack define todo lo que se ve/oye. El código solo sabe ejecutar `beats`, `minigames` y `rewards` genéricos.

### 6.2 Esquema del Pack (Zod en `packages/content/schema.ts`)

```jsonc
{
  "id": "christian-us-en-v1",
  "version": "1.0.0",
  "locale": "en-US",
  "tradition": "christian",           // christian | catholic-addon | jewish | muslim | secular
  "ageBand": "4-8",
  "avatar": { "id": "capy-default", "glb": "avatars/capy-v1.glb", "skinIds": ["capy-default"] },
  "voice": { "provider": "elevenlabs", "voiceId": "...", "style": "warm-kid-friendly" },
  "theme": { "primary": "#FFB84D", "pond": "river-meadow" },
  "skills": [{ "id": "hello", "title": "Hello", "icon": "wave" }, ...],
  "worlds": [{ "id": "garden", "title": "The Meadow", "weeks": ["w1","w2","w3","w4"] }],
  "lessons": [ /* ver 6.3 */ ],
  "prayers": [ /* ver 6.4 */ ],
  "minigames": [ /* instancias tipadas, ver 6.5 */ ],
  "rewards": [{ "id": "hat-flower", "type": "skin", "unlock": { "beacons": 1 } }, ...],
  "people": { "defaults": ["Mom","Dad","Grandma","Grandpa","Sister","Brother","Friend","Teacher","Pet"] },
  "routines": { "bedtime": { "defaultHour": 19, "closingPrayerId": "bedtime-classic" }, "meal": { "prayerId": "grace-god-is-great" } },
  "calendar": [{ "id": "advent-2026", "start": "2026-11-29", "end": "2026-12-25", "lessonIds": [...] }]
}
```

### 6.3 Lesson = secuencia de beats

```jsonc
{
  "id": "w1d1",
  "week": "w1", "day": 1, "skillId": "hello",
  "title": "God Is Always Listening",
  "beats": [
    { "type": "avatar_say", "clip": "wave_hello", "text": "Hi {kidName}! I'm Capy. Guess what? God is always listening. Always!", "audio": "w1d1_01.mp3" },
    { "type": "avatar_say", "clip": "talk_a", "text": "Talking to God is called praying. It's just like talking to a friend.", "audio": "w1d1_02.mp3" },
    { "type": "repeat_after_me", "prayerId": "hello-god-v1" },
    { "type": "minigame", "minigameId": "mg_w1d1_who_listens" },
    { "type": "reward", "lantern": 1 },
    { "type": "avatar_say", "clip": "heart", "text": "You just prayed! High five!", "audio": "w1d1_05.mp3" }
  ]
}
```

Tipos de beat (v1): `avatar_say`, `repeat_after_me`, `minigame`, `listen_timer`, `choose_people`, `reward`, `parent_prompt` (opcional, texto para que el padre lea), `lights_out`.

### 6.4 Prayer

```jsonc
{ "id": "hello-god-v1", "skillId": "hello",
  "lines": [
    { "text": "Hi God, it's me, {kidName}.", "audio": "p_hello_01.mp3" },
    { "text": "Thank you for listening.", "audio": "p_hello_02.mp3" },
    { "text": "I love you. Amen.", "audio": "p_hello_03.mp3" }
  ],
  "variables": ["kidName", "person", "thankfulFor"] }
```

### 6.5 Minijuegos (6 tipos genéricos, instanciados por JSON)

| Tipo | Mecánica | Ejemplo v1 |
|---|---|---|
| `tap_choice` | Elegir 1 de 3–4 tarjetas ilustradas | "Who can hear you when you pray? (God / a rock / nobody)" |
| `collect` | Arrastrar N ítems a Capy/canasta | "Gratitude Garden: pick 3 things you're thankful for today" |
| `sequence` | Ordenar 3–5 tarjetas | Ordenar frases del Lord's Prayer / pasos "Sorry → Forgiven → Try again" |
| `fill_blank` | Completar palabra de una frase con 3 opciones | Memory verse |
| `listen_timer` | Respirar con Capy 30–60s (círculo que crece) | Skill Listen |
| `people_picker` | Elegir por quién orar hoy (tarjetas del niño) | Intercession |

Todos emiten `minigame_complete {type, id, score, durationMs}`.

### 6.6 Reglas de contenido (para Claude Code y para escritores)
- Frases ≤ 12 palabras, 1 idea por beat, sin abstracciones ("sin, salvation") sin ejemplo concreto.
- Denominación-neutral en base. Nada de miedo/culpa. Dios como "God" (no pronombres ambiguos para el niño).
- Textos bíblicos: usar **WEB (World English Bible, dominio público)** o KJV para citas literales; NIV/NIrV/ESV requieren licencia. Paráfrasis propias para niños están OK.
- Oraciones tradicionales de dominio público OK: Lord's Prayer, "Now I lay me down to sleep", "God is great, God is good".
- Cada línea de audio se pre-renderiza (no TTS en runtime; no LLM hablando con niños en v1).

## 7. Pack v1 · "Christian · US · EN · Ages 4–8" — World 1 (28 sesiones)

### 7.1 Currículo

| Día | Skill | Título | Práctica | Minijuego |
|---|---|---|---|---|
| W1D1 | Hello | God Is Always Listening | "Hi God, it's me" | tap_choice: who listens |
| W1D2 | Hello | You Can Pray Anywhere | Hello prayer + lugar del día | collect: places you can pray |
| W1D3 | Hello | Meet Your Prayer People | Agregar 3 personas | people_picker setup |
| W1D4 | Thank You | Noticing Good Things | "Thank you for…" ×3 | collect: gratitude garden |
| W1D5 | Thank You | Thank You Before We Eat | Mealtime grace | sequence: grace lines |
| W1D6 | Thank You | Thank You for People | Gracias por 2 personas | people_picker |
| W1D7 | Review | Beacon Day 1 | Oración libre guiada (Hello+Thanks) | fill_blank review · unlock skin |
| W2D1 | Thank You | Thank You for My Body | Gratitud por 5 sentidos | tap_choice: senses |
| W2D2 | Thank You | Even Hard Days | Gratitud cuando algo salió mal | sequence: bad → good |
| W2D3 | I'm Sorry | Everyone Makes Mistakes | "I'm sorry for…" | tap_choice: what to do after a mistake |
| W2D4 | I'm Sorry | God Forgives | "Please forgive me" + "thank you" | sequence: sorry→forgiven→try again |
| W2D5 | I'm Sorry | Saying Sorry to People Too | Oración + parent_prompt | collect: kind words |
| W2D6 | Listen | Quiet Time With God | listen_timer 30s | listen_timer |
| W2D7 | Review | Beacon Day 2 | Hello+Thanks+Sorry | fill_blank · unlock |
| W3D1 | Please Help | God Cares About What You Need | "Please help me with…" | tap_choice: things to ask help with |
| W3D2 | Please Help | When I'm Scared | Oración para el miedo | listen_timer + prayer |
| W3D3 | Please Help | When I'm Sad | Oración para tristeza | collect: comfort things |
| W3D4 | Please Help | Before Something Big | Test / first day / doctor | sequence |
| W3D5 | Pray for Others | Praying for Family | 2 personas + 1 necesidad | people_picker |
| W3D6 | Pray for Others | Praying for Friends | Amigo + maestro | people_picker |
| W3D7 | Review | Beacon Day 3 | Five-Finger Prayer intro | tap_choice: fingers |
| W4D1 | Pray for Others | Praying for Someone Who Is Sick | "Please be with…" | people_picker |
| W4D2 | Pray for Others | Praying for the World | Personas lejos | collect: world helpers |
| W4D3 | Listen | Listening With My Whole Body | listen_timer 45s | listen_timer |
| W4D4 | Prayers We Share | The Lord's Prayer, Part 1 | "Our Father… hallowed be…" | sequence: 3 líneas |
| W4D5 | Prayers We Share | The Lord's Prayer, Part 2 | "…daily bread… forgive…" | sequence |
| W4D6 | Prayers We Share | Bedtime Prayer Classic | "Now I lay me down to sleep" | fill_blank |
| W4D7 | Review | Beacon Day 4 · World Complete | Oración libre con 5 skills | reward: bioma nuevo + badge "Pond Keeper" |

### 7.2 Oraciones base (originales, dominio público o tradicionales)

- **Hello:** "Hi God, it's me, {kidName}. Thank you for listening. I love you. Amen."
- **Thank You:** "Dear God, thank you for {thankfulFor}. Thank you for {person}. Thank you for today. Amen."
- **I'm Sorry:** "God, I'm sorry for {mistake}. Please forgive me and help me try again. Thank you for loving me. Amen."
- **Please Help:** "God, I feel {feeling}. Please help me with {need}. I know you're with me. Amen."
- **For Others:** "God, please be with {person}. Keep them safe and happy. Help me be kind to them. Amen."
- **Listen:** (sin texto; respiración + "I'm listening, God.")
- **Mealtime grace (trad.):** "God is great, God is good. Let us thank Him for our food. Amen."
- **Bedtime (trad., PD):** "Now I lay me down to sleep, I pray the Lord my soul to keep. Guide me safely through the night, and wake me with the morning light. Amen." (versión moderna, no la de "if I should die").
- **Lord's Prayer:** texto tradicional (dominio público), en 4 bloques memorizables.
- **Five-Finger Prayer:** pulgar = los más cercanos; índice = maestros/ayudantes; medio = líderes; anular = enfermos/débiles; meñique = yo.

### 7.3 Situaciones (World 2, backlog): scared, sad, angry, before a test, sibling fight, new school, someone died (con parent_prompt obligatorio), birthday, thank you for a good day.

## 8. Avatar 3D — "Capy", el capibara que ora

### 8.0 Por qué capibara (y cómo se usa en el diseño)
- **Calma = marca.** El capibara es "el animal más tranquilo del mundo": encaja con el skill *Listen*, con el bedtime y con Grace Days ("Capy never panics"). Ya lo usan apps de hábito Gen Z (Capy, CapyPlan) exactamente con ese framing → validación del arquetipo.
- **Amigo de todos los animales** (los memes de pájaros/monos/patos encima del capibara) = skill *Pray for Others* y el sistema Prayer People: cada persona por la que el niño ora puede aparecer como un animalito amigo en el estanque.
- **Tendencia infantil vigente** (peluches, "capybara song", stickers) → CPI más bajo en paid social parenting y creativos UGC obvios.
- **Neutral religiosamente** → mismo personaje en todos los packs; los packs cambian accesorios, voz y ambiente, nunca el rig.
- **Riesgo de nombre:** "Capy" ya lo usan 2+ apps de hábito ("Capy: Earn Your Screen Time", "CapyPlan"). "Capy Prayer" está libre como título, pero registrar marca y reservar el nombre en App Store Connect en S0; considerar nombre completo distintivo para el personaje en marketing (p. ej. "Capy the Prayer Capybara").

### 8.1 Concepto
- **Capibara chibi, BÍPEDO estilizado** (se para en dos patas, brazos cortos pero con codos/muñecas visibles, manos tipo mitón con pulgar). Cabeza grande (~40% de la altura), ojos grandes, hocico redondo, orejitas. Sin género. Paleta café cálido + panza clara.
- **Por qué bípedo y no cuadrúpedo:** las manos juntas para orar, saludar, aplaudir y abrazar exigen brazos libres; el rig **humanoid** de Meshy/Mixamo abre 600+ clips + "Praying"/"Kneeling" de Mixamo. El rig cuadrúpedo tiene una librería mínima y no puede "orar". Un capibara a cuatro patas queda como **pose secundaria** (clip `chill_lie` para lights_out).
- **Personalidad:** lento, cálido, nunca grita; celebra con un salto pequeño y una sonrisa enorme. Habla despacio (bueno para bedtime y para niños de 4–5).
- **Accesorios firma (skins):** yuzu/naranjita en la cabeza (default), pajarito amigo en el hombro, bufanda, gorro de dormir, salvavidas, flor. Packs futuros = accesorios (cruz pequeña, kippah, etc.), no rigs nuevos.
- Referencias de tono: Pengu (Slay), Duo, Pou, Toca Boca. Nada realista ni "peludo" (pelo real = costo de render en WebView): pelaje sugerido por textura pintada.

### 8.2 Spec técnica
- Formato: **1 GLB** con esqueleto humanoide estándar (bípedo) + todos los clips embebidos. Draco/meshopt + KTX2. Target **< 5 MB**, < 15k tris, 1 material, 1 atlas 1024. Sin fur shader: pelaje pintado en albedo + normal map suave.
- Skins = mismo rig, distinto material/accesorios (GLB adicional < 1 MB cada uno, o texture swap). Accesorios como nodos hijos del hueso `head`/`shoulder_R`.
- **Clips v1 (16):** `idle_breathe`, `idle_look`, `wave_hello`, `talk_a`, `talk_b`, `listen_nod`, `pray_hands` (ojos cerrados, manos juntas), `kneel_pray`, `celebrate` (saltito), `clap`, `heart`, `think`, `yawn`, `sleep`, `chill_lie` (echado a cuatro patas, capibara clásico, para lights_out), `munch` (mordisquea la naranjita; idle raro, "vida").
- **State machine:** `idle → (speak: talk_a|talk_b random, crossfade 0.25s) → idle`; `pray_hands` durante repeat_after_me; `listen_nod` en listen_timer; `celebrate` en reward; `yawn → chill_lie → sleep` en lights_out; `munch` como idle variante 1 de cada 6.
- **Lip-sync roadmap:** v1 = talk clips + subtítulos grandes (kids 4–6 no leen; el audio manda). v1.5 = jaw bone rotado por amplitud del audio (pedir a Meshy/artista que el rig incluya `jaw`; el hocico redondo perdona mucho). v2 = blendshapes/visemes (encargar a artista, ~$300–800) + timing desde ElevenLabs.
- **Ojos:** blink por textura/morph cada 3–5s; ojos "medio cerrados" como pose base de calma (rasgo capibara) → abrir grandes en celebrate.

### 8.3 Pipeline (sin Blender manual)
1. **Concept:** 6–10 imágenes de Capy (Higgsfield ya conectado / cualquier image gen). Prompt base: *"chibi capybara character standing on two legs, A-pose, arms slightly away from body, big round eyes, tiny orange on head, soft matte 3D toy style, front view, neutral background"*. Elegir 1. Generar también vista lateral y trasera para el Image→3D multi-view.
2. **Meshy:** Image→3D multi-view (estilo cartoon) → Remesh (quad, ~12k) → Texture → **Auto-Rig humanoid** (NO quadruped; verificar que detecte codos y muñecas: si los brazos son demasiado cortos, regenerar con brazos un 20% más largos) → aplicar clips de la librería (600+: idle, wave, clap, sit, sleep…). Export GLB.
3. **Mixamo (gratis)** para clips que Meshy no tenga ("Praying", "Kneeling", "Talking", "Waving", "Lying Down"): subir el GLB/FBX riggeado, descargar FBX "without skin" por clip. Con proporciones chibi, revisar que las manos se junten de verdad en `pray_hands` (ajustar en Mixamo con el slider de "arm space" o retargetear en el paso 4).
4. **Claude Code:** script con `FBX2glTF`/Blender headless (`blender -b --python merge_clips.py`) para unir clips al GLB base + `gltf-transform` (`dedup`, `prune`, `resample`, `draco`, `ktx2`) → `capy-v1.glb`.
5. **Preview loop:** página `/preview` en `avatar-web` con dropdown de clips; Claude Code hace screenshots (Playwright/Chrome MCP), corrige luces/cámara/escala, repite.
6. Único paso humano: elegir la mejor generación en Meshy UI y aprobar el look.

## 9. Retención — hooks y sistemas

| Sistema | Diseño | Por qué funciona (evidencia de categoría) |
|---|---|---|
| **Ancla de rutina** | Bedtime como hábito principal; morning opcional. Notificación local a la hora que el padre eligió; Capy "aparece" en la pantalla de notificación (rich). | Habit stacking (Fogg): pegarse a una rutina existente. Bedtime es el momento #1 de oración familiar en USA. |
| **Personajes reales** | Prayer People (tarjetas) que el niño agregó; Capy las recuerda ("How is Grandma?") y muestra contador "prayed for Grandma 4×". | Personalización + emotional stakes; base del Parent Report. |
| **Estanque de Luz (Capy's Pond)** | Linternas flotantes diarias en el estanque → Beacon semanal → biomas mensuales (meadow → river → mountain lake). Cada Prayer Person aparece como un animalito amigo junto a Capy. Nada se marchita. | Forest/Finch: crecimiento visible sin pérdida; el meme "todos los animales se llevan con el capibara" hecho mecánica. |
| **Grace Days** | 2/semana automáticos. | Streak sin ansiedad (Duolingo streak freeze, pero on-brand: gracia). |
| **Coleccionables** | Skins/accesorios de Capy, decoraciones del estanque, "Verse Cards". Solo por progreso, nunca por dinero. | Variable reward + expresión (Pokémon/Toca Boca). |
| **Parent loop** | Weekly Report (push + in-app): sesiones, skills, personas, frase del niño de la semana; sugerencia de conversación de 1 línea. Parent Corner: ajustar bedtime, agregar personas/necesidades de oración ("Grandpa's surgery Tuesday" → Capy lo incluye). | El padre paga: debe ver valor cada semana. Prayer requests del padre = contenido infinito y personal. |
| **Reactivación** | Día 2 sin uso: Capy "te extraña" (1 notificación, no más de 2/semana). Día 7: email al padre con lo logrado + 1 tap para volver. | Cadencia baja = sin fatiga (Kids Category: notificaciones solo con permiso del padre). |
| **Live ops** | Calendario litúrgico: Thanksgiving, Advent (calendario de 25 días), Christmas, Lent (40 días), Easter, back-to-school. | Contenido limitado en tiempo, familias ya orientadas a esas fechas. |
| **Sibling mode** (v1.1) | Hasta 4 perfiles; sesión "together" con turnos. | Aumenta uso por hogar y justifica el precio anual. |

**Anti-patrones prohibidos:** timers de presión, pérdida de progreso, monedas compradas, loot boxes, comparación social, nudges de compra al niño.

## 10. Monetización

### 10.1 Matriz de decisión — modelo de paywall (pesos editables)

| Factor (peso) | A. Freemium soft: bedtime gratis + World 1 semana 1 gratis, resto premium | B. Hard paywall post-onboarding con trial 7d | C. Free trial 7d + todo gratis con ads |
|---|---|---|---|
| Conversión a trial (9) | 6 | 9 | 3 |
| Retención de no-pagadores/boca a boca (7) | 9 | 4 | 7 |
| Kids Category / compliance (8) | 9 | 9 | 3 (ads en Kids = revisión humana, casi inviable) |
| LTV por instalación (8) | 7 | 8 | 3 |
| Simplicidad de build (6) | 7 | 9 | 5 |
| **Total ponderado /10** | **7.6** | **7.8** | **4.1** |

Decisión: **B para lanzar** (mide trial rate y trial→paid limpio) con **1 escape a A**: el "Bedtime Prayer" diario queda gratis para siempre (DAU, WOM, hábito). Todo lo demás premium.

### 10.2 Pricing (USA)
- Monthly $7.99 · Annual $49.99 (default seleccionado; "$4.17/mo · save 48%") · sin lifetime en v1 (canibaliza). Test v1.1: annual $59.99.
- Anchors: Hallow $69.99/año (adultos), Minno $7.99/mes (video). Nosotros: por debajo de Hallow, igual a Minno en mensual, con producto activo y no pasivo.
- Family: incluido (4 perfiles) → argumento del anual.
- Trial 7 días, intro offer solo vía RevenueCat Offerings (A/B: 7d vs 14d).
- Web2app (v1.5): landing en Vercel + RevenueCat Web Billing para tráfico de Facebook/Instagram parenting + churches (evita 30% y permite gifting).
- B2B (v2): "Church Family Plan" – códigos de licencia para kids ministries (100 familias / $999/año).

### 10.3 Flujo
Onboarding del padre (fuera de la zona del niño): 5 preguntas (edad, tradición, hora de bedtime, personas para orar, objetivo) → plan personalizado ("Capy's 4-week plan for Mia") → **parental gate** → RevenueCat Paywall (template editable sin código) → crea perfil del niño → handoff al niño (Capy saluda).
Gating: entitlement `premium` (RevenueCat) → mirror en Supabase vía webhook → `useEntitlement()` en client; lecciones `free: true|false` en el pack.

## 11. Compliance (bloqueante para lanzar)

- **Apple Kids Category (6–8):** sin links externos ni compras fuera de parental gate; **sin analytics ni ads de terceros**; sin enviar PII/device info a terceros. Google Play: "Designed for Families" equivalente.
- **RevenueCat en Kids apps:** configurar SIN identificadores de dispositivo (no llamar `collectDeviceIdentifiers`, sin IDFA/GAID), app user ID anónimo generado por nosotros. Verificar con RC docs antes de submit.
- **COPPA (regla FTC 2025 en vigor):** cuenta = padre (email). Del niño solo nickname + edad-banda + progreso. **Sin fotos, sin grabación de voz, sin chat, sin ubicación** en v1 (audio/foto/video del niño = personal information). Privacy policy específica + "Parental Corner" con borrar datos del niño en 1 tap.
- **Analytics:** eventos propios → Supabase (`events`). Dashboards por SQL/Metabase. Nada de Firebase/Amplitude/Mixpanel/Meta SDK dentro del app.
- **Parental gate:** operación matemática + hold 3s, requerida antes de: paywall, settings, links, Parent Corner.
- **Contenido bíblico:** WEB/KJV (PD) o licencia. Música: original o libre de regalías con licencia comercial.
- **Age rating:** 4+. Sin LLM generativo hablando con el niño en v1 (riesgo de contenido + COPPA). Posible v2 "Ask Capy" con guardrails y opt-in del padre.

## 12. Arquitectura técnica

### 12.1 Monorepo (pnpm + Turborepo)

```
capy-prayer/
  apps/mobile/            # Expo SDK (última), expo-router, TypeScript, NativeWind o Tamagui
  packages/avatar-web/    # Vite + React + @react-three/fiber + drei; build → apps/mobile/assets/avatar/index.html
  packages/content/       # packs JSON + schema Zod + CLI validate/build (genera manifests + hashes)
  packages/ui/            # componentes compartidos (Card, BigButton, LanternMeter…)
  supabase/               # migrations, RLS, edge functions (rc-webhook, weekly-report)
  tools/                  # scripts: merge_clips.py (Blender headless), gltf-optimize.sh, tts-batch.ts (ElevenLabs)
  docs/GDD.md · CLAUDE.md
```

### 12.2 AvatarView (WebView) — contrato
- `react-native-webview` cargando `assets/avatar/index.html` (bundle local, funciona offline), `mediaPlaybackRequiresUserAction={false}`, `allowsInlineMediaPlayback`.
- **RN → Web** (`postMessage` JSON): `{type:"load", glb, skin}`, `{type:"play", clip, loop, fade}`, `{type:"speak", durationMs, visemes?}`, `{type:"look", x,y}`, `{type:"mood", value}`.
- **Web → RN:** `{type:"ready"}`, `{type:"clipEnd", clip}`, `{type:"error"}`.
- Audio se reproduce **nativo** (expo-audio) para evitar restricciones del WebView; el WebView solo anima.
- Interfaz `IAvatarRenderer` → permite swap a `react-native-filament` (nativo, Metal/Vulkan) en v2 sin tocar el resto.
- Mantener el WebView montado (no remount por pantalla) → 0 latencia de carga entre beats.

### 12.3 Backend (Supabase)

Tablas (RLS por `parent_id = auth.uid()`):
- `parents` (id, email, tradition, bedtime_hour, tz, rc_customer_id, created_at)
- `kid_profiles` (id, parent_id, nickname, age_band, skin_id, pond_biome, created_at)
- `progress` (kid_id, pack_id, lesson_id, status, score, completed_at)
- `streaks` (kid_id, current, best, last_active_date, grace_used_week)
- `prayer_people` (id, kid_id, label, icon, prayed_count, note_from_parent, active)
- `pond` (kid_id, lanterns_total, beacons, unlocked jsonb)
- `entitlements` (parent_id, product_id, is_active, expires_at, source) ← webhook RC
- `events` (id, kid_id, parent_id, name, props jsonb, ts) — first-party analytics
- `content_packs` (id, version, url, sha256, min_app_version, active)

Edge functions: `rc-webhook` (RevenueCat → entitlements), `weekly-report` (cron domingo → push/email), `pack-manifest` (versionado + rollout %).
Storage: `packs/`, `audio/`, `avatars/` (CDN pública, inmutable por hash).

### 12.4 Cliente
- Estado: Zustand + persistencia MMKV (offline-first; sync en background).
- Pack loader: bundle `christian-us-en-v1` embebido + OTA de packs por manifest (sin nuevo build para agregar semanas).
- Notificaciones: `expo-notifications` locales (bedtime, reactivación); push server-side solo para weekly report.
- Purchases: `react-native-purchases` + `react-native-purchases-ui` (Paywalls).
- Audio: `expo-audio`; pre-descarga del pack activo.
- Nada de `localStorage`/analytics de terceros.

## 13. Toolchain para Claude Code

### 13.1 MCPs / plugins a conectar en Claude Code

| Herramienta | Estado | Para qué |
|---|---|---|
| **Supabase MCP** | Ya lo tienes en claude.ai → `claude mcp add --transport http supabase https://mcp.supabase.com/mcp` | Schema, migrations, RLS, edge functions, logs |
| **RevenueCat AI Toolkit** | `claude plugins marketplace add RevenueCat/ai-toolkit` | Products, entitlements, offerings, paywalls, skills de RN SDK, debug sandbox |
| **Vercel MCP** | Ya conectado | Hostear `avatar-web` preview + landing web2app |
| **Playwright MCP** (o Chrome MCP) | `claude mcp add playwright npx @playwright/mcp@latest` | Loop visual: screenshots del avatar y minijuegos en browser |
| **mobile-mcp** (mobile-next) | `claude mcp add mobile npx @mobilenext/mobile-mcp@latest` | Claude tapea/ve el simulador iOS / emulador Android |
| **ElevenLabs MCP** | oficial (`elevenlabs-mcp`) | Batch de audio de todas las líneas del pack |
| **GitHub** | `gh` CLI | PRs, issues, CI (EAS Build en GitHub Actions) |
| **Figma MCP** | Ya conectado (opcional) | UI kit / iconos de minijuegos |
| **Meshy** | Sin MCP; API REST + UI | Gen + rig del avatar (paso semi-manual) |
| **Higgsfield** | Ya conectado en claude.ai | Concept art de Capy; videos UGC para marketing (reusar tu ugc-machine) |
| **EAS CLI** | `eas build/submit/update` | Builds, OTA updates, submit a stores |

### 13.2 CLAUDE.md (esqueleto)

```
# Capy Prayer — reglas
- Lee docs/GDD.md antes de cualquier feature. El GDD manda.
- Todo texto/oración/clip/reward viene del pack JSON. Cero strings hardcodeados en UI del niño.
- Prohibido: SDKs de analytics/ads de terceros, localStorage, LLM en runtime para el niño, recolección de PII del niño.
- Avatar: solo vía IAvatarRenderer. Cambios visuales → correr /preview y adjuntar screenshot en el PR.
- Contenido nuevo → `pnpm content:validate` debe pasar (schema + audio existe + lección referenciada).
- Cada PR: tests de pack validator + smoke e2e (Maestro) + build de avatar-web.
- Idioma de código/commits: inglés. Comentarios mínimos.
```

## 14. Roadmap

| Sprint | Duración | Entregable | Done cuando |
|---|---|---|---|
| S0 Setup | 3–4 días | Monorepo, Expo app + router, Supabase schema + RLS, RC project vía MCP, avatar-web con GLB placeholder + bridge, CI EAS | App abre, avatar placeholder anima por postMessage, login de padre funciona |
| S1 Avatar + Engine | 1 sem | Capy v1 GLB (16 clips), lesson runner (todos los beats), 3 minijuegos, Week 1 con audio real | W1D1–D7 jugables end-to-end en device |
| S2 Meta | 1 sem | Estanque/linternas/Beacons, skins, streak + Grace Days, bedtime routine + notificación local, lights_out | Loop diario completo 7 días |
| S3 Monetización + Parent | 1 sem | Onboarding padre, parental gate, RC paywall + gating, webhook → entitlements, Parent Corner v1 (personas, bedtime, borrar datos), semanas 2–4 + 3 minijuegos restantes | Compra sandbox desbloquea; Kids Category checklist ✔ |
| S4 Beta | 1 sem | Polish, sonido/música, TestFlight + Play internal, 10 familias, eventos first-party + dashboard SQL | D1/D7 medibles, 0 crashes P0 |
| v1.0 | ~5–6 sem desde S0 | Submit stores (Kids 6–8, 4+) | Aprobado |
| v1.1 | +3 sem | Weekly Report, sibling mode, Thanksgiving + Advent live ops, A/B trial 7 vs 14 | Advent listo antes del 29 nov 2026 |
| v1.5 | +4 sem | World 2, Situaciones, web2app + Web Billing, jaw lip-sync | — |
| v2 | 2027 Q1 | Catholic add-on, Español LATAM, Lent (10 feb 2027), Church plan, react-native-filament opcional, packs Jewish/Muslim/Mindfulness | — |

## 15. KPIs y targets (v1 · primeros 90 días)

| Métrica | Target | Nota |
|---|---|---|
| Onboarding completion (padre) | > 70% | 5 preguntas, < 90 s |
| Trial start / install | 8–12% | Paywall B + valor claro |
| Trial → paid | 35–45% | Anual default |
| D1 / D7 / D30 (perfil niño) | 50% / 30% / 15% | Bedtime notif clave |
| Sesiones/semana por niño activo | ≥ 4 | Cap de contenido 1/día + bedtime |
| Prayer People agregadas en semana 1 | ≥ 3 | Predictor de retención (validar) |
| Weekly Report open rate | > 40% | Predictor de renovación (validar) |
| Churn mensual (monthly plan) | < 8% | Hallow/Calm-like |
| Crash-free | > 99.5% | WebView es el riesgo |

Cohortes por: tradición, banda de edad, hora de bedtime, canal de adquisición.

## 16. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| WebView lento en Android low-end | GLB < 5 MB, 1 material, 30 fps cap; fallback 2D (Lottie de Capy) si `deviceTier=low`; swap a filament en v2 |
| Rig de Meshy con deformaciones (cadera/hombros) | Chibi redondo con pocas articulaciones visibles; brazos con codo/muñeca claros para que `pray_hands` cierre bien; validar clips en /preview; retopo con Remesh |
| Confusión de marca con apps "Capy"/"CapyPlan" | Registrar "Capy Prayer" (USPTO + App Store Connect) en S0; ASO con "prayer" siempre junto al nombre; personaje con nombre completo distintivo en marketing |
| Rechazo Kids Category | Checklist §11 en S3; sin SDKs de terceros desde S0 |
| Contenido percibido como "de una denominación" | Base neutral + review por 2 pastores/kids ministry (evangélico + católico) antes de v1 |
| Padres no ven valor → churn | Weekly Report + prayer requests del padre desde v1.1 |
| Licencias de textos bíblicos | WEB/KJV en v1; licencia NIrV solo si data lo justifica |
| Scope creep (LLM, voz, AR) | Fuera de v1 por diseño; backlog v2 |

## 17. Backlog inicial — prompts para Claude Code (en orden)

1. "Lee docs/GDD.md. Crea el monorepo pnpm/turbo con apps/mobile (Expo, expo-router, TS), packages/avatar-web (Vite+R3F), packages/content (Zod schema del §6 + CLI validate), supabase/ (migrations del §12.3 con RLS). Sin analytics de terceros."
2. "Implementa AvatarView (WebView + bridge del §12.2) con un GLB placeholder y una página /preview con dropdown de clips. Usa Playwright para screenshot de idle y wave."
3. "Implementa el lesson runner: ejecuta todos los tipos de beat del §6.3 desde el pack JSON. Crea el pack christian-us-en-v1 con W1D1–D3 usando textos del §7."
4. "Implementa minijuegos tap_choice, collect, people_picker como componentes genéricos parametrizados por JSON. Añade tests del validator."
5. "Genera audio de todas las líneas del pack con ElevenLabs (voz warm-kid-friendly), guárdalo en Supabase Storage y referencia en el pack. Script tools/tts-batch.ts idempotente."
6. "Implementa Estanque de Luz (Capy's Pond) (linternas, beacons, unlocks), streak con Grace Days y bedtime routine con notificación local + lights_out."
7. "Con el plugin de RevenueCat: crea productos monthly $7.99 / annual $49.99 con trial 7d, entitlement premium, offering default con paywall template. Integra react-native-purchases + purchases-ui detrás de parental gate. Webhook a Supabase."
8. "Onboarding del padre (§10.3), Parent Corner v1, borrar datos del niño, privacy policy. Corre el checklist Kids Category §11 y lista lo que falta."
9. "Pipeline del avatar: script Blender headless para unir clips FBX de Mixamo al GLB de Meshy + gltf-transform. Reemplaza el placeholder por capy-v1.glb y valida los 16 clips en /preview."
10. "Semanas 2–4 del pack, 3 minijuegos restantes, Maestro e2e del loop diario, EAS build TestFlight."

---

## Apéndice A — Packs futuros (solo datos, mismo engine)

| Pack | Avatar | Cambios |
|---|---|---|
| catholic-addon-en | Capy (accesorio: cruz pequeña opcional) | Hail Mary, Glory Be, Guardian Angel prayer, Rosary intro, santos como "helpers" |
| christian-latam-es | Capy | Traducción + oraciones tradicionales en español, voz ES-LATAM |
| jewish-en | Capy (accesorio: kippah opcional) | Modeh Ani, Shema, Shabbat blessings, calendario hebreo |
| muslim-en | Capy | Duas diarias, pasos del wudu/salah para niños, Ramadan calendar |
| mindful-secular-en | Capy | Gratitude, breathing, kindness intentions; sin lenguaje religioso |
| ages-9-11-christian | Capy "grown" (skin más alto, sin naranjita) | ACTS explícito, journaling, versículos completos, oración con música |

## Apéndice B — Glosario
Prayer Moment (sesión) · Beat (unidad de lección) · Skill (habilidad de oración) · Lantern/Beacon (reward diario/semanal) · Grace Day (día perdonado) · Prayer People (tarjetas de intercesión) · Pack (contenido modular) · Parent Corner (zona del padre tras parental gate).
