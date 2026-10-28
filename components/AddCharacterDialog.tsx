"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { RosterCharacter } from "@/components/CharacterCard";

const ALL = "\u0000all";
const NO_CAMPAIGN = "\u0000none";

/**
 * The roster's Add character button. It asks whether to make a new character
 * or bring an existing one in from elsewhere in the world; picking an existing
 * one puts them on this campaign's roster.
 */
export function AddCharacterDialog({
  characters,
  campaignName,
  onPick,
}: {
  characters: RosterCharacter[];
  campaignName: string;
  onPick: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<"choose" | "existing">("choose");
  /** Which campaign to list characters from: a name, NO_CAMPAIGN, or ALL. */
  const [from, setFrom] = useState(ALL);

  const campaigns = [...new Set(characters.flatMap((c) => c.elsewhere))].sort((a, b) =>
    a.localeCompare(b),
  );
  const hasLoose = characters.some((c) => c.elsewhere.length === 0);
  const sources = [...campaigns, ...(hasLoose ? [NO_CAMPAIGN] : [])];

  const inSource = characters.filter((c) =>
    from === ALL
      ? true
      : from === NO_CAMPAIGN
        ? c.elsewhere.length === 0
        : c.elsewhere.includes(from),
  );
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? inSource.filter((c) =>
        [c.displayName, c.owner.name, ...c.elsewhere].some((s) =>
          s.toLowerCase().includes(needle),
        ),
      )
    : inSource;

  function reset() {
    setQuery("");
    setStep("choose");
    setFrom(ALL);
  }

  function close() {
    dialog.current?.close();
    reset();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded-md bg-ember px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ember/90"
      >
        Add character
      </button>

      <dialog
        ref={dialog}
        onClose={reset}
        // A click on the backdrop lands on the dialog itself, not its contents.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-ink-600/70 bg-ink-800 p-0 text-parchment shadow-2xl backdrop:bg-ink-900/70 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 border-b border-ink-600/70 px-5 py-4">
          {step === "existing" ? (
            <button
              type="button"
              onClick={() => setStep("choose")}
              aria-label="Back"
              className="-ml-2 rounded-md px-2 py-1 text-parchment-dim hover:text-parchment"
            >
              ←
            </button>
          ) : null}
          <h2 className="font-[family-name:var(--font-display)] text-lg">
            {step === "existing" ? "Pick a character" : `Add to ${campaignName}`}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="ml-auto rounded-md px-2 py-1 text-parchment-dim hover:text-parchment"
          >
            ✕
          </button>
        </div>

        {step === "choose" ? (
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <Link
              href="/characters/new"
              onClick={close}
              className="rounded-lg border border-ink-500 p-4 text-left hover:border-ember"
            >
              <span className="block text-parchment">New character</span>
              <span className="mt-1 block text-xs text-parchment-dim">
                Start a fresh sheet for this campaign.
              </span>
            </Link>
            <button
              type="button"
              disabled={characters.length === 0}
              onClick={() => setStep("existing")}
              className="rounded-lg border border-ink-500 p-4 text-left enabled:hover:border-ember disabled:opacity-50"
            >
              <span className="block text-parchment">Existing character</span>
              <span className="mt-1 block text-xs text-parchment-dim">
                {characters.length
                  ? "Bring someone in from another campaign."
                  : "Everyone is already on this roster."}
              </span>
            </button>
          </div>
        ) : (
          <>
            {sources.length > 1 ? (
              <div
                role="group"
                aria-label="Campaign"
                className="flex flex-wrap gap-1.5 px-5 pt-4"
              >
                {[ALL, ...sources].map((source) => (
                  <button
                    key={source}
                    type="button"
                    aria-pressed={from === source}
                    onClick={() => setFrom(source)}
                    className={
                      from === source
                        ? "rounded-full border border-ember bg-ember/15 px-3 py-1 text-xs text-parchment"
                        : "rounded-full border border-ink-500 px-3 py-1 text-xs text-parchment-dim hover:border-ember/60 hover:text-parchment"
                    }
                  >
                    {source === ALL ? "All" : source === NO_CAMPAIGN ? "No campaign" : source}
                  </button>
                ))}
              </div>
            ) : null}

            {characters.length > 6 ? (
              <div className="px-5 pt-4">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, player or campaign"
                  aria-label="Search characters"
                  className="w-full rounded-md border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-parchment outline-none placeholder:text-parchment-dim/40 focus:border-ember"
                />
              </div>
            ) : null}

            <ul className="max-h-[60vh] space-y-1 overflow-y-auto p-3">
              {shown.map((character) => (
                <li key={character.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(character.id);
                      close();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-ink-700/60 focus:bg-ink-700/60 focus:outline-none"
                  >
                    {character.portraitFileId ? (
                      // eslint-disable-next-line @next/next/no-img-element -- served from our own file route
                      <img
                        src={`/api/files/${character.portraitFileId}`}
                        alt=""
                        className="size-10 shrink-0 rounded-md object-cover object-[center_30%]"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: character.owner.color ?? "var(--color-owner-default)" }}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-[family-name:var(--font-display)]">
                        {character.displayName}
                      </span>
                      <span className="block truncate text-xs text-parchment-dim">
                        {character.owner.name} ·{" "}
                        {character.elsewhere.length
                          ? `in ${character.elsewhere.join(", ")}`
                          : "in no campaign"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {shown.length === 0 ? (
                <li className="py-6 text-center text-sm text-parchment-dim/60">
                  Nobody matches that.
                </li>
              ) : null}
            </ul>
          </>
        )}
      </dialog>
    </>
  );
}
