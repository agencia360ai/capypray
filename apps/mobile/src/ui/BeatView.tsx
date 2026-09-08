import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Pack, Minigame } from "@capy/content";
import type { Step } from "@/engine/lessonRunner";
import { useKid } from "@/store/kid";
import { speak } from "@/audio/voice";
import { BigButton, Grid, IconCard, Sheet, SpeechBubble } from "./components";
import { Arrow, Check, Mic } from "./art";
import { Confetti } from "./Confetti";
import * as haptics from "./haptics";
import { getPack } from "@/content/pack";
import { T } from "./theme";
import { useAvatar } from "@/avatar/AvatarView";
import { estimateMs } from "@/engine/lessonRunner";
import { track } from "@/backend/events";

// Renders the current beat. Capy's words live in a speech bubble under the avatar; actions in the bottom sheet.
// Audio leads (kids 4–6 don't read): plain lines advance by themselves once spoken, anything that needs the
// kid shows a pointing hand, and Capy speaks a hint if they stall (pack.ui.nudge*).
const HINT_MS = 1400;
const NUDGE_MS = 9000;
const AUTO_SAY_MS = 1800;
const AUTO_REWARD_MS = 2600;

export function BeatView({ step, pack, onNext, onAnswer }: { step: Step; pack: Pack; onNext: () => void; onAnswer?: (key: string, value: string) => void }) {
  const avatar = useAvatar();
  switch (step.kind) {
    case "say":
      return <LineBeat key={step.text} text={step.text} audio={step.audio} badge="chat" label={pack.ui.next} icon={<Arrow />} autoMs={AUTO_SAY_MS} nudge={pack.ui.nudgeTap} onNext={onNext} />;
    case "repeat":
      return (
        <LineBeat
          key={`${step.prayer.id}:${step.lineIndex}`}
          text={step.text}
          audio={step.audio}
          badge="pray"
          hint={`${step.lineIndex + 1} / ${step.prayer.lines.length}`}
          label={pack.ui.iSaidIt}
          icon={<Mic />}
          nudge={pack.ui.nudgeRepeat}
          onNext={onNext}
        />
      );
    case "ask":
      return (
        <ChoiceBeat key={step.key} text={step.text} audio={step.audio} badge="question" nudge={pack.ui.nudgeChoose}>
          {(pick) =>
            step.options.map((o) => (
              <IconCard
                key={o.id}
                icon={o.icon}
                label={o.label}
                size="lg"
                onPress={() => {
                  pick();
                  avatar.send({ type: "mood", value: "happy" });
                  onAnswer?.(step.key, o.label);
                  onNext();
                }}
              />
            ))
          }
        </ChoiceBeat>
      );
    case "minigame": {
      const mg = pack.minigames.find((m) => m.id === step.minigameId)!;
      return <MinigameView key={mg.id} mg={mg} onDone={onNext} />;
    }
    case "listen":
      return <ListenTimer seconds={step.seconds} text={step.text} audio={step.audio} onDone={onNext} />;
    case "choose_people":
      return <PeoplePicker text={step.text} audio={step.audio} min={step.min} max={step.max} defaults={pack.people.defaults} allowAdd onDone={onNext} />;
    case "reward":
      return <RewardBeat lanterns={step.lanterns} label={pack.ui.yay} onNext={onNext} />;
    case "parent_prompt":
      return (
        <Sheet>
          <Text style={styles.parent}>
            {pack.ui.forGrownUps} · {step.text}
          </Text>
          <BigButton label={pack.ui.ok} onPress={onNext} tone="ghost" />
        </Sheet>
      );
    case "lights_out":
      return <ListenTimer seconds={step.seconds} text={step.text} audio={step.audio} onDone={onNext} dark />;
    case "done":
      return null;
  }
}

/** After Capy finished: pointing hand after HINT_MS, a spoken nudge after NUDGE_MS (once). */
function useGuide(spoken: boolean, nudge?: string, enabled = true) {
  const [hint, setHint] = useState(false);
  const avatar = useAvatar();
  useEffect(() => {
    if (!spoken || !enabled) {
      setHint(false);
      return;
    }
    const a = setTimeout(() => setHint(true), HINT_MS);
    const b = setTimeout(() => {
      if (!nudge) return;
      avatar.send({ type: "speak", durationMs: estimateMs(nudge) * 2, clip: "listen_nod" });
      speak(nudge, { onDone: () => avatar.send({ type: "idle" }) });
    }, NUDGE_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [spoken, enabled, nudge, avatar]);
  return hint;
}

function LineBeat({ text, audio, badge, hint, label, icon, autoMs, nudge, onNext }: { text: string; audio?: string; badge: string; hint?: string; label: string; icon: React.ReactNode; autoMs?: number; nudge: string; onNext: () => void }) {
  const [spoken, setSpoken] = useState(false);
  const showHint = useGuide(spoken, autoMs ? undefined : nudge);
  return (
    <>
      <SpeechBubble text={text} audio={audio} badge={badge} hint={hint} onSpoken={() => setSpoken(true)} />
      <Sheet>
        <BigButton label={label} icon={icon} onPress={onNext} hint={showHint && !autoMs} autoAdvanceMs={spoken && autoMs ? autoMs : undefined} />
      </Sheet>
    </>
  );
}

function ChoiceBeat({ text, audio, badge, nudge, children }: { text: string; audio?: string; badge: string; nudge: string; children: (pick: () => void) => React.ReactNode }) {
  const [spoken, setSpoken] = useState(false);
  const [picked, setPicked] = useState(false);
  const showHint = useGuide(spoken, nudge, !picked);
  return (
    <>
      <SpeechBubble text={text} audio={audio} badge={badge} onSpoken={() => setSpoken(true)} />
      <Sheet>
        <Grid hint={showHint}>{children(() => setPicked(true))}</Grid>
      </Sheet>
    </>
  );
}

function RewardBeat({ lanterns, label, onNext }: { lanterns: number; label: string; onNext: () => void }) {
  useEffect(() => {
    void haptics.success();
  }, []);
  return (
    <>
      <Confetti trigger={1} />
      <SpeechBubble text={`🏮 +${lanterns}`} badge="lantern" />
      <Sheet>
        <BigButton label={label} icon={<Check />} onPress={onNext} autoAdvanceMs={AUTO_REWARD_MS} />
      </Sheet>
    </>
  );
}

function MinigameView({ mg, onDone }: { mg: Minigame; onDone: () => void }) {
  const pack = getPack();
  const [msg, setMsg] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [burst, setBurst] = useState(0);
  const [shake, setShake] = useState(0);
  const [spoken, setSpoken] = useState(false);
  const [touched, setTouched] = useState(false);
  const kid = useKid();
  const avatar = useAvatar();
  const showHint = useGuide(spoken, pack.ui.nudgeChoose, !touched && !msg);
  // Capy reacts: talks the prompt, celebrates a win, droops on a miss (GDD §4.2 "reacción de Capy").
  useEffect(() => {
    avatar.send({ type: "speak", durationMs: estimateMs(mg.prompt.text) * 2, clip: "think" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg.id]);
  const [startedAt] = useState(() => Date.now());
  const [misses, setMisses] = useState(0);
  const finish = (line: string) => {
    setTouched(true);
    setMsg(line);
    void track("minigame_complete", { type: mg.type, id: mg.id, score: Math.max(0, 3 - misses), durationMs: Date.now() - startedAt });
    setBurst((b) => b + 1);
    void haptics.success();
    avatar.send({ type: "mood", value: "happy" });
    avatar.send({ type: "speak", durationMs: estimateMs(line) * 2, clip: "celebrate" });
    setTimeout(onDone, 1900);
  };
  const retry = (line: string) => {
    setTouched(true);
    setMsg(line);
    setMisses((m) => m + 1);
    setShake((n) => n + 1);
    void haptics.nope();
    avatar.send({ type: "speak", durationMs: estimateMs(line) * 2, clip: "sad" });
  };
  const bubble = (text: string, hint?: string) => (
    <>
      <Confetti trigger={burst} />
      <SpeechBubble text={text} audio={msg ? undefined : mg.prompt.audio} badge="game" hint={hint} shake={shake} onSpoken={() => setSpoken(true)} />
    </>
  );

  switch (mg.type) {
    case "tap_choice":
      return (
        <>
          {bubble(msg ?? mg.prompt.text)}
          <Sheet>
            <Grid hint={showHint}>
              {mg.cards.map((c) => (
                <IconCard key={c.id} icon={c.icon} label={c.label} size="lg" onPress={() => (c.correct ? finish(mg.successLine.text) : retry(mg.retryLine.text))} />
              ))}
            </Grid>
          </Sheet>
        </>
      );
    case "collect":
      return (
        <>
          {bubble(msg ?? mg.prompt.text, `${picked.length} / ${mg.target}`)}
          <Sheet>
            <Grid hint={showHint}>
              {mg.items.map((c) => (
                <IconCard
                  key={c.id}
                  icon={c.icon}
                  label={c.label}
                  selected={picked.includes(c.id)}
                  onPress={() => {
                    setTouched(true);
                    const n = picked.includes(c.id) ? picked.filter((x) => x !== c.id) : [...picked, c.id];
                    setPicked(n);
                    if (n.length >= mg.target) finish(mg.successLine.text);
                  }}
                />
              ))}
            </Grid>
          </Sheet>
        </>
      );
    case "people_picker":
      return (
        <PeoplePicker
          text={mg.prompt.text}
          audio={mg.prompt.audio}
          min={mg.min}
          max={mg.max}
          defaults={[]}
          allowAdd={mg.allowAdd}
          onDone={(ids) => {
            kid.prayedFor(ids);
            onDone();
          }}
        />
      );
    case "listen_timer":
      return <ListenTimer seconds={mg.seconds} text={mg.prompt.text} audio={mg.prompt.audio} onDone={onDone} />;
    case "sequence":
      return (
        <>
          {bubble(msg ?? mg.prompt.text)}
          <Sheet>
            <View style={styles.slots}>
              {mg.order.map((_, i) => (
                <Text key={i} style={[styles.slot, picked[i] && styles.slotOn]}>
                  {picked[i] ? mg.cards.find((c) => c.id === picked[i])?.label : "…"}
                </Text>
              ))}
            </View>
            <Grid hint={showHint}>
              {mg.cards
                .filter((c) => !picked.includes(c.id))
                .map((c) => (
                  <IconCard
                    key={c.id}
                    icon={c.icon}
                    label={c.label}
                    onPress={() => {
                      setTouched(true);
                      const n = [...picked, c.id];
                      if (mg.order[n.length - 1] !== c.id) {
                        retry(mg.retryLine.text);
                        setPicked([]);
                        return;
                      }
                      setPicked(n);
                      if (n.length === mg.order.length) finish(mg.successLine.text);
                    }}
                  />
                ))}
            </Grid>
          </Sheet>
        </>
      );
    case "fill_blank":
      return (
        <>
          {bubble(msg ?? mg.prompt.text, mg.sentence.replace("___", picked[0] ?? "____"))}
          <Sheet>
            <Grid hint={showHint}>
              {mg.options.map((o) => (
                <IconCard key={o} icon="text" label={o} selected={picked[0] === o} onPress={() => (setPicked([o]), o === mg.answer ? finish(mg.successLine.text) : retry(mg.retryLine.text))} />
              ))}
            </Grid>
          </Sheet>
        </>
      );
  }
}

function PeoplePicker({ text, audio, min, max, defaults, allowAdd, onDone }: { text: string; audio?: string; min: number; max: number; defaults: string[]; allowAdd: boolean; onDone: (ids: string[]) => void }) {
  const pack = getPack();
  const kid = useKid();
  const avatar = useAvatar();
  const [picked, setPicked] = useState<string[]>([]);
  const [spoken, setSpoken] = useState(false);
  const showHint = useGuide(spoken, picked.length < min ? pack.ui.nudgeChoose : pack.ui.nudgeTap, true);
  const options = kid.people.length ? kid.people : defaults.map((d) => ({ id: `default:${d}`, label: d, icon: "person", prayedCount: 0 }));
  return (
    <>
      <SpeechBubble text={text} audio={audio} badge="heart" hint={`${picked.length} / ${max}`} onSpoken={() => setSpoken(true)} />
      <Sheet>
        <Grid hint={showHint && picked.length < min}>
          {options.map((p) => (
            <IconCard
              key={p.id}
              icon={p.icon}
              label={p.label}
              selected={picked.includes(p.id)}
              onPress={() => setPicked((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : s.length < max ? [...s, p.id] : s))}
            />
          ))}
        </Grid>
        <BigButton
          label={pack.ui.done}
          icon={<Check />}
          disabled={picked.length < min}
          hint={showHint && picked.length >= min}
          onPress={() => {
            if (allowAdd) for (const id of picked) if (id.startsWith("default:") && !kid.people.some((p) => p.label === id.slice(8))) kid.addPerson(id.slice(8));
            void haptics.success();
            avatar.send({ type: "mood", value: "happy" });
            avatar.send({ type: "play", clip: "heart", loop: false });
            onDone(picked);
          }}
        />
      </Sheet>
    </>
  );
}

function ListenTimer({ seconds, text, audio, onDone, dark }: { seconds: number; text: string; audio?: string; onDone: () => void; dark?: boolean }) {
  const [left, setLeft] = useState(seconds);
  const avatar = useAvatar();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!dark) return;
    const h = speak(text, { audio, onDone: () => avatar.send({ type: "lights_out" }) });
    return () => h.cancel();
  }, [dark, text, audio, avatar]);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) done.current();
  }, [left]);
  const size = 110 + (1 - left / seconds) * 110; // GDD §6.5: circle that grows while breathing with Capy
  return (
    <>
      {!dark && <SpeechBubble text={text} audio={audio} badge="ear" />}
      <Sheet style={dark ? styles.dark : undefined}>
        {dark && <Text style={styles.darkText}>{text}</Text>}
        <View style={styles.circleWrap}>
          <View style={[styles.circle, dark && styles.circleDark, { width: size, height: size, borderRadius: size / 2 }]} />
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  parent: { fontFamily: T.font.regular, fontSize: 16, color: T.color.brown, lineHeight: 22 },
  slots: { gap: 6 },
  slot: { fontFamily: T.font.bold, fontSize: 18, color: T.color.brown, textAlign: "center", padding: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.6)" },
  slotOn: { color: T.color.ink, backgroundColor: T.color.paper },
  circleWrap: { alignItems: "center", justifyContent: "center", height: 240 },
  circle: { backgroundColor: T.color.primary, opacity: 0.85 },
  circleDark: { backgroundColor: "#6b63b5", opacity: 0.6 },
  dark: { backgroundColor: "rgba(20,17,45,0.92)" },
  darkText: { fontFamily: T.font.bold, fontSize: 22, color: "#efeaff", textAlign: "center", lineHeight: 30 },
});
