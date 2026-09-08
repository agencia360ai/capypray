import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { biomeFor } from "@/store/rewards";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { BigButton, Chip, Sheet, SpeechBubble } from "@/ui/components";
import { Confetti } from "@/ui/Confetti";
import { StageDecor } from "@/ui/StageDecor";
import * as haptics from "@/ui/haptics";
import { glyph } from "@/ui/icons";
import { T } from "@/ui/theme";
import { useStageInsets } from "@/ui/useStageInsets";

const REWARD_ICON: Record<string, string> = { skin: "hat", pond_decoration: "lily", sticker: "star", verse_card: "card", biome: "mountain", badge: "badge" };

// Beacon moment (GDD §4.1 / §9): 7 lanterns became a beacon. Capy celebrates, the pond shows what opened up.
export default function Beacon() {
  const { n, unlocks } = useLocalSearchParams<{ n?: string; unlocks?: string }>();
  const pack = getPack();
  const { kidName, beacons, completed, biomeId } = useKid();
  const avatar = useAvatar();
  const { setStage } = useStage();
  const onBottomLayout = useStageInsets();
  const ids = (unlocks ?? "").split(",").filter(Boolean);
  const rewards = pack.rewards.filter((r) => ids.includes(r.id));
  const count = Number(n ?? beacons) || beacons;

  useEffect(() => {
    void haptics.success();
    setStage({ dark: false, biome: biomeFor(pack, { beacons, completed, biomeId }) }); // a freshly unlocked biome is revealed behind Capy
    avatar.send({ type: "mood", value: "happy" });
    avatar.send({ type: "play", clip: "celebrate", loop: true });
    return () => avatar.send({ type: "idle" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <Confetti trigger={1} count={28} />
      <View style={styles.spacer}>
        <StageDecor />
      </View>
      <View onLayout={onBottomLayout}>
        <SpeechBubble text={interpolate(pack.ui.beaconLine, { kidName: kidName || pack.ui.friend })} />
        <Sheet>
          <View style={styles.head}>
            <Text style={styles.title}>{pack.ui.beaconTitle}</Text>
            <Chip>{Array.from({ length: Math.min(count, 12) }, () => "⭐").join("")}</Chip>
          </View>
          {rewards.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {rewards.map((r) => (
                <View key={r.id} style={styles.card}>
                  <Text style={styles.new}>{pack.ui.newUnlock}</Text>
                  <Text style={styles.icon}>{glyph(r.type === "biome" ? r.biome : REWARD_ICON[r.type])}</Text>
                  <Text style={styles.label} numberOfLines={2}>
                    {r.title}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
          <BigButton label={pack.ui.yay} onPress={() => router.replace("/")} />
        </Sheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontFamily: T.font.black, fontSize: 24, color: T.color.ink, flexShrink: 1 },
  row: { gap: 10, paddingVertical: 4 },
  card: { width: 120, padding: 12, borderRadius: T.radius.md, backgroundColor: T.color.paper, borderWidth: 3, borderColor: T.color.primary, alignItems: "center", gap: 4 },
  new: { fontFamily: T.font.black, fontSize: 11, color: T.color.coral, letterSpacing: 1, textTransform: "uppercase" },
  icon: { fontSize: 40 },
  label: { fontFamily: T.font.bold, fontSize: 14, color: T.color.ink, textAlign: "center" },
});
