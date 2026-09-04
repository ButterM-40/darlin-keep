"use client";

import { useSyncExternalStore } from "react";

export interface OwnerOption {
  id: string;
  name: string;
  color: string | null;
}

const STORAGE_KEY = "vault.ownerId";

// localStorage is an external store, so it is read through useSyncExternalStore
// rather than an effect: that keeps the server render and the first client
// render in agreement instead of flashing a default and correcting it.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Picking a name in another tab should update this one too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // Private browsing or blocked storage: behave as if nobody is chosen.
    return "";
  }
}

function getServerSnapshot(): string {
  return "";
}

function store(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not fatal; the picker just will not persist.
  }
  // Same-tab writes do not raise a storage event, so notify by hand.
  for (const listener of listeners) listener();
}

/** Remembers who is using this browser. It only sets defaults; nothing is gated. */
export function useCurrentOwner(owners: OwnerOption[]) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ownerId = owners.some((o) => o.id === stored) ? stored : "";
  return { ownerId, choose: store };
}

export function WhoAmI({ owners }: { owners: OwnerOption[] }) {
  const { ownerId, choose } = useCurrentOwner(owners);
  const current = owners.find((o) => o.id === ownerId);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span
        aria-hidden
        className="inline-block size-2.5 rounded-full ring-1 ring-ink-500"
        style={{ background: current?.color ?? "transparent" }}
      />
      <span className="text-parchment-dim">You are</span>
      <select
        aria-label="Who are you?"
        value={ownerId}
        onChange={(e) => choose(e.target.value)}
        className="rounded-md border border-ink-500 bg-ink-800 px-2 py-1 text-parchment outline-none focus:border-ember"
      >
        <option value="">nobody</option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.name}
          </option>
        ))}
      </select>
    </label>
  );
}
