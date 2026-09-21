import { useCallback, useEffect } from "react";
import { useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { useAvatar, useStage } from "@/avatar/AvatarView";

/** Past this share of the screen under the sheet, the band above it is sky and water: Capy would stand on the pond. */
const TALL_SHEET = 0.6;

/**
 * Attach `onLayout` to the bottom UI block; Capy gets framed in the band above it.
 *
 * The painted meadow is 72 % of the screen tall, its water across the middle. A sheet that covers most of the
 * screen leaves only the top of the art, and Capy framed there stands on the water. Behind a tall sheet the scene
 * is scaled to the space above it instead — the art's grass then ends right above the sheet — and Capy is framed in
 * the lower part of that scene, feet on the ground: the same move the trail lobby makes. Screens with a normal
 * sheet (home, lessons) keep their framing. The scene height is cleared on unmount.
 */
export function useStageInsets(top = 0.12) {
  const avatar = useAvatar();
  const { setStage } = useStage();
  const { height } = useWindowDimensions();
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const covered = e.nativeEvent.layout.height / height;
      if (covered > TALL_SHEET) {
        const scene = Math.max(220, height - e.nativeEvent.layout.height + 22);
        setStage({ sceneHeight: scene });
        avatar.send({ type: "viewport", top: (scene * 0.42) / height, bottom: 1 - (scene * 0.9) / height });
        return;
      }
      setStage({ sceneHeight: undefined });
      avatar.send({ type: "viewport", top, bottom: Math.min(0.75, covered + 0.02) });
    },
    [avatar, height, top, setStage],
  );
  useEffect(
    () => () => {
      setStage({ sceneHeight: undefined });
      avatar.send({ type: "viewport", top, bottom: 0.45 });
    },
    [avatar, top, setStage],
  );
  return onLayout;
}
