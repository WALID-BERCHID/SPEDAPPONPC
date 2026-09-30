// Where the encrypted vault lives.
// Desktop (Tauri): the app-data folder, written atomically, with one automatic
// backup per day (the 10 newest are kept). Browser (development/demo): IndexedDB.

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const VAULT = "vault.hih";
const KEEP_BACKUPS = 10;

export interface PickedFile {
  name: string;
  text: string;
}

export interface Storage {
  load(): Promise<string | null>;
  save(text: string): Promise<void>;
  /** Asks the user where to save. Returns false if they cancelled. */
  exportFile(name: string, text: string, ext: string): Promise<boolean>;
  importFile(exts: string[]): Promise<PickedFile | null>;
  /** Folder shown to the user in Settings, if any. */
  location(): Promise<string | null>;
}

const tauriStorage: Storage = {
  async load() {
    const fs = await import("@tauri-apps/plugin-fs");
    const file = await vaultPath();
    return (await fs.exists(file)) ? fs.readTextFile(file) : null;
  },
  async save(text) {
    const fs = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    const dir = await dataDir();
    const file = await join(dir, VAULT);
    const tmp = file + ".tmp";
    await fs.writeTextFile(tmp, text);
    await fs.rename(tmp, file);

    const backups = await join(dir, "backups");
    if (!(await fs.exists(backups))) await fs.mkdir(backups, { recursive: true });
    const today = await join(backups, `vault-${new Date().toISOString().slice(0, 10)}.hih`);
    if (!(await fs.exists(today))) {
      await fs.writeTextFile(today, text);
      const old = (await fs.readDir(backups))
        .map((e) => e.name)
        .filter((n) => n.startsWith("vault-"))
        .sort()
        .slice(0, -KEEP_BACKUPS);
      for (const name of old) await fs.remove(await join(backups, name));
    }
  },
  async exportFile(name, text, ext) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const fs = await import("@tauri-apps/plugin-fs");
    const path = await save({ defaultPath: name, filters: [{ name: ext, extensions: [ext] }] });
    if (!path) return false;
    await fs.writeTextFile(path, text);
    return true;
  },
  async importFile(exts) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const fs = await import("@tauri-apps/plugin-fs");
    const path = await open({ multiple: false, filters: [{ name: exts.join(", "), extensions: exts }] });
    if (typeof path !== "string") return null;
    return { name: path.split(/[\\/]/).pop() ?? path, text: await fs.readTextFile(path) };
  },
  location: dataDir,
};

async function dataDir() {
  const fs = await import("@tauri-apps/plugin-fs");
  const { appDataDir } = await import("@tauri-apps/api/path");
  const dir = await appDataDir();
  if (!(await fs.exists(dir))) await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function vaultPath() {
  const { join } = await import("@tauri-apps/api/path");
  return join(await dataDir(), VAULT);
}

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("handinhand", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function kv<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction("kv", mode).objectStore("kv"));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

const browserStorage: Storage = {
  load: async () => (await kv<string | undefined>("readonly", (s) => s.get(VAULT))) ?? null,
  save: async (text) => {
    await kv("readwrite", (s) => s.put(text, VAULT));
  },
  async exportFile(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "application/octet-stream" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  },
  importFile(exts) {
    return new Promise((resolve) => {
      const input = Object.assign(document.createElement("input"), {
        type: "file",
        accept: exts.map((e) => "." + e).join(","),
      });
      input.onchange = async () => {
        const f = input.files?.[0];
        resolve(f ? { name: f.name, text: await f.text() } : null);
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  },
  location: async () => null,
};

export const storage: Storage = isTauri ? tauriStorage : browserStorage;
