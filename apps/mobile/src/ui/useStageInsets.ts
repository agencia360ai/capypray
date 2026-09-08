import { useCallback, useEffect } from "react";
import { useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { useAvatar } from "@/avatar/AvatarView";

/** Attach `onLayout` to the bottom UI block; Capy gets framed in the band above it. */
export function useStageInsets(top = 0.12) {
  const avatar = useAvatar();
  const { height } = useWindowDimensions();
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const bottom = Math.min(0.75, e.nativeEvent.layout.height / height + 0.02);
      avatar.send({ type: "viewport", top, bottom });
    },
    [avatar, height, top],
  );
  useEffect(() => () => avatar.send({ type: "viewport", top, bottom: 0.45 }), [avatar, top]);
  return onLayout;
}
