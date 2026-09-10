import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { useStageInsets } from "@/ui/useStageInsets";
import { SpeechBubble } from "@/ui/components";
import { speakCapMs } from "@/engine/lessonRunner";
import * as haptics from "@/ui/haptics";
import { T } from "@/ui/theme";
import { P } from "@/parent/strings";

// Paywall placeholder — purchases arrive with the RevenueCat Paywall template (src/entitlements/revenuecat.md); this
// screen is the header/footer that template will wrap. Reached only after onboarding or the parental gate; the kid
// never sees a purchase nudge (GDD §9 anti-patterns).
//
// Shape (see docs/playtest-feedback-2026-09-10.md §2): the "aha" first — Capy, by name, with the plan the parent just
// built — then a trial timeline that says exactly when we remind and when we charge, then the price. Billing trust is
// the #1 complaint of the whole faith-app vertical (Hallow, Moshi), so "cancel in 1 tap" is copy on the button, not
// small print. The escape hatch is the honest freemium of the GDD: bedtime prayer stays free forever.
export default function Paywall() {
  const pack = getPack();
  const kid = useKid();
  const avatar = useAvatar();
  const { setStage } = useStage();
  const setPremium = useKid((s) => s.setPremium);
  const [plan, setPlan] = useState<"annual" | "monthly">("annual");
  const onBottomLayout = useStageInsets(0.04);
  const name = kid.kidName || P.onboarding.yourChild;
  const hour = kid.profile.bedtimeHour;
  const bedtime = `${hour > 12 ? hour - 12 : hour}:00 pm`;
  const done = () => router.replace("/");

  useEffect(() => {
    setStage({ dark: false, night: false });
    avatar.send({ type: "mood", value: "happy" });
    avatar.send({ type: "speak", durationMs: speakCapMs(P.paywall.capyLine), clip: "wave_hello" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar]);

  const pick = (p: typeof plan) => {
    setPlan(p);
    void haptics.tap();
  };

  return (
    <View style={styles.root}>
      <View style={styles.stage} pointerEvents="none" />
      <View onLayout={onBottomLayout} style={styles.bottom}>
        <SpeechBubble text={P.paywall.capyLine} audio="pw_hello.mp3" badge="heart" />
        <ScrollView style={styles.card} contentContainerStyle={styles.cardContent} bounces={false}>
          <Text style={styles.title}>{P.paywall.title(name)}</Text>

          {/* what the parent just built, so the price lands on something concrete */}
          <View style={styles.recap}>
            <RecapRow icon="🌙" text={P.paywall.recap.bedtime(bedtime)} />
            <RecapRow icon="💛" text={P.paywall.recap.people(kid.people.map((p) => p.label))} />
            <RecapRow icon="🗺️" text={P.paywall.recap.weeks(pack.worlds.reduce((n, w) => n + w.weeks.length, 0))} />
            <RecapRow icon="📬" text={P.paywall.recap.report} />
          </View>

          <Timeline />

          <View style={styles.plans}>
            <PlanOption selected={plan === "annual"} onPress={() => pick("annual")} title={P.paywall.annualTitle} price={P.paywall.annualPrice} note={P.paywall.annualNote} badge={P.paywall.bestValue} />
            <PlanOption selected={plan === "monthly"} onPress={() => pick("monthly")} title={P.paywall.monthlyTitle} price={P.paywall.monthlyPrice} note={P.paywall.monthlyNote} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={() => {
              void haptics.success();
              setPremium(true);
              done();
            }}
          >
            <Text style={styles.ctaText}>{P.paywall.cta}</Text>
            <Text style={styles.ctaSub}>{plan === "annual" ? P.paywall.ctaSubAnnual : P.paywall.ctaSubMonthly}</Text>
          </Pressable>

          <Text style={styles.trust}>{P.paywall.trust}</Text>

          <View style={styles.footer}>
            <Pressable onPress={done} style={styles.later} hitSlop={6}>
              <Text style={styles.laterText}>{P.paywall.later}</Text>
            </Pressable>
            <Pressable style={styles.restore} hitSlop={6}>
              <Text style={styles.restoreText}>{P.paywall.restore}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function RecapRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.recapRow}>
      <Text style={styles.recapIcon}>{icon}</Text>
      <Text style={styles.recapText}>{text}</Text>
    </View>
  );
}

/** Blinkist-style trial timeline: today / day 5 reminder / day 7 charge. Draws itself in as it appears. */
function Timeline() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 900, delay: 250, useNativeDriver: true }).start();
  }, [v]);
  const steps = P.paywall.timeline;
  return (
    <View style={styles.timeline}>
      <View style={styles.rail}>
        <Animated.View style={[styles.railFill, { transform: [{ scaleY: v }] }]} />
      </View>
      {steps.map((s, i) => (
        <Animated.View key={s.title} style={[styles.tlRow, { opacity: v.interpolate({ inputRange: [i / steps.length, Math.min(1, (i + 0.6) / steps.length)], outputRange: [0.25, 1], extrapolate: "clamp" }) }]}>
          <View style={[styles.dot, i === 0 && styles.dotNow]}>
            <Text style={styles.dotText}>{s.icon}</Text>
          </View>
          <View style={styles.tlText}>
            <Text style={styles.tlTitle}>{s.title}</Text>
            <Text style={styles.tlBody}>{s.body}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function PlanOption({ selected, onPress, title, price, note, badge }: { selected: boolean; onPress: () => void; title: string; price: string; note: string; badge?: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.plan, selected && styles.planOn]} accessibilityRole="radio" accessibilityState={{ selected }}>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.planText}>
        <View style={styles.planHead}>
          <Text style={styles.planTitle}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.planNote}>{note}</Text>
      </View>
      <Text style={styles.planPrice}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stage: { height: 190 },
  bottom: { flex: 1 },
  card: { flex: 1, marginTop: 10, backgroundColor: "rgba(255,247,230,0.97)", borderTopLeftRadius: 32, borderTopRightRadius: 32, ...T.shadow },
  cardContent: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { fontFamily: T.font.black, fontSize: 24, color: T.color.ink, lineHeight: 30 },
  recap: { gap: 8, backgroundColor: T.color.paper, borderRadius: T.radius.md, padding: 14, borderWidth: 2, borderColor: T.color.tan },
  recapRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  recapIcon: { fontSize: 18, width: 26, textAlign: "center" },
  recapText: { flex: 1, fontFamily: T.font.regular, fontSize: 15, color: T.color.brown, lineHeight: 20 },
  timeline: { gap: 12, paddingLeft: 4 },
  rail: { position: "absolute", left: 21, top: 18, bottom: 18, width: 4, borderRadius: 2, backgroundColor: T.color.tan, overflow: "hidden" },
  railFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: T.color.primary, transformOrigin: "top" },
  tlRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.color.paper, borderWidth: 3, borderColor: T.color.tan, alignItems: "center", justifyContent: "center" },
  dotNow: { borderColor: T.color.primary, backgroundColor: "#FFF5E0" },
  dotText: { fontSize: 16 },
  tlText: { flex: 1 },
  tlTitle: { fontFamily: T.font.black, fontSize: 15, color: T.color.ink },
  tlBody: { fontFamily: T.font.regular, fontSize: 14, color: T.color.brown, lineHeight: 19 },
  plans: { gap: 10 },
  plan: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: T.radius.md, backgroundColor: T.color.paper, borderWidth: 3, borderColor: T.color.tan },
  planOn: { borderColor: T.color.primary, backgroundColor: "#FFF5E0" },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: T.color.tan, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: T.color.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: T.color.primary },
  planText: { flex: 1, gap: 2 },
  planHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  planTitle: { fontFamily: T.font.black, fontSize: 17, color: T.color.ink },
  planNote: { fontFamily: T.font.regular, fontSize: 13, color: T.color.brown },
  planPrice: { fontFamily: T.font.black, fontSize: 17, color: T.color.ink, fontVariant: ["tabular-nums"] },
  badge: { backgroundColor: T.color.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: T.font.black, fontSize: 11, color: T.color.ink, letterSpacing: 0.5 },
  cta: { backgroundColor: T.color.primary, borderRadius: 24, paddingVertical: 16, alignItems: "center", borderBottomWidth: 6, borderBottomColor: T.color.primaryDark, gap: 2 },
  ctaPressed: { borderBottomWidth: 2, transform: [{ translateY: 4 }] },
  ctaText: { fontSize: 19, fontFamily: T.font.black, color: T.color.ink },
  ctaSub: { fontSize: 13, fontFamily: T.font.regular, color: T.color.brown },
  trust: { fontFamily: T.font.regular, fontSize: 13, color: T.color.brown, textAlign: "center", lineHeight: 19 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  later: { padding: 10 },
  laterText: { fontFamily: T.font.bold, color: T.color.brown, fontSize: 15, textDecorationLine: "underline" },
  restore: { padding: 10 },
  restoreText: { fontFamily: T.font.regular, color: T.color.brown, fontSize: 13, textDecorationLine: "underline" },
});
