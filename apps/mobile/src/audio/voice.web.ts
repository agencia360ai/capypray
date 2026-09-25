import { Asset } from "expo-asset";
import * as Speech from "expo-speech";
import { AUDIO } from "./manifest";
import { getPack } from "@/content/pack";

// Keep one media element across lines: replacing the element loses Safari's user activation.
let player: HTMLAudioElement | undefined;
let token = 0;
let retry: (() => void) | undefined;
let listening = false;
export type SpeakHandle = { cancel: () => void };
type Opts = { language?: string; audio?: string; onStart?: () => void; onDone?: () => void };
function media() {
  if (!player) player = new Audio();
  if (!listening) {
    listening = true;
    const unlock = () => { const pending = retry; retry = undefined; pending?.(); };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
  }
  return player;
}
export function stopSpeaking() {
  token++;
  retry = undefined;
  if (player) { player.pause(); player.onended = null; player.onerror = null; }
  void Speech.stop().catch(() => {});
}
export function speak(text: string, opts: Opts = {}): SpeakHandle {
  stopSpeaking();
  const current = token;
  const active = () => current === token;
  const done = () => { if (active()) opts.onDone?.(); };
  const language = opts.language ?? getPack().locale;
  let fallbackStarted = false;
  const fallback = () => { if (active() && !fallbackStarted) { fallbackStarted = true; Speech.speak(text, { language, rate: 0.88, onStart: opts.onStart, onDone: done, onError: done }); } };
  const file = language === "en-US" && opts.audio ? AUDIO[opts.audio] : undefined;
  if (file) {
    const audio = media();
    audio.src = Asset.fromModule(file).uri;
    audio.muted = false;
    audio.onended = done;
    audio.onerror = fallback;
    const play = () => {
      if (!active()) return;
      void audio.play().then(() => { if (active()) opts.onStart?.(); }).catch(error => {
        if (!active()) return;
        if (error?.name === "NotAllowedError") retry = play;
        else if (error?.name !== "AbortError") fallback();
      });
    };
    play();
  } else fallback();
  return { cancel: () => { if (active()) stopSpeaking(); } };
}
export const hasAudio = (file?: string) => !!file && file in AUDIO;
