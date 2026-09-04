"use client";

import { useState, useTransition } from "react";
import { assignOwner, moveCharacter, removeCharacter } from "@/app/actions";
import { CharacterCard, type RosterCharacter } from "@/components/CharacterCard";
import { ROSTER_ORDER, STATUS_LABELS, type Status } from "@/lib/status";
import type { OwnerOption } from "@/components/WhoAmI";

const BLURB: Record<Status, string> = {
  ACTIVE_PARTY: "Out on the road right now.",
  ALIVE: "Retired, benched, or waiting for a call.",
  DEAD: "Gone, but on the record.",
};

const EMPTY: Record<Status, string> = {
  ACTIVE_PARTY: "Drag someone here to send them out.",
  ALIVE: "Nobody waiting in the wings.",
  DEAD: "No losses yet.",
};

/**
 * Holds the roster in local state so a drag lands instantly and the server
 * catches up behind it. Owner changes and deletions go through here too, so
 * a card never shows a value the board has already moved past.
 */
export function RosterBoard({
  initialCharacters,
  owners,
}: {
  initialCharacters: RosterCharacter[];
  owners: OwnerOption[];
}) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Status | null>(null);
  const [, startTransition] = useTransition();

  function optimistic(
    apply: (current: RosterCharacter[]) => RosterCharacter[],
    persist: () => Promise<void>,
  ) {
    const rollback = characters;
    setCharacters(apply);
    startTransition(async () => {
      try {
        await persist();
      } catch {
        setCharacters(rollback);
      }
    });
  }

  function move(id: string, status: Status) {
    const character = characters.find((c) => c.id === id);
    if (!character || character.status === status) return;
    optimistic(
      (current) => current.map((c) => (c.id === id ? { ...c, status } : c)),
      () => moveCharacter(id, status),
    );
  }

  function changeOwner(id: string, ownerId: string) {
    const owner = owners.find((o) => o.id === ownerId);
    if (!owner) return;
    optimistic(
      (current) => current.map((c) => (c.id === id ? { ...c, owner } : c)),
      () => assignOwner(id, ownerId),
    );
  }

  function remove(id: string) {
    optimistic(
      (current) => current.filter((c) => c.id !== id),
      () => removeCharacter(id),
    );
  }

  return (
    <div className="space-y-10">
      {ROSTER_ORDER.map((status) => {
        const group = characters.filter((c) => c.status === status);
        const isTarget = hovered === status && dragging !== null;
        const draggedFromHere =
          dragging !== null &&
          characters.find((c) => c.id === dragging)?.status === status;

        return (
          <section
            key={status}
            onDragOver={(event) => {
              // Only preventDefault marks this as a valid drop target.
              event.preventDefault();
              setHovered(status);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setHovered((prev) => (prev === status ? null : prev));
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              if (id) move(id, status);
              setHovered(null);
              setDragging(null);
            }}
          >
            <div className="mb-4 flex items-baseline gap-3 border-b border-ink-600/70 pb-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-parchment">
                {STATUS_LABELS[status]}
              </h2>
              <span className="text-xs text-parchment-dim">{group.length}</span>
              <span className="ml-auto text-xs text-parchment-dim/70">{BLURB[status]}</span>
            </div>

            <div
              className={
                isTarget && !draggedFromHere
                  ? "rounded-xl outline-2 outline-dashed outline-ember/70 outline-offset-4 transition"
                  : "rounded-xl outline-2 outline-dashed outline-transparent outline-offset-4 transition"
              }
            >
              {group.length === 0 ? (
                <p className="py-8 text-center text-sm text-parchment-dim/50">
                  {dragging ? EMPTY[status] : "Nobody here yet."}
                </p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((character) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      owners={owners}
                      isDragging={dragging === character.id}
                      onDragStart={() => setDragging(character.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setHovered(null);
                      }}
                      onOwnerChange={(ownerId) => changeOwner(character.id, ownerId)}
                      onDelete={() => remove(character.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
