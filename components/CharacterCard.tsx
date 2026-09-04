"use client";

import Link from "next/link";
import type { OwnerOption } from "@/components/WhoAmI";
import { UNNAMED, type CharacterSummary } from "@/lib/roles";
import type { Status } from "@/lib/status";

export interface RosterCharacter {
  id: string;
  displayName: string;
  status: Status;
  summary: CharacterSummary;
  templateName: string;
  owner: { id: string; name: string; color: string | null };
}

interface Props {
  character: RosterCharacter;
  owners: OwnerOption[];
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOwnerChange: (ownerId: string) => void;
  onDelete: () => void;
}

export function CharacterCard({
  character,
  owners,
  isDragging,
  onDragStart,
  onDragEnd,
  onOwnerChange,
  onDelete,
}: Props) {
  const { summary } = character;
  const facts = [summary.species, summary.classLevel].filter(Boolean).join(" · ");
  const unnamed = character.displayName === UNNAMED;
  const accent = character.owner.color ?? "#8a7f6d";

  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", character.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={
        "group relative flex cursor-grab flex-col rounded-xl border border-ink-600/70 bg-ink-800/60 p-4 pl-5 transition active:cursor-grabbing hover:border-ember/50" +
        (isDragging ? " opacity-40" : "")
      }
    >
      {/* Owner colour as a spine, so a player can find their characters at a glance. */}
      <span
        aria-hidden
        className="absolute inset-y-3 left-0 w-1 rounded-full"
        style={{ background: accent }}
      />

      {/* The whole card opens the editor; the full PDF is one click further in. */}
      <Link href={`/characters/${character.id}`} className="min-w-0">
        <h3
          className={
            unnamed
              ? "truncate font-[family-name:var(--font-display)] text-lg italic text-parchment-dim"
              : "truncate font-[family-name:var(--font-display)] text-lg text-parchment"
          }
        >
          {character.displayName}
        </h3>
        {facts ? <p className="truncate text-sm text-parchment-dim">{facts}</p> : null}
      </Link>

      <div className="mt-4 flex items-center gap-2 border-t border-ink-600/60 pt-3">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: accent }}
        />
        <select
          aria-label={`Owner of ${character.displayName}`}
          value={character.owner.id}
          onChange={(event) => onOwnerChange(event.target.value)}
          className="-ml-1 min-w-0 cursor-pointer rounded-md border-0 bg-transparent py-0.5 pl-1 pr-1 text-sm text-parchment outline-none hover:text-ember focus:ring-1 focus:ring-ember"
        >
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id} className="bg-ink-800">
              {owner.name}
            </option>
          ))}
        </select>

        <span className="ml-auto truncate text-xs text-parchment-dim/50">
          {character.templateName}
        </span>

        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 rounded-md px-1.5 py-1 text-xs text-parchment-dim/40 opacity-0 transition hover:text-blood focus:opacity-100 group-hover:opacity-100"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
