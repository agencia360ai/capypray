import type { ComponentType } from "react";
import { Redirect } from "expo-router";
import { getPack } from "@/content/pack";
import type { HomeSectionId } from "@/store/home";
import { UNLOCK_HREF, isSectionLocked, useEntitlement } from ".";

/** Direct routes follow the same rule as the doors: a locked section goes to the parental gate, then the offer. */
export function premiumOnly<P extends object>(section: HomeSectionId, Screen: ComponentType<P>) {
  return function PremiumScreen(props: P) {
    const { premium } = useEntitlement();
    if (isSectionLocked(getPack(), section, premium)) return <Redirect href={UNLOCK_HREF} />;
    return <Screen {...props} />;
  };
}
