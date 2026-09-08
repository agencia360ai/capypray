import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Pack, Minigame } from "@capy/content";
import type { Step } from "@/engine/lessonRunner";
import { useKid } from "@/store/kid";
import { BigButton, Grid, IconCard, Sheet, SpeechBubble } from "./components";
import { T } from "./theme";

// Renders the current beat. Capy's words live in a speech bubble under the avatar; actions in the bottom sheet.
// Big text, one tap to advance (kids 4–6 don't read; audio leads).
export function BeatView({ step, pack, onNext, onAnswer }: { step: Step; pack: Pack; onNext: () => void; onAnswer?: (key: string, value: string) => void }) {
  switch (step.kind) {
    case "say":
    case "repeat":
      return (
        <>
          <SpeechBubble text={step.text} hint={step.kind === "repeat" ? `${step.lineIndex + 1} / ${step.prayer.lines.length}` : undefined} />
          <Sheet>
            <BigButton label={step.kind === "repeat" ? "I said it!" : "Next"} onPress={onNext} />
          </Sheet>
        </>
      );
    case "ask":
      return (
        <>
          <SpeechBubble text={step.text} />
          <Sheet>
            <Grid>
              {step.options.map((o) => (
                <IconCard
                  key={o.id}
                  icon={o.icon}
                  label={o.label}
                  size="lg"
                  onPress={() => {
                    onAnswer?.(step.key, o.label);
                    onNext();
                  }}
                />
              ))}
            </Grid>
          </Sheet>
        </>
      );
    case "minigame": {
      const mg = pack.minigames.find((m) => m.id === step.minigameId)!;
      return <MinigameView mg={mg} onDone={onNext} />;
    }
    case "listen":
      return <ListenTimer seconds={step.seconds} text={step.text} onDone={onNext} />;
    case "choose_people":
      return <PeoplePicker text={step.text} min={step.min} max={step.max} defaults={pack.people.defaults} allowAdd onDone={onNext} />;
    case "reward":
      return (
        <>
          <SpeechBubble text={`🏮 +${step.lanterns}`} />
          <Sheet>
            <BigButton label="Yay!" onPress={onNext} />
          </Sheet>
        </>
      );
    case "parent_prompt":
      return (
        <Sheet>
          <Text style={styles.parent}>For grown-ups · {step.text}</Text>
          <BigButton label="OK" onPress={onNext} tone="ghost" />
        </Sheet>
      );
    case "lights_out":
      return <ListenTimer seconds={step.seconds} text={step.text} onDone={onNext} dark />;
    case "done":
      return null;
  }
}

function MinigameView({ mg, onDone }: { mg: Minigame; onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const kid = useKid();
  const finish = (line: string) => {
    setMsg(line);
    setTimeout(onDone, 1300);
  };

  switch (mg.type) {
    case "tap_choice":
      return (
        <>
          <SpeechBubble text={msg ?? mg.prompt.text} />
          <Sheet>
            <Grid>
              {mg.cards.map((c) => (
                <IconCard key={c.id} icon={c.icon} label={c.label} size="lg" onPress={() => (c.correct ? finish(mg.successLine.text) : setMsg(mg.retryLine.text))} />
              ))}
            </Grid>
          </Sheet>
        </>
      );
    case "collect":
      return (
        <>
          <SpeechBubble text={msg ?? mg.prompt.text} hint={`${picked.length} / ${mg.target}`} />
          <Sheet>
            <Grid>
              {mg.items.map((c) => (
                <IconCard
                  key={c.id}
                  icon={c.icon}
                  label={c.label}
                  selected={picked.includes(c.id)}
                  onPress={() => {
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
      return <ListenTimer seconds={mg.seconds} text={mg.prompt.text} onDone={onDone} />;
    case "sequence":
      return (
        <>
          <SpeechBubble text={msg ?? mg.prompt.text} />
          <Sheet>
            <View style={styles.slots}>
              {mg.order.map((_, i) => (
                <Text key={i} style={[styles.slot, picked[i] && styles.slotOn]}>
                  {picked[i] ? mg.cards.find((c) => c.id === picked[i])?.label : "…"}
                </Text>
              ))}
            </View>
            <Grid>
              {mg.cards
                .filter((c) => !picked.includes(c.id))
                .map((c) => (
                  <IconCard
                    key={c.id}
                    icon={c.icon}
                    label={c.label}
                    onPress={() => {
                      const n = [...picked, c.id];
                      if (mg.order[n.length - 1] !== c.id) {
                        setMsg(mg.retryLine.text);
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
          <SpeechBubble text={msg ?? mg.prompt.text} hint={mg.sentence.replace("___", picked[0] ?? "____")} />
          <Sheet>
            <Grid>
              {mg.options.map((o) => (
                <IconCard key={o} icon="text" label={o} selected={picked[0] === o} onPress={() => (setPicked([o]), o === mg.answer ? finish(mg.successLine.text) : setMsg(mg.retryLine.text))} />
              ))}
            </Grid>
          </Sheet>
        </>
      );
  }
}

function PeoplePicker({ text, min, max, defaults, allowAdd, onDone }: { text: string; min: number; max: number; defaults: string[]; allowAdd: boolean; onDone: (ids: string[]) => void }) {
  const kid = useKid();
  const [picked, setPicked] = useState<string[]>([]);
  const options = kid.people.length ? kid.people : defaults.map((d) => ({ id: `default:${d}`, label: d, icon: "person", prayedCount: 0 }));
  return (
    <>
      <SpeechBubble text={text} hint={`${picked.length} / ${max}`} />
      <Sheet>
        <Grid>
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
          label="Done"
          disabled={picked.length < min}
          onPress={() => {
            if (allowAdd) for (const id of picked) if (id.startsWith("default:") && !kid.people.some((p) => p.label === id.slice(8))) kid.addPerson(id.slice(8));
            onDone(picked);
          }}
        />
      </Sheet>
    </>
  );
}

function ListenTimer({ seconds, text, onDone, dark }: { seconds: number; text: string; onDone: () => void; dark?: boolean }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) onDone();
  }, [left, onDone]);
  const size = 110 + (1 - left / seconds) * 110; // GDD §6.5: circle that grows while breathing with Capy
  return (
    <>
      {!dark && <SpeechBubble text={text} />}
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
