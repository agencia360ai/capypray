import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid, type AgeBand, type Tradition } from "@/store/kid";
import { P } from "@/parent/strings";

// GDD §10.3: 5 questions (< 90 s) → personalised plan → parental gate → paywall → handoff to the kid.
// v1 runs on first launch (the parent installs the app). Gate is skipped here because no kid profile exists yet.
const STEPS = ["name", "age", "tradition", "bedtime", "people", "goal"] as const;
const AGES: AgeBand[] = ["4-8", "9-11"];
const TRADITIONS: { id: Tradition; label: string }[] = [
  { id: "christian", label: "Christian" },
  { id: "catholic-addon", label: "Catholic" },
  { id: "secular", label: "Non-religious / mindful" },
];

export default function Onboarding() {
  const pack = getPack();
  const kid = useKid();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(kid.kidName);
  const [people, setPeople] = useState<string[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const cur = STEPS[step]!;
  const last = step === STEPS.length - 1;

  const next = () => {
    if (!last) return setStep(step + 1);
    kid.setKidName(name || "friend");
    for (const p of people) kid.addPerson(p);
    kid.setProfile({ goal: goal ?? undefined });
    kid.finishOnboarding();
    router.replace("/parent/paywall");
  };

  const canNext = cur === "name" ? name.trim().length > 0 : cur === "people" ? people.length >= 1 : true;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>
        {step + 1} / {STEPS.length}
      </Text>
      <Text style={styles.title}>{P.onboarding.title}</Text>

      {cur === "name" && (
        <>
          <Text style={styles.q}>{P.onboarding.name}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={P.onboarding.namePlaceholder} maxLength={20} autoFocus />
        </>
      )}
      {cur === "age" && (
        <>
          <Text style={styles.q}>{P.onboarding.age}</Text>
          <Choice options={AGES.map((a) => ({ id: a, label: a }))} value={kid.profile.ageBand} onChange={(v) => kid.setProfile({ ageBand: v as AgeBand })} />
        </>
      )}
      {cur === "tradition" && (
        <>
          <Text style={styles.q}>{P.onboarding.tradition}</Text>
          <Choice options={TRADITIONS} value={kid.profile.tradition} onChange={(v) => kid.setProfile({ tradition: v as Tradition })} />
        </>
      )}
      {cur === "bedtime" && (
        <>
          <Text style={styles.q}>{P.onboarding.bedtime}</Text>
          <Choice options={[18, 19, 20, 21].map((h) => ({ id: String(h), label: `${h > 12 ? h - 12 : h}:00 pm` }))} value={String(kid.profile.bedtimeHour)} onChange={(v) => kid.setProfile({ bedtimeHour: Number(v) })} />
        </>
      )}
      {cur === "people" && (
        <>
          <Text style={styles.q}>{P.onboarding.people}</Text>
          <Choice multi options={pack.people.defaults.map((d) => ({ id: d, label: d }))} value={people} onChange={(v) => setPeople(v as string[])} />
        </>
      )}
      {cur === "goal" && (
        <>
          <Text style={styles.q}>{P.onboarding.goal}</Text>
          <Choice options={P.onboarding.goals.map((g) => ({ id: g, label: g }))} value={goal ?? ""} onChange={(v) => setGoal(v as string)} />
          {goal && <Text style={styles.plan}>{P.onboarding.plan(name || "your child")}</Text>}
        </>
      )}

      <Pressable style={[styles.next, !canNext && styles.disabled]} disabled={!canNext} onPress={next}>
        <Text style={styles.nextText}>{last ? P.onboarding.finish : P.onboarding.next}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Choice<T extends string>({ options, value, onChange, multi }: { options: { id: T; label: string }[]; value: T | T[]; onChange: (v: T | T[]) => void; multi?: boolean }) {
  const selected = (id: T) => (Array.isArray(value) ? value.includes(id) : value === id);
  return (
    <View style={styles.grid}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          style={[styles.opt, selected(o.id) && styles.optOn]}
          onPress={() => {
            if (!multi) return onChange(o.id);
            const arr = value as T[];
            onChange(arr.includes(o.id) ? arr.filter((x) => x !== o.id) : [...arr, o.id]);
          }}
        >
          <Text style={styles.optText}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF3DC" },
  content: { padding: 24, paddingTop: 72, gap: 16 },
  eyebrow: { fontSize: 13, letterSpacing: 1, color: "#8a6a48", fontVariant: ["tabular-nums"] },
  title: { fontSize: 24, fontWeight: "800", color: "#3b2a1a" },
  q: { fontSize: 18, color: "#3b2a1a", marginTop: 8 },
  input: { backgroundColor: "#fff", borderRadius: 14, padding: 14, fontSize: 18, borderWidth: 2, borderColor: "#f1e2c8" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  opt: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#fff", borderWidth: 2, borderColor: "#f1e2c8" },
  optOn: { borderColor: "#FFB84D", backgroundColor: "#fff5e0" },
  optText: { fontSize: 16, color: "#3b2a1a" },
  plan: { fontSize: 16, color: "#6b4a2b", marginTop: 8 },
  next: { marginTop: 16, backgroundColor: "#FFB84D", borderRadius: 24, padding: 18, alignItems: "center" },
  disabled: { opacity: 0.4 },
  nextText: { fontSize: 18, fontWeight: "800", color: "#3b2a1a" },
});
