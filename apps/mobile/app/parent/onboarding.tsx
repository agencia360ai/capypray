import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid, type AgeBand, type Tradition } from "@/store/kid";
import { useAvatar, useAvatarReady, useStage } from "@/avatar/AvatarView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SpeechBubble } from "@/ui/components";
import { speakCapMs } from "@/engine/lessonRunner";
import * as haptics from "@/ui/haptics";
import { T } from "@/ui/theme";
import { P } from "@/parent/strings";

// GDD §10.3: 5 questions (< 90 s) → personalised plan → paywall → handoff to the kid.
// Capy is on stage the whole time (the AvatarProvider stage sits behind this screen): he asks each question out loud
// (voice + talk loop + a gesture), the options appear once he has finished, he reacts to every answer, and each answer
// immediately shows what it buys ("Capy will be ready at 7 pm"). Capy never moves: the camera gets one fixed viewport
// for the whole flow, so the card growing or the keyboard opening never re-frames him. The card scrolls its content
// (tall on the plan step) with the Back/Continue row pinned below it, so the button is always reachable.
// v1 runs on first launch (the parent installs the app). Gate is skipped here because no kid profile exists yet.
const STEPS = ["name", "age", "tradition", "bedtime", "people", "goal", "plan"] as const;
type StepId = (typeof STEPS)[number];
const AGES: AgeBand[] = ["4-8", "9-11"];
const TRADITIONS: { id: Tradition; label: string }[] = [
  { id: "christian", label: "Christian" },
  { id: "catholic-addon", label: "Catholic" },
  { id: "secular", label: "Non-religious / mindful" },
];
const HOURS = [18, 19, 20, 21];
/** Share of the screen taken by the bubble + card block (fixed, so Capy is framed once and stays put).
 *  With the compact bubble this fits the 9 prayer-people pills + payoff + Back/Next without scrolling on a ~800 px phone. */
const BOTTOM = 0.6;
const hourLabel = (h: number) => `${h > 12 ? h - 12 : h}:00 pm`;

export default function Onboarding() {
  const pack = getPack();
  const kid = useKid();
  const avatar = useAvatar();
  const { setStage } = useStage();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(kid.kidName);
  const [people, setPeople] = useState<string[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const [spoken, setSpoken] = useState(false);
  const cur: StepId = STEPS[step]!;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomHeight = Math.round(height * BOTTOM);
  const avatarReady = useAvatarReady();
  // the title + progress bar, measured once: Capy is framed *below* them, never behind them
  const [topInset, setTopInset] = useState<number | null>(null);
  const displayName = name.trim() || P.onboarding.yourChild;

  useEffect(() => {
    setStage({ dark: false, night: false, biome: "meadow" });
    avatar.send({ type: "mood", value: "calm" });
    avatar.send({ type: "idle" });
    return () => avatar.send({ type: "viewport", top: 0.12, bottom: 0.45 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar]);
  // one fixed frame for the whole onboarding: below the measured header, above the BOTTOM block. Sent once the
  // header is measured and never again, so nothing that happens in the card re-frames Capy.
  useEffect(() => {
    if (topInset == null) return;
    avatar.send({ type: "viewport", top: topInset, bottom: BOTTOM + 0.01, align: "bottom" });
  }, [topInset, avatar]);

  const question: Record<StepId, string> = {
    name: P.onboarding.name,
    age: P.onboarding.age,
    tradition: P.onboarding.tradition,
    bedtime: P.onboarding.bedtime,
    people: P.onboarding.people,
    goal: P.onboarding.goal,
    plan: P.onboarding.planBubble,
  };
  // Capy says each question himself: talk loop for as long as the voice runs (the bubble sends idle when it ends),
  // led by a gesture that fits the step — a wave for the name, a yawn at bedtime, paws on heart for the people.
  const AUDIO_LINE: Record<StepId, string> = { name: "ob_name.mp3", age: "ob_age.mp3", tradition: "ob_tradition.mp3", bedtime: "ob_bedtime.mp3", people: "ob_people.mp3", goal: "ob_goal.mp3", plan: "ob_plan.mp3" };
  const LEAD: Record<StepId, string> = { name: "wave_hello", age: "think", tradition: "listen_nod", bedtime: "yawn", people: "heart", goal: "think", plan: "celebrate" };
  useEffect(() => {
    setSpoken(false);
    avatar.send({ type: "mood", value: cur === "bedtime" ? "sleepy" : cur === "people" || cur === "plan" ? "happy" : "calm" });
    avatar.send({ type: "speak", durationMs: speakCapMs(question[cur]), clip: LEAD[cur] });
    // never leave the parent waiting on a stuck voice: options show after 3.5 s regardless
    const t = setTimeout(() => setSpoken(true), 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, avatar]);

  const cheer = () => {
    void haptics.tap();
    avatar.send({ type: "mood", value: "happy" });
    avatar.send({ type: "play", clip: "heart" });
  };

  const next = () => {
    void haptics.tap();
    if (cur !== "plan") return setStep(step + 1);
    kid.setKidName(name || "friend");
    for (const p of people) kid.addPerson(p);
    kid.setProfile({ goal: goal ?? undefined });
    kid.finishOnboarding();
    router.replace("/parent/paywall");
  };
  const back = () => step > 0 && setStep(step - 1);

  const canNext = cur === "name" ? name.trim().length > 0 : cur === "people" ? people.length >= 1 : cur === "goal" ? !!goal : true;
  const payoff: Partial<Record<StepId, string | null>> = {
    name: name.trim() ? P.onboarding.payoff.name(displayName) : null,
    age: P.onboarding.payoff.age(kid.profile.ageBand),
    tradition: P.onboarding.payoff.tradition(TRADITIONS.find((t) => t.id === kid.profile.tradition)?.label ?? ""),
    bedtime: P.onboarding.payoff.bedtime(hourLabel(kid.profile.bedtimeHour)),
    people: people.length ? P.onboarding.payoff.people(people) : null,
    goal: goal ? P.onboarding.payoff.goal(goal) : null,
  };
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.top} onLayout={(e) => setTopInset(Math.min(0.3, (e.nativeEvent.layout.y + e.nativeEvent.layout.height) / height + 0.015))}>
        <Text style={styles.eyebrow}>{P.onboarding.title}</Text>
        <Progress value={(step + 1) / STEPS.length} />
      </View>

      <View style={styles.stage} pointerEvents="none">
        {!avatarReady && <LoadingCapy />}
      </View>

      {/* bubble + card: fixed-height block, Capy lives in the band above it */}
      <View style={{ height: bottomHeight }}>
        <SpeechBubble key={cur} text={question[cur]} audio={AUDIO_LINE[cur]} badge={cur === "plan" ? "star" : "question"} compact onSpoken={() => setSpoken(true)} />
        <View style={styles.card}>
          {spoken && (
          <>
          <ScrollView key={cur} style={styles.cardScroll} contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
            {cur === "name" && (
              <Pop delay={0}>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={P.onboarding.namePlaceholder} placeholderTextColor="#B59E82" maxLength={20} returnKeyType="done" onSubmitEditing={() => canNext && next()} />
              </Pop>
            )}
            {cur === "age" && (
              <Choice
                options={AGES.map((a) => ({ id: a, label: P.onboarding.ages[a] ?? a }))}
                value={kid.profile.ageBand}
                onChange={(v) => {
                  kid.setProfile({ ageBand: v as AgeBand });
                  cheer();
                }}
              />
            )}
            {cur === "tradition" && (
              <Choice
                options={TRADITIONS}
                value={kid.profile.tradition}
                onChange={(v) => {
                  kid.setProfile({ tradition: v as Tradition });
                  cheer();
                }}
              />
            )}
            {cur === "bedtime" && (
              <Choice
                options={HOURS.map((h) => ({ id: String(h), label: hourLabel(h), icon: "🌙" }))}
                value={String(kid.profile.bedtimeHour)}
                onChange={(v) => {
                  kid.setProfile({ bedtimeHour: Number(v) });
                  avatar.send({ type: "play", clip: "yawn" });
                  void haptics.tap();
                }}
              />
            )}
            {cur === "people" && (
              <Choice
                multi
                options={pack.people.defaults.map((d) => ({ id: d, label: d }))}
                value={people}
                onChange={(v) => {
                  setPeople(v as string[]);
                  if ((v as string[]).length > people.length) cheer();
                }}
              />
            )}
            {cur === "goal" && (
              <Choice
                options={P.onboarding.goals.map((g) => ({ id: g, label: g }))}
                value={goal ?? ""}
                onChange={(v) => {
                  setGoal(v as string);
                  cheer();
                }}
              />
            )}
            {cur === "plan" && <PlanCard name={displayName} bedtime={hourLabel(kid.profile.bedtimeHour)} people={people} tradition={kid.profile.tradition} traditionLabel={TRADITIONS.find((t) => t.id === kid.profile.tradition)?.label ?? ""} />}

            {cur !== "plan" && <Payoff text={payoff[cur] ?? null} />}
          </ScrollView>

          {/* pinned below the scroll: the Continue button is never clipped, whatever the phone height */}
          {/* paddingBottom follows the system bar so Next never hides under Android's navigation */}
          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {step > 0 && cur !== "plan" ? (
              <Pressable onPress={back} style={styles.back} hitSlop={8}>
                <Text style={styles.backText}>{P.onboarding.back}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable style={({ pressed }) => [styles.next, !canNext && styles.disabled, pressed && canNext && styles.nextPressed]} disabled={!canNext} onPress={next}>
              <Text style={styles.nextText}>{cur === "plan" ? P.onboarding.finish : P.onboarding.next}</Text>
            </Pressable>
          </View>
          </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Filling bar instead of "3 / 7": progress you can feel. */
function Progress({ value }: { value: number }) {
  const v = useRef(new Animated.Value(value)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: value, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [value, v]);
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { transform: [{ scaleX: v }] }]} />
    </View>
  );
}

/** Where Capy will stand while the model parses on first launch: a soft breathing glow, not an empty meadow. */
function LoadingCapy() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={styles.loading}>
      <Animated.View style={[styles.loadingGlow, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.05] }) }] }]} />
    </View>
  );
}

/** pop · pop · pop: scale in from nothing with a bouncy spring, staggered by `delay`. */
function Pop({ children, delay }: { children: ReactNode; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, delay, useNativeDriver: true, friction: 4, tension: 140 }).start();
  }, [v, delay]);
  return <Animated.View style={{ opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }), transform: [{ scale: v }] }}>{children}</Animated.View>;
}

/** What the answer just bought ("Capy will be ready every night at 7 pm"). Pops in when it has something to say. */
function Payoff({ text }: { text: string | null }) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (text) {
      setShown(text);
      v.setValue(0.6);
      Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
    } else {
      Animated.timing(v, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShown(null));
    }
  }, [text, v]);
  if (!shown) return <View style={styles.payoffSpacer} />;
  return (
    <Animated.View style={[styles.payoff, { opacity: v, transform: [{ scale: v }] }]}>
      <Text style={styles.payoffIcon}>✨</Text>
      <Text style={styles.payoffText} numberOfLines={2}>
        {shown}
      </Text>
    </Animated.View>
  );
}

/** The personalised plan (GDD §10.3 "Capy's 4-week plan for Mia") as a screen of its own, not a line of text. */
function PlanCard({ name, bedtime, people, tradition, traditionLabel }: { name: string; bedtime: string; people: string[]; tradition: Tradition; traditionLabel: string }) {
  const pack = getPack();
  const skills = pack.skills.filter((s) => s.id !== "review").slice(0, 6);
  return (
    <View style={styles.plan}>
      <Text style={styles.planTitle}>{P.onboarding.planTitle(name)}</Text>
      <PlanRow icon="🌙" text={P.onboarding.planRows.bedtime(bedtime)} />
      <PlanRow icon="💛" text={P.onboarding.planRows.people(people)} />
      <PlanRow icon={tradition === "secular" ? "🌿" : "✝️"} text={P.onboarding.planRows.tradition(traditionLabel)} />
      <View style={styles.skills}>
        {skills.map((s, i) => (
          <SkillPill key={s.id} label={s.title} delay={i * 80} />
        ))}
      </View>
    </View>
  );
}

function PlanRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.planRow}>
      <Text style={styles.planIcon}>{icon}</Text>
      <Text style={styles.planText}>{text}</Text>
    </View>
  );
}

function SkillPill({ label, delay }: { label: string; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, delay, useNativeDriver: true, friction: 5, tension: 100 }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[styles.skill, { opacity: v, transform: [{ scale: v }] }]}>
      <Text style={styles.skillText}>{label}</Text>
    </Animated.View>
  );
}

function Choice<Id extends string>({ options, value, onChange, multi }: { options: { id: Id; label: string; icon?: string }[]; value: Id | Id[]; onChange: (v: Id | Id[]) => void; multi?: boolean }) {
  const selected = (id: Id) => (Array.isArray(value) ? value.includes(id) : value === id);
  return (
    <View style={styles.grid}>
      {options.map((o, i) => (
        <Pop key={o.id} delay={i * 90}>
          <Pill
            label={o.icon ? `${o.icon} ${o.label}` : o.label}
            selected={selected(o.id)}
            onPress={() => {
              if (!multi) return onChange(o.id);
              const arr = value as Id[];
              onChange(arr.includes(o.id) ? arr.filter((x) => x !== o.id) : [...arr, o.id]);
            }}
          />
        </Pop>
      ))}
    </View>
  );
}

/** Option pill: squashes on press, bounces when it becomes selected. */
function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const was = useRef(selected);
  useEffect(() => {
    if (selected && !was.current) {
      scale.setValue(0.9);
      Animated.spring(scale, { toValue: 1.05, useNativeDriver: true, friction: 4, tension: 180 }).start();
    } else if (!selected && was.current) Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
    was.current = selected;
  }, [selected, scale]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, friction: 5, tension: 220 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: selected ? 1.05 : 1, useNativeDriver: true, friction: 5, tension: 220 }).start()}
        onPress={onPress}
        style={[styles.opt, selected && styles.optOn]}
      >
        <Text style={[styles.optText, selected && styles.optTextOn]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { paddingTop: 40, paddingHorizontal: 20, gap: 5 },
  eyebrow: { fontFamily: T.font.bold, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: T.color.brown },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.7)", overflow: "hidden" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, right: 0, backgroundColor: T.color.primary, transformOrigin: "left" },
  stage: { flex: 1 },
  card: { flex: 1, marginTop: 10, backgroundColor: "rgba(255,247,230,0.96)", borderTopLeftRadius: 32, borderTopRightRadius: 32, ...T.shadow },
  loading: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 24 },
  loadingGlow: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#FFD27A" },
  cardScroll: { flex: 1 },
  cardContent: { padding: 16, paddingBottom: 6, gap: 10 },
  input: { backgroundColor: T.color.paper, borderRadius: 16, padding: 16, fontSize: 20, fontFamily: T.font.bold, color: T.color.ink, borderWidth: 3, borderColor: T.color.tan, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  opt: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: T.color.paper, borderWidth: 3, borderColor: T.color.tan, borderBottomWidth: 5 },
  optOn: { borderColor: T.color.primary, backgroundColor: "#FFF5E0" },
  optText: { fontSize: 14, fontFamily: T.font.bold, color: T.color.ink },
  optTextOn: { color: T.color.ink },
  payoff: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFF1D6", borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  payoffSpacer: { height: 40 },
  payoffIcon: { fontSize: 15 },
  payoffText: { flexShrink: 1, fontFamily: T.font.regular, fontSize: 13, color: T.color.brown, lineHeight: 17, textAlign: "center" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6 },
  back: { padding: 12 },
  backText: { fontFamily: T.font.bold, color: T.color.brown, fontSize: 16 },
  next: { backgroundColor: T.color.primary, borderRadius: 24, paddingVertical: 13, paddingHorizontal: 26, alignItems: "center", borderBottomWidth: 5, borderBottomColor: T.color.primaryDark, minWidth: 140 },
  nextPressed: { borderBottomWidth: 2, transform: [{ translateY: 4 }] },
  disabled: { opacity: 0.4 },
  nextText: { fontSize: 18, fontFamily: T.font.black, color: T.color.ink },
  // plan card is the tallest step: sized to fit a 740 dp phone above the pinned "Meet Capy" without scrolling
  plan: { gap: 6 },
  planTitle: { fontFamily: T.font.black, fontSize: 18, color: T.color.ink, marginBottom: 2, textAlign: "center" },
  planRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planIcon: { fontSize: 17, width: 24, textAlign: "center" },
  planText: { flex: 1, fontFamily: T.font.regular, fontSize: 14, color: T.color.brown, lineHeight: 18 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2, justifyContent: "center" },
  skill: { backgroundColor: T.color.paper, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 2, borderColor: T.color.tan },
  skillText: { fontFamily: T.font.bold, fontSize: 12, color: T.color.ink },
});
