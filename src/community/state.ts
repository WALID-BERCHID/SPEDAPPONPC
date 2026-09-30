import { useSyncExternalStore } from "react";
import { COMMUNITY_KEY, COMMUNITY_URL } from "../lib/app";
import { LiveCommunity } from "./live";
import { PreviewCommunity } from "./preview";
import type { CommunityApi, Profile } from "./types";

export const communityConfigured = Boolean(COMMUNITY_URL && COMMUNITY_KEY);

interface State {
  api: CommunityApi | null;
  profile: Profile | null;
  signedIn: boolean;
  ready: boolean;
}

let state: State = { api: communityConfigured ? new LiveCommunity(COMMUNITY_URL, COMMUNITY_KEY) : null, profile: null, signedIn: false, ready: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function useCommunity(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export async function refreshCommunity() {
  if (!state.api) return set({ ready: true });
  const session = await state.api.getSession();
  const profile = session ? await state.api.me() : null;
  set({ signedIn: Boolean(session), profile, ready: true });
}

export function startPreview(name: string) {
  set({ api: new PreviewCommunity(name), ready: false });
  void refreshCommunity();
}

export function setProfile(profile: Profile | null) {
  set({ profile });
}

export async function signOutCommunity() {
  await state.api?.signOut();
  set({ signedIn: false, profile: null, api: communityConfigured ? state.api : null });
}
