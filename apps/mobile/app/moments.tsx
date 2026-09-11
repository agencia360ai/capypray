import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { CollectionScreen } from "@/ui/CollectionScreen";
import { CompanionIcon } from "@/ui/CompanionIcon";
import { Reveal } from "@/ui/motion";
import { T } from "@/ui/theme";

export default function Moments() {
  const pack = getPack(), copy = pack.companion.ui;
  return <CollectionScreen title={copy.moments} subtitle={copy.feelingsHint}>
    {pack.companion.moments.map((moment, i) => <Reveal key={moment.id} delay={i * 25}><Pressable onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: moment.lessonId } })} accessibilityRole="button" style={({ pressed }) => [styles.card, { backgroundColor: ["#EDF2E4", "#E9EFF5", "#FAEADA", "#F5E7DC"][i % 4] }, pressed && { opacity: 0.8 }]}>
      <View style={styles.icon}><CompanionIcon name={moment.icon} size={44} /></View><View style={styles.copy}><Text style={styles.title}>{moment.title}</Text><Text style={styles.description}>{moment.description}</Text></View><CompanionIcon name="arrow" size={23} />
    </Pressable></Reveal>)}
  </CollectionScreen>;
}
const styles = StyleSheet.create({ card: { padding: 18, flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 24, minHeight: 110 }, icon: { width: 54, alignItems: "center" }, copy: { flex: 1, gap: 6 }, title: { fontFamily: T.font.bold, fontSize: 18, color: T.color.ink }, description: { fontFamily: T.font.regular, fontSize: 13, lineHeight: 19, color: T.color.brown } });
