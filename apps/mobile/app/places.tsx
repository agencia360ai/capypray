import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { unlockedScenes } from "@/store/scenes";
import { glyph } from "@/ui/icons";
import { T } from "@/ui/theme";
import { useStageInsets } from "@/ui/useStageInsets";
import { backgroundFor } from "@/ui/backgrounds";

// Places: everywhere Capy has learned to pray. Tap one to go there and say that place's prayer.
export default function Places() {
  const pack = getPack();
  const { beacons, completed } = useKid();
  const onBottomLayout = useStageInsets();
  const open = new Set(unlockedScenes(pack, { beacons, completed }).map((s) => s.id));
  return (
    <View style={styles.root}>
      <Pressable style={styles.close} onPress={() => router.back()} hitSlop={8}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.spacer} />
      <View onLayout={onBottomLayout} style={styles.sheetWrap}>
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
          <Text style={styles.title}>{pack.ui.placesTitle}</Text>
          <View style={styles.grid}>
            {pack.scenes.map((sc) => {
              const ok = open.has(sc.id);
              return (
                <Pressable key={sc.id} accessibilityRole="button" accessibilityState={{ disabled: !ok }} onPress={() => router.push({ pathname: "/place/[id]", params: { id: sc.id } })} disabled={!ok} style={({ pressed }) => [styles.card, !ok && styles.locked, pressed && styles.pressed]}>
                  <ImageBackground source={backgroundFor(sc.background)} style={styles.cardArt} imageStyle={styles.cardArtImage} resizeMode="cover" accessible={false}>
                    <View style={styles.badge}><Text style={styles.cardGlyph}>{ok ? glyph(sc.icon) : "🔒"}</Text></View>
                  </ImageBackground>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {sc.title}
                  </Text>
                  {!ok ? <Text style={styles.soon}>{pack.ui.locked}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  close: { position: "absolute", top: 52, right: 20, zIndex: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 26, color: T.color.brown, lineHeight: 30 },
  sheetWrap: { maxHeight: "62%" },
  sheet: { backgroundColor: "rgba(255,247,230,0.94)", borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  sheetContent: { padding: 20, paddingBottom: 34, gap: 14 },
  title: { fontFamily: T.font.black, fontSize: 24, color: T.color.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  card: { width: "46%", flexGrow: 1, paddingBottom: 12, overflow: "hidden", borderRadius: T.radius.md, backgroundColor: T.color.paper, borderWidth: 2, borderColor: T.color.tan, borderBottomWidth: 5, alignItems: "center", gap: 8 },
  cardArt: { width: "100%", height: 96, overflow: "hidden", alignItems: "flex-end", justifyContent: "flex-end", padding: 8 },
  cardArtImage: { height: "180%" },
  badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFFBF2E8", alignItems: "center", justifyContent: "center" },
  locked: { opacity: 0.65 },
  pressed: { borderBottomWidth: 3, transform: [{ translateY: 3 }] },
  cardGlyph: { fontSize: 19 },
  cardTitle: { fontFamily: T.font.bold, fontSize: 13, color: T.color.ink, textAlign: "center" },
  soon: { fontFamily: T.font.regular, fontSize: 11, color: T.color.brown },
});
