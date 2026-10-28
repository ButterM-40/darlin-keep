"use client";

import Link from "next/link";
import { Web } from "@/components/Decorations";
import type { OwnerOption } from "@/components/WhoAmI";
import { UNNAMED, type CharacterSummary } from "@/lib/roles";
import type { Status } from "@/lib/status";
import type { CardStyle } from "@/lib/themes";

export interface RosterCharacter {
  id: string;
  displayName: string;
  status: Status;
  summary: CharacterSummary;
  templateName: string;
  owner: { id: string; name: string; color: string | null };
  portraitFileId: string | null;
  /** Names of the other campaigns this character is on. */
  elsewhere: string[];
}

interface Props {
  character: RosterCharacter;
  cardStyle: CardStyle;
  owners: OwnerOption[];
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOwnerChange: (ownerId: string) => void;
  /** Leaves this campaign, or deletes the character if it is on no other. */
  onRemove: () => void;
}

export function CharacterCard({
  character,
  cardStyle,
  owners,
  isDragging,
  onDragStart,
  onDragEnd,
  onOwnerChange,
  onRemove,
}: Props) {
  const { summary } = character;
  const facts = [summary.species, summary.classLevel].filter(Boolean).join(" · ");
  const unnamed = character.displayName === UNNAMED;
  const accent = character.owner.color ?? "var(--color-owner-default)";
  // No picture means no picture slot at all: the card stays exactly as it was.
  const style = character.portraitFileId ? cardStyle : null;
  const portrait = character.portraitFileId ? (
    // eslint-disable-next-line @next/next/no-img-element -- served from our own file route
    <img
      src={`/api/files/${character.portraitFileId}`}
      alt=""
      draggable={false}
      className={PORTRAIT_CLASS[cardStyle]}
    />
  ) : null;

  const heading = (
    <h3
      className={
        unnamed
          ? "truncate font-[family-name:var(--font-display)] text-lg italic text-parchment-dim"
          : "truncate font-[family-name:var(--font-display)] text-lg text-parchment"
      }
    >
      {character.displayName}
    </h3>
  );
  const factsLine = facts ? <p className="truncate text-sm text-parchment-dim">{facts}</p> : null;
  const elsewhereLine = character.elsewhere.length ? (
    <p className="truncate text-xs text-parchment-dim/60">
      Also in {character.elsewhere.join(", ")}
    </p>
  ) : null;

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
        (style === "banner" ? " overflow-hidden" : "") +
        (style === "portrait" ? " min-h-72 justify-end overflow-hidden" : "") +
        (isDragging ? " opacity-40" : "")
      }
    >
      {style === "portrait" ? (
        <div aria-hidden className="absolute inset-0">
          {portrait}
          <div className="absolute inset-0 bg-linear-to-t from-ink-900 from-10% via-ink-900/70 via-35% to-transparent to-65%" />
        </div>
      ) : null}

      {/* Owner colour as a spine, so a player can find their characters at a glance. */}
      <span
        aria-hidden
        className={
          "absolute bottom-3 left-0 z-10 w-1 rounded-full " +
          (style === "banner" ? "top-[7.75rem]" : "top-3")
        }
        style={{ background: accent }}
      />

      {character.status === "DEAD" ? (
        <i aria-hidden className="fx fx-cobwebs fx-web fx-card">
          <Web />
        </i>
      ) : null}

      {/* The whole card opens the editor; the full PDF is one click further in. */}
      {style === "avatar" ? (
        <Link
          href={`/characters/${character.id}`}
          className="flex min-w-0 items-center gap-3"
        >
          <span
            className="size-12 shrink-0 overflow-hidden rounded-md"
            style={{ boxShadow: `0 0 0 2px var(--color-ink-800), 0 0 0 3px ${accent}` }}
          >
            {portrait}
          </span>
          <span className="min-w-0">
            {heading}
            {factsLine}
            {elsewhereLine}
          </span>
        </Link>
      ) : (
        <Link href={`/characters/${character.id}`} className="relative min-w-0">
          {style === "banner" ? portrait : null}
          {heading}
          {factsLine}
          {elsewhereLine}
        </Link>
      )}

      <div className="relative mt-4 flex items-center gap-2 border-t border-ink-600/60 pt-3">
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
          onClick={onRemove}
          title={
            character.elsewhere.length
              ? "Take off this campaign's roster. The sheet stays."
              : "Delete this character and their sheet."
          }
          className="shrink-0 rounded-md px-1.5 py-1 text-xs text-parchment-dim/40 opacity-0 transition hover:text-blood focus:opacity-100 group-hover:opacity-100"
        >
          {character.elsewhere.length ? "Remove" : "Delete"}
        </button>
      </div>
    </li>
  );
}

const PORTRAIT_CLASS: Record<CardStyle, string> = {
  avatar: "size-full object-cover object-[center_30%]",
  banner:
    "-ml-5 -mr-4 -mt-4 mb-3 block h-28 w-[calc(100%+2.25rem)] max-w-none border-b border-ink-600/70 object-cover object-[center_30%]",
  portrait: "size-full object-cover object-[center_25%]",
};
