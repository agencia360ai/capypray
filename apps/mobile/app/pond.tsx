import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { unlockedRewards } from "@/store/rewards";
import { useAvatar } from "@/avatar/AvatarView";

// Capy's Pond (GDD §9): lanterns → beacons → unlocks. Nothing ever withers.
export default function Pond() {
  const pack = getPack();
  const { lanterns, beacons, completed, people, skinId, setSkin } = useKid();
  const avatar = useAvatar();
  const equip = (id: string) => {
    const next = skinId === id ? undefined : id;
    setSkin(next);
    avatar.send({ type: "skin", id: next });
    avatar.send({ type: "mood", value: "happy" });
    avatar.send({ type: "play", clip: "celebrate", loop: false });
  };
  const unlocked = unlockedRewards(pack, { beacons, completed });
  const inProgress = lanterns % 7;

  return (
    <View style={styles.root}>
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.spacer} />
      <ScrollView contentContainerStyle={styles.sheet}>
        <Text style={styles.title}>{pack.worlds[0]?.title}</Text>
        <View style={styles.row}>
          {Array.from({ length: 7 }, (_, i) => (
            <Text key={i} style={[styles.lantern, i >= inProgress && styles.dim]}>
              🏮
            </Text>
          ))}
        </View>
        <Text style={styles.counter}>{Array.from({ length: beacons }, () => "⭐").join(" ") || "—"}</Text>
        <View style={styles.row}>
          {people.map((p) => (
            <View key={p.id} style={styles.friend}>
              <Text style={styles.friendIcon}>🐦</Text>
              <Text style={styles.friendLabel}>{p.label}</Text>
              <Text style={styles.friendCount}>{p.prayedCount}</Text>
            </View>
          ))}
        </View>
        <View style={styles.row}>
          {pack.rewards.map((r) => (
            <Pressable key={r.id} disabled={!unlocked.has(r.id) || r.type !== "skin"} onPress={() => equip(r.id)} style={[styles.reward, !unlocked.has(r.id) && styles.dim, skinId === r.id && styles.rewardOn]}>
              <Text style={styles.rewardLabel}>
                {r.type === "skin" ? "🎀 " : ""}
                {r.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  close: { position: "absolute", top: 48, right: 20, zIndex: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 26, color: "#6b4a2b", lineHeight: 30 },
  sheet: { padding: 20, gap: 14, backgroundColor: "rgba(255,255,255,0.85)", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  title: { fontSize: 22, fontWeight: "700", color: "#3b2a1a", textAlign: "center" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  lantern: { fontSize: 34 },
  dim: { opacity: 0.25 },
  counter: { fontSize: 22, textAlign: "center" },
  friend: { alignItems: "center", padding: 8, minWidth: 72 },
  friendIcon: { fontSize: 28 },
  friendLabel: { fontSize: 13, color: "#3b2a1a" },
  friendCount: { fontSize: 11, color: "#6b4a2b" },
  reward: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#fff5e0", borderWidth: 2, borderColor: "#FFB84D" },
  rewardOn: { backgroundColor: "#FFB84D" },
  rewardLabel: { color: "#3b2a1a" },
});
