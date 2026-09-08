import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { biomeFor, unlockedRewards } from "@/store/rewards";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { Chip, LanternMeter } from "@/ui/components";
import * as haptics from "@/ui/haptics";
import { glyph } from "@/ui/icons";
import { T } from "@/ui/theme";
import { useStageInsets } from "@/ui/useStageInsets";

const REWARD_ICON: Record<string, string> = { skin: "hat", pond_decoration: "lily", sticker: "star", verse_card: "card", badge: "badge" };

// Capy's Pond (GDD §9): lanterns → beacons → unlocks. Nothing ever withers. Kids dress Capy and pick the place.
export default function Pond() {
  const pack = getPack();
  const { lanterns, beacons, completed, people, skinId, setSkin, biomeId, setBiome } = useKid();
  const avatar = useAvatar();
  const { setStage } = useStage();
  const onBottomLayout = useStageInsets();
  const unlocked = unlockedRewards(pack, { beacons, completed });
  const friends = pack.people.friends;

  const equip = (id: string) => {
    const next = skinId === id ? undefined : id;
    void haptics.tap();
    setSkin(next);
    avatar.send({ type: "skin", id: next });
    avatar.send({ type: "mood", value: "happy" });
    avatar.send({ type: "play", clip: "celebrate", loop: false });
  };
  const goTo = (id: string) => {
    void haptics.tap();
    setBiome(id);
    setStage({ biome: biomeFor(pack, { beacons, completed, biomeId: id }) });
    avatar.send({ type: "play", clip: "wave_hello", loop: false });
  };

  const skins = pack.rewards.filter((r) => r.type === "skin");
  const biomes = pack.rewards.filter((r) => r.type === "biome");
  const others = pack.rewards.filter((r) => r.type !== "skin" && r.type !== "biome");
  const currentBiome = biomeFor(pack, { beacons, completed, biomeId });

  return (
    <View style={styles.root}>
      <Pressable style={styles.close} onPress={() => router.back()} hitSlop={8}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.spacer} />
      <View onLayout={onBottomLayout} style={styles.sheetWrap}>
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
          <View style={styles.head}>
            <Text style={styles.title}>{pack.worlds[0]?.title}</Text>
            <Chip>⭐ {beacons}</Chip>
          </View>

          <Text style={styles.section}>{pack.ui.lanternsTitle}</Text>
          <View style={styles.center}>
            <LanternMeter lanterns={lanterns} />
          </View>

          {people.length > 0 && (
            <>
              <Text style={styles.section}>{pack.ui.friendsTitle}</Text>
              <View style={styles.row}>
                {people.map((p, i) => (
                  <View key={p.id} style={styles.friend}>
                    <Text style={styles.friendIcon}>{glyph(friends[i % friends.length])}</Text>
                    <Text style={styles.friendLabel} numberOfLines={1}>
                      {p.label}
                    </Text>
                    <Text style={styles.friendCount}>🏮 {p.prayedCount}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={styles.section}>{pack.ui.rewardsTitle}</Text>
          <View style={styles.row}>
            {skins.map((r) => (
              <Tile key={r.id} icon="hat" title={r.title} locked={!unlocked.has(r.id)} on={skinId === r.id} onPress={() => equip(r.id)} hint={r.unlock.beacons} />
            ))}
            {others.map((r) => (
              <Tile key={r.id} icon={REWARD_ICON[r.type] ?? "star"} title={r.title} locked={!unlocked.has(r.id)} hint={r.unlock.beacons} />
            ))}
          </View>

          <Text style={styles.section}>{pack.ui.biomesTitle}</Text>
          <View style={styles.row}>
            <Tile icon="tree" title={pack.worlds[0]?.title ?? ""} on={currentBiome === pack.theme.pond} onPress={() => goTo(pack.theme.pond)} />
            {biomes.map((r) => (
              <Tile key={r.id} icon={r.biome ?? "star"} title={r.title} locked={!unlocked.has(r.id)} on={currentBiome === r.biome} onPress={() => goTo(r.id)} hint={r.unlock.beacons} />
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function Tile({ icon, title, locked, on, onPress, hint }: { icon: string; title: string; locked?: boolean; on?: boolean; onPress?: () => void; hint?: number }) {
  return (
    <Pressable disabled={locked || !onPress} onPress={onPress} style={({ pressed }) => [styles.tile, on && styles.tileOn, locked && styles.tileLocked, pressed && styles.tilePressed]}>
      <Text style={styles.tileIcon}>{locked ? "🔒" : glyph(icon)}</Text>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {title}
      </Text>
      {locked && hint !== undefined ? <Text style={styles.tileHint}>⭐ {hint}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  close: { position: "absolute", top: 52, right: 20, zIndex: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 26, color: T.color.brown, lineHeight: 30 },
  sheetWrap: { maxHeight: "62%" },
  sheet: { backgroundColor: "rgba(255,247,230,0.94)", borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  sheetContent: { padding: 20, paddingBottom: 34, gap: 10 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: T.font.black, fontSize: 24, color: T.color.ink },
  section: { fontFamily: T.font.bold, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: T.color.brown, marginTop: 6 },
  center: { alignItems: "center" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  friend: { alignItems: "center", padding: 8, minWidth: 76, backgroundColor: T.color.paper, borderRadius: T.radius.md },
  friendIcon: { fontSize: 30 },
  friendLabel: { fontFamily: T.font.bold, fontSize: 13, color: T.color.ink, maxWidth: 80 },
  friendCount: { fontFamily: T.font.regular, fontSize: 11, color: T.color.brown },
  tile: { width: 100, paddingVertical: 10, paddingHorizontal: 6, borderRadius: T.radius.md, backgroundColor: T.color.paper, borderWidth: 3, borderColor: T.color.tan, borderBottomWidth: 6, alignItems: "center", gap: 4 },
  tileOn: { borderColor: T.color.primary, backgroundColor: "#FFF5E0" },
  tileLocked: { opacity: 0.55 },
  tilePressed: { borderBottomWidth: 3, transform: [{ translateY: 3 }] },
  tileIcon: { fontSize: 32 },
  tileLabel: { fontFamily: T.font.bold, fontSize: 13, color: T.color.ink, textAlign: "center" },
  tileHint: { fontFamily: T.font.regular, fontSize: 11, color: T.color.brown },
});
