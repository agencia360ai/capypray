import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": resolve(__dirname, "src"), "@react-native-async-storage/async-storage": resolve(__dirname, "src/test/async-storage-mock.ts") } },
});
