import { useMemo } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { T } from "./theme";

/** Only the handle owns the drag, leaving the sheet's scroll and action buttons alone. */
export function SheetHandle({ collapsed, onChange, expandLabel, collapseLabel, testID }: {
  collapsed: boolean; onChange: (collapsed: boolean) => void;
  expandLabel: string; collapseLabel: string; testID: string;
}) {
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 30) onChange(true);
      else if (g.dy < -30) onChange(false);
    },
  }), [onChange]);
  return <View {...pan.panHandlers}>
    <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? expandLabel : collapseLabel}
      accessibilityState={{ expanded: !collapsed }} aria-expanded={!collapsed}
      onPress={() => onChange(!collapsed)} style={s.grab} testID={testID}>
      <View style={s.handle} />
      <Text style={s.label}>{collapsed ? expandLabel : collapseLabel}</Text>
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  grab: { minHeight: 48, alignItems: "center", justifyContent: "center", gap: 5, padding: 8 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: "#A3AE99" },
  label: { fontFamily: T.font.bold, fontSize: 11, color: "#65785C", textAlign: "center" },
});
