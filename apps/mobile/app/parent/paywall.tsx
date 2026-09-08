import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useKid } from "@/store/kid";
import { P } from "@/parent/strings";

// Paywall placeholder. The real one is the RevenueCat Paywall template (src/entitlements/revenuecat.md).
// Reached only after onboarding or the parental gate; the kid never sees a purchase nudge (GDD §9 anti-patterns).
export default function Paywall() {
  const setPremium = useKid((s) => s.setPremium);
  const done = () => router.replace("/");
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{P.paywall.title}</Text>
      <Text style={styles.body}>{P.paywall.body}</Text>
      <View style={styles.plan}>
        <Text style={styles.planText}>{P.paywall.annual}</Text>
        <Text style={styles.trial}>{P.paywall.trial}</Text>
      </View>
      <View style={styles.planAlt}>
        <Text style={styles.planText}>{P.paywall.monthly}</Text>
      </View>
      <Pressable
        style={styles.cta}
        onPress={() => {
          setPremium(true);
          done();
        }}
      >
        <Text style={styles.ctaText}>{P.paywall.sandbox}</Text>
      </Pressable>
      <Pressable onPress={done} style={styles.later}>
        <Text style={styles.laterText}>{P.paywall.later}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF3DC", padding: 24, paddingTop: 80, gap: 14 },
  title: { fontSize: 26, fontWeight: "800", color: "#3b2a1a" },
  body: { fontSize: 16, color: "#6b4a2b", lineHeight: 22 },
  plan: { marginTop: 8, padding: 18, borderRadius: 18, backgroundColor: "#fff5e0", borderWidth: 3, borderColor: "#FFB84D", gap: 4 },
  planAlt: { padding: 18, borderRadius: 18, backgroundColor: "#fff", borderWidth: 2, borderColor: "#f1e2c8" },
  planText: { fontSize: 18, fontWeight: "700", color: "#3b2a1a" },
  trial: { color: "#6b4a2b" },
  cta: { marginTop: 8, backgroundColor: "#FFB84D", borderRadius: 24, padding: 18, alignItems: "center" },
  ctaText: { fontSize: 18, fontWeight: "800", color: "#3b2a1a" },
  later: { alignItems: "center", padding: 12 },
  laterText: { color: "#6b4a2b", fontSize: 16 },
});
