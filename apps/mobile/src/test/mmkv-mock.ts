// In-memory MMKV for vitest (node).
export class MMKV {
  private m = new Map<string, string>();
  constructor(_opts?: { id: string }) {}
  getString(k: string) {
    return this.m.get(k);
  }
  set(k: string, v: string) {
    this.m.set(k, v);
  }
  delete(k: string) {
    this.m.delete(k);
  }
}
