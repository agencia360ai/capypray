// Card icon ids (from the pack) → glyph. Placeholder until illustrated icon set lands; keeps the pack free of emoji.
const ICONS: Record<string, string> = {
  "sun-cloud": "🌤️", rock: "🪨", empty: "🫥", bed: "🛏️", car: "🚗", tree: "🌳", bath: "🛁", school: "🏫", plate: "🍽️",
  family: "👨‍👩‍👧", apple: "🍎", sun: "☀️", paw: "🐾", blocks: "🧱", friends: "🧑‍🤝‍🧑", house: "🏠", heart: "❤️", text: "📝",
  ear: "👂", foot: "🦶", tummy: "🫃", mud: "🟤", sad: "😢", seeds: "🌰", "heart-mend": "💛", bush: "🌿", water: "💦",
  sprout: "🌱", "hands-open": "🙌", storm: "⛈️", grab: "✊", person: "🙂", wave: "👋", people: "👥", book: "📖",
  beacon: "🗼", orange: "🍊", bird: "🐦", star: "⭐", moon: "🌙", rainbow: "🌈", dog: "🐶", cat: "🐱", fish: "🐟",
  duck: "🦆", frog: "🐸", turtle: "🐢", bunny: "🐰", hedgehog: "🦔", otter: "🦦", mountain: "🏔️", river: "🏞️", hat: "🎀", badge: "🏅", card: "🃏", lily: "🪷",
  music: "🎵", ball: "⚽", ice: "🍦", pizza: "🍕", happy: "😄", sleepy: "😴", scared: "😨", angry: "😠", calm: "😌",
};

export const glyph = (id?: string) => (id && ICONS[id]) || "✨";
