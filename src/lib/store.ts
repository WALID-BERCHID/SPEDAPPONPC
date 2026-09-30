import { useSyncExternalStore } from "react";
import { sealVault, type Session } from "./crypto";
import { storage } from "./storage";
import type { Collection, RecordOf, VaultData } from "./schema";

// All data lives in memory while the vault is unlocked and is saved (encrypted)
// shortly after every change.

type SaveState = "saved" | "saving" | "error";

let data: VaultData | null = null;
let session: Session | null = null;
let saveState: SaveState = "saved";
let timer: ReturnType<typeof setTimeout> | undefined;
let pending: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

export function openStore(s: Session, d: VaultData) {
  session = s;
  data = migrate(d);
  saveState = "saved";
  notify();
}

/** Fills in collections added after a vault was created. */
function migrate(d: VaultData): VaultData {
  return { ...d, checklists: d.checklists ?? [] };
}

/** Saves and forgets everything. The caller unmounts the screens that read the data. */
export async function closeStore() {
  await flush();
  session = null;
  data = null;
}

export function getSession() {
  return session;
}

export function getData(): VaultData {
  if (!data) throw new Error("Vault is locked");
  return data;
}

export function useData(): VaultData {
  return useSyncExternalStore(subscribe, getData);
}

export function useSaveState(): SaveState {
  return useSyncExternalStore(subscribe, () => saveState);
}

function commit(next: VaultData) {
  data = next;
  saveState = "saving";
  notify();
  clearTimeout(timer);
  timer = setTimeout(() => void flush(), 600);
}

/** Writes the vault now. Safe to call repeatedly. */
export function flush(): Promise<void> {
  clearTimeout(timer);
  if (!data || !session || saveState === "saved") return pending;
  const [d, s] = [data, session];
  pending = pending.then(async () => {
    try {
      await storage.save(JSON.stringify(await sealVault(s, d)));
      if (data === d) saveState = "saved";
    } catch (e) {
      console.error(e);
      saveState = "error";
    }
    notify();
  });
  return pending;
}

/** Forces a save even if nothing changed (e.g. after a password change). */
export function markDirty() {
  if (data) commit(data);
}

export function update(fn: (d: VaultData) => Partial<VaultData>) {
  const d = getData();
  commit({ ...d, ...fn(d) });
}

type Draft<K extends Collection> = Omit<RecordOf<K>, "id" | "createdAt" | "updatedAt"> & Partial<Pick<RecordOf<K>, "id" | "createdAt">>;

export function upsert<K extends Collection>(key: K, item: Draft<K>): RecordOf<K> {
  const t = now();
  const record = { ...item, id: item.id ?? uid(), createdAt: item.createdAt ?? t, updatedAt: t } as RecordOf<K>;
  update((d) => {
    const list = d[key] as RecordOf<K>[];
    const i = list.findIndex((r) => r.id === record.id);
    return { [key]: i < 0 ? [...list, record] : list.map((r, j) => (j === i ? record : r)) };
  });
  return record;
}

export function remove(key: Collection, id: string) {
  update((d) => ({ [key]: (d[key] as { id: string }[]).filter((r) => r.id !== id) }));
}

export function removeChild(id: string) {
  update((d) => ({
    children: d.children.filter((c) => c.id !== id),
    goals: d.goals.filter((g) => g.childId !== id),
    dataPoints: d.dataPoints.filter((p) => p.childId !== id),
    behaviors: d.behaviors.filter((b) => b.childId !== id),
    dailyLogs: d.dailyLogs.filter((l) => l.childId !== id),
    schedules: d.schedules.filter((s) => s.childId !== id),
    checklists: d.checklists.filter((c) => c.childId !== id),
  }));
}

export function addImage(dataUrl: string): string {
  const id = uid();
  update((d) => ({ images: { ...d.images, [id]: dataUrl } }));
  return id;
}

const COLLECTIONS: Collection[] = ["children", "goals", "dataPoints", "behaviors", "dailyLogs", "schedules", "checklists"];

export interface SharePack {
  kind: "child";
  exportedAt: string;
  from: string;
  data: Pick<VaultData, Collection | "images">;
}

/** Everything about one child, for a share file. */
export function packChild(childId: string): SharePack {
  const d = getData();
  const own = <T extends { childId: string }>(list: T[]) => list.filter((r) => r.childId === childId);
  const children = d.children.filter((c) => c.id === childId);
  const schedules = own(d.schedules);
  const imageIds = new Set([...children.map((c) => c.photoId), ...schedules.flatMap((s) => s.steps.map((st) => st.imageId))]);
  return {
    kind: "child",
    exportedAt: now(),
    from: d.profile.name,
    data: {
      children,
      goals: own(d.goals),
      dataPoints: own(d.dataPoints),
      behaviors: own(d.behaviors),
      dailyLogs: own(d.dailyLogs),
      schedules,
      checklists: own(d.checklists),
      images: Object.fromEntries(Object.entries(d.images).filter(([id]) => imageIds.has(id))),
    },
  };
}

/** Merges a share pack. A record replaces ours only if it was changed more recently. */
export function mergePack(pack: SharePack): { added: number; updated: number } {
  let added = 0;
  let updated = 0;
  update((d) => {
    const next: Partial<VaultData> = { images: { ...d.images, ...pack.data.images } };
    for (const key of COLLECTIONS) {
      const list = [...(d[key] as RecordOf<typeof key>[])];
      for (const incoming of (pack.data[key] ?? []) as RecordOf<typeof key>[]) {
        const i = list.findIndex((r) => r.id === incoming.id);
        if (i < 0) {
          list.push(incoming);
          added++;
        } else if (incoming.updatedAt > list[i].updatedAt) {
          list[i] = incoming;
          updated++;
        }
      }
      (next as Record<string, unknown>)[key] = list;
    }
    return next;
  });
  return { added, updated };
}
