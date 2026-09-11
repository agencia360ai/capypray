// Kid-zone look: warm, rounded, toy-like. Colors come from the pack theme + pond palette.
export const T = {
  color: {
    primary: "#FFB84D",
    primaryDark: "#E39A2A",
    cream: "#FFF3DC",
    paper: "#FFFFFF",
    ink: "#354B3E",
    brown: "#69715D",
    tan: "#F1E2C8",
    pond: "#5FB8B0",
    leaf: "#8CC66B",
    coral: "#FF8A5B",
    night: "#2D2A4A",
    ok: "#5FB37A",
    bad: "#D9534F",
  },
  font: {
    regular: "Nunito_600SemiBold",
    bold: "Nunito_800ExtraBold",
    black: "Nunito_900Black",
  },
  radius: { sm: 14, md: 20, lg: 28, pill: 999 },
  shadow: { shadowColor: "#3B2A1A", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
} as const;
