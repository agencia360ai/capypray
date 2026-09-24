import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { stopSpeaking } from "@/audio/voice";
import { useCapyLine } from "@/games/ui/GameShell";
import { CompanionIcon } from "@/ui/CompanionIcon";
import { glyph } from "@/ui/icons";
import { Pop } from "@/ui/motion";
import { useStageInsets } from "@/ui/useStageInsets";
import { T } from "@/ui/theme";

const TINT: Record<string, string> = { sort: "#E3F1EE", blocks: "#FBEBD8", tiles: "#FFF3CF", memory: "#E8EFDE" };

/** "Play with me": four little puzzles, each on its own level. A break next to prayer; nothing here earns lanterns. */
export default function Games() {
  const games = getPack().companion.games;
  if (!games) return <Redirect href="/" />;
  return <Corner />;
}

function Corner() {
  const pack = getPack(), copy = pack.companion.games!;
  const levels = useKid((s) => s.gameLevels);
  const insets = useSafeAreaInsets();
  const avatar = useAvatar(), { setStage } = useStage();
  const say = useCapyLine();
  const onLayout = useStageInsets(0.12);
  useEffect(() => {
    setStage({ dark: false, night: false });
    avatar.send({ type: "mood", value: "happy" });
    const t = setTimeout(() => say(copy.hello, "wave_hello"), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar]);
  return (
    <View style={s.root}>
      <View style={[s.top, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={pack.companion.ui.back} onPress={() => { stopSpeaking(); router.replace("/"); }} style={s.round} hitSlop={6}>
          <CompanionIcon name="back" size={24} />
        </Pressable>
      </View>
      <View style={s.stage} pointerEvents="none" />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]} onLayout={onLayout}>
        <Text accessibilityRole="header" style={s.title}>{copy.title}</Text>
        <Text style={s.subtitle}>{copy.subtitle}</Text>
        <View style={s.grid}>
          {copy.items.map((g, i) => (
            <Pop key={g.id} delay={80 + i * 70} style={s.cell}>
              <Pressable accessibilityRole="button" testID={`game-${g.id}`} onPress={() => router.push({ pathname: "/games/[id]", params: { id: g.id } })} style={({ pressed }) => [s.card, { backgroundColor: TINT[g.id] }, pressed && s.pressed]}>
                <Text style={s.glyph}>{glyph(g.icon)}</Text>
                <Text style={s.cardTitle}>{g.title}</Text>
                <Text style={s.hint}>{g.hint}</Text>
                <Text style={s.level}>{interpolate(copy.level, { n: String(levels[g.id] ?? 1) })}</Text>
              </Pressable>
            </Pop>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  top: { paddingHorizontal: 18, flexDirection: "row" },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFF9EAEF", alignItems: "center", justifyContent: "center" },
  stage: { flex: 1, minHeight: 150 },
  sheet: { backgroundColor: "#FFFBF2", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 20, paddingHorizontal: 18, gap: 4, ...T.shadow },
  title: { fontFamily: T.font.black, fontSize: 26, color: T.color.ink, textAlign: "center" },
  subtitle: { fontFamily: T.font.regular, fontSize: 13, color: T.color.brown, textAlign: "center", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { width: "47%", flexGrow: 1 },
  card: { borderRadius: 24, padding: 16, gap: 3, minHeight: 150, borderBottomWidth: 4, borderBottomColor: "#00000012" },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  glyph: { fontSize: 36, marginBottom: 4 },
  cardTitle: { fontFamily: T.font.black, fontSize: 17, color: T.color.ink },
  hint: { fontFamily: T.font.regular, fontSize: 12, lineHeight: 16, color: T.color.brown },
  level: { marginTop: "auto", paddingTop: 8, fontFamily: T.font.bold, fontSize: 11, letterSpacing: 0.5, color: "#476D58" },
});
