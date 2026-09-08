import * as Haptics from "expo-haptics";

// Tiny, calm feedback vocabulary. Never loud; Capy's world is soft.
export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const nope = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
