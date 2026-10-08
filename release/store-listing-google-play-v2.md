# Google Play listing v2 — proposal (8 October 2026)

Audit of the live listing (`play.google.com/store/apps/details?id=com.looplab.capypray`, read 8 October 2026). It shows title "CapyPray", category Lifestyle, 0+ downloads, no ratings, no promo video, 6 screenshots and Data safety "No data collected". On Play search, CapyPray ranks only for its own name: it is absent from the top 30 for "prayer app for kids", "kids prayer", "bedtime prayers for kids", "bible app for kids", "christian kids app" and "bible stories for kids". The apps that rank (God for Kids, Theo, Instill, Bible App for Kids, Superbook, Minno) put the keyword in the title, mostly use Education, and all but two have a promo video.

## Fix before driving any traffic

1. **Data safety is inaccurate.** RevenueCat processes purchase history and a pseudonymous app user ID, and RevenueCat's Play guide marks Financial info → Purchase history as a required disclosure (see `analytics-and-data-safety.md`). Answer "Yes" to collecting data, then declare Purchase history: collected, not shared (service provider), required, for app functionality, encrypted in transit and deletable on request. Follow RevenueCat's table for identifiers.
2. **Privacy policy.** The listing shows only `http://looplab.gg` as the website. Confirm that App content → Privacy policy points to a published page that names CapyPray, children and COPPA (see `legal-addendum-DRAFT.md`). Families apps without one can be removed.
3. **Subscription wording.** The live description says Premium "unlocks additional prayer content". Since build 4, Premium also covers stories, puzzles, places and the pond. Use the "What's free and what's Premium" section below so the listing matches the app.

## Title (29/30)

CapyPray: Kids Prayer & Bible

## Short description (77/80)

Christian prayer app for kids: bedtime prayers, Bible stories and gentle play

## Category

Education (currently Lifestyle). Education is where Bible App for Kids, Superbook and Bedtime Bible Stories compete, and it fits the Families program. Pick tags for religion, kids learning and bedtime.

## Full description (2,361/4,000)

CapyPray is a Christian prayer app for kids ages 4–8. Capy, a gentle capybara, guides short prayers your child can say out loud, a calm bedtime prayer every night and illustrated Bible stories, so prayer becomes a familiar, happy part of the day.

A FRIEND WHO TEACHES THEM TO PRAY
Capy says a short line, your child repeats it and taps "I said it!" when ready. Prayers use your child's nickname and stay simple: hello, thank you, I'm sorry, please help and prayers for the people they love. Children speak out loud, and nothing is recorded.

A CALM BEDTIME PRAYER, FREE EVERY NIGHT
End the day with a quiet goodnight prayer and a gentle lights-out moment in Capy's cozy room. A grown-up can set a bedtime reminder. Bedtime prayers stay free, every night.

A PRAYER PATH THAT GROWS ONE STEP A DAY
42 guided Prayer Moments across two little worlds teach one prayer skill at a time. One new step opens each day, and every prayer lights a lantern by Capy's pond. Along the way, Capy opens short prayers for big feelings (happy, sad, worried, thankful, sleepy) and places to pray, from the kitchen to the car.

ILLUSTRATED BIBLE STORIES, READ ALOUD
Ten narrated stories, including The Lost Sheep, Jesus Calms the Storm, Zacchaeus in the Tree and Jesus and the Children, told in words little ones understand.

LITTLE PUZZLES FOR A PLAYFUL BREAK
Color Pour, Block Garden, Triple Tiles and Memory Pond: four calm games with gentle levels.

MADE WITH FAMILIES IN MIND
• No ads and no chat
• No voice recording; the microphone is never used
• A parental gate before purchases and grown-up settings
• Bedtime reminders and prayer people set by a grown-up
• Your child's progress stays on your device
• English prayers and narration

WHAT'S FREE AND WHAT'S PREMIUM
Free: meeting Capy, the first day of the prayer path and a bedtime prayer every night.
Premium: the full prayer path with its feelings and everyday prayers, the Bible stories, places to pray, the puzzle games and Capy's pond.
Choose a monthly or yearly plan. Google Play shows any free trial, the price and the billing period before you confirm. Subscriptions renew automatically unless canceled in your Google Play account. Restoring a purchase restores Premium, not progress from another device.

Praying together is even better: we recommend a grown-up nearby.

Questions or feedback: support@fivebits.gs

## What's new (build 4)

Thanks for praying with Capy! This update makes it clearer what's free and what's included with Premium. Bedtime prayers stay free every night.

## Screenshots

`screenshots/google-play-v2/` holds 8 phone screenshots, 1080×1920 opaque JPEG, captured from the current app with a fictional profile ("Mia") and framed with parent-facing captions. Order: meet Capy → say it out loud → bedtime (free) → every part of the day → Bible stories (Premium chip) → prayer path → puzzles (Premium chip) → made for families. Regenerate them with `tools/store-screens/capture.cjs` (needs the Expo web dev server on port 8081) and then `compose.cjs`. They come from the web renderer of the same React Native UI; swap in native captures when an emulator or device is at hand.

## Promo video (YouTube, 30 s, landscape)

Not yet made; nearly every ranking competitor has one. Script: Capy's opening line (0–4 s) → "Hi God, it's me, Mia" with the repeat button (4–10 s) → the bedtime room and "Now I lay me down to sleep" (10–16 s) → a story page and the prayer path (16–24 s) → end card "Bedtime prayers free every night · No ads · No voice recording" (24–30 s). Use real app footage and the recorded Capy voice. No children on camera.

## Later

- Store listing experiments: test screenshot 1 (day vs night) and the short description once traffic exceeds a few hundred visitors a week.
- Ratings: ask friends, family and church partners for honest reviews. No incentives: Google prohibits incentivized ratings.
- Teacher Approved: Google picks Families apps for teacher review; it cannot be requested.
