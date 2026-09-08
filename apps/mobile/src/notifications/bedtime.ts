import * as Notifications from "expo-notifications";
import type { Pack } from "@capy/content";

// Local-only (GDD §12.4). Called from Parent Corner after the parental gate, never from the kid zone (GDD §11).
const BEDTIME_ID = "bedtime";

export async function scheduleBedtimeReminder(pack: Pack, hour = pack.routines.bedtime.defaultHour, minute = 0): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return false;
  await Notifications.cancelScheduledNotificationAsync(BEDTIME_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: BEDTIME_ID,
    content: { title: pack.avatar.id === "capy-default" ? "Capy" : pack.avatar.id, body: pack.routines.bedtime.notificationText ?? "", sound: false },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  return true;
}

export async function cancelBedtimeReminder() {
  await Notifications.cancelScheduledNotificationAsync(BEDTIME_ID).catch(() => {});
}
