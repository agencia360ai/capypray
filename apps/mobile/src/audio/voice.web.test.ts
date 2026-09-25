import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ play: vi.fn(), pause: vi.fn(), speak: vi.fn(), stop: vi.fn(), listeners: {} as Record<string, () => void>, created: 0 }));
vi.mock("expo-asset", () => ({ Asset: { fromModule: () => ({ uri: "/voice.mp3" }) } }));
vi.mock("expo-speech", () => ({ speak: mocks.speak, stop: mocks.stop }));
vi.mock("./manifest", () => ({ AUDIO: { "voice.mp3": 1 } }));
vi.mock("@/content/pack", () => ({ getPack: () => ({ locale: "en-US" }) }));
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); mocks.created = 0;
  mocks.play.mockResolvedValue(undefined); mocks.stop.mockResolvedValue(undefined);
  vi.stubGlobal("document", { addEventListener: (name: string, fn: () => void) => { mocks.listeners[name] = fn; } });
  vi.stubGlobal("Audio", class { constructor() { mocks.created++; } play = mocks.play; pause = mocks.pause; });
});
it("retries browser-blocked audio on a gesture and reuses one media element", async () => {
  mocks.play.mockRejectedValueOnce({ name: "NotAllowedError" });
  const m = await import("./voice.web"); m.speak("Hello", { audio: "voice.mp3" });
  await Promise.resolve(); await Promise.resolve();
  await vi.waitFor(() => expect(mocks.play).toHaveBeenCalledTimes(1));
  mocks.listeners.pointerdown!(); await vi.waitFor(() => expect(mocks.play).toHaveBeenCalledTimes(2));
  m.speak("Next", { audio: "voice.mp3" }); expect(mocks.created).toBe(1);
});
it("never restarts a canceled blocked line", async () => {
  mocks.play.mockRejectedValueOnce({ name: "NotAllowedError" });
  const m = await import("./voice.web"); const h = m.speak("Hello", { audio: "voice.mp3" });
  await Promise.resolve(); await Promise.resolve();
  await vi.waitFor(() => expect(mocks.play).toHaveBeenCalledTimes(1)); h.cancel(); mocks.listeners.pointerdown!();
  expect(mocks.play).toHaveBeenCalledTimes(1);
});
it("falls back to speech when an audio file fails", async () => {
  mocks.play.mockRejectedValueOnce({ name: "NotSupportedError" });
  const m = await import("./voice.web"); m.speak("Hello", { audio: "voice.mp3" });
  await vi.waitFor(() => expect(mocks.speak).toHaveBeenCalledWith("Hello", expect.anything()));
});
