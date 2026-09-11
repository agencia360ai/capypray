/** Offline browser review storage; never uses localStorage. Native uses AsyncStorage. */
let database: Promise<IDBDatabase> | undefined;
const memory = new Map<string, string>();
function open() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("capy-prayer", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("state", mode);
    const request = action(transaction.objectStore("state"));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
export default {
  getItem: async (key: string): Promise<string | null> => {
    try { return (await transact("readonly", store => store.get(key))) ?? null; }
    catch { return memory.get(key) ?? null; }
  },
  setItem: async (key: string, value: string) => {
    memory.set(key, value);
    try { await transact("readwrite", store => store.put(value, key)); } catch { /* Session-only review when browser storage is unavailable. */ }
  },
  removeItem: async (key: string) => {
    memory.delete(key);
    try { await transact("readwrite", store => store.delete(key)); } catch { /* No persistent storage available. */ }
  },
};
