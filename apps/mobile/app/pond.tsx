import { type ReactNode } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { biomeFor, unlockedRewards } from "@/store/rewards";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { LanternMeter } from "@/ui/components";
import * as haptics from "@/ui/haptics";
import { CompanionIcon } from "@/ui/CompanionIcon";
import { RewardArt } from "@/ui/RewardArt";
import { LockBadge } from "@/ui/LockBadge";
import { glyph } from "@/ui/icons";
import { Star, Lantern } from "@/ui/art";
import { backgroundFor } from "@/ui/backgrounds";
import { T } from "@/ui/theme";
import { useStageInsets } from "@/ui/useStageInsets";

// Collectibles are earned through progress; their pictures remain visible before discovery.
export default function Pond() {
  const pack = getPack(), copy = pack.companion.ui;
  const kid = useKid(), avatar = useAvatar(), { setStage } = useStage(), insets = useSafeAreaInsets();
  const onBottomLayout = useStageInsets();
  const unlocked = unlockedRewards(pack, kid);
  const currentBiome = biomeFor(pack, kid);
  const curriculum = pack.lessons.filter(l => l.routine === "any");
  const equip = (id: string) => {
    const next = kid.skinId === id ? undefined : id;
    void haptics.tap(); kid.setSkin(next);
    avatar.send({ type: "skin", id: next });
    avatar.send({ type: "mood", value: "happy" });
    avatar.send({ type: "play", clip: "celebrate", loop: false });
  };
  const goTo = (id: string) => {
    void haptics.tap(); kid.setBiome(id);
    setStage({ biome: biomeFor(pack, { ...kid, biomeId: id }) });
    avatar.send({ type: "play", clip: "wave_hello", loop: false });
  };
  const beacons = interpolate(copy.beaconCount ?? "{count}", { count: String(kid.beacons) });
  return <View style={s.root}>
    <Pressable accessibilityRole="button" accessibilityLabel={copy.close} style={[s.close, { top: insets.top + 16 }]} onPress={() => router.back()}><CompanionIcon name="close" size={24} /></Pressable>
    <View style={s.spacer} />
    <View onLayout={onBottomLayout} style={s.sheetWrap}>
      <ScrollView style={s.sheet} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 28 }]}>
        <View style={s.head}><View style={{ flex: 1 }}><Text style={s.eyebrow}>{pack.worlds[0]?.title}</Text><Text style={s.title}>{copy.pond}</Text></View><View style={s.beacon} accessible accessibilityLabel={beacons}><Star size={21} /><Text style={s.beaconNumber}>{kid.beacons}</Text></View></View>
        <Text style={s.subtitle}>{copy.pondHint}</Text>
        <View style={s.lights} testID="pond-lanterns">
          <Text style={s.section}>{pack.ui.lanternsTitle}</Text>
          <LanternMeter lanterns={kid.lanterns} />
          <Text style={s.lightHint}>{interpolate(copy.lanternProgress ?? "{count} / 7", { count: String(kid.lanterns % 7) })}</Text>
        </View>
        <View style={s.sectionHead}><Text style={s.sectionTitle}>{pack.ui.rewardsTitle}</Text><Text style={s.subtitle}>{copy.treasuresHint}</Text></View>
        <View style={s.grid}>{pack.rewards.filter(r => r.type !== "biome").map(r => {
          const locked = !unlocked.has(r.id), wearing = r.type === "skin" && kid.skinId === r.id;
          const step = curriculum.findIndex(l => l.id === r.unlock.lessonId) + 1;
          const hint = wearing ? copy.equipped : !locked ? copy.rewardReady : r.unlock.beacons !== undefined
            ? r.unlock.beacons === 1 ? (copy.rewardBeacon ?? "1") : interpolate(copy.rewardBeacons ?? "{count}", { count: String(r.unlock.beacons) })
            : interpolate(copy.trailStep ?? "{n}", { n: String(step) });
          return <Tile key={r.id} id={r.id} title={r.title} locked={locked} selected={wearing} hint={hint} onPress={r.type === "skin" ? () => equip(r.id) : undefined}>
            <RewardArt asset={r.asset ?? r.type} size={78} />
          </Tile>;
        })}</View>
        {kid.people.length > 0 && <><Text style={s.sectionTitle}>{pack.ui.friendsTitle}</Text><View style={s.grid}>{kid.people.map((p, i) => <View key={p.id} style={s.friend}><Text style={{ fontSize: 30 }}>{glyph(pack.people.friends[i % pack.people.friends.length])}</Text><Text style={s.tileLabel}>{p.label}</Text><View style={s.friendCount}><Lantern size={12} /><Text style={s.lightHint}>{p.prayedCount}</Text></View></View>)}</View></>}
        <Text style={s.sectionTitle}>{pack.ui.biomesTitle}</Text>
        <View style={s.grid}>
          <Tile title={pack.worlds[0]?.title ?? ""} selected={currentBiome === pack.theme.pond} onPress={() => goTo(pack.theme.pond)}><ImageBackground source={backgroundFor(pack.theme.pond)} style={s.biomeArt} imageStyle={{ width: "100%", height: "100%" }} /></Tile>
          {pack.rewards.filter(r => r.type === "biome").map(r => <Tile key={r.id} id={r.id} title={r.title} locked={!unlocked.has(r.id)} selected={currentBiome === r.biome} onPress={() => goTo(r.id)} hint={!unlocked.has(r.id) ? interpolate(copy.rewardBeacons ?? "{count}", { count: String(r.unlock.beacons) }) : copy.rewardReady}><ImageBackground source={backgroundFor(r.biome ?? pack.theme.pond)} style={s.biomeArt} /></Tile>)}
        </View>
      </ScrollView>
    </View>
  </View>;
}
function Tile({ id, title, locked, selected, onPress, hint, children }: { id?: string; title: string; locked?: boolean; selected?: boolean; onPress?: () => void; hint?: string; children: ReactNode }) {
  return <Pressable testID={id ? "reward-" + id : undefined} disabled={locked || !onPress} onPress={onPress}
    accessibilityRole={onPress ? "button" : "text"} accessibilityLabel={[title, hint].filter(Boolean).join(". ")} accessibilityState={{ disabled: !!locked, selected: !!selected }}
    style={({ pressed }) => [s.tile, selected && s.tileOn, pressed && s.pressed]}>
    <View style={s.art}>{children}{locked && <LockBadge />}{selected && <View style={s.equipped}><CompanionIcon name="check" size={17} /></View>}</View>
    <Text style={s.tileLabel}>{title}</Text>
    {!!hint && <Text style={[s.tileHint, selected && s.hintOn]}>{hint}</Text>}
  </Pressable>;
}
const s = StyleSheet.create({
 root:{flex:1}, spacer:{flex:1}, close:{position:"absolute",right:20,zIndex:2,width:44,height:44,borderRadius:22,backgroundColor:"#FFFBF2E8",alignItems:"center",justifyContent:"center"},
 sheetWrap:{maxHeight:"62%"},sheet:{backgroundColor:"#FFFAED",borderTopLeftRadius:32,borderTopRightRadius:32},content:{padding:20,gap:13},
 head:{flexDirection:"row",alignItems:"center",gap:12},eyebrow:{fontFamily:T.font.bold,fontSize:10,letterSpacing:1.5,textTransform:"uppercase",color:"#7E8D71"},title:{fontFamily:T.font.black,fontSize:25,color:T.color.ink},
 beacon:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"#FFF1C9",paddingVertical:9,paddingHorizontal:12,borderRadius:18,borderWidth:1,borderColor:"#EEDFBC"},beaconNumber:{fontFamily:T.font.black,fontSize:17,color:"#735B31"},
 subtitle:{fontFamily:T.font.regular,fontSize:12,lineHeight:17,color:"#748069"},lights:{alignItems:"center",gap:7,backgroundColor:"#F4F0DF",borderRadius:22,paddingVertical:13,paddingHorizontal:8,borderWidth:1,borderColor:"#E8E5D0"},section:{fontFamily:T.font.bold,fontSize:10,letterSpacing:1.5,textTransform:"uppercase",color:"#7A846A"},
 lightHint:{fontFamily:T.font.regular,fontSize:11,lineHeight:16,color:"#6B775F",textAlign:"center"},sectionHead:{gap:3,marginTop:5},sectionTitle:{fontFamily:T.font.black,fontSize:19,color:T.color.ink},
 grid:{flexDirection:"row",flexWrap:"wrap",gap:8},tile:{width:"31%",borderRadius:21,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#E8E0CA",borderBottomWidth:4,padding:7,alignItems:"center",gap:5,paddingBottom:12},
 tileOn:{borderColor:"#8CAC79",backgroundColor:"#F0F5E7"},art:{width:"100%",height:89,borderRadius:15,backgroundColor:"#F9F4E7",alignItems:"center",justifyContent:"center",overflow:"hidden"},tileLabel:{fontFamily:T.font.bold,fontSize:12,lineHeight:16,color:T.color.ink,textAlign:"center"},tileHint:{fontFamily:T.font.regular,fontSize:10,lineHeight:14,textAlign:"center",color:"#7C816B"},hintOn:{color:"#52754E"},
 equipped:{position:"absolute",bottom:4,right:4,width:25,height:25,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:"#D8E8C9"},biomeArt:{width:"100%",height:"100%"},pressed:{opacity:0.82},friendCount:{flexDirection:"row",alignItems:"center",gap:2},friend:{width:"31%",alignItems:"center",gap:4,padding:9,borderRadius:18,backgroundColor:"#F3EDDD"},
});
