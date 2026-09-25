import { useCallback, useRef, useState } from "react";
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { gate } from "@/parent/gate";
import { P } from "@/parent/strings";
import Constants from "expo-constants";

import { cancelBedtimeReminder, scheduleBedtimeReminder } from "@/notifications/bedtime";
import { BackupCard } from "@/parent/BackupCard";
import { formatHour } from "@/i18n";

import { PURCHASES_SANDBOX, restorePurchases, subscriptionStatus, subscriptionManagementURL } from "@/entitlements/purchase";
import { legalURLs } from "@/parent/legal";

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

  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [plan, setPlan] = useState<"loading" | "premium" | "free" | "preview" | "unknown">("loading");
  const parentReady = () => {
    if (gate.isOpen()) return true;
    router.replace("/parent/gate?next=corner");
    return false;
  };
  const refreshPlan = useCallback(async () => {
    if (!gate.isOpen()) { router.replace("/parent/gate?next=corner"); return; }
    setPlan("loading");
    try { setPlan(await subscriptionStatus()); } catch { setPlan("unknown"); }
  }, []);
  useFocusEffect(useCallback(() => {
    void refreshPlan();
    const sub = AppState.addEventListener("change", state => { if (state === "active") void refreshPlan(); });
    return () => sub.remove();
  }, [refreshPlan]));
  const run = async (action: () => Promise<void>, error = P.paywall.errorBody as string) => {
    if (!parentReady() || locked.current) return;
    locked.current = true;
    setBusy(true);
    try { await action(); } catch { Alert.alert(P.paywall.errorTitle, error); }
    finally { locked.current = false; setBusy(false); }
  };
  const openLink = (url: string) => run(async () => { await Linking.openURL(url); });
  const reminderHelp = () => Alert.alert(P.corner.reminder, P.corner.reminderUnavailable, [
    { text: P.corner.cancel, style: "cancel" },
    { text: P.corner.settings, onPress: () => { void run(() => Linking.openSettings()); } },
  ]);
  const setReminder = (on: boolean) => run(async () => {
    if (!on) { await cancelBedtimeReminder(); kid.setProfile({ reminder: false }); return; }
    const ok = await scheduleBedtimeReminder(pack, kid.profile.bedtimeHour);
    kid.setProfile({ reminder: ok });
    if (!ok) reminderHelp();
  }, P.corner.reminderError);
  const bedtime = (delta: number) => run(async () => {
    const h = Math.min(22, Math.max(17, kid.profile.bedtimeHour + delta));
    if (kid.profile.reminder && !await scheduleBedtimeReminder(pack, h)) {
      kid.setProfile({ reminder: false }); reminderHelp(); return;
    }
    kid.setProfile({ bedtimeHour: h });
  }, P.corner.reminderError);
  const restore = () => run(async () => {
    const active = await restorePurchases();
    setPlan(PURCHASES_SANDBOX ? "preview" : active ? "premium" : "free");
    Alert.alert(P.paywall.restore, active ? P.corner.restoreSuccess : P.paywall.restoreEmpty);
  });

  const deleteData = () =>
    Alert.alert(P.corner.deleteData, P.corner.deleteConfirm, [
      { text: P.corner.cancel, style: "cancel" },
      {
        text: P.corner.delete,
        style: "destructive",
        onPress: () => run(async () => {
          await cancelBedtimeReminder();
          kid.reset();
          gate.close();
          router.replace("/parent/onboarding");
        }, P.corner.deleteError),
      },
    ]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{P.corner.title}</Text>

      <Text style={styles.h}>{P.corner.child}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} accessibilityLabel={P.corner.child} onEndEditing={() => { if (parentReady()) { const value = name.trim() || kid.kidName; kid.setKidName(value); setName(value); } }} maxLength={20} />

      <Text style={styles.h}>{P.corner.progress}</Text>
      <Text style={styles.stat}>
        🏮 {kid.lanterns}  ⭐ {kid.beacons}  🔥 {kid.streak.current}  ·  {P.corner.sessions(weekly)}
      </Text>

      <Text style={styles.h}>{P.corner.bedtime}</Text>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={P.corner.earlier} disabled={busy || kid.profile.bedtimeHour <= 17} style={styles.pill} onPress={() => void bedtime(-1)}>
          <Text style={styles.pillText}>−</Text>
        </Pressable>
        <Text style={styles.stat}>{formatHour(kid.profile.bedtimeHour, pack.locale)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={P.corner.later} disabled={busy || kid.profile.bedtimeHour >= 22} style={styles.pill} onPress={() => void bedtime(1)}>
          <Text style={styles.pillText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{P.corner.reminder}</Text>
        <Switch disabled={busy} accessibilityLabel={P.corner.reminder} value={kid.profile.reminder} onValueChange={setReminder} trackColor={{ true: "#FFB84D" }} />
      </View>

      <Text style={styles.h}>{P.corner.people}</Text>
      {kid.people.map((p) => (
        <View key={p.id} style={styles.person}>
          <View style={styles.rowBetween}>
            <Text style={styles.personName}>
              {p.label} · {p.prayedCount}×
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`${P.corner.remove} ${p.label}`} style={{ minHeight: 44, justifyContent: "center" }} onPress={() => { if (parentReady()) kid.removePerson(p.id); }}>
              <Text style={styles.remove}>{P.corner.remove}</Text>
            </Pressable>
          </View>
          <TextInput style={styles.note} placeholder={P.corner.note} defaultValue={p.note} accessibilityLabel={`${P.corner.note}: ${p.label}`} onEndEditing={(e) => { if (parentReady()) kid.setPersonNote(p.id, e.nativeEvent.text); }} maxLength={120} />
        </View>
      ))}
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.grow]} accessibilityLabel={P.corner.addPerson} value={newPerson} onChangeText={setNewPerson} placeholder={P.corner.addPerson} maxLength={30} />
        <Pressable
          style={styles.pill}
          accessibilityRole="button" accessibilityLabel={P.corner.addPerson}
          onPress={() => {
            if (!parentReady()) return;
            if (newPerson.trim()) kid.addPerson(newPerson.trim());
            setNewPerson("");
          }}
        >
          <Text style={styles.pillText}>+</Text>
        </Pressable>
      </View>

      {__DEV__ && <BackupCard />}

      {PURCHASES_SANDBOX && <View style={styles.rowBetween}>
        <Text style={styles.label}>{P.corner.premium}</Text>
        <Switch value={kid.premium} onValueChange={kid.setPremium} trackColor={{ true: "#FFB84D" }} />
      </View>}
      {__DEV__ && <><Pressable accessibilityRole="button" onPress={() => router.push("/trail")} style={styles.row}>
        <Text style={styles.label}>{P.corner.trail}</Text>
        <Text style={styles.label}>›</Text>
      </Pressable>
      <Text style={styles.hint}>{P.corner.trailHint}</Text>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{P.corner.intentions}</Text>
        <Switch value={kid.intentions} onValueChange={kid.setIntentions} trackColor={{ true: "#FFB84D" }} />
      </View>
      <Text style={styles.hint}>{P.corner.intentionsHint}</Text>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{P.corner.freePlay}</Text>
        <Switch value={kid.freePlay} onValueChange={kid.setFreePlay} trackColor={{ true: "#FFB84D" }} />
      </View>
      <Text style={styles.hint}>{P.corner.premiumHint}</Text></>}
      <Text style={styles.h}>{P.corner.subscription}</Text>
      <View style={styles.person}>
        <Text accessibilityLiveRegion="polite" style={styles.personName}>{({ loading: P.corner.planLoading, premium: P.corner.planPremium, free: P.corner.planFree, preview: P.corner.planPreview, unknown: P.corner.planUnknown })[plan]}</Text>
        {plan === "unknown" && <Pressable accessibilityRole="button" style={styles.back} disabled={busy} onPress={() => void refreshPlan()}><Text style={styles.backText}>{P.corner.retry}</Text></Pressable>}
        <Pressable accessibilityRole="button" disabled={busy} style={styles.back} onPress={() => void run(async () => { const url = await subscriptionManagementURL(); if (url) await Linking.openURL(url); else router.push("/parent/paywall"); })}><Text style={styles.backText}>{P.paywall.manage}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} style={styles.back} onPress={() => void restore()}><Text style={styles.backText}>{busy ? P.paywall.busy : P.paywall.restore}</Text></Pressable>
      </View>
      <Text style={styles.h}>{P.corner.about}</Text>
      {Object.entries(legalURLs).filter(([,url]) => !!url).map(([key,url]) => <Pressable key={key} disabled={busy} style={{ minHeight: 44, justifyContent: "center" }} accessibilityRole="link" onPress={() => void openLink(url)}><Text>{P.paywall.legal[key as keyof typeof legalURLs]}</Text></Pressable>)}
      <Text style={styles.hint}>{P.corner.privacy}</Text>
      <Text style={styles.hint}>{P.corner.localData}</Text>
      <Text style={styles.hint}>{P.corner.version(Constants.expoConfig?.version ?? "1.0.0")}</Text>
      <Pressable accessibilityRole="button" disabled={busy} style={styles.danger} onPress={() => { if (parentReady()) deleteData(); }}>
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
  grow: { flex: 1, minWidth: 160 },
  stat: { fontSize: 18, color: "#3b2a1a", fontVariant: ["tabular-nums"] },
  row: { flexWrap: "wrap", flexDirection: "row", alignItems: "center", gap: 12 },
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
