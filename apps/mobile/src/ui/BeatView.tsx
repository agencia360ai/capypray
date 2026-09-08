import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Pack, Minigame } from "@capy/content";
import type { Step } from "@/engine/lessonRunner";
import { useKid } from "@/store/kid";

// Renders the current beat. Big subtitles (kids 4–6 don't read; audio leads), one tap to advance.
export function BeatView({ step, pack, onNext }: { step: Step; pack: Pack; onNext: () => void }) {
  switch (step.kind) {
    case "say":
    case "repeat":
      return (
        <Sheet>
          <Text style={styles.subtitle}>{step.text}</Text>
          {step.kind === "repeat" && (
            <Text style={styles.hint}>
              {step.lineIndex + 1} / {step.prayer.lines.length}
            </Text>
          )}
          <Big label={step.kind === "repeat" ? "I said it!" : "Next"} onPress={onNext} />
        </Sheet>
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
        <Sheet>
          <Text style={styles.subtitle}>🏮 +{step.lanterns}</Text>
          <Big label="Yay!" onPress={onNext} />
        </Sheet>
      );
    case "parent_prompt":
      return (
        <Sheet>
          <Text style={styles.parent}>For grown-ups: {step.text}</Text>
          <Big label="OK" onPress={onNext} />
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

  switch (mg.type) {
    case "tap_choice":
      return (
        <Sheet>
          <Text style={styles.subtitle}>{msg ?? mg.prompt.text}</Text>
          <View style={styles.grid}>
            {mg.cards.map((c) => (
              <Card
                key={c.id}
                label={c.label}
                onPress={() => {
                  if (c.correct) {
                    setMsg(mg.successLine.text);
                    setTimeout(onDone, 1200);
                  } else setMsg(mg.retryLine.text);
                }}
              />
            ))}
          </View>
        </Sheet>
      );
    case "collect":
      return (
        <Sheet>
          <Text style={styles.subtitle}>{msg ?? mg.prompt.text}</Text>
          <View style={styles.grid}>
            {mg.items.map((c) => (
              <Card
                key={c.id}
                label={c.label}
                selected={picked.includes(c.id)}
                onPress={() => {
                  const n = picked.includes(c.id) ? picked.filter((x) => x !== c.id) : [...picked, c.id];
                  setPicked(n);
                  if (n.length >= mg.target) {
                    setMsg(mg.successLine.text);
                    setTimeout(onDone, 1200);
                  }
                }}
              />
            ))}
          </View>
        </Sheet>
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
        <Sheet>
          <Text style={styles.subtitle}>{msg ?? mg.prompt.text}</Text>
          <View style={styles.slots}>
            {mg.order.map((_, i) => (
              <Text key={i} style={styles.slot}>
                {picked[i] ? mg.cards.find((c) => c.id === picked[i])?.label : "…"}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {mg.cards
              .filter((c) => !picked.includes(c.id))
              .map((c) => (
                <Card
                  key={c.id}
                  label={c.label}
                  onPress={() => {
                    const n = [...picked, c.id];
                    if (mg.order[n.length - 1] !== c.id) {
                      setMsg(mg.retryLine.text);
                      setPicked([]);
                      return;
                    }
                    setPicked(n);
                    if (n.length === mg.order.length) {
                      setMsg(mg.successLine.text);
                      setTimeout(onDone, 1200);
                    }
                  }}
                />
              ))}
          </View>
        </Sheet>
      );
    case "fill_blank":
      return (
        <Sheet>
          <Text style={styles.subtitle}>{msg ?? mg.prompt.text}</Text>
          <Text style={styles.sentence}>{mg.sentence.replace("___", picked[0] ?? "____")}</Text>
          <View style={styles.grid}>
            {mg.options.map((o) => (
              <Card
                key={o}
                label={o}
                selected={picked[0] === o}
                onPress={() => {
                  setPicked([o]);
                  if (o === mg.answer) {
                    setMsg(mg.successLine.text);
                    setTimeout(onDone, 1200);
                  } else setMsg(mg.retryLine.text);
                }}
              />
            ))}
          </View>
        </Sheet>
      );
  }
}

function PeoplePicker({ text, min, max, defaults, allowAdd, onDone }: { text: string; min: number; max: number; defaults: string[]; allowAdd: boolean; onDone: (ids: string[]) => void }) {
  const kid = useKid();
  const [picked, setPicked] = useState<string[]>([]);
  const options = kid.people.length ? kid.people : defaults.map((d) => ({ id: `default:${d}`, label: d, icon: "person", prayedCount: 0 }));
  return (
    <Sheet>
      <Text style={styles.subtitle}>{text}</Text>
      <View style={styles.grid}>
        {options.map((p) => (
          <Card
            key={p.id}
            label={p.label}
            selected={picked.includes(p.id)}
            onPress={() => setPicked((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : s.length < max ? [...s, p.id] : s))}
          />
        ))}
      </View>
      <Big
        label="Done"
        disabled={picked.length < min}
        onPress={() => {
          if (allowAdd) for (const id of picked) if (id.startsWith("default:") && !kid.people.some((p) => p.label === id.slice(8))) kid.addPerson(id.slice(8));
          onDone(picked);
        }}
      />
    </Sheet>
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
  const size = 120 + (1 - left / seconds) * 120; // GDD §6.5: circle that grows while breathing with Capy
  return (
    <View style={[styles.timer, dark && styles.dark]}>
      <Text style={[styles.subtitle, dark && styles.light]}>{text}</Text>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]} />
    </View>
  );
}

const Sheet = ({ children }: { children: React.ReactNode }) => <View style={styles.sheet}>{children}</View>;
const Big = ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
  <Pressable style={[styles.big, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
    <Text style={styles.bigText}>{label}</Text>
  </Pressable>
);
const Card = ({ label, onPress, selected }: { label: string; onPress: () => void; selected?: boolean }) => (
  <Pressable style={[styles.card, selected && styles.cardSelected]} onPress={onPress}>
    <Text style={styles.cardText}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  sheet: { padding: 20, gap: 14, backgroundColor: "rgba(255,255,255,0.9)", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  subtitle: { fontSize: 26, fontWeight: "600", color: "#3b2a1a", textAlign: "center", lineHeight: 34 },
  hint: { textAlign: "center", color: "#6b4a2b" },
  parent: { fontSize: 16, color: "#6b4a2b" },
  big: { backgroundColor: "#FFB84D", borderRadius: 24, padding: 18, alignItems: "center" },
  disabled: { opacity: 0.4 },
  bigText: { fontSize: 22, fontWeight: "700", color: "#3b2a1a" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  slots: { gap: 6 },
  slot: { fontSize: 18, color: "#3b2a1a", textAlign: "center", padding: 8, borderRadius: 10, backgroundColor: "#fff5e0" },
  sentence: { fontSize: 24, color: "#3b2a1a", textAlign: "center", fontWeight: "600" },
  card: { minWidth: 100, padding: 16, borderRadius: 18, backgroundColor: "#fff", borderWidth: 3, borderColor: "#f1e2c8", alignItems: "center" },
  cardSelected: { borderColor: "#FFB84D", backgroundColor: "#fff5e0" },
  cardText: { fontSize: 18, color: "#3b2a1a" },
  timer: { padding: 20, gap: 20, alignItems: "center", backgroundColor: "rgba(255,255,255,0.9)", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  dark: { backgroundColor: "#0b0a14", flex: 1 },
  light: { color: "#eee" },
  circle: { backgroundColor: "#ffd9a8" },
});
