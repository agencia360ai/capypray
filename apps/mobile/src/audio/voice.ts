import * as Speech from "expo-speech";
import { Platform } from "react-native";

// Capy's voice. v1 beta: on-device TTS (works in Expo Go, offline). When the pack ships pre-rendered
// ElevenLabs audio (tools/tts-batch.ts) `play()` prefers the mp3 and falls back to TTS.
// No child audio is ever recorded (GDD §11); this only speaks.

let voiceId: string | undefined;
let picked = false;
let token = 0;

async function pickVoice(language: string) {
  if (picked) return;
  picked = true;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const lang = voices.filter((v) => v.language.toLowerCase().startsWith(language.slice(0, 2)));
    const preferred = ["Samantha", "Karen", "Moira", "Ava", "Allison", "Zoe", "Nicky"];
    const enhanced = lang.filter((v) => v.quality === Speech.VoiceQuality.Enhanced);
    const byName = (list: typeof voices) => list.find((v) => preferred.some((n) => v.name.includes(n)));
    voiceId = (byName(enhanced) ?? enhanced[0] ?? byName(lang) ?? lang[0])?.identifier;
  } catch {
    voiceId = undefined;
  }
}

export type SpeakHandle = { cancel: () => void };

/** Speak one kid-facing line. onStart/onDone drive the avatar's talk animation. */
export function speak(text: string, opts: { language?: string; onStart?: () => void; onDone?: () => void } = {}): SpeakHandle {
  const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  const my = ++token;
  if (!/[a-zA-Z]/.test(clean)) {
    opts.onDone?.();
    return { cancel: () => {} };
  }
  (async () => {
    await pickVoice(opts.language ?? "en-US");
    if (my !== token) return;
    Speech.stop();
    Speech.speak(clean, {
      language: opts.language ?? "en-US",
      voice: voiceId,
      rate: Platform.OS === "ios" ? 0.48 : 0.85, // slow and calm: Capy's whole personality (GDD §8.1)
      pitch: 1.08,
      onStart: () => {
        if (my === token) opts.onStart?.();
      },
      onDone: () => {
        if (my === token) opts.onDone?.();
      },
      onStopped: () => {
        if (my === token) opts.onDone?.();
      },
      onError: () => {
        if (my === token) opts.onDone?.();
      },
    });
  })();
  return {
    cancel: () => {
      if (my === token) {
        token++;
        Speech.stop();
      }
    },
  };
}

export function stopSpeaking() {
  token++;
  Speech.stop();
}
