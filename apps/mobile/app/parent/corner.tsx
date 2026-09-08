import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { gate } from "@/parent/gate";
import { P } from "@/parent/strings";
import { cancelBedtimeReminder, scheduleBedtimeReminder } from "@/notifications/bedtime";
import { BackupCard } from "@/parent/BackupCard";

// Parent Corner v1 (GDD §9, §11): bedtime, prayer people + notes, delete data, sandbox premium.
export default function ParentCorner() {
  if (!gate.isOpen()) return <Redirect href="/parent/gate?next=corner" />;
  return <Corner />;
}

function Corner() {
  const pack = getPack();
  const kid = useKid();
  const [name, setName] = useState(kid.kidName);
  const [newPerson, setNewPerson] = useState("");
  const weekly = Object.values(kid.completed).filter((c) => Date.now() - c.at < 7 * 864e5).length;

  useEffect(() => {
    kid.setKidName(name || kid.kidName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const setReminder = async (on: boolean) => {
    const ok = on ? await scheduleBedtimeReminder(pack, kid.profile.bedtimeHour) : (await cancelBedtimeReminder(), false);
    kid.setProfile({ reminder: ok });
  };

  const bedtime = async (delta: number) => {
    const h = Math.min(22, Math.max(17, kid.profile.bedtimeHour + delta));
    kid.setProfile({ bedtimeHour: h });
    if (kid.profile.reminder) await scheduleBedtimeReminder(pack, h);
  };

  const deleteData = () =>
    Alert.alert(P.corner.deleteData, P.corner.deleteConfirm, [
      { text: P.corner.cancel, style: "cancel" },
      {
        text: P.corner.delete,
        style: "destructive",
        onPress: async () => {
          await cancelBedtimeReminder();
          kid.reset();
          gate.close();
          router.replace("/parent/onboarding");
        },
      },
    ]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{P.corner.title}</Text>

      <Text style={styles.h}>{P.corner.child}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={20} />

      <Text style={styles.h}>{P.corner.progress}</Text>
      <Text style={styles.stat}>
        🏮 {kid.lanterns}  ⭐ {kid.beacons}  🔥 {kid.streak.current}  ·  {weekly} sessions
      </Text>

      <Text style={styles.h}>{P.corner.bedtime}</Text>
      <View style={styles.row}>
        <Pressable style={styles.pill} onPress={() => bedtime(-1)}>
          <Text style={styles.pillText}>−</Text>
        </Pressable>
        <Text style={styles.stat}>{kid.profile.bedtimeHour > 12 ? kid.profile.bedtimeHour - 12 : kid.profile.bedtimeHour}:00 pm</Text>
        <Pressable style={styles.pill} onPress={() => bedtime(1)}>
          <Text style={styles.pillText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{P.corner.reminder}</Text>
        <Switch value={kid.profile.reminder} onValueChange={setReminder} trackColor={{ true: "#FFB84D" }} />
      </View>

      <Text style={styles.h}>{P.corner.people}</Text>
      {kid.people.map((p) => (
        <View key={p.id} style={styles.person}>
          <View style={styles.rowBetween}>
            <Text style={styles.personName}>
              {p.label} · {p.prayedCount}×
            </Text>
            <Pressable onPress={() => kid.removePerson(p.id)}>
              <Text style={styles.remove}>{P.corner.remove}</Text>
            </Pressable>
          </View>
          <TextInput style={styles.note} placeholder={P.corner.note} defaultValue={p.note} onEndEditing={(e) => kid.setPersonNote(p.id, e.nativeEvent.text)} maxLength={120} />
        </View>
      ))}
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.grow]} value={newPerson} onChangeText={setNewPerson} placeholder={P.corner.addPerson} maxLength={30} />
        <Pressable
          style={styles.pill}
          onPress={() => {
            if (newPerson.trim()) kid.addPerson(newPerson);
            setNewPerson("");
          }}
        >
          <Text style={styles.pillText}>+</Text>
        </Pressable>
      </View>

      <BackupCard />

      <View style={styles.rowBetween}>
        <Text style={styles.label}>{P.corner.premium}</Text>
        <Switch value={kid.premium} onValueChange={kid.setPremium} trackColor={{ true: "#FFB84D" }} />
      </View>
      <Text style={styles.hint}>{P.corner.premiumHint}</Text>

      <Text style={styles.hint}>{P.corner.privacy}</Text>
      <Pressable style={styles.danger} onPress={deleteData}>
        <Text style={styles.dangerText}>{P.corner.deleteData}</Text>
      </Pressable>

      <Pressable
        style={styles.back}
        onPress={() => {
          gate.close();
          router.replace("/");
        }}
      >
        <Text style={styles.backText}>{P.corner.back}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF3DC" },
  content: { padding: 24, paddingTop: 72, gap: 10, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: "800", color: "#3b2a1a" },
  h: { marginTop: 14, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: "#8a6a48" },
  input: { backgroundColor: "#fff", borderRadius: 14, padding: 12, fontSize: 17, borderWidth: 2, borderColor: "#f1e2c8" },
  grow: { flex: 1 },
  stat: { fontSize: 18, color: "#3b2a1a", fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 16, color: "#3b2a1a", flex: 1 },
  pill: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFB84D", alignItems: "center", justifyContent: "center" },
  pillText: { fontSize: 22, fontWeight: "800", color: "#3b2a1a" },
  person: { backgroundColor: "#fff", borderRadius: 14, padding: 12, gap: 8 },
  personName: { fontSize: 16, fontWeight: "700", color: "#3b2a1a" },
  remove: { color: "#a05050" },
  note: { borderTopWidth: 1, borderColor: "#f1e2c8", paddingTop: 8, fontSize: 14, color: "#3b2a1a" },
  hint: { fontSize: 13, color: "#8a6a48", lineHeight: 18 },
  danger: { marginTop: 16, borderRadius: 18, padding: 16, alignItems: "center", borderWidth: 2, borderColor: "#d9534f" },
  dangerText: { color: "#d9534f", fontWeight: "700", fontSize: 16 },
  back: { marginTop: 8, backgroundColor: "#FFB84D", borderRadius: 24, padding: 18, alignItems: "center" },
  backText: { fontSize: 18, fontWeight: "800", color: "#3b2a1a" },
});
