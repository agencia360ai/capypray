import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": resolve(__dirname, "src"), "react-native-mmkv": resolve(__dirname, "src/test/mmkv-mock.ts") } },
});
