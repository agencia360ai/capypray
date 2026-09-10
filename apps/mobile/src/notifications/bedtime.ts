import type { Pack } from "@capy/content";

// Local-only (GDD §12.4). Called from Parent Corner after the parental gate, never from the kid zone (GDD §11).
const BEDTIME_ID = "bedtime";

// expo-notifications throws at *import* time inside Expo Go (SDK 53+ removed push support there),
// which would take down any route that imports this file. Load it lazily instead: in Expo Go the
// reminder simply reports "unavailable"; in a development build it works normally.
type NotificationsModule = typeof import("expo-notifications");
let mod: NotificationsModule | null | undefined;

function notifications(): NotificationsModule | null {
  if (mod === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require("expo-notifications") as NotificationsModule;
    } catch (e) {
      console.warn("[notifications] unavailable here (Expo Go?) — use a development build:", e);
      mod = null;
    }
  }
  return mod;
}

/** False in Expo Go: the UI can disable the bedtime toggle instead of failing silently. */
export function bedtimeRemindersAvailable(): boolean {
  return notifications() !== null;
}

export async function scheduleBedtimeReminder(pack: Pack, hour = pack.routines.bedtime.defaultHour, minute = 0): Promise<boolean> {
  const N = notifications();
  if (!N) return false;
  const { status } = await N.requestPermissionsAsync();
  if (status !== "granted") return false;
  await N.cancelScheduledNotificationAsync(BEDTIME_ID).catch(() => {});
  await N.scheduleNotificationAsync({
    identifier: BEDTIME_ID,
    content: { title: pack.avatar.id === "capy-default" ? "Capy" : pack.avatar.id, body: pack.routines.bedtime.notificationText ?? "", sound: false },
    trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  return true;
}

export async function cancelBedtimeReminder() {
  const N = notifications();
  if (!N) return;
  await N.cancelScheduledNotificationAsync(BEDTIME_ID).catch(() => {});
}
