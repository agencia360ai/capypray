import type { Pack } from "@capy/content";

// Local-only (GDD §12.4). Called from Parent Corner after the parental gate, never from the kid zone (GDD §11).
const BEDTIME_ID = "bedtime";

// expo-notifications throws at *import* time inside Expo Go (SDK 53+ removed push support there),
// which would take down any route that imports this file. Load it lazily instead: in Expo Go the
// reminder simply reports "unavailable"; in a development build it works normally.
type NotificationsModule = typeof import("expo-notifications");
let mod: Promise<NotificationsModule | null> | undefined;
function notifications(): Promise<NotificationsModule | null> {
  return mod ??= import("expo-notifications").catch(() => null);
}

export async function scheduleBedtimeReminder(pack: Pack, hour = pack.routines.bedtime.defaultHour, minute = 0): Promise<boolean> {
  const N = await notifications();
  if (!N) return false;
  const { status } = await N.requestPermissionsAsync();
  if (status !== "granted") return false;
  // Reusing the identifier replaces the reminder without canceling it before scheduling succeeds.
  await N.scheduleNotificationAsync({
    identifier: BEDTIME_ID,
    content: { title: pack.avatar.id === "capy-default" ? "Capy" : pack.avatar.id, body: pack.routines.bedtime.notificationText ?? "", sound: false },
    trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  return true;
}

export async function cancelBedtimeReminder() {
  const N = await notifications();
  if (!N) return;
  await N.cancelScheduledNotificationAsync(BEDTIME_ID);
}
