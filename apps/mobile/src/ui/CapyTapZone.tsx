import { useEffect, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar } from "@/avatar/AvatarView";
import { speak, stopSpeaking } from "@/audio/voice";
import { estimateMs } from "@/engine/lessonRunner";
import * as haptics from "./haptics";

const REACTIONS = ["wave_hello", "celebrate", "clap", "heart", "think"];

/** Invisible layer over Capy in the lobby: a poke gets a gesture and a line (pack.ui.tapLines). */
export function CapyTapZone() {
  const pack = getPack();
  const kidName = useKid((s) => s.kidName);
  const avatar = useAvatar();
  const n = useRef(0);
  const busy = useRef(0);
  useEffect(() => () => stopSpeaking(), []);
  const poke = () => {
    if (Date.now() < busy.current) return;
    const line = pack.ui.tapLines[n.current % pack.ui.tapLines.length]!;
    const clip = REACTIONS[n.current % REACTIONS.length]!;
    n.current++;
    const text = interpolate(line.text, { kidName: kidName || pack.ui.friend });
    busy.current = Date.now() + estimateMs(text) + 800;
    void haptics.tap();
    avatar.send({ type: "mood", value: "happy" });
    avatar.send({ type: "speak", durationMs: estimateMs(text) * 2, clip });
    speak(text, { language: pack.locale, audio: line.audio, onDone: () => avatar.send({ type: "idle" }) });
  };
  return <Pressable style={styles.zone} onPress={poke} accessibilityRole="button" accessibilityLabel={pack.companion.ui.tapCapy} />;
}

const styles = StyleSheet.create({ zone: { position: "absolute", left: "15%", right: "15%", top: 0, bottom: 40 } });
