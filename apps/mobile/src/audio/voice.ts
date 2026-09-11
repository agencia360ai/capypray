import * as Speech from "expo-speech";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Platform } from "react-native";
import { AUDIO } from "./manifest";
import { getPack } from "@/content/pack";

// Capy's voice. Pre-rendered lines (pack `audio` refs → apps/mobile/assets/audio, see tools/tts-batch.ts,
// tools/audio-fetch.mjs, tools/audio-manifest.mjs) play natively; anything without a file falls back to
// on-device TTS so the app never goes silent. No child audio is ever recorded (GDD §11); this only speaks.

let voiceId: string | undefined;
let picked: string | undefined;
let token = 0;
// One reused player for the whole app: a single native player can only emit one source at a time, so advancing to
// the next line (replace + play) can never overlap the one still sounding. Creating a fresh player per line raced —
// remove() on a still-loading player didn't reliably cut it, so two lines bled together.
let player: AudioPlayer | null = null;
let onFinish: (() => void) | null = null;
let modeSet = false;

function ensurePlayer(file: number): AudioPlayer {
  if (!player) {
    const p = createAudioPlayer(file);
    p.addListener("playbackStatusUpdate", (s) => {
      if (s.didJustFinish) {
        const f = onFinish;
        onFinish = null;
        f?.();
      }
    });
    player = p;
  } else {
    player.replace(file);
  }
  return player;
}

async function pickVoice(language: string) {
  if (picked === language) return;
  picked = language;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const lang = voices.filter((v) => v.language.toLowerCase().startsWith(language.slice(0, 2)));
    // iOS ships robotic "compact" voices by default; premium/enhanced ones (Settings → Accessibility →
    // Spoken Content → Voices) sound human. Prefer them whenever the parent downloaded one.
    const rank = (v: (typeof voices)[number]) => (/premium/i.test(v.identifier) ? 3 : v.quality === Speech.VoiceQuality.Enhanced || /enhanced/i.test(v.identifier) ? 2 : 0) + (/Samantha|Ava|Zoe|Allison|Nicky|Karen|Moira|Evan|Tom/.test(v.name) ? 0.5 : 0);
    voiceId = [...lang].sort((a, b) => rank(b) - rank(a))[0]?.identifier;
  } catch {
    voiceId = undefined;
  }
}

export type SpeakHandle = { cancel: () => void };
type Opts = { language?: string; audio?: string; onStart?: () => void; onDone?: () => void };

/** Speak one kid-facing line. onStart/onDone drive the avatar's talk animation. */
export function speak(text: string, opts: Opts = {}): SpeakHandle {
  const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  const my = ++token;
  const done = () => {
    if (my === token) opts.onDone?.();
  };
  const language = opts.language ?? getPack().locale;
  const file = opts.audio && language === "en-US" ? AUDIO[opts.audio] : undefined;
  if (!file && !/\p{L}/u.test(clean)) {
    opts.onDone?.();
    return { cancel: () => {} };
  }
  (async () => {
    stopAll();
    if (file) {
      try {
        if (!modeSet) {
          modeSet = true;
          await setAudioModeAsync({ playsInSilentMode: true });
        }
        if (my !== token) return;
        const p = ensurePlayer(file);
        onFinish = done;
        opts.onStart?.();
        p.play();
        return;
      } catch {
        // fall through to TTS
      }
    }
    await pickVoice(language);
    if (my !== token) return;
    Speech.speak(clean, {
      language,
      voice: voiceId,
      rate: Platform.OS === "ios" ? 0.5 : 0.88, // calm, but not so slow that it drones (GDD §8.1)
      pitch: 1.05,
      onStart: () => {
        if (my === token) opts.onStart?.();
      },
      onDone: done,
      onStopped: done,
      onError: done,
    });
  })();
  return {
    cancel: () => {
      if (my === token) {
        token++;
        stopAll();
      }
    },
  };
}

function stopAll() {
  Speech.stop();
  onFinish = null;
  // Pause (don't remove) so the single reused player is ready for the next line; a paused player emits nothing.
  try {
    player?.pause();
  } catch {
    // already released
  }
}

export function stopSpeaking() {
  token++;
  stopAll();
}

/** True when this line has a pre-rendered file (used to pick a talk clip length). */
export const hasAudio = (file?: string) => !!file && file in AUDIO;
