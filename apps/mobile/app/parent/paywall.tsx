import { useEffect, useState } from "react";
import { Alert, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar } from "@/avatar/AvatarView";
import * as haptics from "@/ui/haptics";
import { T } from "@/ui/theme";
import { P } from "@/parent/strings";
import { PURCHASES_SANDBOX, restorePurchases, startTrial, type Plan } from "@/entitlements/purchase";
import { CompanionIcon as Icon } from "@/ui/CompanionIcon";
import { feelingArt, storyCover } from "@/ui/illustrations";
import { backgroundFor } from "@/ui/backgrounds";
import { formatHour } from "@/i18n";
import { speak, stopSpeaking } from "@/audio/voice";

// Parent-only offer. Prices remain explicit beside the action; Expo Go uses the existing sandbox adapter.
export default function Paywall() {
  const pack = getPack(), kid = useKid(), copy = P.paywall, avatar = useAvatar(), insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan>("annual");
  const [details, setDetails] = useState(false), [busy, setBusy] = useState(false);
  const done = () => router.replace("/");
  const name = kid.kidName || P.onboarding.yourChild;
  useEffect(() => {
    stopSpeaking(); avatar.send({ type: "idle" });
    const voice = speak(copy.capyLine, { audio: "pw_hello.mp3" });
    return () => voice.cancel();
  }, [avatar, copy.capyLine]);
  const pick = (p: Plan) => { if (!busy) { setPlan(p); void haptics.tap(); } };
  const purchase = async () => {
    if (busy) return;
    setBusy(true);
    try { await startTrial(plan); void haptics.success(); done(); }
    catch { Alert.alert(copy.errorTitle, copy.errorBody); }
    finally { setBusy(false); }
  };
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try { if (await restorePurchases()) done(); else Alert.alert(copy.restore, copy.restoreEmpty); }
    catch { Alert.alert(copy.errorTitle, copy.errorBody); }
    finally { setBusy(false); }
  };
  return <View style={[s.root, { paddingTop: insets.top }]} testID="paywall">
    <View style={s.top}>
      <View style={s.brand}><Icon name="leaf" size={23} /><Text style={s.brandText}>{copy.brand}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={done} style={s.close}><Icon name="close" size={23} /></Pressable>
    </View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} testID="paywall-scroll">
      <View style={s.hero}>
        <View style={s.heroCopy}><Text style={s.eyebrow}>{copy.eyebrow}</Text><Text style={s.heroTitle}>{copy.heroTitle}</Text><Text style={s.heroBody}>{copy.capyLine}</Text></View>
        <View style={s.heroHalo} />
        <Image source={feelingArt("thankful")} style={s.capy} resizeMode="contain" accessible={false} />
      </View>
      <Text style={s.personal}>{copy.title(name)}</Text>
      <View style={s.previews}>
        <Preview source={backgroundFor("bedroom")} label={copy.previewPrayer} icon="moon" />
        <Preview source={storyCover("lost-sheep")} label={copy.previewStories} icon="book" />
        <Preview source={backgroundFor("trail")} label={copy.previewJourney} icon="leaf" />
      </View>
      <View style={s.planHeading}><Text style={s.heading}>{copy.choosePlan}</Text><Text style={s.small}>{copy.gentlePace}</Text></View>
      <View accessibilityRole="radiogroup" accessibilityLabel={copy.choosePlan} style={s.plans}>
        <PlanOption id="annual" selected={plan === "annual"} disabled={busy} onPress={() => pick("annual")} title={copy.annualTitle} price={copy.annualPrice} period={copy.annualPeriod} note={copy.annualNote} badge={copy.bestValue} />
        <PlanOption id="monthly" selected={plan === "monthly"} disabled={busy} onPress={() => pick("monthly")} title={copy.monthlyTitle} price={copy.monthlyPrice} period={copy.monthlyPeriod} note={copy.monthlyNote} />
      </View>
      <View style={s.included}>
        <Text style={s.heading}>{copy.included}</Text>
        <Benefit icon="leaf" text={copy.recap.weeks(pack.worlds.reduce((n,w) => n + w.weeks.length, 0))} />
        <Benefit icon="heart" text={copy.recap.people(kid.people.map(p => p.label))} />
        <Benefit icon="moon" text={copy.recap.bedtime(formatHour(kid.profile.bedtimeHour, pack.locale))} />
      </View>
      <View style={s.details}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.trialDetails} accessibilityState={{ expanded: details }} aria-expanded={details} onPress={() => setDetails(v => !v)} style={s.detailsToggle}>
          <Text style={s.heading}>{copy.trialDetails}</Text><Text style={s.plus}>{details ? "−" : "+"}</Text>
        </Pressable>
        {details && <View style={s.timeline}>{copy.timeline.map((step,i) => <View key={step.title} style={s.step}><View style={s.stepIcon}><Icon name={step.icon} size={22} /></View><View style={s.stepText}><Text style={s.stepTitle}>{step.title}</Text><Text style={s.small}>{i === 2 ? (plan === "annual" ? copy.ctaSubAnnual : copy.ctaSubMonthly) + ". " + step.body : step.body}</Text></View></View>)}</View>}
      </View>
      <Text style={s.trust}>{copy.trust}</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void restore()} style={s.restore}><Text style={s.restoreText}>{copy.restore}</Text></Pressable>
    </ScrollView>
    <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Text style={s.billing} testID="paywall-billing">{plan === "annual" ? copy.ctaSubAnnual : copy.ctaSubMonthly}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => void purchase()} style={({ pressed }) => [s.cta, pressed && s.pressed, busy && { opacity: 0.65 }]} testID="paywall-continue">
        <Text style={s.ctaText}>{busy ? copy.busy : copy.cta}</Text><Icon name="arrow" color="#FFFFFF" size={22} />
      </Pressable>
      {PURCHASES_SANDBOX && <Text style={s.previewNote}>{copy.sandboxNotice}</Text>}
      <Pressable accessibilityRole="button" onPress={done} style={s.later} testID="paywall-free"><Text style={s.laterText}>{copy.later}</Text></Pressable>
    </View>
  </View>;
}
function Preview({ source, label, icon }: { source: ImageSourcePropType | undefined; label: string; icon: string }) {
  return <View style={s.preview}><ImageBackground source={source} style={s.previewArt} imageStyle={{ width: "100%", height: "100%" }} resizeMode="cover" accessible={false}><View style={s.previewIcon}><Icon name={icon} size={17} /></View></ImageBackground><Text style={s.previewLabel}>{label}</Text></View>;
}
function Benefit({ icon, text }: { icon: string; text: string }) {
 return <View style={s.benefit}><View style={s.benefitIcon}><Icon name={icon} size={23} /></View><Text style={s.small}>{text}</Text></View>;
}
function PlanOption({ id, selected, disabled, onPress, title, price, period, note, badge }: { id: string; selected: boolean; disabled: boolean; onPress: () => void; title: string; price: string; period: string; note: string; badge?: string }) {
 return <Pressable testID={"plan-" + id} onPress={onPress} disabled={disabled} accessibilityRole="radio" aria-checked={selected} accessibilityState={{ checked: selected, disabled }} accessibilityLabel={[title, price, period, note].join(". ")} style={[s.plan, selected && s.planOn]}>
   <View style={[s.radio, selected && s.radioOn]}>{selected && <Icon name="check" color="#FFFFFF" size={17} />}</View>
   <View style={s.planCopy}><View style={s.planName}><Text style={s.planTitle}>{title}</Text>{badge && <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View>}</View><Text style={s.planNote}>{note}</Text></View>
   <View style={s.priceBlock}><Text style={s.price}>{price}</Text><Text style={s.period}>{period}</Text></View>
 </Pressable>;
}
const s = StyleSheet.create({
 root:{flex:1,backgroundColor:"#FFFBF3"},top:{height:52,paddingLeft:22,paddingRight:12,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},brand:{flexDirection:"row",alignItems:"center",gap:7},brandText:{fontFamily:T.font.black,fontSize:11,letterSpacing:1.5,color:"#577561"},close:{width:44,height:44,alignItems:"center",justifyContent:"center"},
 content:{paddingHorizontal:20,paddingBottom:16,gap:14},hero:{minHeight:170,backgroundColor:"#EAF0DF",borderRadius:25,overflow:"hidden",padding:18,justifyContent:"center"},heroCopy:{width:"66%",zIndex:2,gap:7},eyebrow:{fontFamily:T.font.bold,fontSize:9,letterSpacing:1.6,color:"#75916B"},heroTitle:{fontFamily:T.font.black,fontSize:26,lineHeight:29,color:"#35583F"},heroBody:{fontFamily:T.font.regular,fontSize:11,lineHeight:15,color:"#648067"},heroHalo:{position:"absolute",width:150,height:150,borderRadius:75,backgroundColor:"#DCE7C9",right:-28,bottom:-27},capy:{position:"absolute",right:-8,bottom:0,width:"42%",height:153},
 personal:{fontFamily:T.font.black,fontSize:19,lineHeight:24,color:T.color.ink},previews:{flexDirection:"row",gap:9},preview:{flex:1,minWidth:0,borderRadius:15,backgroundColor:"#F3ECD9",overflow:"hidden"},previewArt:{height:70,alignItems:"flex-end",justifyContent:"flex-end",padding:5},previewIcon:{width:25,height:25,borderRadius:13,backgroundColor:"#FFFCF2ED",alignItems:"center",justifyContent:"center"},previewLabel:{fontFamily:T.font.bold,fontSize:10,lineHeight:14,color:"#5B7158",textAlign:"center",padding:6},
 planHeading:{gap:3},heading:{fontFamily:T.font.bold,fontSize:15,lineHeight:21,color:T.color.ink,flexShrink:1},small:{fontFamily:T.font.regular,fontSize:12,lineHeight:18,color:"#718067",flexShrink:1},plans:{gap:9},plan:{minHeight:79,flexDirection:"row",alignItems:"center",gap:10,padding:12,borderWidth:1.5,borderColor:"#E5E5D6",borderRadius:19,backgroundColor:"#FFFFFF"},planOn:{borderColor:"#6D8E62",backgroundColor:"#F0F5E8"},radio:{width:23,height:23,borderRadius:12,borderWidth:1.5,borderColor:"#C8CEBD",alignItems:"center",justifyContent:"center"},radioOn:{borderColor:"#5C7D55",backgroundColor:"#5C7D55"},planCopy:{flex:1,gap:4},planName:{flexDirection:"row",alignItems:"center",gap:6,flexWrap:"wrap"},planTitle:{fontFamily:T.font.black,fontSize:16,color:T.color.ink},planNote:{fontFamily:T.font.regular,fontSize:10,lineHeight:14,color:"#75836A"},priceBlock:{alignItems:"flex-end"},price:{fontFamily:T.font.black,fontSize:20,color:T.color.ink,fontVariant:["tabular-nums"]},period:{fontFamily:T.font.regular,fontSize:10,color:"#75836A"},badge:{backgroundColor:"#E1ECCC",paddingHorizontal:6,paddingVertical:3,borderRadius:7},badgeText:{fontFamily:T.font.black,fontSize:8,color:"#577A47",letterSpacing:0.4},
 previewNote:{fontFamily:T.font.regular,fontSize:10,color:"#7C806E",textAlign:"center"},included:{gap:12,padding:15,borderRadius:20,backgroundColor:"#F7F2E5"},benefit:{flexDirection:"row",alignItems:"center",gap:9},benefitIcon:{width:31,alignItems:"center"},details:{borderBottomWidth:1,borderColor:"#E8E5D7"},detailsToggle:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",minHeight:48,gap:10},plus:{fontSize:23,color:"#738667"},timeline:{gap:14,paddingBottom:17},step:{flexDirection:"row",alignItems:"flex-start",gap:11},stepIcon:{width:35,height:35,borderRadius:18,backgroundColor:"#EEF1E2",alignItems:"center",justifyContent:"center"},stepText:{flex:1,gap:4},stepTitle:{fontFamily:T.font.bold,fontSize:12,color:T.color.ink},trust:{fontFamily:T.font.regular,fontSize:11,lineHeight:17,textAlign:"center",color:"#7C806E"},restore:{minHeight:44,alignItems:"center",justifyContent:"center"},restoreText:{fontFamily:T.font.regular,fontSize:12,textDecorationLine:"underline",color:"#6A7A63"},
 footer:{paddingTop:10,paddingHorizontal:20,borderTopWidth:1,borderTopColor:"#E9E5D7",backgroundColor:"#FFFBF3",gap:7},billing:{fontFamily:T.font.regular,fontSize:11,lineHeight:16,color:"#62765D",textAlign:"center"},cta:{minHeight:55,borderRadius:18,backgroundColor:"#4D7556",borderBottomWidth:4,borderBottomColor:"#37573E",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:13,padding:12},ctaText:{fontFamily:T.font.black,fontSize:18,color:"#FFFFFF",flexShrink:1,textAlign:"center"},pressed:{opacity:0.85},later:{minHeight:36,alignItems:"center",justifyContent:"center"},laterText:{fontFamily:T.font.bold,fontSize:12,color:"#6D7D63"},
});
