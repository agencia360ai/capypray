import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { backendEnabled, requestCode, signOut, supabase, verifyCode } from "@/backend/supabase";
import { pullIfEmpty, push } from "@/backend/sync";
import { P } from "@/parent/strings";

// Parent Corner → "Back up progress": email + 6-digit code (Supabase OTP). Parent account only (GDD §11).
export function BackupCard() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => setUser(data.session?.user.email ?? null));
  }, []);

  if (!backendEnabled) return <Text style={styles.hint}>{P.corner.offline}</Text>;

  const send = async () => {
    try {
      await requestCode(email.trim());
      setSent(true);
      setMsg(null);
    } catch (e) {
      setMsg(String((e as Error).message ?? e));
    }
  };
  const verify = async () => {
    try {
      const session = await verifyCode(email.trim(), code.trim());
      setUser(session?.user.email ?? email);
      const restored = await pullIfEmpty();
      if (!restored) await push();
      setMsg(restored ? P.corner.restored : null);
    } catch (e) {
      setMsg(String((e as Error).message ?? e));
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.h}>{P.corner.backup}</Text>
      {user ? (
        <>
          <Text style={styles.hint}>{P.corner.signedIn(user)}</Text>
          <Pressable
            onPress={async () => {
              await signOut();
              setUser(null);
            }}
          >
            <Text style={styles.link}>{P.corner.signOut}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.hint}>{P.corner.backupHint}</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder={P.corner.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          {!sent ? (
            <Pressable style={styles.btn} onPress={send} disabled={!email.includes("@")}>
              <Text style={styles.btnText}>{P.corner.sendCode}</Text>
            </Pressable>
          ) : (
            <>
              <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder={P.corner.code} keyboardType="number-pad" maxLength={6} />
              <Pressable style={styles.btn} onPress={verify} disabled={code.length < 6}>
                <Text style={styles.btnText}>{P.corner.verify}</Text>
              </Pressable>
            </>
          )}
        </>
      )}
      {msg && <Text style={styles.hint}>{msg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 12, gap: 8 },
  h: { fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: "#8a6a48" },
  hint: { fontSize: 13, color: "#8a6a48", lineHeight: 18 },
  link: { color: "#a05050" },
  input: { backgroundColor: "#FFF3DC", borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 2, borderColor: "#f1e2c8" },
  btn: { backgroundColor: "#FFB84D", borderRadius: 999, padding: 12, alignItems: "center" },
  btnText: { fontWeight: "700", color: "#3b2a1a", fontSize: 16 },
});
