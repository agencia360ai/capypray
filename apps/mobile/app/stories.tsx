import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { glyph } from "@/ui/icons";
import { T } from "@/ui/theme";
import { useStageInsets } from "@/ui/useStageInsets";

// Story shelf: every parable Capy has told in a lesson stays here to hear again (GDD §9 "Nothing withers").
export default function Stories() {
  const pack = getPack();
  const completed = useKid((s) => s.completed);
  const onBottomLayout = useStageInsets();
  const heard = new Set<string>();
  for (const l of pack.lessons) if (completed[l.id]) for (const b of l.beats) if (b.type === "story") heard.add(b.storyId);
  return (
    <View style={styles.root}>
      <Pressable style={styles.close} onPress={() => router.back()} hitSlop={8}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.spacer} />
      <View onLayout={onBottomLayout} style={styles.sheetWrap}>
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
          <Text style={styles.title}>{pack.ui.storiesTitle}</Text>
          <View style={styles.grid}>
            {pack.stories.map((st) => {
              const open = heard.has(st.id);
              return (
                <Link key={st.id} href={{ pathname: "/story/[id]", params: { id: st.id } }} asChild>
                  <Pressable disabled={!open} style={({ pressed }) => [styles.card, !open && styles.locked, pressed && styles.pressed]}>
                    <Text style={styles.cardGlyph}>{open ? glyph(st.icon) : "🔒"}</Text>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {st.title}
                    </Text>
                    {!open ? <Text style={styles.soon}>{pack.ui.locked}</Text> : null}
                  </Pressable>
                </Link>
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
  card: { width: 104, paddingVertical: 12, paddingHorizontal: 6, borderRadius: T.radius.md, backgroundColor: T.color.paper, borderWidth: 3, borderColor: T.color.tan, borderBottomWidth: 6, alignItems: "center", gap: 4 },
  locked: { opacity: 0.55 },
  pressed: { borderBottomWidth: 3, transform: [{ translateY: 3 }] },
  cardGlyph: { fontSize: 38 },
  cardTitle: { fontFamily: T.font.bold, fontSize: 13, color: T.color.ink, textAlign: "center" },
  soon: { fontFamily: T.font.regular, fontSize: 11, color: T.color.brown },
});
